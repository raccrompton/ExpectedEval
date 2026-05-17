/**
 * BrowserStack Safari reproduction for the Win Finder OOM.
 *
 * Connects to real macOS Safari (WebKit) on BrowserStack, drives the live
 * deployment, runs "Analyze Game", and watches for a crash / OOM.
 *
 * Run: BROWSERSTACK_USERNAME=... BROWSERSTACK_ACCESS_KEY=... node scripts/bs-safari-winfinder.mjs
 */
import { webkit, chromium } from 'playwright'

const BROWSER = process.env.BS_BROWSER || 'webkit' // 'webkit' | 'chromium'
const engine = BROWSER === 'chromium' ? chromium : webkit

const USER = process.env.BROWSERSTACK_USERNAME
const KEY = process.env.BROWSERSTACK_ACCESS_KEY
const TARGET = process.env.TARGET_URL || 'https://expected-eval.vercel.app'

if (!USER || !KEY) {
  console.error('Missing BROWSERSTACK_USERNAME / BROWSERSTACK_ACCESS_KEY')
  process.exit(1)
}

// A 40-ply game so Win Finder has plenty of positions past skipFirstPly(20).
const LONG_PGN = [
  '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6',
  '8. c3 O-O 9. h3 Na5 10. Bc2 c5 11. d4 Qc7 12. Nbd2 cxd4 13. cxd4 Nc6',
  '14. Nb3 a5 15. Be3 a4 16. Nbd2 Bd7 17. Rc1 Qb7 18. Bb1 Rfe8 19. d5 Nb4 20. Nf1 Rac8',
].join(' ')

const caps = BROWSER === 'chromium'
  ? {
      browser: 'playwright-chromium',
      os: 'osx',
      os_version: 'Sequoia',
      name: 'WinFinder Chromium check',
      build: 'expectedEval-safari',
      'browserstack.username': USER,
      'browserstack.accessKey': KEY,
    }
  : {
      browser: 'playwright-webkit',
      os: 'osx',
      os_version: 'Sequoia',
      name: 'WinFinder OOM repro',
      build: 'expectedEval-safari',
      'browserstack.username': USER,
      'browserstack.accessKey': KEY,
    }

const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a)

const wsEndpoint = `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(JSON.stringify(caps))}`

let crashed = false
let initError = null

const run = async () => {
  log('Connecting to BrowserStack macOS Safari...')
  const browser = await engine.connect(wsEndpoint)
  const page = await browser.newPage()

  page.on('crash', () => { crashed = true; log('!!! PAGE CRASHED (likely OOM)') })
  page.on('pageerror', (e) => log('pageerror:', e.message))
  page.on('console', (m) => {
    const t = m.text()
    if (/Failed to initialize|out of bounds|RuntimeError/i.test(t)) {
      if (!initError) initError = t.slice(0, 400)
      log('console:', m.type(), t.slice(0, 300))
    } else if (/memory|allocat|wasm|RangeError|oom/i.test(t)) {
      log('console:', m.type(), t.slice(0, 300))
    }
  })

  try {
    log(`Navigating to ${TARGET}`)
    await page.goto(TARGET, { timeout: 60000, waitUntil: 'domcontentloaded' })

    log('Waiting for engines to initialize (polling, up to 4 min)...')
    const initDeadline = Date.now() + 240000
    let enginesReady = false
    while (Date.now() < initDeadline) {
      if (initError) throw new Error(`Engine init failed: ${initError}`)
      const status = await page.evaluate(() => ({
        sf: document.querySelector('[data-testid=sf-status]')?.textContent?.trim() ?? '',
        maia: document.querySelector('[data-testid=maia-status]')?.textContent?.trim() ?? '',
      }))
      if (/ready/i.test(status.sf) && /ready/i.test(status.maia)) { enginesReady = true; break }
      log(`  sf="${status.sf}"  maia="${status.maia}"`)
      await new Promise((r) => setTimeout(r, 5000))
    }
    if (!enginesReady) throw new Error('Engines never became ready (timeout)')
    log('Engines ready.')

    log('Loading PGN...')
    await page.getByTestId('pgn-input').fill(LONG_PGN)
    await page.getByTestId('load-pgn-button').click()
    await page.getByTestId('sf-cp').waitFor({ timeout: 60000 })
    log('PGN loaded, position evaluated.')

    log('Switching to Win Finder tab...')
    await page.getByTestId('tab-winfinder').click()
    await page.getByTestId('wf-analyze-button').waitFor({ timeout: 10000 })

    log('Clicking Analyze Game — monitoring for OOM...')
    await page.getByTestId('wf-analyze-button').click()

    // Poll the page every 2s. If the page is dead, page.evaluate throws.
    const started = Date.now()
    while (Date.now() - started < 300000) {
      if (crashed) break
      await new Promise((r) => setTimeout(r, 2000))
      try {
        const state = await page.evaluate(() => {
          const prog = document.querySelector('[data-testid=wf-progress]')
          const results = document.querySelector('[data-testid=wf-results]')
          return {
            progress: prog ? prog.textContent.trim() : null,
            done: !!results,
            // performance.memory is Chrome-only; undefined in WebKit
            heapMB: performance.memory
              ? Math.round(performance.memory.usedJSHeapSize / 1048576)
              : null,
          }
        })
        log(`progress=${state.progress ?? '-'}  done=${state.done}  heapMB=${state.heapMB ?? 'n/a'}`)
        if (state.done) { log('=== ANALYSIS COMPLETED — no crash ==='); break }
      } catch (err) {
        crashed = true
        log('!!! page.evaluate failed — page is dead (OOM):', err.message.slice(0, 200))
        break
      }
    }
  } catch (err) {
    log('ERROR:', err.message)
    if (!initError && /init failed/i.test(err.message)) initError = err.message
    crashed = true
    try {
      await page.screenshot({ path: 'scripts/bs-safari-failure.png' })
      log('Screenshot saved: scripts/bs-safari-failure.png')
    } catch {}
  } finally {
    const status = crashed ? 'failed' : 'passed'
    const reason = initError
      ? `Stockfish init failed on Safari: ${initError}`
      : crashed
        ? 'Win Finder OOM reproduced'
        : 'No crash observed'
    log(`Result: ${status} — ${reason}`)
    // Mark the BrowserStack session status (special executor command).
    try {
      await page.evaluate(
        () => {},
        `browserstack_executor: ${JSON.stringify({
          action: 'setSessionStatus',
          arguments: { status, reason },
        })}`,
      )
    } catch {}
    await browser.close().catch(() => {})
  }
  process.exit(crashed ? 1 : 0)
}

run().catch((e) => { console.error(e); process.exit(1) })
