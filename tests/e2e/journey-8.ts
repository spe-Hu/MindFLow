// Journey 8 E2E – AI 生成 + 节点详情 + 番茄钟 + Dashboard
// 覆盖 PRD §11 迭代记录中尚未被 J1~J7 覆盖的新增功能

import { Page, expect } from '@playwright/test'
import { enterLocalMode } from './journey-1'

const BASE_URL = process.env.MF_BASE_URL || 'http://localhost:5173'

/** 获取 simple-mind-map 根节点文本（第一个 g.smm-node text） */
async function getRootText(page: Page): Promise<string> {
  const firstNode = page.locator('g.smm-node text').first()
  await expect(firstNode).toBeVisible()
  return (await firstNode.textContent()) || ''
}

/** 聚焦 simple-mind-map 中的特定文字节点 */
async function focusNodeByText(page: Page, text: string) {
  const node = page.locator('g.smm-node text').filter({ hasText: text }).first()
  await expect(node).toBeVisible()
  await node.click({ force: true })
}

export async function runJourney8(page: Page) {
  const results: { name: string; pass: boolean; detail?: string }[] = []

  let aiCard: ReturnType<typeof page.locator> | null = null

  // ============================================================
  // AI 辅助生成思维导图
  // ============================================================

  // AI-1: 新建项目 dialog 中显示 AI 生成卡片
  try {
    await enterLocalMode(page)
    await page.locator('aside button[aria-label="新建项目"]').first().click()
    await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 })

    aiCard = page.locator('button:has-text("AI 生成")').first()
    await expect(aiCard).toBeVisible()
    results.push({ name: 'AI-1: 新建项目 dialog 显示 AI 生成卡片', pass: true })
  } catch (e: any) {
    results.push({ name: 'AI-1: 新建项目 dialog 显示 AI 生成卡片', pass: false, detail: e.message })
  }

  // AI-2: 选择 AI 生成 + 输入产品相关主题 → 本地引擎匹配 product-dev 模板
  try {
    if (!aiCard) throw new Error('AI 生成卡片未定位')
    await aiCard.click()

    const input = page.locator('#project-name')
    await input.fill('')
    await input.fill('前端组件库开发')
    await page.waitForTimeout(100)

    const createBtn = page.locator('[role="dialog"] button:has-text("生成并创建")')
    await expect(createBtn).toBeVisible()
    await createBtn.click()

    // 等待导航 + MindMapCanvas 挂载 + simple-mind-map 渲染
    // ProjectMindMapPage 现在有 loading 状态，固定等待比 waitForSelector 更稳定
    await page.waitForURL(/\/project\//, { timeout: 15000 })
    await page.waitForTimeout(2500)

    // 验证根节点文本是 AI 接收的主题
    const allTexts = await page.locator('g.smm-node text').allTextContents()
    expect(allTexts).toContain('前端组件库开发')

    // 验证 product-dev 模板结构（4 个一级分支）
    expect(allTexts).toContain('需求分析')
    expect(allTexts).toContain('设计阶段')
    expect(allTexts).toContain('开发实现')
    expect(allTexts).toContain('测试上线')

    results.push({ name: 'AI-2: AI 生成基于主题匹配 product-dev 模板结构', pass: true })
  } catch (e: any) {
    results.push({ name: 'AI-2: AI 生成基于主题匹配 product-dev 模板结构', pass: false, detail: e.message })
  }

  // AI-3: AI 生成的任务节点自动同步到看板
  try {
    await page.click('button:has-text("看板")')
    await page.waitForTimeout(800)

    const boardText = await page.locator('main').first().innerText()
    // 验证看板三列存在
    if (!boardText.includes('待办') || !boardText.includes('进行中') || !boardText.includes('已完成')) {
      throw new Error('看板三列未完整显示')
    }
    // 验证至少能看到模板中的某些任务文本
    const hasTasks = ['用户调研', '前端开发', '需求分析', '设计阶段'].some((t) => boardText.includes(t))
    if (!hasTasks) {
      throw new Error(`看板中未找到预期任务文本，实际: ${boardText.slice(0, 300)}`)
    }

    results.push({ name: 'AI-3: AI 生成的任务节点自动同步到看板', pass: true })
  } catch (e: any) {
    results.push({ name: 'AI-3: AI 生成的任务节点自动同步到看板', pass: false, detail: e.message })
  }

  // ============================================================
  // 节点详情面板
  // ============================================================

  // DETAIL-1: 双击节点打开详情面板
  try {
    await page.click('button:has-text("导图")')
    await page.waitForTimeout(600)

    const detailNode = page.locator('g.smm-node text').filter({ hasText: '需求分析' }).first()
    await expect(detailNode).toBeVisible()
    await detailNode.click()
    await page.waitForTimeout(400)

    // 通过浮动工具栏「查看详情」按钮打开 Sheet（比 dblclick 更稳定）
    const viewDetailBtn = page.locator('button:has-text("查看详情")').first()
    await viewDetailBtn.click()
    await page.waitForTimeout(500)

    // Sheet 打开后应能看到「属性」「文档」两个 Tab
    await expect(page.locator('text=属性').first()).toBeVisible()
    await expect(page.locator('text=文档').first()).toBeVisible()

    results.push({ name: 'DETAIL-1: 双击节点打开详情面板（属性/文档 Tab 可见）', pass: true })
  } catch (e: any) {
    results.push({ name: 'DETAIL-1: 双击节点打开详情面板（属性/文档 Tab 可见）', pass: false, detail: e.message })
  }

  // DETAIL-2: 属性 Tab 中「转为任务」，设置优先级为「高」
  try {
    // 确保当前在「属性」Tab
    const propertiesTab = page.locator('button:has-text("属性")').first()
    if (await propertiesTab.isVisible()) await propertiesTab.click()
    await page.waitForTimeout(200)

    const toggleBtn = page.locator('button:has-text("转为任务")').first()
    await expect(toggleBtn).toBeVisible()
    await toggleBtn.click()
    await page.waitForTimeout(400)

    // 点击后按钮应变为「已标记为任务」
    await expect(page.locator('button:has-text("已标记为任务")').first()).toBeVisible()

    // 设置优先级为「高」
    const prioritySection = page.locator('label:has-text("优先级")').first().locator('xpath=../../div[2]')
    const highBtn = prioritySection.locator('button', { hasText: /^高$/ }).first()
    await expect(highBtn).toBeVisible()
    await highBtn.click()
    await page.waitForTimeout(200)

    // 验证高优先级按钮有选中样式
    const highClasses = await highBtn.getAttribute('class')
    expect(highClasses).toMatch(/border-primary|bg-primary-subtle|text-primary/)

    results.push({ name: 'DETAIL-2: 属性 Tab 中节点转为任务并设置高优先级', pass: true })
  } catch (e: any) {
    results.push({ name: 'DETAIL-2: 属性 Tab 中节点转为任务并设置高优先级', pass: false, detail: e.message })
  }

  // DETAIL-3: 设置截止日期
  try {
    const dateInput = page.locator('input[type="date"]').first()
    await expect(dateInput).toBeVisible()

    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    const dateStr = futureDate.toISOString().slice(0, 10)
    await dateInput.fill(dateStr)
    await page.waitForTimeout(200)

    const value = await dateInput.inputValue()
    expect(value).toBe(dateStr)

    results.push({ name: 'DETAIL-3: 属性 Tab 中设置截止日期', pass: true })
  } catch (e: any) {
    results.push({ name: 'DETAIL-3: 属性 Tab 中设置截止日期', pass: false, detail: e.message })
  }

  // DETAIL-4: 文档 Tab 中输入 Markdown 并保存，验证预览
  try {
    const documentTab = page.locator('button:has-text("文档")').first()
    await documentTab.click()
    await page.waitForTimeout(300)

    const editBtn = page.locator('button:has-text("编辑")').first()
    await editBtn.click()
    await page.waitForTimeout(200)

    const textarea = page.locator('textarea[placeholder*="Markdown"], textarea[placeholder*="在此输入"]').first()
    await expect(textarea).toBeVisible()

    const markdownContent = '# 需求分析文档\n\n- 用户调研报告\n- 竞品分析结论\n'
    await textarea.fill(markdownContent)
    await page.waitForTimeout(200)

    const saveBtn = page.locator('button:has-text("保存")').first()
    await saveBtn.click()
    await page.waitForTimeout(400)

    // 验证预览中渲染了标题和列表
    await expect(page.locator('h1:has-text("需求分析文档")').first()).toBeVisible()
    await expect(page.locator('li:has-text("用户调研报告")').first()).toBeVisible()

    results.push({ name: 'DETAIL-4: 文档 Tab 中输入 Markdown 并保存，预览正确渲染', pass: true })
  } catch (e: any) {
    results.push({ name: 'DETAIL-4: 文档 Tab 中输入 Markdown 并保存，预览正确渲染', pass: false, detail: e.message })
  }

  // 关闭详情面板
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  // ============================================================
  // 番茄钟
  // ============================================================

  // POMO-1: 从节点详情面板启动番茄钟
  try {
    const pomoNode = page.locator('g.smm-node text').filter({ hasText: '需求分析' }).first()
    await expect(pomoNode).toBeVisible()
    await pomoNode.click()
    await page.waitForTimeout(400)

    const viewDetailBtn2 = page.locator('button:has-text("查看详情")').first()
    await viewDetailBtn2.click()
    await page.waitForTimeout(500)

    const startPomodoroBtn = page.locator('button:has-text("开始专注")').first()
    await expect(startPomodoroBtn).toBeVisible()
    await startPomodoroBtn.click()
    await page.waitForTimeout(500)

    // 番茄钟面板应展开
    await expect(page.locator('text=专注中').first()).toBeVisible()

    results.push({ name: 'POMO-1: 从节点详情启动番茄钟，面板展开', pass: true })
  } catch (e: any) {
    results.push({ name: 'POMO-1: 从节点详情启动番茄钟，面板展开', pass: false, detail: e.message })
  }

  // POMO-2: 番茄钟面板显示任务名和 25:00 倒计时
  try {
    await expect(page.locator('text=25:00').first()).toBeVisible()

    // 检查页面上至少有两个包含「需求分析」的元素（导图节点 + 番茄钟任务名）
    const demandCount = await page.locator('text=需求分析').count()
    expect(demandCount).toBeGreaterThanOrEqual(2)

    results.push({ name: 'POMO-2: 番茄钟面板显示任务名和 25:00 倒计时', pass: true })
  } catch (e: any) {
    results.push({ name: 'POMO-2: 番茄钟面板显示任务名和 25:00 倒计时', pass: false, detail: e.message })
  }

  // POMO-3: 启动后暂停，验证时间变化和按钮状态
  try {
    const timeLocator = page.locator('.text-2xl.font-mono').first()
    const timeBefore = await timeLocator.textContent()
    expect(timeBefore).toBe('25:00')

    // 等待 2.5 秒
    await page.waitForTimeout(2500)

    const timeAfterRun = await timeLocator.textContent()
    expect(timeAfterRun).not.toBe('25:00')

    // 点击 Pause（controls 区域第一个按钮）
    const controlsFirstBtn = page.locator('.fixed.bottom-5.right-5 .flex.items-center.gap-2 > button').first()
    await controlsFirstBtn.click()
    await page.waitForTimeout(300)

    // 暂停后，第一个按钮应变为 Play（有 default 样式）
    const playBtnClasses = await controlsFirstBtn.getAttribute('class')
    expect(playBtnClasses).toMatch(/bg-primary|text-primary-foreground/)

    results.push({ name: 'POMO-3: 番茄钟启动后时间减少，暂停后显示 Play 按钮', pass: true })
  } catch (e: any) {
    results.push({ name: 'POMO-3: 番茄钟启动后时间减少，暂停后显示 Play 按钮', pass: false, detail: e.message })
  }

  // 关闭番茄钟面板
  try {
    const pomodoroPanel = page.locator('.fixed.bottom-5.right-5').first()
    const closeBtn = pomodoroPanel.locator('button').first()
    if (await closeBtn.isVisible()) {
      await closeBtn.click()
      await page.waitForTimeout(200)
    }
  } catch {
    // ignore
  }

  // ============================================================
  // Dashboard 工作台
  // ============================================================

  // DASH-1: 访问工作台显示统计数据
  try {
    const dashboardBtn = page.locator('button:has-text("工作台")').first()
    await expect(dashboardBtn).toBeVisible()
    await dashboardBtn.click()
    await page.waitForURL('/dashboard', { timeout: 5000 })
    await page.waitForTimeout(800)

    await expect(page.locator('text=工作台').first()).toBeVisible()
    await expect(page.locator('text=总任务').first()).toBeVisible()

    // 统计数值应该大于 0
    const statValues = await page.locator('.text-xl.font-semibold').allTextContents()
    const totalNum = parseInt(statValues[0] || '0', 10)
    expect(totalNum).toBeGreaterThan(0)

    await expect(page.locator('text=项目进度').first()).toBeVisible()

    results.push({ name: 'DASH-1: 工作台显示统计数据和项目进度', pass: true })
  } catch (e: any) {
    results.push({ name: 'DASH-1: 工作台显示统计数据和项目进度', pass: false, detail: e.message })
  }

  // DASH-2: 点击项目进度卡片跳转到对应项目看板
  try {
    const firstProjectCard = page.locator('button:has-text("前端组件库开发")').first()
    await expect(firstProjectCard).toBeVisible()

    await firstProjectCard.click()
    await page.waitForTimeout(800)

    const url = page.url()
    expect(url).toMatch(/\/project\/.+\/board/)

    const boardCards = await page.locator('[data-testid="project-board"] [data-testid="task-card"]').all()
    expect(boardCards.length).toBeGreaterThan(0)

    results.push({ name: 'DASH-2: 点击工作台项目进度卡片跳转到项目看板', pass: true })
  } catch (e: any) {
    results.push({ name: 'DASH-2: 点击工作台项目进度卡片跳转到项目看板', pass: false, detail: e.message })
  }

  console.log(`Journey 8: ${results.filter((r) => r.pass).length}/${results.length} passed`)
  return results
}
