import { chromium } from 'playwright'
import { runJourney1 } from './journey-1'
import { runJourney2 } from './journey-2'
import { runJourney3 } from './journey-3'
import { runJourney4 } from './journey-4'
import { runJourney5 } from './journey-5'
import { runJourney6 } from './journey-6'

const BASE_URL = process.env.MF_BASE_URL || 'http://127.0.0.1:5179'

async function run() {
  const browser = await chromium.launch({ headless: true })

  const allResults: { journey: string; results: { name: string; pass: boolean; detail?: string }[] }[] = []

  const journeys = [
    { name: 'Journey 1', fn: runJourney1 },
    { name: 'Journey 2', fn: runJourney2 },
    { name: 'Journey 3', fn: runJourney3 },
    { name: 'Journey 4', fn: runJourney4 },
    { name: 'Journey 5', fn: runJourney5 },
    { name: 'Journey 6', fn: runJourney6 },
  ]

  for (const j of journeys) {
    console.log(`\n=== Running ${j.name} ===`)
    // Each journey gets a fresh BrowserContext to avoid state leakage
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } })
    const page = await context.newPage()
    const results = await j.fn(page)
    allResults.push({ journey: j.name, results })
    const passCount = results.filter((r) => r.pass).length
    console.log(`${j.name}: ${passCount}/${results.length} passed`)
    for (const r of results) {
      if (!r.pass) {
        console.log(`  FAIL: ${r.name}`)
        if (r.detail) console.log(`        ${r.detail}`)
      }
    }
    await context.close()
  }

  await browser.close()

  // 汇总输出
  console.log('\n========== FINAL SUMMARY ==========')
  let totalPassed = 0
  let totalFailed = 0
  for (const j of allResults) {
    const passed = j.results.filter((r) => r.pass).length
    const failed = j.results.filter((r) => !r.pass).length
    totalPassed += passed
    totalFailed += failed
    console.log(`${j.journey}: ${passed} passed, ${failed} failed`)
  }
  console.log(`\nTOTAL: ${totalPassed} passed, ${totalFailed} failed out of ${totalPassed + totalFailed}`)

  if (totalFailed > 0) {
    process.exit(1)
  }
}

run().catch((e) => {
  console.error('Fatal error:', e)
  process.exit(1)
})
