#!/usr/bin/env node
/**
 * E2E 测试 runner — 调用 journey-X 的 runJourney* 函数并打印结果
 *
 * 用法:
 *   node scripts/run-e2e.mjs journey-4
 *   node scripts/run-e2e.mjs all
 */

import { chromium } from 'playwright'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// 切换 cwd 到 tests/e2e 以便 ./journey-X 相对导入
process.chdir(resolve(ROOT, 'tests/e2e'))

const arg = process.argv[2] || 'all'

const BASE_URL = process.env.MF_BASE_URL || 'http://127.0.0.1:5179'

async function run() {
  // 把 journey-X 路径转为绝对路径,然后用 file:// URL import
  const journeys = []
  if (arg === 'all' || arg === 'journey-1') journeys.push(['journey-1', './journey-1.spec.ts'])
  if (arg === 'all' || arg === 'journey-2') journeys.push(['journey-2', './journey-2.spec.ts'])
  if (arg === 'all' || arg === 'journey-3') journeys.push(['journey-3', './journey-3.spec.ts'])
  if (arg === 'all' || arg === 'journey-4') journeys.push(['journey-4', './journey-4.spec.ts'])

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } })
  const page = await ctx.newPage()

  // console.error 透传,避免污染 stdout
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('[browser console.error]', msg.text())
    }
  })

  const allResults = []

  for (const [name, path] of journeys) {
    console.log(`\n=== ${name} ===`)
    // 动态 import .ts 文件需要 loader;Playwright 自带 ts-node-like 支持
    const mod = await import(path)
    const fn = mod[`run${name.replace(/-(\w)/g, (_, c) => c.toUpperCase())}`] ||
               mod[`runJourney${name.split('-')[1]}`] ||
               mod[`run${name.replace('journey-', 'Journey')}`]
    if (!fn) {
      console.log(`SKIP: no run function found in ${path}`)
      continue
    }
    // 清理 IndexedDB 防止跨 journey 数据干扰
    await page.goto(BASE_URL + '/auth').catch(() => {})
    await page.waitForTimeout(300)
    try {
      await page.evaluate(async () => {
        await new Promise((r) => {
          const req = indexedDB.deleteDatabase('mindflow-db')
          req.onsuccess = () => r(undefined)
          req.onerror = () => r(undefined)
          req.onblocked = () => r(undefined)
        })
        localStorage.clear()
      })
    } catch {}
    await page.waitForTimeout(300)

    const results = await fn(page)
    let pass = 0
    let fail = 0
    for (const r of results) {
      const icon = r.pass ? '\u2705' : '\u274c'
      console.log(`  ${icon} ${r.name}${r.detail ? ` — ${r.detail.slice(0, 120)}` : ''}`)
      if (r.pass) pass++; else fail++
    }
    console.log(`  -- ${name}: ${pass}/${results.length} 通过${fail > 0 ? `, ${fail} 失败` : ''}`)
    allResults.push({ journey: name, pass, fail, total: results.length })
  }

  await browser.close()

  console.log('\n=== 总览 ===')
  let totalPass = 0
  let totalFail = 0
  let totalAll = 0
  for (const r of allResults) {
    console.log(`  ${r.journey}: ${r.pass}/${r.total} 通过`)
    totalPass += r.pass
    totalFail += r.fail
    totalAll += r.total
  }
  console.log(`  -- 总计: ${totalPass}/${totalAll} 通过, ${totalFail} 失败`)
  if (totalFail > 0) process.exit(1)
}

run().catch((e) => { console.error(e); process.exit(1) })