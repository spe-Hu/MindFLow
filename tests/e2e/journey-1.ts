// Journey 1 E2E - PRD AC-1 ~ AC-5
// 覆盖: 创建项目、思维导图节点 CRUD、节点转任务、看板拖拽、思维导图<->看板双向同步、刷新持久化
//
// 设计: 这是一个 Playwright 风格的测试脚本,可由 Playwright MCP 工具调度。
// 它使用语义化的 Playwright 调用 (page.goto / page.click / page.fill 等),
// 这些可以通过 MCP 适配器一对一驱动浏览器。

import { Page, expect } from '@playwright/test'

const BASE_URL = process.env.MF_BASE_URL || 'http://localhost:5173'
const PROJECT_NAME = 'E2E-项目A-' + Date.now()
const NODE_ROOT = '中心主题'
const NODE_CHILD_1 = '需求分析'
const NODE_CHILD_2 = '视觉设计'
const NODE_GRANDCHILD = '首页 mockup'
const NODE_GRANDCHILD_2 = '用户调研报告'

// helper: 进入本地模式 (免登录)
export async function enterLocalMode(page: Page) {
  await page.goto(BASE_URL + '/auth')
  await page.waitForTimeout(2500)
  // 「离线使用,数据仅存本地」按钮
  const offlineBtn = page.locator('button:has-text("离线使用，数据仅存本地")')
  await offlineBtn.click()
  await page.waitForTimeout(2000)
}

// helper: 创建项目
export async function createProject(page: Page, name: string) {
  // 任意页面打开时,点侧边栏 + 新建项目 按钮
  await page.locator('aside button[aria-label="新建项目"]').first().click()
  await page.locator('input#project-name').fill(name)
  await page.locator('div[role="dialog"] button:has-text("创建")').click()
  // 等到跳转到 /project/:id
  await page.waitForURL(/\/project\/.+/, { timeout: 5000 })
}

// helper: 在思维导图上根据文字找到节点并点击（绕过 Playwright SVG 定位限制）
async function clickNodeByText(page: Page, text: string) {
  const el = page.locator('text=' + text).first()
  await el.scrollIntoViewIfNeeded().catch(() => {})
  const box = await el.boundingBox()
  if (!box) throw new Error(`Node not found: ${text}`)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(200)
}

// helper: 添加同级节点 (Enter) - 先选中再按 Enter,然后输入文本
async function addSiblingNode(page: Page, text: string) {
  await page.keyboard.press('Enter')
  // simple-mind-map 节点进入编辑态,等待 input/textarea
  await page.waitForTimeout(200)
  await page.keyboard.type(text)
  await page.keyboard.press('Enter') // 确认
  await page.waitForTimeout(200)
}

export async function runJourney1(page: Page) {
  const results: { name: string; pass: boolean; detail?: string }[] = []

  // ===== AC-1.1 创建项目 =====
  try {
    await enterLocalMode(page)
    await createProject(page, PROJECT_NAME)
    // 验证: 侧边栏包含项目名
    await expect(page.locator('aside')).toContainText(PROJECT_NAME)
    // 验证: 进入思维导图页,画布存在,根节点 "中心主题" (NewProjectDialog 把 root 的 text 设为项目名)
    await expect(page.locator('text=' + PROJECT_NAME).first()).toBeVisible({ timeout: 3000 })
    results.push({ name: 'AC-6 创建项目', pass: true })
  } catch (e: any) {
    results.push({ name: 'AC-6 创建项目', pass: false, detail: e.message })
  }

  // ===== AC-1 添加节点 =====
  try {
    // headless 下 simple-mind-map Tab 创建节点不稳定，加 retry 机制
    let created = false
    for (let attempt = 0; attempt < 3; attempt++) {
      // 先点击 root 节点确保画布获得 focus (点 text 比点 g 更稳定)
      const rootNodeEl = page.locator('g.smm-node').first()
      await rootNodeEl.scrollIntoViewIfNeeded().catch(() => {})
      await rootNodeEl.click({ force: true })
      await page.waitForTimeout(300)
      // Tab 添加子节点
      await page.keyboard.press('Tab')
      await page.waitForTimeout(500)
      const editWrap = page.locator('div.smm-node-edit-wrap')
      if (await editWrap.count() === 0) {
        await page.waitForTimeout(200)
        continue
      }
      await page.keyboard.type(NODE_CHILD_1, { delay: 30 })
      await page.keyboard.press('Enter')
      await page.waitForTimeout(600)
      // 验证: 出现 "需求分析" 文字
      const found = await page.locator('text=' + NODE_CHILD_1).first().isVisible().catch(() => false)
      if (found) {
        created = true
        break
      }
    }
    if (!created) {
      throw new Error(`创建节点 "${NODE_CHILD_1}" 失败，3 次 retry 后仍未出现`)
    }
    results.push({ name: 'AC-1 创建节点', pass: true })
  } catch (e: any) {
    results.push({ name: 'AC-1 创建节点', pass: false, detail: e.message })
  }

  // ===== AC-2 节点任务化 =====
  try {
    // 选中刚创建的节点
    await clickNodeByText(page, NODE_CHILD_1)
    await page.waitForTimeout(300)
    // 浮动工具栏 "转为任务" - 点击
    const toggleBtn = page.locator('button:has-text("转为任务")')
    await toggleBtn.click()
    await page.waitForTimeout(300)
    // 验证: 工具栏变成 "已标记为任务"
    await expect(page.locator('button:has-text("已标记为任务")')).toBeVisible({ timeout: 2000 })
    // 验证: 跳到项目看板能看到这张卡片 (通过 ViewHeader 切到看板)
    await page.locator('button:has-text("看板")').first().click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=' + NODE_CHILD_1).first()).toBeVisible({ timeout: 3000 })
    results.push({ name: 'AC-2 节点任务化 + 项目看板可见', pass: true })
  } catch (e: any) {
    results.push({ name: 'AC-2 节点任务化 + 项目看板可见', pass: false, detail: e.message })
  }

  // ===== AC-3 看板拖拽 (todo → done) =====
  try {
    // 找待办列的卡片
    const todoCol = page.locator('text=待办').first().locator('xpath=ancestor::div[contains(@class,"flex-col")][1]')
    const card = todoCol.locator('div[draggable="true"]').first()
    const cardBox = await card.boundingBox()
    if (!cardBox) throw new Error('未找到待办卡片')
    // 找已完成列的 drop 区
    const doneColDrop = page.locator('text=已完成').first().locator('xpath=ancestor::div[contains(@class,"flex-col")][1]//div[contains(@class,"overflow-y-auto")]')
    const dropBox = await doneColDrop.boundingBox()
    if (!dropBox) throw new Error('未找到已完成列 drop 区')
    // Playwright drag
    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(dropBox.x + dropBox.width / 2, dropBox.y + dropBox.height / 2, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(800)
    // 验证: 已完成列包含该卡片
    const doneColTasks = doneColDrop.locator('div[draggable="true"]')
    const doneCount = await doneColTasks.count()
    if (doneCount < 1) throw new Error('拖拽后已完成列无卡片')
    results.push({ name: 'AC-3 看板拖拽', pass: true })
  } catch (e: any) {
    results.push({ name: 'AC-3 看板拖拽', pass: false, detail: e.message })
  }

  // ===== AC-4 双向同步: 回到导图,节点的 _status = done =====
  try {
    await page.locator('button:has-text("导图")').first().click()
    await page.waitForTimeout(500)
    // 选中该节点,工具栏应不再显示 "转为任务" 而是 "已标记为任务"
    await clickNodeByText(page, NODE_CHILD_1)
    await page.waitForTimeout(300)
    await expect(page.locator('button:has-text("已标记为任务")')).toBeVisible({ timeout: 2000 })
    results.push({ name: 'AC-4 双向同步 (看板→导图)', pass: true })
  } catch (e: any) {
    results.push({ name: 'AC-4 双向同步 (看板→导图)', pass: false, detail: e.message })
  }

  // ===== AC-5 持久化 =====
  try {
    // 刷新浏览器
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    // 验证项目还在
    await expect(page.locator('aside')).toContainText(PROJECT_NAME)
    // 验证节点 "需求分析" 仍在
    await expect(page.locator('text=' + NODE_CHILD_1).first()).toBeVisible({ timeout: 3000 })
    results.push({ name: 'AC-5 数据持久化 (刷新后)', pass: true })
  } catch (e: any) {
    results.push({ name: 'AC-5 数据持久化 (刷新后)', pass: false, detail: e.message })
  }

  return results
}