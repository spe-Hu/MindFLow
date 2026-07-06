# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/e2e/all-journeys.spec.ts >> MindFlow E2E – All Journeys >> Journey 2 – 多项目 + 全局任务 (AC-6~AC-13)
- Location: tests/e2e/all-journeys.spec.ts:39:7

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/auth", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect, Page } from '@playwright/test'
  2  | import { runJourney1 } from './journey-1'
  3  | import { runJourney2 } from './journey-2'
  4  | import { runJourney3 } from './journey-3'
  5  | import { runJourney4 } from './journey-4'
  6  | import { runJourney5 } from './journey-5'
  7  | import { runJourney6 } from './journey-6'
  8  | 
  9  | async function clearIndexedDB(page: Page) {
> 10 |   await page.goto('/auth')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  11 |   await page.evaluate(() => {
  12 |     return new Promise<void>((resolve) => {
  13 |       const req = indexedDB.deleteDatabase('mindflow-db')
  14 |       req.onsuccess = () => resolve()
  15 |       req.onerror = () => resolve()
  16 |       req.onblocked = () => resolve()
  17 |     })
  18 |   })
  19 |   await page.waitForTimeout(300)
  20 | }
  21 | 
  22 | async function assertResults(results: { name: string; pass: boolean; detail?: string }[]) {
  23 |   for (const r of results) {
  24 |     if (!r.pass) {
  25 |       // eslint-disable-next-line no-console
  26 |       console.error(`FAIL: ${r.name} – ${r.detail || ''}`)
  27 |     }
  28 |     expect(r.pass, `${r.name}: ${r.detail || ''}`).toBe(true)
  29 |   }
  30 | }
  31 | 
  32 | test.describe('MindFlow E2E – All Journeys', () => {
  33 |   test('Journey 1 – 单项目完整链路 (AC-1~AC-5)', async ({ page }) => {
  34 |     await clearIndexedDB(page)
  35 |     const results = await runJourney1(page)
  36 |     await assertResults(results)
  37 |   })
  38 | 
  39 |   test('Journey 2 – 多项目 + 全局任务 (AC-6~AC-13)', async ({ page }) => {
  40 |     await clearIndexedDB(page)
  41 |     const results = await runJourney2(page)
  42 |     await assertResults(results)
  43 |   })
  44 | 
  45 |   test('Journey 3 – 全局搜索 (S5)', async ({ page }) => {
  46 |     await clearIndexedDB(page)
  47 |     const results = await runJourney3(page)
  48 |     await assertResults(results)
  49 |   })
  50 | 
  51 |   test('Journey 4 – 日历视图 (S4)', async ({ page }) => {
  52 |     await clearIndexedDB(page)
  53 |     const results = await runJourney4(page)
  54 |     await assertResults(results)
  55 |   })
  56 | 
  57 |   test('Journey 5 – 项目重命名/删除/列表/筛选/空状态 (M11/M13)', async ({ page }) => {
  58 |     await clearIndexedDB(page)
  59 |     const results = await runJourney5(page)
  60 |     await assertResults(results)
  61 |   })
  62 | 
  63 |   test('Journey 6 – 节点删除/布局切换/任务反操作/主题/归档 (M1/M2/M3/M8/C6)', async ({ page }) => {
  64 |     await clearIndexedDB(page)
  65 |     const results = await runJourney6(page)
  66 |     await assertResults(results)
  67 |   })
  68 | })
  69 | 
```