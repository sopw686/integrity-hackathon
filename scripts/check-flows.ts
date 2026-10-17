/**
 * End-to-end checks: keyboard-only loop, storage disabled, reduced motion timing, full-motion timing,
 * axe-core accessibility scans on the play screens, and no page errors anywhere. Prints one line per
 * check and exits 1 if any fails.
 *
 *   npm run check:flows                               (expects `npm run dev` on http://127.0.0.1:5173)
 *   BASE=http://127.0.0.1:4173 npm run check:flows    (against `npm run preview`)
 *
 * Needs a Chromium: CHROMIUM_PATH, /opt/pw-browsers/chromium, or `npx playwright install chromium`.
 */
import { existsSync } from 'node:fs'
import { chromium, type Browser, type BrowserContext, type Locator, type Page } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import { REDUCED_T_DONE, T_DONE, ms } from '../src/tokens/motion'

const BASE = process.env.BASE ?? 'http://127.0.0.1:5173'
const DAY = '2026-10-15'
const MARGIN_MS = 400 // headroom over the designed reveal (slow machines, dev-server renders)

const failures: string[] = []
const say = (line: string) => console.log(line)
const check = (ok: boolean, what: string, detail = '') => {
  say(`${ok ? 'ok  ' : 'FAIL'} ${what}${detail ? ` (${detail})` : ''}`)
  if (!ok) failures.push(what)
}

async function newContext(browser: Browser, opts: { freezeT?: number; reduced?: boolean; storage?: boolean } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' })
  await ctx.addInitScript(
    ({ today, freezeT, storage }) => {
      const w = window as unknown as { __RTR_TODAY?: string; __RTR_FREEZE_T?: number }
      w.__RTR_TODAY = today
      if (typeof freezeT === 'number') w.__RTR_FREEZE_T = freezeT
      if (!storage) {
        Object.defineProperty(window, 'localStorage', {
          get() {
            throw new Error('storage disabled')
          },
        })
        return
      }
      try {
        // Clear once per context, not on every navigation.
        if (!sessionStorage.getItem('__rtr_seeded')) {
          localStorage.clear()
          localStorage.setItem('read-the-room:howto-seen', '1')
          sessionStorage.setItem('__rtr_seeded', '1')
        }
      } catch {
        /* ignore */
      }
    },
    { today: DAY, freezeT: opts.freezeT, storage: opts.storage !== false },
  )
  return ctx
}

/** Run one section in its own context; a throw fails the section instead of ending the run. */
async function section(name: string, ctx: BrowserContext, run: (page: Page) => Promise<void>) {
  const errors: string[] = []
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  try {
    await run(page)
  } catch (e) {
    check(false, `${name}: finished without throwing`, (e as Error).message.split('\n')[0])
  }
  check(errors.length === 0, `${name}: no page errors`, errors.slice(0, 2).join(' | '))
  await ctx.close()
}

async function axe(page: Page, screen: string) {
  const r = await new AxeBuilder({ page }).analyze()
  check(r.violations.length === 0, `axe: ${screen} has no violations`, r.violations.map((v) => `${v.id}:${v.nodes.length}`).join(','))
}

/** Wait up to `timeout` ms for a condition evaluated in the page (it reads document.activeElement itself). */
async function becomes(page: Page, test: () => boolean, timeout = 2000): Promise<boolean> {
  return page.waitForFunction(test, undefined, { timeout }).then(() => true, () => false)
}
// Text of the focused element without its aria-hidden parts (a tile's T/F key hint is not its name).
const focusedText = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement?.cloneNode(true) as HTMLElement | undefined
    el?.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove())
    return el?.textContent?.trim() ?? ''
  })

/**
 * Click Lock and time, inside the page, how long until Next appears. Wall-clock timing would add
 * Playwright's click and polling overhead (up to ~350 ms), so the browser's own clock is used.
 */
async function lockToNext(page: Page, timeout: number): Promise<number> {
  await page.evaluate(() => {
    // No named helpers in here: tsx wraps them in __name(), which does not exist in the page.
    const w = window as unknown as { __lockAt?: number; __nextAt?: number }
    document.addEventListener('click', (e) => {
      if ((e.target as Element | null)?.closest('button')?.textContent?.trim() === 'Lock') w.__lockAt = performance.now()
    }, true)
    new MutationObserver((_, obs) => {
      if (w.__lockAt !== undefined && Array.from(document.querySelectorAll('button')).some((b) => /^(Next|See results)$/.test(b.textContent?.trim() ?? ''))) {
        w.__nextAt = performance.now()
        obs.disconnect()
      }
    }).observe(document.body, { childList: true, subtree: true })
  })
  await page.getByRole('button', { name: 'Lock' }).click()
  await page.getByRole('button', { name: 'Next' }).waitFor({ state: 'visible', timeout })
  return page.evaluate(() => {
    const w = window as unknown as { __lockAt?: number; __nextAt?: number }
    return Math.round((w.__nextAt ?? NaN) - (w.__lockAt ?? NaN))
  })
}

// Home's Play and the empty-day Back may be links or buttons; accept either.
const control = (page: Page, name: string): Locator =>
  page.getByRole('link', { name, exact: true }).or(page.getByRole('button', { name, exact: true }))

async function main() {
  // Use the environment's Chromium when the Playwright-pinned build is absent (cloud containers).
  const candidates = [process.env.CHROMIUM_PATH, '/opt/pw-browsers/chromium'].filter((p): p is string => Boolean(p))
  const executablePath = candidates.find((p) => existsSync(p))
  const browser = await chromium.launch(executablePath ? { executablePath } : {})
  say(`check:flows against ${BASE}`)

  // 1. Keyboard-only full loop
  await section('keyboard loop', await newContext(browser, { freezeT: 999 }), async (page) => {
    await page.goto(BASE + '/')
    await page.waitForLoadState('networkidle')
    let found = false
    for (let i = 0; i < 10 && !found; i++) {
      await page.keyboard.press('Tab')
      found = (await focusedText(page)) === 'Play'
    }
    check(found, 'home: Tab reaches Play')
    if (!found) return
    await page.keyboard.press('Enter')
    await page.waitForURL(/\/play/)
    for (let i = 0; i < 5; i++) {
      const n = `claim ${i + 1}`
      // Play focuses the claim on arrival, after the URL has changed: wait for it before tabbing.
      check(await becomes(page, () => !!document.activeElement?.matches('h1.claim-text')), `${n}: claim text focused on arrival`)
      await page.keyboard.press('Tab') // True
      await page.keyboard.press('Tab') // False
      const label = await focusedText(page)
      check(label === 'False', `${n}: two Tabs reach False`, `focused "${label}"`)
      await page.keyboard.press('Enter')
      // "How sure are you?" takes focus; two Tabs reach a confidence tile
      check(await becomes(page, () => document.activeElement?.textContent?.trim() === 'How sure are you?'), `${n}: "How sure are you?" focused after the verdict`)
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      const sure = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '')
      check(/^\d+%/.test(sure), `${n}: two Tabs reach a confidence tile`, `focused "${sure}"`)
      await page.keyboard.press('Enter')
      check(await becomes(page, () => document.activeElement?.getAttribute('type') === 'range'), `${n}: slider focused after picking confidence`)
      for (let k = 0; k < 12; k++) await page.keyboard.press('ArrowRight')
      await page.keyboard.press('Tab')
      check((await focusedText(page)) === 'Lock', `${n}: Tab from the slider reaches Lock`)
      await page.keyboard.press('Enter')
      // Focus lands on Next or on the reveal (Lock itself is gone); it must not drop to <body>.
      const kept = await becomes(page, () => {
        const el = document.activeElement
        return !!el && el !== document.body && !!el.closest('main') && !el.closest('header')
      })
      check(kept, `${n}: focus stays in the reveal after Lock`, `focused "${(await focusedText(page)).slice(0, 40)}"`)
      let next = /^(Next|See results)$/.test(await focusedText(page))
      for (let k = 0; k < 6 && !next; k++) {
        await page.keyboard.press('Tab')
        next = /^(Next|See results)$/.test(await focusedText(page))
      }
      check(next, `${n}: Next is reachable by keyboard`)
      if (!next) return
      await page.keyboard.press('Enter')
    }
    await page.waitForURL(/\/results/)
    check(true, 'keyboard loop reaches results')
    await page.waitForLoadState('networkidle')
    await axe(page, 'results')
  })

  // 2. Storage disabled
  await section('storage disabled', await newContext(browser, { freezeT: 999, storage: false }), async (page) => {
    await page.goto(BASE + '/')
    await page.waitForLoadState('networkidle')
    check((await page.getByText(/Saving is off/).count()) > 0, 'storage disabled: "Saving is off" notice shown')
    await control(page, 'Play').click()
    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: 'False', exact: true }).click()
      await page.getByRole('button', { name: /^90%/ }).click()
      await page.getByRole('button', { name: 'Lock' }).click()
      await page.getByRole('button', { name: i < 4 ? 'Next' : 'See results' }).click()
    }
    await page.waitForURL(/\/results/)
    check(true, 'storage disabled: play-through reaches results')
  })

  // 3. Reduced motion + axe on the play screens
  await section('reduced motion', await newContext(browser, { reduced: true }), async (page) => {
    await page.goto(BASE + '/play')
    await page.waitForLoadState('networkidle')
    await axe(page, 'verdict screen')
    await page.getByRole('button', { name: 'True', exact: true }).click()
    await axe(page, 'sure screen')
    await page.getByRole('button', { name: /^70%/ }).click()
    await axe(page, 'read screen')
    const took = await lockToNext(page, 5000)
    const want = ms(REDUCED_T_DONE)
    check(took >= want - 50 && took <= want + MARGIN_MS, 'reduced motion: Next appears on time', `${took} ms; designed ${want}, allowed ${want - 50}–${want + MARGIN_MS}`)
    await axe(page, 'reveal screen')
  })

  // 4. Full-motion timing
  await section('full motion', await newContext(browser), async (page) => {
    await page.goto(BASE + '/play')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'True', exact: true }).click()
    await page.getByRole('button', { name: /^70%/ }).click()
    const took = await lockToNext(page, 6000)
    const want = ms(T_DONE)
    check(took >= want - 50 && took <= want + MARGIN_MS, 'full motion: Next appears on time', `${took} ms; designed ${want}, allowed ${want - 50}–${want + MARGIN_MS}`)
  })

  await browser.close()
  say(failures.length === 0 ? '\nAll checks passed.' : `\n${failures.length} check(s) failed:\n  ${failures.join('\n  ')}`)
  if (failures.length > 0) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
