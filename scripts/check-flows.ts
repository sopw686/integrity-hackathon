/**
 * End-to-end checks: keyboard-only loop, storage disabled, reduced motion timing, full-motion timing,
 * and axe-core accessibility scans on the play screens. Expects the dev server on 127.0.0.1:5173.
 *   npm run check:flows
 */
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
const BASE = 'http://127.0.0.1:5173'
const KEY = 'read-the-room:v1'
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" })
  const out: string[] = []
  const say = (line: string) => { out.push(line); console.log(line) }
  // 1. Keyboard-only full loop
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    await ctx.addInitScript(() => { (window as any).__RTR_TODAY = '2026-10-15'; (window as any).__RTR_FREEZE_T = 999; try { localStorage.clear(); localStorage.setItem('read-the-room:howto-seen', '1') } catch {} })
    const page = await ctx.newPage()
    await page.goto(BASE + '/')
    await page.waitForLoadState('networkidle')
    // Tab to Play and press Enter
    let found = false
    for (let i = 0; i < 10 && !found; i++) { await page.keyboard.press('Tab'); found = await page.evaluate(() => document.activeElement?.textContent?.trim() === 'Play') }
    say(`home: tabbed to Play = ${found}`)
    await page.keyboard.press('Enter')
    await page.waitForURL(/\/play/)
    for (let i = 0; i < 5; i++) {
      // focus should be on the claim text; Tab reaches True, Tab again False
      await page.keyboard.press('Tab'); await page.keyboard.press('Tab')
      const label = await page.evaluate(() => document.activeElement?.textContent?.trim())
      await page.keyboard.press('Enter')
      // slider should now be focused
      const sliderFocused = await page.evaluate(() => document.activeElement?.getAttribute('type') === 'range')
      for (let k = 0; k < 12; k++) await page.keyboard.press('ArrowRight')
      const val = await page.evaluate(() => (document.activeElement as HTMLInputElement).value)
      await page.keyboard.press('Tab')
      const lockFocused = await page.evaluate(() => document.activeElement?.textContent?.trim() === 'Lock')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)
      const nextFocused = await page.evaluate(() => /Next|See results/.test(document.activeElement?.textContent ?? ''))
      say(`claim ${i + 1}: verdict=${label} sliderFocused=${sliderFocused} value=${val} lockFocused=${lockFocused} nextAutoFocused=${nextFocused}`)
      await page.keyboard.press('Enter')
      await page.waitForTimeout(200)
    }
    await page.waitForURL(/\/results/)
    say('keyboard loop reached results')
    const axe = await new AxeBuilder({ page }).analyze()
    say(`axe results page violations: ${axe.violations.length} ${axe.violations.map((v) => v.id).join(',')}`)
    await ctx.close()
  }
  // 2. Storage disabled
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    await ctx.addInitScript(() => {
      (window as any).__RTR_TODAY = '2026-10-15'; (window as any).__RTR_FREEZE_T = 999
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('storage disabled') } })
    })
    const page = await ctx.newPage()
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(BASE + '/')
    await page.waitForLoadState('networkidle')
    const notice = await page.getByText(/Saving is off/).count()
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: 'False', exact: true }).click()
      await page.getByRole('button', { name: 'Lock' }).click()
      await page.getByRole('button', { name: i < 4 ? 'Next' : 'See results' }).click()
    }
    await page.waitForURL(/\/results/)
    say(`storage-disabled: notice shown=${notice > 0}, reached results, page errors=${errors.length} ${errors.slice(0, 2).join(' | ')}`)
    await ctx.close()
  }
  // 3. Reduced motion + axe on play screens
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
    await ctx.addInitScript(() => { (window as any).__RTR_TODAY = '2026-10-15'; try { localStorage.clear(); localStorage.setItem('read-the-room:howto-seen', '1') } catch {} })
    const page = await ctx.newPage()
    await page.goto(BASE + '/play')
    await page.waitForLoadState('networkidle')
    let axe = await new AxeBuilder({ page }).analyze()
    say(`axe verdict screen violations: ${axe.violations.length} ${axe.violations.map((v) => v.id + ':' + v.nodes.length).join(',')}`)
    await page.getByRole('button', { name: 'True', exact: true }).click()
    axe = await new AxeBuilder({ page }).analyze()
    say(`axe read screen violations: ${axe.violations.length} ${axe.violations.map((v) => v.id + ':' + v.nodes.length).join(',')}`)
    const t0 = Date.now()
    await page.getByRole('button', { name: 'Lock' }).click()
    await page.getByRole('button', { name: 'Next' }).waitFor({ state: 'visible', timeout: 5000 })
    say(`reduced-motion: Next appeared after ${Date.now() - t0} ms (expect ≈ 500–900)`)
    axe = await new AxeBuilder({ page }).analyze()
    say(`axe reveal screen violations: ${axe.violations.length} ${axe.violations.map((v) => v.id + ':' + v.nodes.length).join(',')}`)
    await page.screenshot({ path: 'design/screens/05-reveal-reduced-motion--phone.png', fullPage: true })
    await ctx.close()
  }
  // 4. Normal-motion timing: Next should appear ≈ 2.3 s after Lock
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    await ctx.addInitScript(() => { (window as any).__RTR_TODAY = '2026-10-15'; try { localStorage.clear(); localStorage.setItem('read-the-room:howto-seen', '1') } catch {} })
    const page = await ctx.newPage()
    await page.goto(BASE + '/play')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'True', exact: true }).click()
    const t0 = Date.now()
    await page.getByRole('button', { name: 'Lock' }).click()
    await page.getByRole('button', { name: 'Next' }).waitFor({ state: 'visible', timeout: 6000 })
    say(`full-motion: Next appeared after ${Date.now() - t0} ms (spec: sequence under 2500)`)
    await ctx.close()
  }
  await browser.close()
  console.log(out.join('\n'))
}
main().catch((e) => { console.error(e); process.exit(1) })
