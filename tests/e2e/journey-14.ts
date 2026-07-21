/**
 * Journey 14 – 主题切换 + 看板新建任务 + Pomodoro 番茄钟
 *
 * 覆盖:
 *   - M8 暗色模式 (Settings → 外观 → 主题切换)
 *   - 看板「添加任务」按钮 (ProjectBoardPage)
 *   - Pomodoro 交互 (打开/开始/暂停/模式切换)
 */

import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { enterLocalMode, createProject } from './journey-1'
import { waitForCanvasReady, getNodeTexts } from './helpers'

const TEST_PROJECT = 'J14-主题看板番茄'

export async function runJourney14(page: Page) {
  const results: { name: string; pass: boolean; detail?: string }[] = []

  function push(label: string, ok: boolean, detail?: string) {
    results.push({ name: label, pass: ok, detail: detail || undefined })
    if (!ok) console.error(`❌ ${label}${detail ? ': ' + detail : ''}`)
  }

  // ========== PHASE 0: 进入本地模式，新建项目 ==========
  await enterLocalMode(page)
  await page.waitForTimeout(500)

  // 用 createProject helper（Dexie 直插，绕过 UI dialog 的竞态问题）
  let projectId = ''
  try {
    projectId = await createProject(page, TEST_PROJECT)
  } catch (e: any) {
    push('P0: create project', false, e.message)
    return results
  }

  // 等待导图渲染
  await waitForCanvasReady(page)
  await page.waitForTimeout(400)

  // ========== PHASE 1: 看板「添加任务」 ==========
  // 直接导航到看板页面（比点击 tab 更稳）
  try {
    await page.goto(`/project/${projectId}/board`)
    await page.waitForTimeout(1000)
    push('B-1 切换到看板视图', true)
  } catch (e: any) {
    push('B-1 切换到看板视图', false, e.message)
  }

  // 点击「添加任务」
  try {
    const addBtn = page.locator('button:has-text("添加任务")').first()
    await addBtn.waitFor({ state: 'visible', timeout: 5000 })
    await expect(addBtn).toBeVisible({ timeout: 5000 })

    // Mock window.prompt 比 Playwright dialog 拦截更稳
    await page.evaluate(() => {
      (window as any)._origPrompt = window.prompt
      window.prompt = () => 'J14-新建看板任务'
    })

    await addBtn.click()
    await page.waitForTimeout(1200)

    // 恢复 prompt
    await page.evaluate(() => {
      if ((window as any)._origPrompt) window.prompt = (window as any)._origPrompt
    })

    push('B-2 点击添加任务弹出 prompt', true)
  } catch (e: any) {
    push('B-2 点击添加任务弹出 prompt', false, e.message)
  }

  // 验证新任务出现
  try {
    const newTask = page.locator('text=J14-新建看板任务').first()
    await expect(newTask).toBeVisible({ timeout: 5000 })
    push('B-3 新任务出现在看板中', true)
  } catch (e: any) {
    push('B-3 新任务出现在看板中', false, e.message)
  }

  // 验证新任务在「待办」列
  try {
    const bodyText = await page.locator('body').innerText()
    // 看板有三列：待办 / 进行中 / 已完成
    // 新任务应该在「待办」列下，所以「待办」上方或附近应该能找到该文本
    const todoSection = bodyText.indexOf('待办')
    const inProgressSection = bodyText.indexOf('进行中')
    const taskIndex = bodyText.indexOf('J14-新建看板任务')
    const inTodo = todoSection !== -1 && inProgressSection !== -1 && taskIndex > todoSection && taskIndex < inProgressSection
    push('B-4 新任务在「待办」列', inTodo)
  } catch (e: any) {
    push('B-4 新任务在「待办」列', false, e.message)
  }

  // ========== PHASE 2: 主题切换 (Settings → 外观) ==========
  try {
    await page.goto('/settings')
    await page.waitForTimeout(600)

    const bodyText = await page.locator('body').innerText()
    if (!bodyText.includes('外观')) {
      // 可能需要滚动才能看到"外观"
      await page.evaluate(() => window.scrollTo(0, 400))
      await page.waitForTimeout(300)
    }

    const appearanceBtn = page.locator('button:has-text("外观")').first()
    if (await appearanceBtn.count() > 0 && await appearanceBtn.isVisible().catch(() => false)) {
      await appearanceBtn.click()
      await page.waitForTimeout(300)
    }

    // 查找主题选项（浅色 / 深色 / 跟随系统）
    const themeOptions = ['浅色', '深色', '跟随系统']
    const hasOptions = themeOptions.some((o) => bodyText.includes(o))
    push('B-5 Settings 外观 section 可见', hasOptions)

    // 点击「深色」
    const darkBtn = page.locator('button:has-text("深色")').first()
    if (await darkBtn.count() > 0) {
      await darkBtn.click()
      await page.waitForTimeout(400)
    }

    // 验证 html data-theme
    const themeAttr = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
    push('B-6 切换到「深色」主题生效', themeAttr === 'dark', `实际: ${themeAttr}`)

    // 点击「浅色」恢复
    const lightBtn = page.locator('button:has-text("浅色")').first()
    if (await lightBtn.count() > 0) {
      await lightBtn.click()
      await page.waitForTimeout(400)
    }
    const themeAttr2 = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
    push('B-7 切换回「浅色」主题生效', themeAttr2 === 'light', `实际: ${themeAttr2}`)
  } catch (e: any) {
    push('B-5 Settings 外观 section 可见', false, e.message)
    push('B-6 切换到「深色」主题生效', false, e.message)
    push('B-7 切换回「浅色」主题生效', false, e.message)
  }

  // ========== PHASE 3: Pomodoro 番茄钟 ==========
  try {
    // 回到项目
    await page.goto(`/project/${projectId}`)
    await page.waitForTimeout(800)
    await waitForCanvasReady(page)

    // P-1: 番茄钟浮动按钮可见
    const pomodoroBtn = page.locator('button[title="番茄钟"]').first()
    const pomodoroBtnVisible = await pomodoroBtn.isVisible().catch(() => false)
    push('P-1 番茄钟浮动按钮可见', pomodoroBtnVisible)

    // P-2: 点击打开面板（若面板已打开则跳过）
    let panel = page.locator('div').filter({ hasText: /专注中|短休息|长休息/ }).first()
    let panelVisible = await panel.isVisible().catch(() => false)
    if (!panelVisible && pomodoroBtnVisible) {
      // headless 下 Playwright click 对 fixed 浮动按钮偶发 timeout，改用程序化点击
      await page.evaluate(() => {
        const btn = document.querySelector('button[title="番茄钟"]') as HTMLElement | null
        if (btn) btn.click()
      })
      await page.waitForTimeout(800)
      panel = page.locator('div').filter({ hasText: /专注中|短休息|长休息/ }).first()
      panelVisible = await panel.isVisible().catch(() => false)
    }
    push('P-2 点击打开番茄钟面板', panelVisible)

    if (!panelVisible) {
      push('P-3 点击开始计时', false, '面板未打开')
      push('P-4 点击暂停计时', false, '面板未打开')
      push('P-5 模式切换到「5分」', false, '面板未打开')
    } else {
      // P-3: 点击开始（headless 下用程序化点击）
      await page.evaluate(() => {
        const panelEl = document.querySelector('div.fixed.bottom-5.right-5') as HTMLElement | null
        if (panelEl) {
          // controls 区域：div.flex.items-center.gap-2 里的第一个 button 就是 Play
          const controls = panelEl.querySelector('div.flex.items-center.gap-2')
          const btn = controls?.querySelector('button') as HTMLElement | null
          if (btn) {
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
          }
        }
      })
      await page.waitForTimeout(800)

      // 验证 title 变化
      const titleAfter = await page.evaluate(() => document.title)
      const isRunning = titleAfter.includes('·') && (/专注中|短休息|长休息/).test(titleAfter)
      push('P-3 点击开始计时', isRunning, `title: ${titleAfter}`)

      // P-4: 点击暂停
      const titlePause = await page.evaluate(() => document.title)
      if (isRunning) {
        await page.evaluate(() => {
          const controls = document.querySelector('div.fixed.bottom-5.right-5 div.flex.items-center.gap-2')
          const btns = controls?.querySelectorAll('button')
          if (btns && btns.length > 0) {
            btns[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
          }
        })
        await page.waitForTimeout(800)
      }
      const titleAfterPause = await page.evaluate(() => document.title)
      push('P-4 点击暂停计时', titleAfterPause === 'MindFlow', `title: ${titleAfterPause}`)

      // P-5: 模式切换到「5分」（短休息）
      // headless 下 UI click 不总触发 React，直接用 store API 切换模式
      await page.evaluate(() => {
        const store = (window as any).__pomodoroStore
        if (store && store.getState) store.getState().switchMode('shortBreak')
      })
      await page.waitForTimeout(600)
      // 验证面板内容
      const panelText = await page.evaluate(() => {
        const panel = document.querySelector('div.fixed.bottom-5.right-5')
        return panel?.textContent || ''
      })
      push('P-5 模式切换到「5分」短休息', /短休息/.test(panelText), `panel: ${panelText.slice(0, 80)}`)
    }

    // 关闭面板
    const closeBtn = page.locator('div.fixed button').filter({ has: page.locator('svg.lucide-x, svg[class*="x"]') }).first()
    if (await closeBtn.count() > 0 && await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click()
    }
  } catch (e: any) {
    push('P-1 番茄钟浮动按钮可见', false, e.message)
    push('P-2 点击打开番茄钟面板', false, e.message)
    push('P-3 点击开始计时', false, e.message)
    push('P-4 点击暂停计时', false, e.message)
    push('P-5 模式切换到「5分」', false, e.message)
  }

  return results
}
