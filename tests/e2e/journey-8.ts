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
  const el = page.locator('text=' + text).first()
  await el.scrollIntoViewIfNeeded().catch(() => {})
  const box = await el.boundingBox()
  if (!box) throw new Error(`Node not found: ${text}`)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(200)
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
    // ProjectMindMapPage 现在有 loading 状态，MindMapCanvas 在 DB 查询完成后才挂载；
    // simple-mind-map 首次渲染在 E2E 中需要 4~6s，使用 waitForFunction 轮询直到 g.smm-node 出现
    await page.waitForURL(/\/project\//, { timeout: 15000 })
    await page.waitForFunction(
      () => document.querySelectorAll('g.smm-node').length > 0,
      undefined,
      { timeout: 15000, polling: 500 }
    )
    await page.waitForTimeout(400)

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

    await focusNodeByText(page, '需求分析')
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

    // 节点详情 Sheet 内才有「转为任务」开关；画布浮动工具栏也存在同名按钮（位于 Sheet 之下），
    // 必须用 [data-base-ui-portal] 限定到详情面板，否则 Playwright 会点到被 Sheet 遮挡的画布按钮。
    const toggleBtn = page.locator('[data-base-ui-portal] button:has-text("转为任务")').first()
    await expect(toggleBtn).toBeVisible()
    await toggleBtn.click()
    await page.waitForTimeout(400)

    // 点击后按钮应变为「已标记为任务」
    await expect(page.locator('[data-base-ui-portal] button:has-text("已标记为任务")').first()).toBeVisible()

    // 设置优先级为「高」
    // 优先级按钮组位于含「优先级」label 的同一字段容器内，直接按文案在 Sheet 内定位即可。
    const highBtn = page.locator('[data-base-ui-portal] button', { hasText: /^高$/ }).first()
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
    const dateInput = page.locator('[data-base-ui-portal] input[type="date"]').first()
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

  // POMO-1: 番茄钟功能可用（面板可打开）
  try {
    await focusNodeByText(page, '需求分析')
    await page.waitForTimeout(400)

    // 验证番茄钟浮动按钮存在（App.tsx 全局挂载 PomodoroTimer）
    // 使用多种选择器策略兼容可能的 DOM 结构差异
    const pomoBtn = page.locator('button[title="番茄钟"], .fixed.bottom-5 button').first()
    await expect(pomoBtn).toBeVisible({ timeout: 8000 })

    // 点击打开番茄钟面板
    await pomoBtn.click()
    await page.waitForTimeout(600)

    // 面板展开后应显示时间或模式标签（专注中/短休息/长休息 或时间格式 XX:XX）
    const pomoPanel = page.locator('.fixed.bottom-5.right-5').first()
    await expect(pomoPanel).toBeVisible()

    const panelText = await pomoPanel.innerText()
    const hasValidContent =
      panelText.includes('专注中') ||
      panelText.includes('短休息') ||
      panelText.includes('长休息') ||
      /\d{1,2}:\d{2}/.test(panelText)

    if (!hasValidContent) {
      throw new Error(`番茄钟面板内容异常: ${panelText.slice(0, 120)}`)
    }

    results.push({ name: 'POMO-1: 番茄钟浮动按钮可见且面板可打开', pass: true })
  } catch (e: any) {
    results.push({ name: 'POMO-1: 番茄钟浮动按钮可见且面板可打开', pass: false, detail: e.message })
  }

  // POMO-2: 番茄钟面板显示默认状态（25:00 + 模式切换按钮）
  try {
    const pomoPanel = page.locator('.fixed.bottom-5.right-5').first()
    await expect(pomoPanel).toBeVisible()

    // 验证默认时间显示为 25:00
    await expect(page.locator('.text-2xl.font-mono').first()).toHaveText('25:00')

    // 验证模式切换按钮存在（25分/5分/15分）
    const panelText = await pomoPanel.innerText()
    if (!panelText.includes('25分') && !panelText.includes('5分')) {
      throw new Error(`番茄钟面板缺少模式切换按钮: ${panelText.slice(0, 120)}`)
    }

    results.push({ name: 'POMO-2: 番茄钟面板显示 25:00 和模式切换', pass: true })
  } catch (e: any) {
    results.push({ name: 'POMO-2: 番茄钟面板显示 25:00 和模式切换', pass: false, detail: e.message })
  }

  // POMO-3: 点击 Play 启动计时 → 时间减少 → Pause 按钮出现
  try {
    const timeLocator = page.locator('.text-2xl.font-mono').first()
    expect(await timeLocator.textContent()).toBe('25:00')

    // 点击 Play 按钮启动
    const playBtn = page.locator('.fixed.bottom-5.right-5 .flex.items-center.gap-2 > button').first()
    await expect(playBtn).toBeVisible({ timeout: 5000 })
    await playBtn.click()

    // 等待 3 秒让时间递减
    await page.waitForTimeout(3000)

    const timeAfterRun = await timeLocator.textContent()
    expect(timeAfterRun).not.toBe('25:00')

    // 点击 Pause（此时第一个控制按钮应变成 Pause，再点回到 Play）
    // 实际上 Play 点击后第一个按钮变为 Pause，我们需要找到并点击它
    const controlsFirstBtn = page.locator('.fixed.bottom-5.right-5 .flex.items-center.gap-2 > button').first()
    await controlsFirstBtn.click() // Pause
    await page.waitForTimeout(300)

    results.push({ name: 'POMO-3: 番茄钟启动后时间减少并可暂停', pass: true })
  } catch (e: any) {
    results.push({ name: 'POMO-3: 番茄钟启动后时间减少并可暂停', pass: false, detail: e.message })
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
    // 注意：侧边栏项目链接（位于 aside）也含项目名文字且先渲染，
    // 必须用 main 限定到工作台内的「项目进度」卡片，否则会点到侧边栏链接（跳转到导图而非看板）。
    const firstProjectCard = page.locator('main button:has-text("前端组件库开发")').first()
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
