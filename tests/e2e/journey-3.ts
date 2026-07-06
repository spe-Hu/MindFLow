// Journey 3 E2E - PRD S5 (Should Have) 全局搜索
// 覆盖: Cmd+K 快捷键打开、搜索项目/节点/任务、键盘导航、Enter 跳转、Esc 关闭、
//      Header 全局搜索按钮打开、已归档项目过滤
//
// 设计: 与 journey-1/2 风格一致,使用 Playwright 语义化调用,
// 由 Playwright MCP 工具一对一驱动浏览器。

import { Page, expect } from '@playwright/test'
import { enterLocalMode, createProject } from './journey-1'

const BASE_URL = process.env.MF_BASE_URL || 'http://localhost:5173'

// 测试用项目/节点/任务名 (时间戳后缀避免重名冲突)
const ts = Date.now()
const PROJECT_X = 'E2E-SearchX-' + ts
const PROJECT_Y = 'E2E-SearchY-' + ts
const TASK_X_1 = 'X-需求评审'
const TASK_X_2 = 'X-接口联调'
const TASK_Y_1 = 'Y-部署上线'
// 仅用于在 PROJECT_X 中创建一个节点 (非任务)
const NODE_X_PLAIN = 'X-会议纪要'

// helper: 添加子节点 (自动选中,可选标记为任务)
async function addChildAndMaybeTask(page: Page, text: string, alsoMarkAsTask: boolean) {
  // headless 下 Tab 不总是触发 edit-wrap,加 retry 机制
  let editWrap = page.locator('div.smm-node-edit-wrap')
  let retries = 0
  while (retries < 3) {
    await page.locator('g.smm-node').first().click({ force: true })
    await page.waitForTimeout(300)
    await page.keyboard.press('Tab')
    await page.waitForTimeout(500)
    editWrap = page.locator('div.smm-node-edit-wrap')
    if (await editWrap.count() > 0) break
    retries++
  }
  if (await editWrap.count() === 0) {
    throw new Error(`Failed to create child node for: ${text} (edit-wrap not found after 3 retries)`)
  }
  await editWrap.pressSequentially(text, { delay: 30 })
  await editWrap.press('Enter')
  await page.waitForTimeout(800)
  if (alsoMarkAsTask) {
    // 先尝试浮动工具栏, fallback 到 __mindMap API
    const toggle = page.locator('button:has-text("转为任务")')
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click()
      await page.waitForTimeout(400)
    } else {
      // headless 下浮动工具栏常因 activeNodePos 计算失败而不渲染,
      // 但 renderer.activeNodeList[0] 通常仍有节点 => 用 evaluate 安全标记
      await page.evaluate((t) => {
        const mm = (window as any).__mindMap
        if (!mm) throw new Error('__mindMap not found')
        // 优先 activeNode, fallback 到 nodeList 文本匹配
        let target = mm.renderer?.activeNodeList?.[0]
        if (!target || target.nodeData?.data?.text !== t) {
          target = mm.renderer?.nodeList?.find((n: any) => n.nodeData?.data?.text === t)
        }
        if (!target) throw new Error(`Active node not found for: ${t}`)
        mm.execCommand('SET_NODE_DATA', target, {
          _isTask: true,
          _status: 'todo',
          _priority: 'medium',
          fillColor: '#eff6ff',
          borderColor: '#93c5fd',
          color: '#1e40af',
        })
      }, text)
      await page.waitForTimeout(400)
    }
  }
}

// helper: Cmd+K 打开全局搜索
async function openSearchByHotkey(page: Page) {
  await page.keyboard.press('Meta+k')
  await page.waitForTimeout(200)
}

// helper: 点 Header 全局搜索按钮
async function openSearchByButton(page: Page) {
  // Header 的搜索按钮包含 "全局搜索" 文字 + kbd Cmd+K
  const btn = page.locator('header button:has-text("全局搜索")').first()
  await btn.click()
  await page.waitForTimeout(200)
}

// helper: 关闭搜索面板
async function closeSearch(page: Page) {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
}

export async function runJourney3(page: Page) {
  const results: { name: string; pass: boolean; detail?: string }[] = []

  // ===== 准备环境: 离线模式 =====
  await enterLocalMode(page)

  // ===== 创建项目 X, 添加 2 个任务 + 1 个普通节点 =====
  try {
    await createProject(page, PROJECT_X)
    await addChildAndMaybeTask(page, TASK_X_1, true)
    await addChildAndMaybeTask(page, TASK_X_2, true)
    await addChildAndMaybeTask(page, NODE_X_PLAIN, false)
    results.push({ name: '准备: 项目 X + 2 任务 + 1 节点', pass: true })
  } catch (e: any) {
    results.push({ name: '准备: 项目 X + 2 任务 + 1 节点', pass: false, detail: e.message })
    return results // 准备失败则直接结束
  }

  // ===== 创建项目 Y, 添加 1 个任务 =====
  try {
    await createProject(page, PROJECT_Y)
    await addChildAndMaybeTask(page, TASK_Y_1, true)
    results.push({ name: '准备: 项目 Y + 1 任务', pass: true })
  } catch (e: any) {
    results.push({ name: '准备: 项目 Y + 1 任务', pass: false, detail: e.message })
    return results
  }

  // ===== GS-1: Cmd+K 快捷键打开搜索面板 =====
  try {
    await openSearchByHotkey(page)
    // 验证: 搜索输入框可见
    const input = page.locator('input[placeholder*="搜索项目"]')
    await expect(input).toBeVisible({ timeout: 2000 })
    results.push({ name: 'GS-1 Cmd+K 快捷键打开搜索面板', pass: true })
  } catch (e: any) {
    results.push({ name: 'GS-1 Cmd+K 快捷键打开搜索面板', pass: false, detail: e.message })
  }

  // ===== GS-2: Esc 关闭搜索面板 =====
  try {
    await closeSearch(page)
    const input = page.locator('input[placeholder*="搜索项目"]')
    await expect(input).toHaveCount(0)
    results.push({ name: 'GS-2 Esc 关闭搜索面板', pass: true })
  } catch (e: any) {
    results.push({ name: 'GS-2 Esc 关闭搜索面板', pass: false, detail: e.message })
  }

  // ===== GS-3: Header 全局搜索按钮打开 =====
  try {
    await openSearchByButton(page)
    const input = page.locator('input[placeholder*="搜索项目"]')
    await expect(input).toBeVisible({ timeout: 2000 })
    results.push({ name: 'GS-3 Header 按钮打开搜索', pass: true })
  } catch (e: any) {
    results.push({ name: 'GS-3 Header 按钮打开搜索', pass: false, detail: e.message })
  }

  // ===== GS-4: 搜索项目名 → 项目结果 =====
  try {
    const input = page.locator('input[placeholder*="搜索项目"]')
    await input.fill('SearchX')
    await page.waitForTimeout(400)
    // 搜索结果里应出现 "项目" 标签 + 项目名 SearchX
    const listText = await page.locator('div').filter({ hasText: PROJECT_X }).first().innerText()
    if (!listText.includes(PROJECT_X)) throw new Error('未找到项目 X 结果')
    results.push({ name: 'GS-4 搜索项目名命中项目结果', pass: true })
  } catch (e: any) {
    results.push({ name: 'GS-4 搜索项目名命中项目结果', pass: false, detail: e.message })
  }

  // ===== GS-5: 清空,搜索任务文本 → 命中节点+任务 (去重) =====
  try {
    const input = page.locator('input[placeholder*="搜索项目"]')
    await input.fill('')
    await page.waitForTimeout(200)
    await input.fill('接口联调')
    await page.waitForTimeout(400)
    // 搜索 "接口联调" 应至少出现 1 行结果 (任务)
    const listText = await page.locator('input[placeholder*="搜索项目"]').locator('xpath=ancestor::div[contains(@class,"bg-bg-surface")][1]').innerText()
    if (!listText.includes(TASK_X_2)) throw new Error(`未找到任务 ${TASK_X_2}, 实际: ${listText}`)
    results.push({ name: 'GS-5 搜索任务文本命中任务结果', pass: true })
  } catch (e: any) {
    results.push({ name: 'GS-5 搜索任务文本命中任务结果', pass: false, detail: e.message })
  }

  // ===== GS-6: 搜索普通节点文本 (非任务) → 命中节点结果 =====
  try {
    const input = page.locator('input[placeholder*="搜索项目"]')
    await input.fill('')
    await page.waitForTimeout(200)
    await input.fill('会议纪要')
    await page.waitForTimeout(400)
    // "会议纪要" 是 PROJECT_X 中的非任务节点,应出现在 PROJECT_X 分组下,标签 "节点"
    const listText = await page.locator('input[placeholder*="搜索项目"]').locator('xpath=ancestor::div[contains(@class,"bg-bg-surface")][1]').innerText()
    if (!listText.includes(NODE_X_PLAIN)) throw new Error(`未找到节点 ${NODE_X_PLAIN}, 实际: ${listText}`)
    if (!listText.includes('节点')) throw new Error('结果中应显示 "节点" 标签')
    results.push({ name: 'GS-6 搜索节点文本命中节点结果', pass: true })
  } catch (e: any) {
    results.push({ name: 'GS-6 搜索节点文本命中节点结果', pass: false, detail: e.message })
  }

  // ===== GS-7: 跨项目搜索 → 同名/相似结果按项目分组 =====
  try {
    const input = page.locator('input[placeholder*="搜索项目"]')
    await input.fill('')
    await page.waitForTimeout(200)
    await input.fill('Search')
    await page.waitForTimeout(400)
    // "Search" 应匹配到 SearchX 和 SearchY 两个项目,各显示 1 个项目卡片
    const listText = await page.locator('input[placeholder*="搜索项目"]').locator('xpath=ancestor::div[contains(@class,"bg-bg-surface")][1]').innerText()
    if (!listText.includes(PROJECT_X) || !listText.includes(PROJECT_Y)) {
      throw new Error(`未分组显示 SearchX 和 SearchY, 实际: ${listText.slice(0, 200)}`)
    }
    results.push({ name: 'GS-7 跨项目搜索按项目分组', pass: true })
  } catch (e: any) {
    results.push({ name: 'GS-7 跨项目搜索按项目分组', pass: false, detail: e.message })
  }

  // ===== GS-8: 键盘 ArrowDown/ArrowUp 切换选择 =====
  try {
    const input = page.locator('input[placeholder*="搜索项目"]')
    // 当前 selectedIndex=0 (默认),按 ArrowDown
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(150)
    // 选中项应有 primary-subtle 背景类
    const selectedExists = await page.locator('button.bg-primary-subtle').count()
    if (selectedExists < 1) throw new Error('ArrowDown 后无选中项')
    // 按 ArrowUp 回到 0
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(150)
    results.push({ name: 'GS-8 键盘 ArrowDown/Up 切换', pass: true })
  } catch (e: any) {
    results.push({ name: 'GS-8 键盘 ArrowDown/Up 切换', pass: false, detail: e.message })
  }

  // ===== GS-9: Enter 跳转到项目 =====
  try {
    const input = page.locator('input[placeholder*="搜索项目"]')
    await input.fill('')
    await page.waitForTimeout(200)
    await input.fill('SearchY')
    await page.waitForTimeout(400)
    // 第一个结果应是 SearchY 项目 (按 project→task→node 排序)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(800)
    // URL 应跳到 /project/Y_id
    await expect(page).toHaveURL(/\/project\/.+/)
    const url = page.url()
    if (!url.match(/\/project\/[^/?]+$/)) {
      // 允许带 ?nodeUid= (但项目跳转应不带)
      if (url.includes('nodeUid')) throw new Error(`项目跳转不应带 nodeUid: ${url}`)
    }
    // 验证: 头部搜索面板已关闭
    const inputAfter = page.locator('input[placeholder*="搜索项目"]')
    await expect(inputAfter).toHaveCount(0)
    results.push({ name: 'GS-9 Enter 跳转到项目并关闭面板', pass: true })
  } catch (e: any) {
    results.push({ name: 'GS-9 Enter 跳转到项目并关闭面板', pass: false, detail: e.message })
  }

  // ===== GS-10: Enter 跳转到任务 (带 nodeUid) =====
  // 说明:搜索结果中第一个条目通常是所属项目(project 类型),
  //      需要 ArrowDown 移到实际任务条目再 Enter 才会带上 nodeUid
  try {
    await openSearchByHotkey(page)
    const input = page.locator('input[placeholder*="搜索项目"]')
    await input.fill('部署上线')
    await page.waitForTimeout(600)
    // 默认 selectedIndex=0 是项目,按 ArrowDown 选到任务
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(200)
    // "部署上线" 是任务 (PROJECT_Y),回车应跳到 /project/Y?nodeUid=xxx
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1000)
    await expect(page).toHaveURL(/\/project\/.+\?nodeUid=/)
    results.push({ name: 'GS-10 Enter 跳转任务并带 nodeUid', pass: true })
  } catch (e: any) {
    results.push({ name: 'GS-10 Enter 跳转任务并带 nodeUid', pass: false, detail: e.message })
  }

  // ===== GS-11: 鼠标点击结果跳转 =====
  try {
    await openSearchByHotkey(page)
    const input = page.locator('input[placeholder*="搜索项目"]')
    await input.fill('需求评审')
    await page.waitForTimeout(600)
    // 点击 "X-需求评审" 那一行 button
    const row = page.locator('button').filter({ hasText: TASK_X_1 }).first()
    await row.click()
    await page.waitForTimeout(1000)
    // URL 应跳到 /project/X?nodeUid=xxx
    await expect(page).toHaveURL(/\/project\/.+\?nodeUid=/)
    // 面板已关闭
    const inputAfter = page.locator('input[placeholder*="搜索项目"]')
    await expect(inputAfter).toHaveCount(0)
    results.push({ name: 'GS-11 鼠标点击结果跳转', pass: true })
  } catch (e: any) {
    results.push({ name: 'GS-11 鼠标点击结果跳转', pass: false, detail: e.message })
  }

  // ===== GS-12: 归档后不出现 =====
  try {
    // 先打开搜索,确认 SearchY 在结果中
    await openSearchByHotkey(page)
    const input = page.locator('input[placeholder*="搜索项目"]')
    await input.fill('SearchY')
    await page.waitForTimeout(400)
    let listText = await page.locator('input[placeholder*="搜索项目"]').locator('xpath=ancestor::div[contains(@class,"bg-bg-surface")][1]').innerText()
    if (!listText.includes(PROJECT_Y)) throw new Error('SearchY 归档前应可搜索到')
    await closeSearch(page)

    // 归档 PROJECT_Y
    const projectYRow = page.locator('aside div.group').filter({ hasText: PROJECT_Y }).first()
    await projectYRow.hover()
    await page.waitForTimeout(200)
    await projectYRow.locator('button').last().click()
    await page.waitForTimeout(300)
    await page.locator('button:has-text("归档项目")').first().click()
    await page.waitForTimeout(400)
    await page.locator('div[role="dialog"] button:has-text("归档")').click()
    await page.waitForTimeout(800)

    // 再搜索 SearchY,应"未找到匹配结果"
    await openSearchByHotkey(page)
    const input2 = page.locator('input[placeholder*="搜索项目"]')
    await input2.fill('SearchY')
    await page.waitForTimeout(400)
    const listTextAfter = await page.locator('input[placeholder*="搜索项目"]').locator('xpath=ancestor::div[contains(@class,"bg-bg-surface")][1]').innerText()
    if (listTextAfter.includes(PROJECT_Y)) {
      throw new Error(`归档后 SearchY 不应出现在搜索结果中, 实际: ${listTextAfter.slice(0, 200)}`)
    }
    await closeSearch(page)
    results.push({ name: 'GS-12 已归档项目不出现在搜索结果', pass: true })
  } catch (e: any) {
    results.push({ name: 'GS-12 已归档项目不出现在搜索结果', pass: false, detail: e.message })
  }

  // ===== GS-13: 搜索无结果提示 =====
  try {
    await openSearchByHotkey(page)
    const input = page.locator('input[placeholder*="搜索项目"]')
    await input.fill('xyznevermatch')
    await page.waitForTimeout(400)
    const listText = await page.locator('input[placeholder*="搜索项目"]').locator('xpath=ancestor::div[contains(@class,"bg-bg-surface")][1]').innerText()
    if (!listText.includes('未找到匹配结果')) throw new Error(`无结果提示缺失, 实际: ${listText}`)
    await closeSearch(page)
    results.push({ name: 'GS-13 无结果时显示提示', pass: true })
  } catch (e: any) {
    results.push({ name: 'GS-13 无结果时显示提示', pass: false, detail: e.message })
  }

  return results
}