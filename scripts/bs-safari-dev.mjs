/**
 * BrowserStack Safari test against the LOCAL dev build via a BrowserStack
 * Local tunnel.
 *
 * Purpose:
 *  - Check whether engines initialize on Safari with the dev build
 *    (vs the production Vercel build, which fails — issue #1).
 *  - If they do, run "Analyze Game" and watch for the Win Finder OOM (#2).
 *
 * Run: BROWSERSTACK_USERNAME=... BROWSERSTACK_ACCESS_KEY=... \
 *      TARGET_URL=http://localhost:3001 node scripts/bs-safari-dev.mjs
 */
import { webkit } from 'playwright'
import bsLocal from 'browserstack-local'

const USER = process.env.BROWSERSTACK_USERNAME
const KEY = process.env.BROWSERSTACK_ACCESS_KEY
const TARGET = process.env.TARGET_URL || 'http://localhost:3001'

if (!USER || !KEY) {
  console.error('Missing BROWSERSTACK_USERNAME / BROWSERSTACK_ACCESS_KEY')
  process.exit(1)
}

const LONG_PGN = [
  '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6',
  '8. c3 O-O 9. h3 Na5 10. Bc2 c5 11. d4 Qc7 12. Nbd2 cxd4 13. cxd4 Nc6',
  '14. Nb3 a5 15. Be3 a4 16. Nbd2 Bd7 17. Rc1 Qb7 18. Bb1 Rfe8 19. d5 Nb4 20. Nf1 Rac8',
].join(' ')

const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a)

const startTunnel = () =>
  new Promise((resolve, reject) => {
    const local = new bsLocal.Local()
    local.start({ key: KEY, force: 'true', forceLocal: 'true' }, (err) => {
      if (err) reject(err)
      else resolve(local)
    })
  })

const stopTunnel = (local) =>
  new Promise((resolve) => local.stop(resolve))

let crashed = false
let initError = null

const run = async () => {
  log('Starting BrowserStack Local tunnel...')
  const local = await startTunnel()
  log('Tunnel up.')

  const caps = {
    browser: 'playwright-webkit',
    os: 'osx',
    os_version: 'Sequoia',
    name: 'WinFinder dev-build Safari test',
    build: 'expectedEval-safari-dev',
    'browserstack.local': 'true',
    'browserstack.username': USER,
    'browserstack.accessKey': KEY,
  }
  const wsEndpoint = `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(JSON.stringify(caps))}`

  let browser
  let page
  try {
    log('Connecting to BrowserStack macOS Safari...')
    browser = await webkit.connect(wsEndpoint)
    page = await browser.newPage()

    page.on('crash', () => { crashed = true; log('!!! PAGE CRASHED (likely OOM)') })
    page.on('pageerror', (e) => log('pageerror:', String(e.message).slice(0, 200)))
    page.on('console', (m) => {
      const t = m.text()
      if (/Failed to initialize|out of bounds|RuntimeError/i.test(t)) {
        if (!initError) initError = t.slice(0, 400)
        log('console:', m.type(), t.slice(0, 300))
      } else if (/memory|allocat|wasm|RangeError|oom/i.test(t)) {
        log('console:', m.type(), t.slice(0, 300))
      }
    })

    log(`Navigating to ${TARGET} (via tunnel)`)
    await page.goto(TARGET, { timeout: 60000, waitUntil: 'domcontentloaded' })

    log('Waiting for engines to initialize (up to 4 min)...')
    const initDeadline = Date.now() + 240000
    let enginesReady = false
    while (Date.now() < initDeadline) {
      if (initError) { log('Engine init error detected.'); break }
      const status = await page.evaluate(() => ({
        sf: document.querySelector('[data-testid=sf-status]')?.textContent?.trim() ?? '',
        maia: document.querySelector('[data-testid=maia-status]')?.textContent?.trim() ?? '',
      })).catch(() => ({ sf: 'DEAD', maia: 'DEAD' }))
      if (/ready/i.test(status.sf) && /ready/i.test(status.maia)) { enginesReady = true; break }
      log(`  sf="${status.sf}"  maia="${status.maia}"`)
      await new Promise((r) => setTimeout(r, 5000))
    }

    if (!enginesReady) {
      log('=== RESULT: engines did NOT initialize on Safari (dev build) ===')
      crashed = true
      await page.screenshot({ path: 'scripts/bs-safari-dev-failure.png' }).catch(() => {})
      return
    }

    log('=== Engines initialized on Safari (dev build) — proceeding to Win Finder ===')
    await page.getByTestId('pgn-input').fill(LONG_PGN)
    await page.getByTestId('load-pgn-button').click()
    await page.getByTestId('sf-cp').waitFor({ timeout: 60000 })
    log('PGN loaded.')

    await page.getByTestId('tab-winfinder').click()
    await page.getByTestId('wf-analyze-button').waitFor({ timeout: 10000 })
    log('Clicking Analyze Game — monitoring for OOM...')
    await page.getByTestId('wf-analyze-button').click()

    const started = Date.now()
    while (Date.now() - started < 300000) {
      if (crashed) break
      await new Promise((r) => setTimeout(r, 3000))
      try {
        const state = await page.evaluate(() => {
          const prog = document.querySelector('[data-testid=wf-progress]')
          const results = document.querySelector('[data-testid=wf-results]')
          return {
            progress: prog ? prog.textContent.trim() : null,
            done: !!results,
          }
        })
        log(`progress=${state.progress ?? '-'}  done=${state.done}`)
        if (state.done) { log('=== ANALYSIS COMPLETED — no crash ==='); break }
      } catch (err) {
        crashed = true
        log('!!! page is dead during Analyze Game (OOM):', String(err.message).slice(0, 200))
        break
      }
    }
  } catch (err) {
    log('ERROR:', String(err.message).slice(0, 300))
    crashed = true
  } finally {
    const status = crashed ? 'failed' : 'passed'
    const reason = initError
      ? `engine init failed: ${initError}`
      : crashed
        ? 'crash/OOM during Analyze Game'
        : 'no crash'
    log(`Result: ${status} — ${reason}`)
    if (page) {
      await page.evaluate(
        () => {},
        `browserstack_executor: ${JSON.stringify({ action: 'setSessionStatus', arguments: { status, reason } })}`,
      ).catch(() => {})
    }
    if (browser) await browser.close().catch(() => {})
    log('Stopping tunnel...')
    await stopTunnel(local)
    log('Tunnel stopped.')
  }
  process.exit(crashed ? 1 : 0)
}

run().catch((e) => { console.error(e); process.exit(1) })
