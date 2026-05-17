/**
 * Probe how maia-platform-frontend (maiachess.com) behaves on real iOS
 * Safari — does it run Stockfish + Maia, crash, or degrade?
 *
 * Run: BROWSERSTACK_USERNAME=... BROWSERSTACK_ACCESS_KEY=... \
 *      node scripts/bs-probe-maiachess.mjs
 */
import { Builder } from 'selenium-webdriver'

const USER = process.env.BROWSERSTACK_USERNAME
const KEY = process.env.BROWSERSTACK_ACCESS_KEY
const TARGET = process.env.TARGET_URL || 'https://www.maiachess.com/analysis'

const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const caps = {
  browserName: 'safari',
  'bstack:options': {
    userName: USER,
    accessKey: KEY,
    buildName: 'maiachess-ios-probe',
    sessionName: 'maiachess.com on real iOS',
    deviceName: 'iPhone 15',
    osVersion: '17',
    realMobile: 'true',
    consoleLogs: 'verbose',
  },
}

const HOOK = `
  window.__errs = window.__errs || [];
  if (!window.__h) {
    window.__h = true;
    var oe = console.error;
    console.error = function () {
      try { window.__errs.push(Array.prototype.map.call(arguments, String).join(' ')); } catch (e) {}
      return oe.apply(console, arguments);
    };
    window.addEventListener('error', function (e) { window.__errs.push('onerror: ' + (e.message || e)); });
    window.addEventListener('unhandledrejection', function (e) {
      window.__errs.push('rejection: ' + ((e.reason && e.reason.message) || e.reason));
    });
  }
  return true;`

const run = async () => {
  const driver = new Builder()
    .usingServer('https://hub-cloud.browserstack.com/wd/hub')
    .withCapabilities(caps)
    .build()
  try {
    await driver.manage().setTimeouts({ pageLoad: 60000, script: 30000 })
    log(`Navigating to ${TARGET}`)
    await driver.get(TARGET)
    await driver.executeScript(HOOK)
    log('Hook installed. Observing for 70s...')

    for (let i = 0; i < 7; i++) {
      await sleep(10000)
      try {
        const snap = await driver.executeScript(`
          return {
            coi: typeof crossOriginIsolated !== 'undefined' ? crossOriginIsolated : null,
            title: document.title,
            bodyLen: document.body ? document.body.innerText.length : 0,
            errCount: (window.__errs || []).length,
          };`)
        log(`  t+${(i + 1) * 10}s  coi=${snap.coi}  bodyLen=${snap.bodyLen}  errs=${snap.errCount}`)
      } catch (err) {
        log('  page is dead (crash): ' + String(err.message).slice(0, 150))
        break
      }
    }

    const errs = await driver.executeScript(`return window.__errs || [];`).catch(() => [])
    log(`--- ${errs.length} console error(s) ---`)
    errs.forEach((e) => log('   ' + String(e).slice(0, 300)))
    await driver.executeScript(
      `browserstack_executor: ${JSON.stringify({
        action: 'setSessionStatus',
        arguments: { status: 'passed', reason: 'probe complete' },
      })}`,
    ).catch(() => {})
  } catch (err) {
    log('ERROR: ' + String(err.message).slice(0, 250))
  } finally {
    await driver.quit().catch(() => {})
  }
}

run().catch((e) => { console.error(e); process.exit(1) })
