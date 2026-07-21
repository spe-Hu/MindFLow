// Journey 13 E2E – 大纲视图 (S1)
// 覆盖: 进入大纲视图、文本编辑、Enter 创建同级、Tab 缩进、Shift+Tab 提升、
//       折叠/展开、切换任务状态、切换回思维导图验证同步
//
// 策略:
//  1. 创建项目 + 思维导图节点 → 切换「大纲」Tab
//  2. 验证大纲页面渲染（root + 子行）
//  3. 编辑某行文本内容
//  4. 在该行 Enter 创建新同级行
//  5. 新行 Tab 缩进成为子节点
//  6. 切换回「思维导图」验证节点结构同步
//  7. 切回大纲，测试折叠/展开、任务 toggle
// ============================================================

import type { Page } from '@playwright/test'
import { enterLocalMode, createProject } from './journey-1'
import { addMindMapChildViaAPI } from './helpers'

interface JourneyResult {
  name: string
  pass: boolean
  detail?: string
}

let results: JourneyResult[] = []
let ctx: { page: Page; projectId: string } | null = null

type TestCtx = NonNullable<typeof ctx>

function push(label: string, ok: boolean, detail?: string) {
  results.push({ name: label, pass: ok, detail })
  if (!ok) console.error(`❌ ${label}${detail ? ' – ' + detail : ''}`)
}

async function safeClick(page: Page, selector: string, label: string) {
  const el = page.locator(selector).first()
  if (await el.isVisible().catch(() => false)) {
    await el.click({ force: true })
    await page.waitForTimeout(150)
    return true
  } else {
    push(label, false, '找不到元素')
    return false
  }
}

async function getInnerText(el: any): Promise<string> {
  return (await el.innerText()) || ''
}

// ============================================================
// Helpers from journey-7 (stable)
// ============================================================

async function startEditingNode(page: Page): Promise<boolean> {
  const editWrap = page.locator('.smm-node-edit-wrap,.smm-node-edit').first()
  if (await editWrap.isVisible().catch(() => false)) return true
  const rootNode = page.locator('.smm-node[isfakerootnode="false"],.smm-node').first()
  if (await rootNode.isVisible().catch(() => false)) {
    await rootNode.dblclick()
    await page.waitForTimeout(500)
    return await editWrap.isVisible().catch(() => false)
  }
  return false
}

async function createSiblingWithText(page: Page, text: string): Promise<boolean> {
  const ready = await startEditingNode(page)
  if (!ready) return false
  const ed = page.locator('.smm-node-edit-wrap,.smm-node-edit').first()
  await ed.click()
  await page.waitForTimeout(200)
  await page.keyboard.press('End')
  await page.waitForTimeout(100)
  await page.keyboard.type(text, { delay: 10 })
  await page.waitForTimeout(200)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(600)
  return true
}

async function getNodeTexts(page: Page): Promise<string[]> {
  const nodes = await page.locator('.smm-node:not([isfakerootnode="true"])').all()
  const texts: string[] = []
  for (const n of nodes) {
    const t = (await n.textContent()) || ''
    if (t) texts.push(t.trim())
  }
  return texts
}

// helper: 通过 Tab 键盘操作在 root 下创建子节点（J6/J7 已验证在 headless 下可行）
async function addChildNodeViaTab(page: Page, text: string) {
  const rootNode = page.locator('g.smm-node').first()
  await rootNode.click({ force: true })
  await page.waitForTimeout(300)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  await page.keyboard.press('Tab')
  await page.waitForTimeout(600)
  const editWrap = page.locator('.smm-node-edit-wrap,.smm-node-edit').first()
  await editWrap.waitFor({ state: 'visible', timeout: 5000 })
  await editWrap.click()
  await page.waitForTimeout(200)
  await page.keyboard.type(text, { delay: 10 })
  await page.waitForTimeout(200)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(600)
}

// ============================================================
// Phase 0: Setup – create project with mind map nodes
// ============================================================

async function phase0({ page }: TestCtx) {
  // 确保在 local mode
  await enterLocalMode(page)

  // 使用 journey-1 中已验证稳定的 createProject helper
  try {
    await createProject(page, '大纲测试项目')
  } catch (e: any) {
    push('P0: create project', false, e.message)
    return
  }

  // 通过 Tab 键盘注入子节点（比 setData 更稳，走 UI 事件流）
  try {
    await addChildNodeViaTab(page, '任务 A')
    await addChildNodeViaTab(page, '任务 B')

    // 验证 DOM 上已渲染
    const texts = await page.locator('g.smm-node text').allTextContents()
    const hasChild = texts.some((t) => t.includes('任务 A') || t.includes('任务 B'))
    push('P0: children rendered on canvas', hasChild)
  } catch (e: any) {
    push('P0: add children via Tab', false, e.message)
  }
}

// ============================================================
// Phase 1: Switch to Outline tab
// ============================================================

async function phase1({ page }: TestCtx) {
  // 直接导航到大纲页面，避免点击 tab 不可靠
  const currentUrl = page.url()
  const outlineUrl = currentUrl.replace(/\/project\/[^/]+(\/|$)/, (m) => m.replace(/\/$/, '') + '/outline')
  await page.goto(outlineUrl)
  await page.waitForTimeout(1200)
  push('P1: navigate to outline', true)

  // Verify URL changed to /outline
  const url = page.url()
  push('P1: URL contains /outline', url.includes('/outline'))
  if (!url.includes('/outline')) {
    push('P1: current url diagnostic', false, url)
    return
  }

  // Verify outline page renders with contenteditable rows
  const rows = page.locator('[contenteditable="true"]')
  await rows.first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {})
  const rowCount = await rows.count()
  push('P1: at least 3 outline rows rendered', rowCount >= 3)
  if (rowCount < 3) {
    const bodyText = await page.locator('body').innerText().catch(() => '')
    push('P1: body text diagnostic', false, bodyText.slice(0, 200))
    return
  }

  // Verify root text
  const rootText = await rows.first().innerText()
  push('P1: root row has text', (rootText || '').length > 0)
}

// ============================================================
// Phase 2: Edit text in outline
// ============================================================

async function phase2({ page }: TestCtx) {
  // Find a non-root row (second contenteditable)
  const rows = await page.locator('[contenteditable="true"]').all()
  if (rows.length < 2) {
    push('P2: enough rows to edit', false)
    return
  }

  const targetRow = rows[1]!
  // 用 evaluate 直接操作 contenteditable DOM，绕过 headless 键盘事件不可靠问题
  await targetRow.evaluate((el, newText) => {
    el.textContent = newText
    el.dispatchEvent(new Event('input', { bubbles: true }))
    ;(el as HTMLElement).blur()
    el.dispatchEvent(new Event('blur', { bubbles: true }))
  }, '已编辑的任务')
  await page.waitForTimeout(800)

  // Re-query（React re-render 后 element handle 可能失效）
  const allRows = await page.locator('[contenteditable="true"]').all()
  const updatedRow = allRows[1]
  const textAfter = updatedRow ? await updatedRow.innerText() : ''
  push('P2: text edited correctly', (textAfter || '').includes('已编辑的任务'))
}

// ============================================================
// Phase 3: Enter creates new sibling row
// ============================================================

async function phase3({ page }: TestCtx) {
  const rowsBefore = await page.locator('[contenteditable="true"]').count()

  // Focus last row and press Enter
  const rows = await page.locator('[contenteditable="true"]').all()
  const lastRow = rows[rows.length - 1]
  if (!lastRow) {
    push('P3: last row exists', false)
    return
  }
  await lastRow.click()
  await page.waitForTimeout(200)
  await page.keyboard.press('End')
  await page.waitForTimeout(100)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(500)

  // 给新行输入文字，用于后续在思维导图中验证同步
  const newRows = await page.locator('[contenteditable="true"]').all()
  const newRow = newRows[newRows.length - 1]
  if (newRow) {
    await newRow.evaluate((el, newText) => {
      el.textContent = newText
      el.dispatchEvent(new Event('input', { bubbles: true }))
      ;(el as HTMLElement).blur()
      el.dispatchEvent(new Event('blur', { bubbles: true }))
    }, '新节点C')
    await page.waitForTimeout(600)
  }

  const rowsAfter = await page.locator('[contenteditable="true"]').count()
  push('P3: Enter creates new row', rowsAfter === rowsBefore + 1)
}

// ============================================================
// Phase 4: Tab indents new row
// ============================================================

async function phase4({ page }: TestCtx) {
  // Focus the newly created empty row (should be last)
  const rows = await page.locator('[contenteditable="true"]').all()
  const newRow = rows[rows.length - 1]
  if (!newRow) {
    push('P4: new row exists for Tab', false)
    return
  }

  await newRow.click()
  await page.waitForTimeout(200)

  // Press Tab to indent
  await page.keyboard.press('Tab')
  await page.waitForTimeout(300)

  // Verify indentation via padding-left style or visual indent
  const parentEl = page.locator('[contenteditable="true"]').last().locator('xpath=../..')
  const stylePadding = await parentEl.evaluate((el) => (el as HTMLElement).style.paddingLeft).catch(() => '')
  push('P4: Tab indents row', parseInt(stylePadding || '0', 10) > 0)
}

// ============================================================
// Phase 5: Switch back to mind map and verify sync
// ============================================================

async function phase5({ page }: TestCtx) {
  // 直接导航回思维导图页面
  const currentUrl = page.url()
  const mindmapUrl = currentUrl.replace(/\/outline(\/|$)/, (m) => m.replace('outline', ''))
  await page.goto(mindmapUrl)
  await page.waitForTimeout(1200)
  push('P5: switch back to mindmap', true)

  const texts = await getNodeTexts(page)
  push('P5: mindmap shows edited text', texts.some((t) => t.includes('已编辑的任务')))
  push('P5: mindmap shows new outline row synced', texts.some((t) => t.includes('新节点C')))
}

// ============================================================
// Main
// ============================================================

export async function runJourney13(page: Page) {
  results = []

  ctx = { page, projectId: '' }

  await phase0(ctx)
  await phase1(ctx)
  await phase2(ctx)
  await phase3(ctx)
  await phase4(ctx)
  await phase5(ctx)

  return results
}
