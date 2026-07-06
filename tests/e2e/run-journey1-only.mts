import { chromium } from 'playwright'

console.log('Importing journey-1...')
import { runJourney1 } from './journey-1'
console.log('Imported journey-1')

const BASE_URL = 'http://localhost:5173'

async function run() {
  console.log('Launching browser...')
  const browser = await chromium.launch({ headless: true })
  console.log('Browser launched')
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } })
  const page = await context.newPage()

  // clear IndexedDB
  console.log('Clearing IndexedDB...')
  await page.goto(BASE_URL + '/auth')
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('mindflow-db')
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
      req.onblocked = () => resolve()
    })
  })
  await page.waitForTimeout(300)
  console.log('IndexedDB cleared')

  console.log('Running Journey 1...')
  const results = await runJourney1(page)
  console.log('Journey 1 returned')
  const passCount = results.filter((r) => r.pass).length
  console.log(`Journey 1: ${passCount}/${results.length} passed`)
  for (const r of results) {
    if (!r.pass) {
      console.log(`  FAIL: ${r.name}`)
      if (r.detail) console.log(`        ${r.detail}`)
    } else {
      console.log(`  PASS: ${r.name}`)
    }
  }

  await browser.close()
}

run().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
