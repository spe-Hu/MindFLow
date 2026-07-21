import { test, expect, Page } from '@playwright/test'
import { runJourney1 } from './journey-1'
import { runJourney2 } from './journey-2'
import { runJourney3 } from './journey-3'
import { runJourney4 } from './journey-4'
import { runJourney5 } from './journey-5'
import { runJourney6 } from './journey-6'

import { runJourney7 } from './journey-7'
import { runJourney8 } from './journey-8'
import { runJourney9 } from './journey-9'
import { runJourney10 } from './journey-10'
import { runJourney11 } from './journey-11'
import { runJourney12 } from './journey-12'
import { runJourney13 } from './journey-13'
import { runJourney14 } from './journey-14'
import { runJourney15 } from './journey-15'

async function clearIndexedDB(page: Page) {
  // Step 1: 在已有页面（任何页面）先清 localStorage
  // 这样 reload / goto 后 zustand persist 不会恢复 isLocalMode
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.removeItem('mindflow-auth-store')
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith('mindflow-')) localStorage.removeItem(k)
    })
  })
  await page.reload({ waitUntil: 'networkidle' })

  // Step 2: 清 IndexedDB — 使用 Dexie table.clear() 逐表清空，避免 deleteDatabase blocked
  await page.evaluate(async () => {
    const db = (window as any).__mindflowDb
    if (db && db.tables) {
      try {
        await db.transaction('rw', db.tables, async () => {
          for (const table of db.tables) {
            await table.clear()
          }
        })
      } catch (e) {
        // 如果 transaction 失败，逐个尝试 clear
        for (const table of db.tables || []) {
          try { await table.clear() } catch (e2) { /* ignore */ }
        }
      }
    } else {
      // fallback: 轮询等待 __mindflowDb 出现后再 clear
      for (let i = 0; i < 30; i++) {
        const d = (window as any).__mindflowDb
        if (d && d.tables) {
          await d.transaction('rw', d.tables, async () => {
            for (const t of d.tables) { await t.clear() }
          })
          return
        }
        await new Promise((r) => setTimeout(r, 100))
      }
    }
  })

  // Step 3: 回到 /auth（此时 zustand 不会恢复 localMode）
  await page.goto('/auth')
  await page.waitForTimeout(500)
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
    const logs: string[] = []
    page.on('console', (msg) => {
      logs.push(`[browser ${msg.type()}] ${msg.text()}`)
    })
    await clearIndexedDB(page)
    const results = await runJourney7(page)
    if (logs.length > 0) {
      // eslint-disable-next-line no-console
      console.log('\n--- J7 Browser console logs ---\n' + logs.filter(l => l.includes('[MindMapCanvas]') || l.includes('[ProjectMindMapPage]')).join('\n') + '\n---\n')
    }
    await assertResults(results)
  })

  test('Journey 8 – AI 生成 + 节点详情 + 番茄钟 + Dashboard', async ({ page }) => {
    const logs: string[] = []
    page.on('console', (msg) => {
      const text = msg.text()
      // Capture all logs/errors, not just our custom ones
      logs.push(`[browser ${msg.type()}] ${text}`)
    })
    await clearIndexedDB(page)
    const results = await runJourney8(page)
    if (logs.length > 0) {
      // eslint-disable-next-line no-console
      console.log('\n--- Browser console logs ---\n' + logs.join('\n') + '\n---\n')
    }
    await assertResults(results)
  })

  test('Journey 9 – 云端同步 (S3): dialog + 上传/下载 + 离线', async ({ page }) => {
    await clearIndexedDB(page)
    const results = await runJourney9(page)
    await assertResults(results)
  })

  test('Journey 10 – 只读分享链接 (C2) + 节点附件 (C5)', async ({ page }) => {
    await clearIndexedDB(page)
    const results = await runJourney10(page)
    await assertResults(results)
  })

  test('Journey 11 – 导入导出 (S2): Settings JSON + 画布 PNG/SVG/Markdown/PDF', async ({ page }) => {
    await clearIndexedDB(page)
    const results = await runJourney11(page)
    await assertResults(results)
  })

  test('Journey 12 – 甘特图 (C1) + 最近编辑列表 (S6)', async ({ page }) => {
    await clearIndexedDB(page)
    const results = await runJourney12(page)
    await assertResults(results)
  })

  test('Journey 13 – 大纲编辑器 (S1): 文本编辑/Enter/Tab/缩进/同步', async ({ page }) => {
    await clearIndexedDB(page)
    const results = await runJourney13(page)
    await assertResults(results)
  })

  test('Journey 14 – 主题切换 (M8) + 看板新建任务 + Pomodoro 番茄钟', async ({ page }) => {
    await clearIndexedDB(page)
    const results = await runJourney14(page)
    await assertResults(results)
  })

  test('Journey 15 – NodeDetail 节点详情 + 全局看板', async ({ page }) => {
    await clearIndexedDB(page)
    const results = await runJourney15(page)
    await assertResults(results)
  })
})
