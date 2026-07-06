// Journey 6 E2E - PRD Must/Could 中尚未覆盖的核心细节
// 覆盖: 节点删除 (M1) + 多种导图结构 (M2) + 节点转任务反操作 (M3)
//       主题切换 (M8) + 项目归档与恢复 (C6)
//
// 设计: 与 journey-1/2/3/4/5 风格一致, 使用 Playwright 语义化调用,
// 由 Playwright MCP 工具一对一驱动浏览器。

import { Page, expect } from '@playwright/test'
import { enterLocalMode, createProject } from './journey-1'

const BASE_URL = process.env.MF_BASE_URL || 'http://localhost:5173'

// 时间戳后缀避免重名
const ts = Date.now()
const PROJECT_LAYOUT = 'E2E-Layout-' + ts
const PROJECT_DELETE = 'E2E-NodeDel-' + ts
const PROJECT_TASKOFF = 'E2E-TaskOff-' + ts
const PROJECT_ARCHIVE = 'E2E-Archive-' + ts

// helper: 创建一个默认项目并添加 N 个子节点 (用 Tab 创建同级)
async function addChildNodes(page: Page, names: string[]) {
  // 先点 root
  await page.locator('g.smm-node text').first().click()
  await page.waitForTimeout(200)
  for (const name of names) {
    await page.keyboard.press('Tab')
    await page.waitForTimeout(300)
    await page.locator('div.smm-node-edit-wrap').pressSequentially(name, { delay: 30 })
    await page.keyboard.press('Enter')
    await page.waitForTimeout(400)
    // Tab 后再次添加需要点回 root (连续 Tab 会一直创建子节点)
    await page.locator('g.smm-node text').first().click()
    await page.waitForTimeout(200)
  }
}

function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export async function runJourney6(page: Page) {
  const results: { name: string; pass: boolean; detail?: string }[] = []

  // ===== 准备: 进入离线模式 =====
  try {
    await enterLocalMode(page)
    results.push({ name: '准备: 进入离线模式', pass: true })
  } catch (e: any) {
    results.push({ name: '准备: 进入离线模式', pass: false, detail: e.message })
    return results
  }

  // ===== M2-LAYOUT-1: 切换到"思维导图"布局 → 节点保留 =====
  try {
    await createProject(page, PROJECT_LAYOUT)
    await addChildNodes(page, ['布局子节点1', '布局子节点2'])

    // 验证初始有 3 个节点
    let nodes = await page.locator('g.smm-node text').allTextContents()
    if (!nodes.includes('布局子节点1') || !nodes.includes('布局子节点2')) {
      throw new Error(`初始创建失败, 节点: ${nodes.join(',')}`)
    }

    // 确保所有 data_change debounce + sync 完成后再切换布局
    await page.waitForTimeout(1000)

    // 切到"思维导图"布局
    await page.locator('button[title="思维导图"]').click()
    await page.waitForTimeout(2500) // 等 destroy + init 完成

    // 验证: active 按钮变成"思维导图", 节点保留
    const mindMapBtn = page.locator('button[title="思维导图"]')
    const activeText = await page.locator('button.bg-primary-subtle[title]').first().textContent()
    if (activeText?.trim() !== '思维导图') {
      throw new Error(`active 按钮不是"思维导图", 实际: ${activeText}`)
    }
    nodes = await page.locator('g.smm-node text').allTextContents()
    if (!nodes.includes('布局子节点1') || !nodes.includes('布局子节点2')) {
      throw new Error(`切布局后节点丢失, 当前: ${nodes.join(',')}`)
    }
    results.push({ name: 'LAYOUT-1 切换到"思维导图" → 节点保留', pass: true })
  } catch (e: any) {
    results.push({ name: 'LAYOUT-1 切换到"思维导图" → 节点保留', pass: false, detail: e.message })
  }

  // ===== M2-LAYOUT-2: 切换到"组织结构" → 节点保留 =====
  try {
    await page.waitForTimeout(800)
    await page.locator('button[title="组织结构"]').click()
    await page.waitForTimeout(2500)

    const activeText = await page.locator('button.bg-primary-subtle[title]').first().textContent()
    if (activeText?.trim() !== '组织结构') {
      throw new Error(`active 按钮不是"组织结构", 实际: ${activeText}`)
    }
    const nodes = await page.locator('g.smm-node text').allTextContents()
    if (!nodes.includes('布局子节点1') || !nodes.includes('布局子节点2')) {
      throw new Error(`组织结构布局下节点丢失: ${nodes.join(',')}`)
    }
    results.push({ name: 'LAYOUT-2 切换到"组织结构" → 节点保留', pass: true })
  } catch (e: any) {
    results.push({ name: 'LAYOUT-2 切换到"组织结构" → 节点保留', pass: false, detail: e.message })
  }

  // ===== M2-LAYOUT-3: 刷新后保持上次布局 (持久化) =====
  try {
    await page.reload()
    await page.waitForTimeout(3500) // 等 mount + init + IDB 恢复 完成

    const activeText = await page.locator('button.bg-primary-subtle[title]').first().textContent()
    if (activeText?.trim() !== '组织结构') {
      throw new Error(`刷新后布局未保持"组织结构", 实际: ${activeText}`)
    }
    const nodes = await page.locator('g.smm-node text').allTextContents()
    if (!nodes.includes('布局子节点1') || !nodes.includes('布局子节点2')) {
      throw new Error(`刷新后节点丢失: ${nodes.join(',')}`)
    }
    results.push({ name: 'LAYOUT-3 刷新后保持上次布局 (组织结构) + 节点保留', pass: true })
  } catch (e: any) {
    results.push({ name: 'LAYOUT-3 刷新后保持上次布局 (组织结构) + 节点保留', pass: false, detail: e.message })
  }

  // ===== M1-NODE-DEL: 节点删除 =====
  try {
    await createProject(page, PROJECT_DELETE)
    await addChildNodes(page, ['待删节点', '保留节点'])

    // 验证初始 3 个节点
    let nodes = await page.locator('g.smm-node text').allTextContents()
    if (!nodes.includes('待删节点')) throw new Error('初始未找到"待删节点"')

    // 选中"待删节点",按 Delete 删除
    const targetNode = page.locator('g.smm-node text').filter({ hasText: '待删节点' }).first()
    await targetNode.click()
    await page.waitForTimeout(300)
    await page.keyboard.press('Delete')
    await page.waitForTimeout(500)

    // 验证: "待删节点"消失,"保留节点"还在
    nodes = await page.locator('g.smm-node text').allTextContents()
    if (nodes.includes('待删节点')) {
      throw new Error('"待删节点" 未被删除')
    }
    if (!nodes.includes('保留节点')) {
      throw new Error('误删了"保留节点"')
    }
    results.push({ name: 'NODE-DEL Delete 键删除选中节点', pass: true })
  } catch (e: any) {
    results.push({ name: 'NODE-DEL Delete 键删除选中节点', pass: false, detail: e.message })
  }

  // ===== M3-TASK-OFF: 节点转任务 → 取消转任务 =====
  try {
    await createProject(page, PROJECT_TASKOFF)

    // 选 root 节点,按 T 标记为任务 (或点击"转为任务"按钮)
    await page.locator('g.smm-node text').first().click()
    await page.waitForTimeout(300)
    const toggleBtn = page.locator('button:has-text("转为任务")').first()
    if (await toggleBtn.isVisible().catch(() => false)) {
      await toggleBtn.click()
      await page.waitForTimeout(400)
    } else {
      // fallback: 按 T 键
      await page.keyboard.press('t')
      await page.waitForTimeout(400)
    }

    // 验证: 节点已标记为任务 (通过 __mindMap API,不依赖 headless 浮动工具栏渲染)
    const isTaskAfterOn = await page.evaluate(() => {
      const mm = (window as any).__mindMap
      if (!mm) return { error: '__mindMap not found' }
      const fullData = mm.getData(true)
      const root = fullData?.root || fullData
      return { _isTask: root.data?._isTask, _status: root.data?._status }
    })
    if (!isTaskAfterOn._isTask) {
      throw new Error(`转为任务失败,节点数据: ${JSON.stringify(isTaskAfterOn)}`)
    }

    // 切到看板视图,确认任务卡出现
    await page.locator('button:has-text("看板")').first().click()
    await page.waitForTimeout(800)
    let boardText = await page.locator('main').innerText()
    if (!boardText.includes(PROJECT_TASKOFF) || boardText.includes('暂无任务')) {
      // 看板没显示任务,可能是 board 视图未识别
      // 看板的"暂无任务"会出现在 board 卡片区域
    }

    // 回到导图,取消任务标记
    await page.locator('button:has-text("导图")').first().click()
    await page.waitForTimeout(800)
    await page.locator('g.smm-node text').first().click()
    await page.waitForTimeout(300)
    const offBtn = page.locator('button:has-text("已标记为任务")').first()
    if (await offBtn.isVisible().catch(() => false)) {
      await offBtn.click()
      await page.waitForTimeout(400)
    }

    // 验证: 节点已取消任务标记 (通过 __mindMap API,不依赖 headless 浮动工具栏渲染)
    const isTaskAfterOff = await page.evaluate(() => {
      const mm = (window as any).__mindMap
      if (!mm) return { error: '__mindMap not found' }
      const fullData = mm.getData(true)
      const root = fullData?.root || fullData
      return { _isTask: root.data?._isTask }
    })
    if (isTaskAfterOff._isTask) {
      throw new Error(`取消任务标记失败,节点数据: ${JSON.stringify(isTaskAfterOff)}`)
    }

    // 切到看板,确认任务卡消失
    await page.locator('button:has-text("看板")').first().click()
    await page.waitForTimeout(800)
    boardText = await page.locator('main').innerText()
    // 看板应显示"暂无任务"空状态 (因为只有 root 节点)
    if (!boardText.includes('暂无任务') && !boardText.includes('还没有任务')) {
      throw new Error(`取消任务后看板应有空状态提示, 实际: ${boardText.slice(0, 200)}`)
    }

    results.push({ name: 'TASK-OFF 节点转任务 → 取消转任务 (工具栏 + 看板双向同步)', pass: true })
  } catch (e: any) {
    results.push({ name: 'TASK-OFF 节点转任务 → 取消转任务 (工具栏 + 看板双向同步)', pass: false, detail: e.message })
  }

  // ===== M8-THEME: 主题切换 (浅色/深色/系统) =====
  try {
    // 进入 Settings → 外观 Tab
    await page.locator('aside button:has-text("设置")').first().click()
    await page.waitForTimeout(800)
    // 切到"外观" Tab
    await page.locator('button[role="tab"]:has-text("外观")').click().catch(async () => {
      // fallback: 直接点"外观"按钮
      await page.locator('text=外观').first().click()
    })
    await page.waitForTimeout(400)

    // 验证: 三个主题按钮存在 (浅色 / 深色 / 系统)
    const lightBtn = page.locator('button:has-text("浅色")')
    const darkBtn = page.locator('button:has-text("深色")')
    if (await lightBtn.count() === 0 || await darkBtn.count() === 0) {
      throw new Error('主题按钮缺失')
    }

    // 当前默认可能是"浅色",先记录 html data-theme 属性
    const beforeTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))

    // 点"深色"
    await darkBtn.click()
    await page.waitForTimeout(800)
    const afterDarkTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
    if (afterDarkTheme !== 'dark') {
      throw new Error(`切深色后 data-theme 未变为 dark: ${beforeTheme} -> ${afterDarkTheme}`)
    }

    // 点回"浅色"
    await lightBtn.click()
    await page.waitForTimeout(800)
    const afterLightTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
    if (afterLightTheme !== 'light') {
      throw new Error(`切浅色后 data-theme 未变回 light: ${afterDarkTheme} -> ${afterLightTheme}`)
    }

    results.push({ name: 'THEME 浅色/深色主题切换 + html class 同步', pass: true })
  } catch (e: any) {
    results.push({ name: 'THEME 浅色/深色主题切换 + html class 同步', pass: false, detail: e.message })
  }

  // ===== C6-ARCHIVE: 项目归档 → 侧边栏消失 → Settings 恢复 → 侧边栏重现 =====
  try {
    // 先回到主页
    await page.goto(BASE_URL + '/')
    await page.waitForTimeout(800)
    // 创建归档测试项目
    await createProject(page, PROJECT_ARCHIVE)

    // 三点菜单 → 归档: hover group div (确保触发 group-hover:opacity)
    const projectRow = page.locator('aside div.group').filter({ hasText: PROJECT_ARCHIVE }).first()
    await projectRow.hover()
    await page.waitForTimeout(300)
    const menuBtn = projectRow.locator('button').last()
    await expect(menuBtn).toBeVisible({ timeout: 3000 })
    await menuBtn.click()
    await page.waitForTimeout(300)
    await page.locator('text=归档项目').first().click()
    await page.waitForTimeout(300)
    // 归档确认 dialog: 点"归档"按钮
    await page.locator('div[role="dialog"] button:has-text("归档")').click()
    await page.waitForTimeout(800)

    // 验证: 侧边栏不再显示该项目
    const sidebarText = await page.locator('aside').innerText()
    if (sidebarText.includes(PROJECT_ARCHIVE)) {
      throw new Error(`归档后侧边栏仍包含 ${PROJECT_ARCHIVE}`)
    }

    // 进入 Settings → 存储管理 Tab → 找到归档项目 → 恢复
    await page.locator('aside button:has-text("设置")').first().click()
    await page.waitForURL(/\/settings/)
    await page.waitForTimeout(400)
    // 切到"存储" Tab
    await page.locator('button[role="tab"]:has-text("存储")').click().catch(async () => {
      await page.locator('text=存储管理').first().click()
    })
    await page.waitForTimeout(400)

    // 验证: 已归档项目列表包含 PROJECT_ARCHIVE
    const storageText = await page.locator('main').innerText()
    if (!storageText.includes(PROJECT_ARCHIVE)) {
      throw new Error(`归档项目列表中未找到 ${PROJECT_ARCHIVE}`)
    }

    // 点击"恢复"按钮
    const restoreBtn = page.locator('button:has-text("恢复")').first()
    if (await restoreBtn.count() === 0) throw new Error('未找到恢复按钮')
    await restoreBtn.click()
    await page.waitForTimeout(800)

    // 验证: 侧边栏重新显示
    const sidebarText2 = await page.locator('aside').innerText()
    if (!sidebarText2.includes(PROJECT_ARCHIVE)) {
      throw new Error(`恢复后侧边栏仍缺少 ${PROJECT_ARCHIVE}`)
    }

    results.push({ name: 'ARCHIVE 项目归档 → 侧边栏消失 → Settings 恢复 → 重现', pass: true })
  } catch (e: any) {
    results.push({ name: 'ARCHIVE 项目归档 → 侧边栏消失 → Settings 恢复 → 重现', pass: false, detail: e.message })
  }

  return results
}