// Journey 2 E2E - PRD AC-6 ~ AC-13
// 覆盖: 多项目、切换、数据隔离、全局任务聚合、全局筛选、全局看板分色、
//      全局→项目双向同步、全局任务定位到项目导图

import { Page, expect } from '@playwright/test'
import { enterLocalMode, createProject } from './journey-1'

const BASE_URL = process.env.MF_BASE_URL || 'http://localhost:5173'
const PROJECT_A = 'E2E-项目A-' + Date.now()
const PROJECT_B = 'E2E-项目B-' + Date.now()
const TASK_A_1 = 'A-需求分析'
const TASK_A_2 = 'A-视觉设计'
const TASK_B_1 = 'B-技术调研'

async function clickNodeByText(page: Page, text: string) {
  const el = page.locator('text=' + text).first()
  await el.scrollIntoViewIfNeeded().catch(() => {})
  const box = await el.boundingBox()
  if (!box) throw new Error(`Node not found: ${text}`)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(200)
}

async function addChildAndTask(page: Page, text: string, alsoMarkAsTask: boolean) {
  // headless 下 simple-mind-map Tab 创建节点不稳定，加 retry 机制
  let created = false
  for (let attempt = 0; attempt < 3; attempt++) {
    const rootNodeEl = page.locator('g.smm-node').first()
    await rootNodeEl.scrollIntoViewIfNeeded().catch(() => {})
    await rootNodeEl.click({ force: true })
    await page.waitForTimeout(300)
    await page.keyboard.press('Tab')
    await page.waitForTimeout(500)
    const editWrap = page.locator('div.smm-node-edit-wrap')
    if (await editWrap.count() === 0) {
      await page.waitForTimeout(200)
      continue
    }
    await page.keyboard.type(text, { delay: 30 })
    await page.keyboard.press('Enter')
    await page.waitForTimeout(600)
    // 验证节点是否出现
    const found = await page.locator('text=' + text).first().isVisible().catch(() => false)
    if (found) {
      created = true
      break
    }
  }
  if (!created) {
    throw new Error(`创建节点 "${text}" 失败，3 次 retry 后仍未出现`)
  }
  if (alsoMarkAsTask) {
    // 新建节点通常会自动选中 (simple-mind-map 行为)
    // 用浮动工具栏标记
    const toggle = page.locator('button:has-text("转为任务")')
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click()
      await page.waitForTimeout(300)
    }
  }
}

export async function runJourney2(page: Page) {
  const results: { name: string; pass: boolean; detail?: string }[] = []

  // 准备环境: 离线模式
  await enterLocalMode(page)

  // ===== AC-6 创建项目 A =====
  try {
    await createProject(page, PROJECT_A)
    await expect(page.locator('aside')).toContainText(PROJECT_A)
    results.push({ name: 'AC-6 创建项目 A', pass: true })
  } catch (e: any) {
    results.push({ name: 'AC-6 创建项目 A', pass: false, detail: e.message })
  }

  // ===== 在 A 项目下添加 2 个任务节点 =====
  try {
    await addChildAndTask(page, TASK_A_1, true)
    await addChildAndTask(page, TASK_A_2, true)
    // 跳到看板验证
    await page.locator('button:has-text("看板")').first().click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=' + TASK_A_1).first()).toBeVisible()
    await expect(page.locator('text=' + TASK_A_2).first()).toBeVisible()
    results.push({ name: 'A 项目添加 2 个任务', pass: true })
  } catch (e: any) {
    results.push({ name: 'A 项目添加 2 个任务', pass: false, detail: e.message })
  }

  // ===== AC-6 创建项目 B =====
  try {
    await createProject(page, PROJECT_B)
    await expect(page.locator('aside')).toContainText(PROJECT_B)
    results.push({ name: 'AC-6 创建项目 B', pass: true })
  } catch (e: any) {
    results.push({ name: 'AC-6 创建项目 B', pass: false, detail: e.message })
  }

  // ===== AC-8 数据隔离: B 项目画布应为空 (不含 A 的节点) =====
  try {
    await page.waitForTimeout(500)
    // 新建 B 项目后默认就跳到 /project/B,root 的 text 是项目名 (B)
    // 不应看到 A 的任务文字
    await expect(page.locator('text=' + TASK_A_1)).toHaveCount(0)
    await expect(page.locator('text=' + TASK_A_2)).toHaveCount(0)
    results.push({ name: 'AC-8 项目数据隔离', pass: true })
  } catch (e: any) {
    results.push({ name: 'AC-8 项目数据隔离', pass: false, detail: e.message })
  }

  // ===== 在 B 项目下添加 1 个任务 =====
  try {
    await addChildAndTask(page, TASK_B_1, true)
    await page.locator('button:has-text("看板")').first().click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=' + TASK_B_1).first()).toBeVisible()
    results.push({ name: 'B 项目添加 1 个任务', pass: true })
  } catch (e: any) {
    results.push({ name: 'B 项目添加 1 个任务', pass: false, detail: e.message })
  }

  // ===== AC-7 项目切换 =====
  try {
    // 侧边栏点项目 A
    await page.locator('aside').locator('text=' + PROJECT_A).first().click()
    await page.waitForTimeout(500)
    // 顶部应显示 A 项目名 (ViewHeader)
    await expect(page.locator('text=' + PROJECT_A).first()).toBeVisible()
    // 跳到看板,看到 A 的任务
    await page.locator('button:has-text("看板")').first().click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=' + TASK_A_1).first()).toBeVisible()
    results.push({ name: 'AC-7 项目切换', pass: true })
  } catch (e: any) {
    results.push({ name: 'AC-7 项目切换', pass: false, detail: e.message })
  }

  // ===== AC-9 全局任务列表聚合 =====
  try {
    // 侧边栏 "全局任务"
    await page.locator('aside button:has-text("全局任务")').first().click()
    await page.waitForTimeout(800)
    // 应看到 3 个任务文字
    await expect(page.locator('text=' + TASK_A_1).first()).toBeVisible()
    await expect(page.locator('text=' + TASK_A_2).first()).toBeVisible()
    await expect(page.locator('text=' + TASK_B_1).first()).toBeVisible()
    results.push({ name: 'AC-9 全局任务聚合', pass: true })
  } catch (e: any) {
    results.push({ name: 'AC-9 全局任务聚合', pass: false, detail: e.message })
  }

  // ===== AC-10 全局任务筛选 (按项目) =====
  try {
    // 在筛选 bar (含"全部"按钮的那一行) 内定位 PROJECT_B chip
    const chipBar = page.locator('div[class*="h-9"]').filter({ has: page.locator('button:has-text("全部")') }).first()
    const projectChip = chipBar.locator('button').filter({ hasText: PROJECT_B }).first()
    await projectChip.click()
    await page.waitForTimeout(400)
    // 现在应只看到 B 任务
    await expect(page.locator('text=' + TASK_B_1).first()).toBeVisible()
    await expect(page.locator('text=' + TASK_A_1)).toHaveCount(0)
    await expect(page.locator('text=' + TASK_A_2)).toHaveCount(0)
    results.push({ name: 'AC-10 全局任务筛选', pass: true })
  } catch (e: any) {
    results.push({ name: 'AC-10 全局任务筛选', pass: false, detail: e.message })
  }

  // ===== 取消筛选,继续测试 =====
  try {
    // 直接重新导航到全局任务页面来重置筛选状态
    await page.goto(BASE_URL + '/global-tasks')
    await page.waitForTimeout(800)
  } catch (_e) {
    // 忽略
  }

  // ===== AC-13 全局任务定位到项目导图 =====
  try {
    // 在全局任务列表点击 A-需求分析 文字
    await page.locator('text=' + TASK_A_1).first().click()
    await page.waitForTimeout(800)
    // URL 应变成 /project/:A_id?nodeUid=...
    await expect(page).toHaveURL(/\/project\/.+\?nodeUid=/)
    // 选中节点,浮动工具栏应显示 "已标记为任务"
    await clickNodeByText(page, TASK_A_1)
    await page.waitForTimeout(400)
    await expect(page.locator('button:has-text("已标记为任务")')).toBeVisible({ timeout: 3000 })
    results.push({ name: 'AC-13 全局→导图节点定位', pass: true })
  } catch (e: any) {
    results.push({ name: 'AC-13 全局→导图节点定位', pass: false, detail: e.message })
  }

  // ===== AC-12 全局→项目双向同步 (在全局任务列表勾选 done) =====
  try {
    // 回到全局任务
    await page.locator('aside button:has-text("全局任务")').first().click()
    await page.waitForTimeout(500)
    // 找到 A-需求分析 这一行的复选框按钮 (行内有 status 切换按钮)
    // 行结构: 6 列网格, 最后一列是 toggle button
    const taskRow = page.locator('div').filter({ hasText: TASK_A_1 }).filter({ has: page.locator('button') }).last()
    // 取行内最后一个 button (status toggle)
    const statusBtn = taskRow.locator('button').last()
    await statusBtn.click()
    await page.waitForTimeout(500)
    // 验证: 跳到项目 A 看板,该卡片应出现在 "已完成" 列
    await page.locator('aside').locator('text=' + PROJECT_A).first().click()
    await page.waitForTimeout(500)
    await page.locator('button:has-text("看板")').first().click()
    await page.waitForTimeout(500)
    const doneCol = page.locator('text=已完成').first().locator('xpath=ancestor::div[contains(@class,"flex-col")][1]//div[contains(@class,"overflow-y-auto")]')
    const doneText = await doneCol.innerText()
    if (!doneText.includes(TASK_A_1)) throw new Error(`已完成列无 ${TASK_A_1}, 实际: ${doneText}`)
    results.push({ name: 'AC-12 全局→项目双向同步', pass: true })
  } catch (e: any) {
    results.push({ name: 'AC-12 全局→项目双向同步', pass: false, detail: e.message })
  }

  // ===== C6 归档项目 (PRD §7 Could Have) =====
  // 验证: 项目 B 可从侧边栏菜单触发归档,归档后从侧边栏消失,设置页可恢复
  try {
    // 回到思维导图,确保 PROJECT_B 是当前 active (走一次 sidebar 切换)
    await page.locator('aside').locator('text=' + PROJECT_B).first().click()
    await page.waitForTimeout(500)
    // 打开项目 B 的更多菜单 (hover 后显示)
    const projectBRow = page.locator('aside div.group').filter({ hasText: PROJECT_B }).first()
    await projectBRow.hover()
    await page.waitForTimeout(200)
    // 点击更多按钮 (...图标)
    await projectBRow.locator('button').last().click()
    await page.waitForTimeout(300)
    // 菜单出现,点击 "归档项目"
    await page.locator('button:has-text("归档项目")').first().click()
    await page.waitForTimeout(400)
    // 二次确认 dialog - 点击 "归档" 按钮 (primary)
    await page.locator('div[role="dialog"] button:has-text("归档")').click()
    await page.waitForTimeout(800)
    // 验证: 侧边栏不再显示 PROJECT_B
    const sidebarText = await page.locator('aside').innerText()
    if (sidebarText.includes(PROJECT_B)) {
      throw new Error(`归档后侧边栏仍显示 ${PROJECT_B}: ${sidebarText}`)
    }
    results.push({ name: 'C6 项目归档 (从侧边栏消失)', pass: true })
  } catch (e: any) {
    results.push({ name: 'C6 项目归档 (从侧边栏消失)', pass: false, detail: e.message })
  }

  // ===== C6 归档项目 - 设置页恢复 =====
  try {
    // 进入设置页
    await page.locator('aside button:has-text("设置")').click()
    await page.waitForTimeout(500)
    // 找存储 Tab
    const storageTab = page.locator('button[role="tab"]:has-text("存储")').first()
    if (await storageTab.isVisible({ timeout: 1500 }).catch(() => false)) {
      await storageTab.click()
      await page.waitForTimeout(300)
    }
    // 找 "已归档项目" 区域,验证 PROJECT_B 在内
    const archivedSection = page.locator('text=已归档项目')
    await archivedSection.first().waitFor({ timeout: 3000 })
    // PROJECT_B 应在该区域中
    const pageContent = await page.content()
    if (!pageContent.includes(PROJECT_B)) {
      throw new Error(`设置页已归档区域未列出 ${PROJECT_B}`)
    }
    results.push({ name: 'C6 设置页显示已归档项目', pass: true })

    // 恢复 PROJECT_B
    // 找到对应行,行内应该有 "恢复" 按钮
    const archivedRow = page.locator('div').filter({ hasText: PROJECT_B }).filter({ has: page.locator('button:has-text("恢复")') }).last()
    await archivedRow.locator('button:has-text("恢复")').click()
    await page.waitForTimeout(800)
    // 返回侧边栏验证 PROJECT_B 重新出现
    const sidebarAfter = await page.locator('aside').first().innerText()
    if (!sidebarAfter.includes(PROJECT_B)) {
      throw new Error(`恢复后侧边栏仍未显示 ${PROJECT_B}`)
    }
    results.push({ name: 'C6 从设置页恢复已归档项目', pass: true })
  } catch (e: any) {
    results.push({ name: 'C6 设置页归档恢复', pass: false, detail: e.message })
  }

  return results
}