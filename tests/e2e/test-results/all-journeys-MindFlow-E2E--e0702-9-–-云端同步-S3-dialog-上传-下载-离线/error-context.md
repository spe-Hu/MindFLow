# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: all-journeys.spec.ts >> MindFlow E2E – All Journeys >> Journey 9 – 云端同步 (S3): dialog + 上传/下载 + 离线
- Location: tests/e2e/all-journeys.spec.ts:108:7

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('button:has-text("离线使用，数据仅存本地")')

```

# Test source

```ts
  69  | 
  70  |     const pathname = new URL(url).pathname
  71  |     const key = `${method} ${pathname}`
  72  |     apiCalls[key] = (apiCalls[key] || 0) + 1
  73  | 
  74  |     // Auth user endpoint
  75  |     if (pathname === '/auth/v1/user') {
  76  |       return route.fulfill({
  77  |         status: 200,
  78  |         contentType: 'application/json',
  79  |         body: JSON.stringify({
  80  |           id: MOCK_USER_ID,
  81  |           email: 'test@example.com',
  82  |           role: 'authenticated',
  83  |         }),
  84  |       })
  85  |     }
  86  | 
  87  |     // Auth token refresh
  88  |     if (pathname === '/auth/v1/token') {
  89  |       return route.fulfill({
  90  |         status: 200,
  91  |         contentType: 'application/json',
  92  |         body: JSON.stringify({
  93  |           access_token: 'mock-token',
  94  |           token_type: 'bearer',
  95  |           expires_in: 3600,
  96  |           refresh_token: 'mock-refresh',
  97  |           user: { id: MOCK_USER_ID, email: 'test@example.com' },
  98  |         }),
  99  |       })
  100 |     }
  101 | 
  102 |     // Users table (initSession queries this)
  103 |     if (pathname.includes('/rest/v1/users')) {
  104 |       return route.fulfill({
  105 |         status: 200,
  106 |         contentType: 'application/json',
  107 |         body: JSON.stringify([
  108 |           {
  109 |             id: MOCK_USER_ID,
  110 |             username: 'testuser',
  111 |             display_name: 'Test User',
  112 |             avatar_url: null,
  113 |             created_at: new Date().toISOString(),
  114 |             updated_at: new Date().toISOString(),
  115 |           },
  116 |         ]),
  117 |       })
  118 |     }
  119 | 
  120 |     // Accept all writes without failure
  121 |     if (method === 'POST' || method === 'PATCH' || method === 'DELETE') {
  122 |       return route.fulfill({ status: 200, body: '{}' })
  123 |     }
  124 | 
  125 |     // Default: return empty arrays for all reads
  126 |     return route.fulfill({
  127 |       status: 200,
  128 |       contentType: 'application/json',
  129 |       body: '[]',
  130 |     })
  131 |   })
  132 | }
  133 | 
  134 | /** 在现有 route 基础上追加返回云端任务数据的 route */
  135 | async function mockCloudTasksRoute(page: Page) {
  136 |   await page.route('https://biywnxryvwsszplzirce.supabase.co/rest/v1/tasks**', async (route) => {
  137 |     const req = route.request()
  138 |     if (req.method() === 'GET') {
  139 |       return route.fulfill({
  140 |         status: 200,
  141 |         contentType: 'application/json',
  142 |         body: JSON.stringify([
  143 |           {
  144 |             id: 'cloud-task-1',
  145 |             project_id: 'cloud-project-id',
  146 |             node_uid: 'cloud-node-1',
  147 |             title: '云端恢复的任务',
  148 |             status: 'todo',
  149 |             priority: 'high',
  150 |             due_date: null,
  151 |             completed_at: null,
  152 |             sort_order: 0,
  153 |             user_id: MOCK_USER_ID,
  154 |             pomodoro_count: null,
  155 |           },
  156 |         ]),
  157 |       })
  158 |     }
  159 |     route.fulfill({ status: 200, body: '{}' })
  160 |   })
  161 | }
  162 | 
  163 | /** 创建本地数据（项目 + 思维导图节点 + 任务） */
  164 | async function createLocalData(page: Page) {
  165 |   // 进入本地模式
  166 |   await page.goto(BASE_URL + '/auth')
  167 |   await page.waitForTimeout(2500)
  168 |   const offlineBtn = page.locator('button:has-text("离线使用，数据仅存本地")')
> 169 |   await offlineBtn.click()
      |                    ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  170 |   await page.waitForTimeout(2500)
  171 | 
  172 |   // 创建项目
  173 |   await page.goto(BASE_URL + '/projects')
  174 |   await page.waitForTimeout(1500)
  175 |   await page.locator('button:has-text("新建项目")').first().click()
  176 |   await page.waitForTimeout(400)
  177 |   const dialog = page.locator('div[role="dialog"]').first()
  178 |   const input = dialog.locator('input[type="text"]').first()
  179 |   await input.fill('同步测试项目')
  180 |   await dialog.locator('button[type="submit"]').click()
  181 |   await page.waitForTimeout(1500)
  182 | 
  183 |   // 进入 mindmap 创建节点并转为任务
  184 |   await page.goto(BASE_URL + '/app')
  185 |   await page.waitForTimeout(2000)
  186 | 
  187 |   const projectLink = page.locator('text=同步测试项目').first()
  188 |   await expect(projectLink).toBeVisible({ timeout: 5000 })
  189 |   await projectLink.click()
  190 |   await page.waitForTimeout(2000)
  191 |   await page.waitForSelector('svg.smm-container', { timeout: 10000 })
  192 | 
  193 |   // 创建子节点
  194 |   await page.locator('g.smm-node').first().click({ force: true })
  195 |   await page.waitForTimeout(300)
  196 |   await page.keyboard.press('Tab')
  197 |   await page.waitForTimeout(400)
  198 |   await page.keyboard.type('云端同步任务节点', { delay: 30 })
  199 |   await page.keyboard.press('Enter')
  200 |   await page.waitForTimeout(600)
  201 | 
  202 |   // 转为任务
  203 |   await page.locator('g.smm-node').nth(1).click({ force: true })
  204 |   await page.waitForTimeout(300)
  205 |   await page.keyboard.press('t')
  206 |   await page.waitForTimeout(800)
  207 | 
  208 |   // 等待 syncTasksFromTree debounce 完成
  209 |   await page.waitForTimeout(1500)
  210 | }
  211 | 
  212 | export async function runJourney9(page: Page): Promise<JourneyResult[]> {
  213 |   const results: JourneyResult[] = []
  214 | 
  215 |   // 先创建本地数据（否则 SyncMigrationDialog 不会弹出）
  216 |   await createLocalData(page)
  217 | 
  218 |   // ============ SYNC-1: 未登录时 Settings 云端同步 Tab 状态正确 ============
  219 |   try {
  220 |     await page.goto(BASE_URL + '/settings')
  221 |     await page.waitForTimeout(2000)
  222 | 
  223 |     // 点击"云端同步"导航
  224 |     await page.locator('nav button:has-text("云端同步")').first().click()
  225 |     await page.waitForTimeout(600)
  226 | 
  227 |     const pageText = await page.locator('main').innerText()
  228 |     if (!pageText.includes('未登录')) {
  229 |       throw new Error('未登录时应显示"未登录"状态')
  230 |     }
  231 | 
  232 |     // 上传/下载按钮应被禁用
  233 |     const uploadBtn = page.locator('button:has-text("立即同步（上传）")').first()
  234 |     const downloadBtn = page.locator('button:has-text("从云端恢复")').first()
  235 |     const uploadDisabled = await uploadBtn.isDisabled().catch(() => true)
  236 |     const downloadDisabled = await downloadBtn.isDisabled().catch(() => true)
  237 |     if (!uploadDisabled || !downloadDisabled) {
  238 |       throw new Error('未登录时上传/下载按钮应被禁用')
  239 |     }
  240 | 
  241 |     results.push({ name: 'SYNC-1 未登录时 Settings 云端同步状态正确', pass: true })
  242 |   } catch (e: any) {
  243 |     results.push({ name: 'SYNC-1 未登录时 Settings 云端同步状态正确', pass: false, detail: e.message })
  244 |   }
  245 | 
  246 |   // ============ SYNC-2: mock 登录后 SyncMigrationDialog 弹出 ============
  247 |   try {
  248 |     // 先注入 mock session 并设置 route
  249 |     await injectMockSession(page)
  250 |     await mockSupabaseAPI(page)
  251 | 
  252 |     // 刷新页面让 supabase 读取注入的 session
  253 |     await page.goto(BASE_URL + '/app')
  254 |     await page.waitForTimeout(3000)
  255 | 
  256 |     const dialog = page.locator('div[role="dialog"]').filter({ hasText: '发现本地数据' }).first()
  257 |     const isVisible = await dialog.isVisible().catch(() => false)
  258 | 
  259 |     if (!isVisible) {
  260 |       // 再次检查（可能 dialog 已经在初始化阶段弹出了但被我们错过了）
  261 |       await page.waitForTimeout(1500)
  262 |       const retryVisible = await dialog.isVisible().catch(() => false)
  263 |       if (!retryVisible) {
  264 |         // 如果仍然看不到，再尝试重新刷新一次
  265 |         await injectMockSession(page)
  266 |         await page.goto(BASE_URL + '/app')
  267 |         await page.waitForTimeout(3000)
  268 |         const retry2 = await page
  269 |           .locator('div[role="dialog"]')
```