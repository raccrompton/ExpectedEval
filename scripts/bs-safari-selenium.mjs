/**
 * Real-Safari test via BrowserStack + Selenium WebDriver.
 *
 * Unlike playwright-webkit (Playwright's own WebKit build, weak SAB/WASM-
 * threads support), BrowserStack Selenium drives ACTUAL Safari.app on real
 * macOS — the genuine engine. This is the real test for:
 *   #1 — does Stockfish/Maia initialize on Safari?
 *   #2 — does "Analyze Game" OOM on Safari?
 *
 * Run: BROWSERSTACK_USERNAME=... BROWSERSTACK_ACCESS_KEY=... \
 *      node scripts/bs-safari-selenium.mjs
 *
 * Env:
 *   TARGET_URL  default https://expected-eval.vercel.app
 *   BS_DEVICE   'macos' (default) | 'ios'
 */
import { Builder } from 'selenium-webdriver'
import { readFileSync } from 'node:fs'

const USER = process.env.BROWSERSTACK_USERNAME
const KEY = process.env.BROWSERSTACK_ACCESS_KEY
const TARGET = process.env.TARGET_URL || 'https://expected-eval.vercel.app'
const DEVICE = process.env.BS_DEVICE || 'macos'

if (!USER || !KEY) {
  console.error('Missing BROWSERSTACK_USERNAME / BROWSERSTACK_ACCESS_KEY')
  process.exit(1)
}

// Real game to analyze. Defaults to scripts/test-game.pgn (a 98-ply game the
// user reproduces the OOM on). Override with PGN_FILE.
const PGN_FILE = process.env.PGN_FILE || 'scripts/test-game.pgn'
const LONG_PGN = readFileSync(PGN_FILE, 'utf8').trim()

const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const bstackOptions = {
  userName: USER,
  accessKey: KEY,
  buildName: 'expectedEval-real-safari',
  sessionName: `WinFinder real Safari (${DEVICE})`,
  seleniumVersion: '4.0.0',
  debug: 'true',
  consoleLogs: 'verbose',
}

const DEVICE_CAPS = {
  ios: {
    browserName: 'safari',
    'bstack:options': { ...bstackOptions, deviceName: 'iPhone 15', osVersion: '17', realMobile: 'true' },
  },
  ipad: {
    browserName: 'safari',
    'bstack:options': {
      ...bstackOptions,
      deviceName: 'iPad Pro 12.9 2022',
      osVersion: '16',
      realMobile: 'true',
    },
  },
  macos: {
    browserName: 'Safari',
    'bstack:options': { ...bstackOptions, os: 'OS X', osVersion: 'Sequoia', browserVersion: 'latest' },
  },
}
const caps = DEVICE_CAPS[DEVICE] || DEVICE_CAPS.macos

// Injected right after navigation: capture console.error + uncaught errors
// so we can report WHY engine init fails (the app only logs to console).
const ERROR_HOOK = `
  window.__errs = window.__errs || [];
  if (!window.__errHook) {
    window.__errHook = true;
    var oe = console.error;
    console.error = function () {
      try { window.__errs.push(Array.prototype.map.call(arguments, String).join(' ')); } catch (e) {}
      return oe.apply(console, arguments);
    };
    window.__mems = window.__mems || [];
    var ol = console.log;
    console.log = function () {
      try {
        var s = Array.prototype.map.call(arguments, String).join(' ');
        if (s.indexOf('[mem:') === 0) window.__mems.push(s);
      } catch (e) {}
      return ol.apply(console, arguments);
    };
    window.addEventListener('error', function (e) {
      window.__errs.push('window.onerror: ' + (e.message || e));
    });
    window.addEventListener('unhandledrejection', function (e) {
      window.__errs.push('unhandledrejection: ' + ((e.reason && e.reason.message) || e.reason));
    });
  }
  return window.__errs.length;`

// Browser-side helpers, passed as strings to executeScript.
const READ_STATUS = `
  return {
    sf: (document.querySelector('[data-testid=sf-status]') || {}).textContent || '',
    maia: (document.querySelector('[data-testid=maia-status]') || {}).textContent || '',
    sfError: !!document.querySelector('[data-testid=sf-status] .error, [data-testid=sf-status]'),
  };`

const READ_WF = `
  var prog = document.querySelector('[data-testid=wf-progress]');
  var results = document.querySelector('[data-testid=wf-results]');
  return {
    progress: prog ? prog.textContent.trim() : null,
    done: !!results,
    heapMB: (performance.memory ? Math.round(performance.memory.usedJSHeapSize/1048576) : null),
  };`

let result = 'unknown'
let reason = ''

const run = async () => {
  log(`Connecting to BrowserStack — REAL Safari (${DEVICE})...`)
  const driver = new Builder()
    .usingServer('https://hub-cloud.browserstack.com/wd/hub')
    .withCapabilities(caps)
    .build()

  try {
    await driver.manage().setTimeouts({ pageLoad: 60000, script: 30000 })
    log(`Navigating to ${TARGET}`)
    await driver.get(TARGET)
    await driver.executeScript(ERROR_HOOK)
    log('Error hook installed.')

    // --- Phase 1: engine init ---
    log('Waiting for engines to initialize (up to 4 min)...')
    const deadline = Date.now() + 240000
    let enginesReady = false
    while (Date.now() < deadline) {
      await driver.executeScript(ERROR_HOOK) // idempotent re-install
      const s = await driver.executeScript(READ_STATUS)
      if (/ready/i.test(s.sf) && /ready/i.test(s.maia)) { enginesReady = true; break }
      if (/error/i.test(s.sf) || /error/i.test(s.maia)) {
        const errs = await driver.executeScript(`return window.__errs || [];`)
        result = 'failed'
        reason = `engine init ERROR — sf="${s.sf.trim()}" maia="${s.maia.trim()}"`
        log('!!! ' + reason)
        if (errs.length) errs.forEach((e) => log('   console: ' + String(e).slice(0, 350)))
        else log('   (no console errors captured — hook may have missed early failure)')
        break
      }
      log(`  sf="${s.sf.trim()}"  maia="${s.maia.trim()}"`)
      await sleep(5000)
    }

    if (!enginesReady) {
      if (result === 'unknown') { result = 'failed'; reason = 'engines never became ready (timeout)' }
      log('=== #1 RESULT: engines did NOT initialize on real Safari ===')
      return
    }
    log('=== #1 RESULT: engines INITIALIZED on real Safari ✓ ===')

    // --- Phase 2: Win Finder ---
    log('Loading PGN (via React-compatible native setter)...')
    await driver.executeScript(
      `var i=document.querySelector('[data-testid=pgn-input]');` +
        `var proto=i.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype;` +
        `Object.getOwnPropertyDescriptor(proto,'value').set.call(i, arguments[0]);` +
        `i.dispatchEvent(new Event('input',{bubbles:true}));`,
      LONG_PGN,
    )
    await driver.executeScript(`document.querySelector('[data-testid=load-pgn-button]').click();`)

    // Wait for the position to evaluate (sf-cp appears) before analyzing.
    let pgnLoaded = false
    for (let t = 0; t < 60000; t += 4000) {
      await sleep(4000)
      const ok = await driver.executeScript(
        `return !!document.querySelector('[data-testid=sf-cp]');`,
      )
      if (ok) { pgnLoaded = true; break }
    }
    log(`PGN loaded / position evaluated: ${pgnLoaded}`)

    log('Switching to Win Finder tab...')
    await driver.executeScript(`document.querySelector('[data-testid=tab-winfinder]').click();`)
    await sleep(1000)
    const btn = await driver.executeScript(
      `var b=document.querySelector('[data-testid=wf-analyze-button]');` +
        `return b?{disabled:b.disabled,text:b.textContent.trim()}:null;`,
    )
    log(`Analyze button: ${JSON.stringify(btn)}`)
    log('Clicking Analyze Game...')
    await driver.executeScript(`document.querySelector('[data-testid=wf-analyze-button]').click();`)

    log('Monitoring Analyze Game for OOM...')
    const wfDeadline = Date.now() + 300000
    let crashed = false
    while (Date.now() < wfDeadline) {
      await sleep(4000)
      try {
        const w = await driver.executeScript(READ_WF)
        log(`  progress=${w.progress ?? '-'}  done=${w.done}  heapMB=${w.heapMB ?? 'n/a'}`)
        if (w.done) { log('=== #2 RESULT: Analyze Game COMPLETED — no crash ✓ ==='); break }
      } catch (err) {
        crashed = true
        log('!!! page is dead during Analyze Game (OOM): ' + String(err.message).slice(0, 200))
        break
      }
    }
    result = crashed ? 'failed' : 'passed'
    reason = crashed
      ? '#2 Win Finder OOM reproduced on real Safari'
      : 'engines init + Win Finder completed on real Safari'
  } catch (err) {
    result = 'failed'
    reason = String(err.message).slice(0, 300)
    log('ERROR: ' + reason)
  } finally {
    try {
      const mems = await driver.executeScript(`return window.__mems || [];`)
      mems.forEach((m) => log('   ' + m))
    } catch {}
    log(`RESULT: ${result} — ${reason}`)
    try {
      await driver.executeScript(
        `browserstack_executor: ${JSON.stringify({
          action: 'setSessionStatus',
          arguments: { status: result === 'passed' ? 'passed' : 'failed', reason },
        })}`,
      )
    } catch {}
    await driver.quit().catch(() => {})
  }
  process.exit(result === 'passed' ? 0 : 1)
}

run().catch((e) => { console.error(e); process.exit(1) })
