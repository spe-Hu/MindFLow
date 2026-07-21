/**
 * Journey 15 – NodeDetail 节点详情 + 全局看板
 *
 * 覆盖:
 *   - NodeDetailSidebar: 打开面板、转为任务、修改优先级/状态
 *   - GlobalBoardPage: 项目筛选、任务卡片
 */

import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { enterLocalMode, createProject } from './journey-1'
import {
  waitForCanvasReady,
  getNodeTexts,
  addMindMapChildViaAPI,
  focusNodeByText,
} from './helpers'

const TEST_PROJECT = 'J15-详情全局看板'

export async function runJourney15(page: Page) {
  const results: { name: string; pass: boolean; detail?: string }[] = []

  function push(label: string, ok: boolean, detail?: string) {
    results.push({ name: label, pass: ok, detail: detail || undefined })
    if (!ok) console.error(`❌ ${label}${detail ? ': ' + detail : ''}`)
  }

  // ========== PHASE 0: 进入本地模式，新建项目，添加节点 ==========
  await enterLocalMode(page)
  await page.waitForTimeout(500)

  let projectId = ''
  try {
    projectId = await createProject(page, TEST_PROJECT)
  } catch (e: any) {
    push('P0: create project', false, e.message)
    return results
  }

  await waitForCanvasReady(page)
  await page.waitForTimeout(400)

  // 通过 API 添加一个子节点（避免键盘输入不稳定）
  let childUid = ''
  try {
    await addMindMapChildViaAPI(page, 'J15-测试节点')
    await page.waitForTimeout(600)
    const texts = await getNodeTexts(page)
    push('P0: API 添加子节点成功', texts.includes('J15-测试节点'))
  } catch (e: any) {
    push('P0: API 添加子节点成功', false, e.message)
    return results
  }

  // ========== PHASE 1: NodeDetail 节点详情面板 ==========
  try {
    // 通过 renderer node.active() 选中节点（headless 下唯一可靠方式）
    await focusNodeByText(page, 'J15-测试节点')

    // ND-1: 详情面板可见（选中节点后显示「转为任务」按钮，项目概览没有）
    const toggleBtn = page.locator('button:has-text("转为任务")').first()
    const hasToggle = await toggleBtn.count() > 0 && await toggleBtn.isVisible().catch(() => false)
    push('ND-1 点击节点后详情面板可见', hasToggle)

    if (!hasToggle) {
      push('ND-2 「转为任务」按钮可见', false, '面板未打开')
      push('ND-3 点击转为任务成功', false, '面板未打开')
      push('ND-4 优先级可修改为「高」', false, '面板未打开')
      push('ND-5 状态可修改为「进行中」', false, '面板未打开')
    } else {
      push('ND-2 「转为任务」按钮可见', true)

      // ND-3: 点击转为任务
      await toggleBtn.click()
      await page.waitForTimeout(500)
      const panelText = await page.evaluate(() => {
        const sidebar = document.querySelector('[class*="border-l"][class*="shrink-0"]') as HTMLElement | null
        return sidebar?.innerText || ''
      })
      push('ND-3 点击转为任务成功', /优先级|状态/.test(panelText), panelText.slice(0, 80))

      // ND-4: 修改优先级为「高」
      try {
        const priorityBtn = page.locator('button').filter({ hasText: /^高$/ }).first()
        if (await priorityBtn.count() > 0) {
          await priorityBtn.click()
          await page.waitForTimeout(300)
          push('ND-4 优先级可修改为「高」', true)
        } else {
          push('ND-4 优先级可修改为「高」', panelText.includes('高'), '未找到优先级按钮')
        }
      } catch (e: any) {
        push('ND-4 优先级可修改为「高」', false, e.message)
      }

      // ND-5: 修改状态为「进行中」
      try {
        const statusBtn = page.locator('button').filter({ hasText: /^进行中$/ }).first()
        if (await statusBtn.count() > 0) {
          await statusBtn.click()
          await page.waitForTimeout(300)
          push('ND-5 状态可修改为「进行中」', true)
        } else {
          push('ND-5 状态可修改为「进行中」', panelText.includes('进行中'))
        }
      } catch (e: any) {
        push('ND-5 状态可修改为「进行中」', false, e.message)
      }
    }

    // 关闭面板（拖拽手柄 z-60 会遮挡 z-40 的关闭按钮，用 evaluate 点击）
    await page.evaluate(() => {
      const btn = document.querySelector('button[title="收起详情面板"]') as HTMLElement | null
      if (btn) btn.click()
    })
    await page.waitForTimeout(200)
  } catch (e: any) {
    push('ND-1 点击节点后详情面板可见', false, e.message)
  }

  // ========== PHASE 2: 全局看板 ==========
  try {
    await page.goto('/global-tasks/board')
    await page.waitForTimeout(800)

    // GB-1: 页面显示「全局看板」标题
    const pageText = await page.locator('body').innerText()
    push('GB-1 全局看板页面可见', pageText.includes('全局看板'))

    // GB-2: 项目筛选 chip 可见（全部 + 各项目）
    const allChip = page.locator('button:has-text("全部")').first()
    const hasAllChip = await allChip.count() > 0 && await allChip.isVisible().catch(() => false)
    push('GB-2 项目筛选「全部」chip 可见', hasAllChip)

    // GB-3: 任务卡片可见（J15-测试节点 转为任务后应该出现）
    const taskCard = page.locator('text=J15-测试节点').first()
    const cardVisible = await taskCard.count() > 0 && await taskCard.isVisible().catch(() => false)
    push('GB-3 任务卡片「J15-测试节点」可见', cardVisible)

    // GB-4: 点击项目筛选 chip 后筛选生效
    try {
      // 等 project store 加载（project chip 出现在 filter bar 的标志）
      let found = false
      for (let i = 0; i < 15; i++) {
        const hasChip = await page.evaluate((name) => {
          for (const btn of document.querySelectorAll('div.h-9 button')) {
            if (btn.textContent?.trim() === name) return true
          }
          return false
        }, TEST_PROJECT)
        if (hasChip) { found = true; break }
        await page.waitForTimeout(200)
      }
      if (!found) {
        push('GB-4 点击项目筛选 chip 后激活态正确', false, 'filter bar 未加载 project chip')
        return results
      }

      await page.evaluate((name) => {
        for (const btn of document.querySelectorAll('div.h-9 button')) {
          if (btn.textContent?.trim() === name) {
            (btn as HTMLElement).click()
            break
          }
        }
      }, TEST_PROJECT)
      await page.waitForTimeout(600)

      const chipClass = await page.evaluate((name) => {
        for (const btn of document.querySelectorAll('div.h-9 button')) {
          if (btn.textContent?.trim() === name) return (btn as HTMLElement).className
        }
        return ''
      }, TEST_PROJECT)
      const isActive = chipClass.includes('bg-primary') || chipClass.includes('text-white')
      push('GB-4 点击项目筛选 chip 后激活态正确', isActive, `class: ${chipClass.slice(0, 80)}`)
    } catch (e: any) {
      push('GB-4 点击项目筛选 chip 后激活态正确', false, e.message)
    }
  } catch (e: any) {
    push('GB-1 全局看板页面可见', false, e.message)
    push('GB-2 项目筛选「全部」chip 可见', false, e.message)
    push('GB-3 任务卡片「J15-测试节点」可见', false, e.message)
    push('GB-4 点击项目筛选 chip 后激活态正确', false, e.message)
  }

  return results
}
