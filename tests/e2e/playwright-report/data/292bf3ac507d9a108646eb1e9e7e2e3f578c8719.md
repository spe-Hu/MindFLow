# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: all-journeys.spec.ts >> MindFlow E2E – All Journeys >> Journey 6 – 节点删除/布局切换/任务反操作/主题/归档 (M1/M2/M3/M8/C6)
- Location: tests/e2e/all-journeys.spec.ts:72:7

# Error details

```
Error: 准备: 进入离线模式: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('button:has-text("离线使用，数据仅存本地")')


expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test'
  2   | import { runJourney1 } from './journey-1'
  3   | import { runJourney2 } from './journey-2'
  4   | import { runJourney3 } from './journey-3'
  5   | import { runJourney4 } from './journey-4'
  6   | import { runJourney5 } from './journey-5'
  7   | import { runJourney6 } from './journey-6'
  8   | 
  9   | import { runJourney7 } from './journey-7'
  10  | import { runJourney8 } from './journey-8'
  11  | import { runJourney9 } from './journey-9'
  12  | 
  13  | async function clearIndexedDB(page: Page) {
  14  |   await page.goto('/auth')
  15  |   await page.evaluate(async () => {
  16  |     const dexie = (window as any).__mindflowDb
  17  |     if (dexie && dexie.delete) {
  18  |       await dexie.delete()
  19  |     } else {
  20  |       return new Promise<void>((resolve) => {
  21  |         const req = indexedDB.deleteDatabase('mindflow-db')
  22  |         req.onsuccess = () => resolve()
  23  |         req.onerror = () => resolve()
  24  |         req.onblocked = () => resolve()
  25  |       })
  26  |     }
  27  |   })
  28  |   await page.waitForTimeout(500)
  29  | }
  30  | 
  31  | async function assertResults(results: { name: string; pass: boolean; detail?: string }[]) {
  32  |   for (const r of results) {
  33  |     if (!r.pass) {
  34  |       // eslint-disable-next-line no-console
  35  |       console.error(`FAIL: ${r.name} – ${r.detail || ''}`)
  36  |     }
> 37  |     expect(r.pass, `${r.name}: ${r.detail || ''}`).toBe(true)
      |                                                    ^ Error: 准备: 进入离线模式: locator.click: Timeout 15000ms exceeded.
  38  |   }
  39  | }
  40  | 
  41  | test.describe('MindFlow E2E – All Journeys', () => {
  42  |   test('Journey 1 – 单项目完整链路 (AC-1~AC-5)', async ({ page }) => {
  43  |     await clearIndexedDB(page)
  44  |     const results = await runJourney1(page)
  45  |     await assertResults(results)
  46  |   })
  47  | 
  48  |   test('Journey 2 – 多项目 + 全局任务 (AC-6~AC-13)', async ({ page }) => {
  49  |     await clearIndexedDB(page)
  50  |     const results = await runJourney2(page)
  51  |     await assertResults(results)
  52  |   })
  53  | 
  54  |   test('Journey 3 – 全局搜索 (S5)', async ({ page }) => {
  55  |     await clearIndexedDB(page)
  56  |     const results = await runJourney3(page)
  57  |     await assertResults(results)
  58  |   })
  59  | 
  60  |   test('Journey 4 – 日历视图 (S4)', async ({ page }) => {
  61  |     await clearIndexedDB(page)
  62  |     const results = await runJourney4(page)
  63  |     await assertResults(results)
  64  |   })
  65  | 
  66  |   test('Journey 5 – 项目重命名/删除/列表/筛选/空状态 (M11/M13)', async ({ page }) => {
  67  |     await clearIndexedDB(page)
  68  |     const results = await runJourney5(page)
  69  |     await assertResults(results)
  70  |   })
  71  | 
  72  |   test('Journey 6 – 节点删除/布局切换/任务反操作/主题/归档 (M1/M2/M3/M8/C6)', async ({ page }) => {
  73  |     await clearIndexedDB(page)
  74  |     const results = await runJourney6(page)
  75  |     await assertResults(results)
  76  |   })
  77  | 
  78  |   test('Journey 7 – 项目模板系统 (产品开发/周计划/空白模板)', async ({ page }) => {
  79  |     const logs: string[] = []
  80  |     page.on('console', (msg) => {
  81  |       logs.push(`[browser ${msg.type()}] ${msg.text()}`)
  82  |     })
  83  |     await clearIndexedDB(page)
  84  |     const results = await runJourney7(page)
  85  |     if (logs.length > 0) {
  86  |       // eslint-disable-next-line no-console
  87  |       console.log('\n--- J7 Browser console logs ---\n' + logs.filter(l => l.includes('[MindMapCanvas]') || l.includes('[ProjectMindMapPage]')).join('\n') + '\n---\n')
  88  |     }
  89  |     await assertResults(results)
  90  |   })
  91  | 
  92  |   test('Journey 8 – AI 生成 + 节点详情 + 番茄钟 + Dashboard', async ({ page }) => {
  93  |     const logs: string[] = []
  94  |     page.on('console', (msg) => {
  95  |       const text = msg.text()
  96  |       // Capture all logs/errors, not just our custom ones
  97  |       logs.push(`[browser ${msg.type()}] ${text}`)
  98  |     })
  99  |     await clearIndexedDB(page)
  100 |     const results = await runJourney8(page)
  101 |     if (logs.length > 0) {
  102 |       // eslint-disable-next-line no-console
  103 |       console.log('\n--- Browser console logs ---\n' + logs.join('\n') + '\n---\n')
  104 |     }
  105 |     await assertResults(results)
  106 |   })
  107 | 
  108 |   test('Journey 9 – 云端同步 (S3): dialog + 上传/下载 + 离线', async ({ page }) => {
  109 |     await clearIndexedDB(page)
  110 |     const results = await runJourney9(page)
  111 |     await assertResults(results)
  112 |   })
  113 | })
  114 | 
```