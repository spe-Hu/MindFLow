# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: all-journeys.spec.ts >> MindFlow E2E – All Journeys >> Journey 3 – 全局搜索 (S5)
- Location: tests/e2e/all-journeys.spec.ts:54:7

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('button:has-text("离线使用，数据仅存本地")')

```

# Test source

```ts
  1   | // Journey 1 E2E - PRD AC-1 ~ AC-5
  2   | // 覆盖: 创建项目、思维导图节点 CRUD、节点转任务、看板拖拽、思维导图<->看板双向同步、刷新持久化
  3   | //
  4   | // 设计: 这是一个 Playwright 风格的测试脚本,可由 Playwright MCP 工具调度。
  5   | // 它使用语义化的 Playwright 调用 (page.goto / page.click / page.fill 等),
  6   | // 这些可以通过 MCP 适配器一对一驱动浏览器。
  7   | 
  8   | import { Page, expect } from '@playwright/test'
  9   | 
  10  | const BASE_URL = process.env.MF_BASE_URL || 'http://localhost:5173'
  11  | const PROJECT_NAME = 'E2E-项目A-' + Date.now()
  12  | const NODE_ROOT = '中心主题'
  13  | const NODE_CHILD_1 = '需求分析'
  14  | const NODE_CHILD_2 = '视觉设计'
  15  | const NODE_GRANDCHILD = '首页 mockup'
  16  | const NODE_GRANDCHILD_2 = '用户调研报告'
  17  | 
  18  | // helper: 进入本地模式 (免登录)
  19  | export async function enterLocalMode(page: Page) {
  20  |   await page.goto(BASE_URL + '/auth')
  21  |   await page.waitForTimeout(2500)
  22  |   // 「离线使用,数据仅存本地」按钮
  23  |   const offlineBtn = page.locator('button:has-text("离线使用，数据仅存本地")')
> 24  |   await offlineBtn.click()
      |                    ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  25  |   await page.waitForTimeout(2000)
  26  | }
  27  | 
  28  | // helper: 创建项目
  29  | export async function createProject(page: Page, name: string) {
  30  |   // 任意页面打开时,点侧边栏 + 新建项目 按钮
  31  |   await page.locator('aside button[aria-label="新建项目"]').first().click()
  32  |   await page.locator('input#project-name').fill(name)
  33  |   await page.locator('div[role="dialog"] button:has-text("创建")').click()
  34  |   // 等到跳转到 /project/:id
  35  |   await page.waitForURL(/\/project\/.+/, { timeout: 5000 })
  36  | }
  37  | 
  38  | // helper: 在思维导图上根据文字找到节点并点击（绕过 Playwright SVG 定位限制）
  39  | async function clickNodeByText(page: Page, text: string) {
  40  |   const el = page.locator('text=' + text).first()
  41  |   await el.scrollIntoViewIfNeeded().catch(() => {})
  42  |   const box = await el.boundingBox()
  43  |   if (!box) throw new Error(`Node not found: ${text}`)
  44  |   await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  45  |   await page.waitForTimeout(200)
  46  | }
  47  | 
  48  | // helper: 添加同级节点 (Enter) - 先选中再按 Enter,然后输入文本
  49  | async function addSiblingNode(page: Page, text: string) {
  50  |   await page.keyboard.press('Enter')
  51  |   // simple-mind-map 节点进入编辑态,等待 input/textarea
  52  |   await page.waitForTimeout(200)
  53  |   await page.keyboard.type(text)
  54  |   await page.keyboard.press('Enter') // 确认
  55  |   await page.waitForTimeout(200)
  56  | }
  57  | 
  58  | export async function runJourney1(page: Page) {
  59  |   const results: { name: string; pass: boolean; detail?: string }[] = []
  60  | 
  61  |   // ===== AC-1.1 创建项目 =====
  62  |   try {
  63  |     await enterLocalMode(page)
  64  |     await createProject(page, PROJECT_NAME)
  65  |     // 验证: 侧边栏包含项目名
  66  |     await expect(page.locator('aside')).toContainText(PROJECT_NAME)
  67  |     // 验证: 进入思维导图页,画布存在,根节点 "中心主题" (NewProjectDialog 把 root 的 text 设为项目名)
  68  |     await expect(page.locator('text=' + PROJECT_NAME).first()).toBeVisible({ timeout: 3000 })
  69  |     results.push({ name: 'AC-6 创建项目', pass: true })
  70  |   } catch (e: any) {
  71  |     results.push({ name: 'AC-6 创建项目', pass: false, detail: e.message })
  72  |   }
  73  | 
  74  |   // ===== AC-1 添加节点 =====
  75  |   try {
  76  |     // headless 下 simple-mind-map Tab 创建节点不稳定，加 retry 机制
  77  |     let created = false
  78  |     for (let attempt = 0; attempt < 3; attempt++) {
  79  |       // 先点击 root 节点确保画布获得 focus (点 text 比点 g 更稳定)
  80  |       const rootNodeEl = page.locator('g.smm-node').first()
  81  |       await rootNodeEl.scrollIntoViewIfNeeded().catch(() => {})
  82  |       await rootNodeEl.click({ force: true })
  83  |       await page.waitForTimeout(300)
  84  |       // Tab 添加子节点
  85  |       await page.keyboard.press('Tab')
  86  |       await page.waitForTimeout(500)
  87  |       const editWrap = page.locator('div.smm-node-edit-wrap')
  88  |       if (await editWrap.count() === 0) {
  89  |         await page.waitForTimeout(200)
  90  |         continue
  91  |       }
  92  |       await page.keyboard.type(NODE_CHILD_1, { delay: 30 })
  93  |       await page.keyboard.press('Enter')
  94  |       await page.waitForTimeout(600)
  95  |       // 验证: 出现 "需求分析" 文字
  96  |       const found = await page.locator('text=' + NODE_CHILD_1).first().isVisible().catch(() => false)
  97  |       if (found) {
  98  |         created = true
  99  |         break
  100 |       }
  101 |     }
  102 |     if (!created) {
  103 |       throw new Error(`创建节点 "${NODE_CHILD_1}" 失败，3 次 retry 后仍未出现`)
  104 |     }
  105 |     results.push({ name: 'AC-1 创建节点', pass: true })
  106 |   } catch (e: any) {
  107 |     results.push({ name: 'AC-1 创建节点', pass: false, detail: e.message })
  108 |   }
  109 | 
  110 |   // ===== AC-2 节点任务化 =====
  111 |   try {
  112 |     // 选中刚创建的节点
  113 |     await clickNodeByText(page, NODE_CHILD_1)
  114 |     await page.waitForTimeout(300)
  115 |     // 浮动工具栏 "转为任务" - 点击
  116 |     const toggleBtn = page.locator('button:has-text("转为任务")')
  117 |     await toggleBtn.click()
  118 |     await page.waitForTimeout(300)
  119 |     // 验证: 工具栏变成 "已标记为任务"
  120 |     await expect(page.locator('button:has-text("已标记为任务")')).toBeVisible({ timeout: 2000 })
  121 |     // 验证: 跳到项目看板能看到这张卡片 (通过 ViewHeader 切到看板)
  122 |     await page.locator('button:has-text("看板")').first().click()
  123 |     await page.waitForTimeout(500)
  124 |     await expect(page.locator('text=' + NODE_CHILD_1).first()).toBeVisible({ timeout: 3000 })
```