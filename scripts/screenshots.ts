/**
 * Screenshot every screen at 390×844 and 1280×800, plus three frames of the reveal
 * (0%, 50%, 100%) and a dark-mode set. Saves PNGs to design/screens/.
 *
 * Usage: npm run screenshots            (expects the dev server on http://127.0.0.1:5173)
 *        BASE=http://127.0.0.1:4173 npm run screenshots
 *        DAY=2026-10-15 npm run screenshots   (the "today" to freeze for stable output)
 */
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const BASE = process.env.BASE ?? 'http://127.0.0.1:5173'
const DAY = process.env.DAY ?? '2026-10-15'
const OUT = resolve(process.cwd(), 'design/screens')
mkdirSync(OUT, { recursive: true })

const SIZES = {
  phone: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { width: 1280, height: 800, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
} as const

type SizeKey = keyof typeof SIZES
type Theme = 'light' | 'dark'

const STORAGE_KEY = 'read-the-room:v1'

async function newContext(browser: Browser, size: SizeKey, theme: Theme, init?: { today?: string; freezeT?: number; storage?: unknown }) {
  const ctx = await browser.newContext({
    viewport: { width: SIZES[size].width, height: SIZES[size].height },
    deviceScaleFactor: SIZES[size].deviceScaleFactor,
    isMobile: SIZES[size].isMobile,
    hasTouch: SIZES[size].hasTouch,
    colorScheme: theme,
    reducedMotion: 'no-preference',
  })
  await ctx.addInitScript(
    ({ today, freezeT, storage, key }) => {
      ;(window as unknown as { __RTR_TODAY?: string }).__RTR_TODAY = today
      if (typeof freezeT === 'number') (window as unknown as { __RTR_FREEZE_T?: number }).__RTR_FREEZE_T = freezeT
      // Seed or clear storage once per browser context, not on every navigation.
      try {
        if (!window.sessionStorage.getItem('__rtr_seeded')) {
          if (storage) window.localStorage.setItem(key, JSON.stringify(storage))
          else window.localStorage.removeItem(key)
          window.sessionStorage.setItem('__rtr_seeded', '1')
        }
      } catch {
        /* ignore */
      }
    },
    { today: init?.today ?? DAY, freezeT: init?.freezeT, storage: init?.storage ?? null, key: STORAGE_KEY },
  )
  return ctx
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => (document as unknown as { fonts: { ready: Promise<void> } }).fonts.ready)
  await page.waitForTimeout(150)
}

async function shot(page: Page, name: string, size: SizeKey, theme: Theme, fullPage = true) {
  const file = resolve(OUT, `${name}--${size}${theme === 'dark' ? '--dark' : ''}.png`)
  await page.screenshot({ path: file, fullPage })
  console.log('saved', file.replace(process.cwd() + '/', ''))
}

/** Play one claim up to the reveal: verdict → slider → lock. */
async function playToReveal(page: Page, verdict: 'True' | 'False', guess: number) {
  await page.getByRole('button', { name: verdict, exact: true }).click()
  const slider = page.getByRole('slider')
  await slider.focus()
  await slider.evaluate((el, v) => {
    const input = el as HTMLInputElement
    input.value = String(v)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, guess)
  await page.waitForTimeout(100)
}

async function flows(browser: Browser, size: SizeKey, theme: Theme) {
  // Home (fresh)
  {
    const ctx = await newContext(browser, size, theme)
    const page = await ctx.newPage()
    await page.goto(`${BASE}/`)
    await settle(page)
    await shot(page, '01-home', size, theme)
    // How to play
    await page.getByRole('button', { name: 'How to play' }).first().click()
    await page.waitForTimeout(300)
    await shot(page, '02-howto-1', size, theme, false)
    await page.getByRole('button', { name: 'Next' }).click()
    await page.waitForTimeout(300)
    await shot(page, '02-howto-2', size, theme, false)
    await page.getByRole('button', { name: 'Next' }).click()
    await page.waitForTimeout(300)
    await shot(page, '02-howto-3', size, theme, false)
    await ctx.close()
  }

  // Play: verdict, read, reveal frames
  for (const [frameName, freezeT] of [
    ['05-reveal-0pct', 0],
    ['05-reveal-50pct', 0.4],
    ['05-reveal-100pct', 999],
  ] as const) {
    const ctx = await newContext(browser, size, theme, { freezeT })
    const page = await ctx.newPage()
    await page.goto(`${BASE}/play`)
    await settle(page)
    if (frameName === '05-reveal-0pct') await shot(page, '03-play-verdict', size, theme)
    await playToReveal(page, 'False', 62)
    if (frameName === '05-reveal-0pct') await shot(page, '04-play-read', size, theme)
    await page.getByRole('button', { name: 'Lock' }).click()
    await page.waitForTimeout(freezeT >= 999 ? 400 : 120)
    await shot(page, frameName, size, theme)
    await ctx.close()
  }

  // Full loop to results, then home-done, results, stats, archive, claim page
  {
    const ctx = await newContext(browser, size, theme, { freezeT: 999 })
    const page = await ctx.newPage()
    await page.goto(`${BASE}/play`)
    await settle(page)
    const picks: Array<['True' | 'False', number]> = [['False', 62], ['True', 48], ['False', 20], ['True', 70], ['False', 35]]
    for (let i = 0; i < 5; i++) {
      await playToReveal(page, picks[i][0], picks[i][1])
      await page.getByRole('button', { name: 'Lock' }).click()
      await page.waitForTimeout(300)
      await page.getByRole('button', { name: i < 4 ? 'Next' : 'See results' }).click()
      await page.waitForTimeout(150)
    }
    await page.waitForURL(/\/results/)
    await settle(page)
    await shot(page, '06-results', size, theme)
    const storage = await page.evaluate((k) => window.localStorage.getItem(k), STORAGE_KEY)
    await page.goto(`${BASE}/`)
    await settle(page)
    await shot(page, '07-home-done', size, theme)
    await page.goto(`${BASE}/stats`)
    await settle(page)
    await shot(page, '08-stats', size, theme)
    await page.goto(`${BASE}/archive`)
    await settle(page)
    await shot(page, '09-archive', size, theme)
    // claim deep link: first claim of the day
    const firstClaim = await page.evaluate(async () => {
      const a = document.querySelector('a[href^="/c/"]') as HTMLAnchorElement | null
      return a?.getAttribute('href') ?? null
    })
    const href = firstClaim ?? (await (async () => {
      await page.goto(`${BASE}/results`)
      await settle(page)
      return page.evaluate(() => (document.querySelector('a[href^="/c/"]') as HTMLAnchorElement | null)?.getAttribute('href') ?? '/c/moon-landing-staged')
    })())
    await page.goto(`${BASE}${href}`)
    await settle(page)
    await shot(page, '10-claim-page', size, theme)
    void storage
    await ctx.close()
  }
}

async function main() {
  // Use the environment's Chromium when the Playwright-pinned build is absent (cloud containers).
  const candidates = [process.env.CHROMIUM_PATH, '/opt/pw-browsers/chromium'].filter((p): p is string => Boolean(p))
  const executablePath = candidates.find((p) => existsSync(p))
  const browser = await chromium.launch(executablePath ? { executablePath } : {})
  try {
    for (const size of ['phone', 'desktop'] as SizeKey[]) {
      await flows(browser, size, 'light')
    }
    await flows(browser, 'phone', 'dark')
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
