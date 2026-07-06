import { test, expect, Page } from '@playwright/test'
import { runJourney1 } from './journey-1'
import { runJourney2 } from './journey-2'
import { runJourney3 } from './journey-3'
import { runJourney4 } from './journey-4'
import { runJourney5 } from './journey-5'
import { runJourney6 } from './journey-6'

import { runJourney7 } from './journey-7'
import { runJourney8 } from './journey-8'

async function clearIndexedDB(page: Page) {
  await page.goto('/auth')
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('mindflow-db')
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
      req.onblocked = () => resolve()
    })
  })
  await page.waitForTimeout(300)
}

async function assertResults(results: { name: string; pass: boolean; detail?: string }[]) {
  for (const r of results) {
    if (!r.pass) {
      // eslint-disable-next-line no-console
      console.error(`FAIL: ${r.name} – ${r.detail || ''}`)
    }
    expect(r.pass, `${r.name}: ${r.detail || ''}`).toBe(true)
  }
}

test.describe('MindFlow E2E – All Journeys', () => {
  test('Journey 1 – 单项目完整链路 (AC-1~AC-5)', async ({ page }) => {
    await clearIndexedDB(page)
    const results = await runJourney1(page)
    await assertResults(results)
  })

  test('Journey 2 – 多项目 + 全局任务 (AC-6~AC-13)', async ({ page }) => {
    await clearIndexedDB(page)
    const results = await runJourney2(page)
    await assertResults(results)
  })

  test('Journey 3 – 全局搜索 (S5)', async ({ page }) => {
    await clearIndexedDB(page)
    const results = await runJourney3(page)
    await assertResults(results)
  })

  test('Journey 4 – 日历视图 (S4)', async ({ page }) => {
    await clearIndexedDB(page)
    const results = await runJourney4(page)
    await assertResults(results)
  })

  test('Journey 5 – 项目重命名/删除/列表/筛选/空状态 (M11/M13)', async ({ page }) => {
    await clearIndexedDB(page)
    const results = await runJourney5(page)
    await assertResults(results)
  })

  test('Journey 6 – 节点删除/布局切换/任务反操作/主题/归档 (M1/M2/M3/M8/C6)', async ({ page }) => {
    await clearIndexedDB(page)
    const results = await runJourney6(page)
    await assertResults(results)
  })

  test('Journey 7 – 项目模板系统 (产品开发/周计划/空白模板)', async ({ page }) => {
    await clearIndexedDB(page)
    const results = await runJourney7(page)
    await assertResults(results)
  })
})
