// Journey 10 E2E – 只读分享链接 (C2) + 节点图片/文件附件 (C5)
// 覆盖 PRD §11 两个新增功能。二者均依赖 Supabase，故用 page.route 拦截
// 鉴权 / users 表 / shared_links REST / Storage，无需真实后端。
//
// 策略：全新会话注入 mock supabase session（不经过本地模式，避免 SyncMigrationDialog
// 干扰，同时让 authStore.user 被 initSession 填充，满足附件上传的前置条件）。

import { Page, expect } from '@playwright/test'

const BASE_URL = process.env.MF_BASE_URL || 'http://localhost:5173'
const SUPABASE_URL = 'https://biywnxryvwsszplzirce.supabase.co'
const MOCK_USER_ID = 'e2e-share-attach-user'

interface JourneyResult {
  name: string
  pass: boolean
  detail?: string
}

const MOCK_SESSION = {
  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-signature',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'mock-refresh',
  user: {
    id: MOCK_USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'share@example.com',
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
}

// 最小可用 1x1 透明 PNG（base64）
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

function injectMockSession(page: Page) {
  return page.evaluate(
    (sessionJson) => {
      localStorage.setItem('sb-biywnxryvwsszplzirce-auth-token', sessionJson)
    },
    JSON.stringify(MOCK_SESSION)
  )
}

/** 聚焦 simple-mind-map 中指定文字节点（点击文字中心） */
async function focusNodeByText(page: Page, text: string) {
  const el = page.locator('text=' + text).first()
  await el.scrollIntoViewIfNeeded().catch(() => {})
  const box = await el.boundingBox()
  if (!box) throw new Error(`Node not found: ${text}`)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(300)
}

export async function runJourney10(page: Page): Promise<JourResultLike[]> {
  const results: JourneyResult[] = []

  // 捕获浏览器端错误，便于诊断
  page.on('pageerror', (err) => console.error('[browser pageerror]', err.message))
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error('[browser console.error]', msg.text())
  })

  // 跨 step 共享：分享链接存储（由 route handler 在 Node 侧写入）
  let sharedLinksStore: { token: string; snapshot: any; project_id: string } | null = null

  // ============ 全新会话 + mock supabase ============
  // 清 IndexedDB / localStorage，然后注入 mock session 并拦截所有 Supabase 请求
  await page.goto(BASE_URL + '/')
  await page.evaluate(() => {
    localStorage.removeItem('mindflow-auth-store')
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith('mindflow-')) localStorage.removeItem(k)
    })
  })
  await page.reload()
  // 删除 IndexedDB
  await page.evaluate(async () => {
    const req = indexedDB.deleteDatabase('mindflow-db')
    await new Promise<void>((resolve) => {
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
      req.onblocked = () => resolve()
    })
  })
  await page.waitForTimeout(400)

  await injectMockSession(page)

  await page.route(`${SUPABASE_URL}/**`, async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const method = req.method()
    const path = url.pathname

    // 鉴权
    if (path === '/auth/v1/user') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: MOCK_USER_ID, email: 'share@example.com', role: 'authenticated' }),
      })
    }
    if (path === '/auth/v1/token') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'mock', token_type: 'bearer', expires_in: 3600, refresh_token: 'mock', user: { id: MOCK_USER_ID } }),
      })
    }

    // users 表：initSession 查询（maybeSingle）并填充 authStore.user
    if (path.includes('/rest/v1/users')) {
      const userRow = {
        id: MOCK_USER_ID,
        username: 'shareuser',
        display_name: 'Share User',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([userRow]) })
    }

    // shared_links 表
    if (path === '/rest/v1/shared_links' || path.startsWith('/rest/v1/shared_links/')) {
      if (method === 'POST') {
        const body = req.postDataJSON()
        sharedLinksStore = {
          token: body.token,
          snapshot: body.snapshot,
          project_id: body.project_id,
        }
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'shared-1', ...body }),
        })
      }
      if (method === 'GET') {
        if (sharedLinksStore) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              {
                id: 'shared-1',
                project_id: sharedLinksStore.project_id,
                token: sharedLinksStore.token,
                snapshot: sharedLinksStore.snapshot,
                created_by: MOCK_USER_ID,
                created_at: new Date().toISOString(),
                expires_at: null,
              },
            ]),
          })
        }
        return route.fulfill({ status: 200, body: '[]' })
      }
      if (method === 'DELETE') {
        return route.fulfill({ status: 204, body: '' })
      }
    }

    // Storage 上传
    if (path.startsWith('/storage/v1/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: path }) })
    }

    // 其它读取默认返回空数组
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  // 重新加载让 app 读取注入的 session → initSession 填充 authStore.user
  await page.goto(BASE_URL + '/')
  await page.waitForTimeout(2000)

  // ============ 创建项目 + 任务节点 ============
  try {
    await page.locator('aside button[aria-label="新建项目"]').first().click()
    await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 })
    const input = page.locator('#project-name')
    await input.fill('分享与附件测试项目')
    await page.locator('[role="dialog"] button:has-text("创建")').first().click()
    await page.waitForURL(/\/project\//, { timeout: 10000 })
    await page.waitForFunction(
      () => document.querySelectorAll('g.smm-node').length > 0,
      undefined,
      { timeout: 15000, polling: 500 }
    )
    await page.waitForTimeout(600)

    // 创建子节点
    await page.locator('g.smm-node').first().click({ force: true })
    await page.waitForTimeout(300)
    await page.keyboard.press('Tab')
    await page.waitForTimeout(400)
    await page.keyboard.type('附件任务节点', { delay: 30 })
    await page.keyboard.press('Enter')
    await page.waitForTimeout(600)

    // 打开节点详情并转为任务
    await focusNodeByText(page, '附件任务节点')
    const viewDetailBtn = page.locator('button:has-text("查看详情")').first()
    await expect(viewDetailBtn).toBeVisible({ timeout: 5000 })
    await viewDetailBtn.click()
    await page.waitForTimeout(500)
    const toggleBtn = page.locator('[data-base-ui-portal] button:has-text("转为任务")').first()
    await expect(toggleBtn).toBeVisible({ timeout: 5000 })
    await toggleBtn.click()
    await page.waitForTimeout(500)
    await expect(page.locator('[data-base-ui-portal] button:has-text("已标记为任务")').first()).toBeVisible()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)

    const projectId = page.url().match(/\/project\/(.+)/)?.[1]
    if (!projectId) throw new Error('无法获取 projectId')

    results.push({ name: 'SETUP 项目 + 任务节点创建成功', pass: true })

    // ============ SHARE-1: 生成分享链接（Snapshot 写入 shared_links）============
    try {
      const shareBtn = page.locator('button[aria-label="分享项目"]').first()
      await expect(shareBtn).toBeVisible({ timeout: 5000 })
      await shareBtn.click()
      await page.waitForTimeout(1800)

      if (!sharedLinksStore || !sharedLinksStore.token) {
        throw new Error('点击分享后未检测到 shared_links 写入（token 缺失）')
      }
      const snap = sharedLinksStore.snapshot
      if (!snap || !snap.treeData) {
        throw new Error('分享快照缺少 treeData')
      }
      results.push({ name: 'SHARE-1 生成分享链接并写入 shared_links（含快照）', pass: true })
    } catch (e: any) {
      results.push({ name: 'SHARE-1 生成分享链接并写入 shared_links（含快照）', pass: false, detail: e.message })
    }

    // ============ SHARE-2: 公共只读分享页正确渲染 ============
    try {
      const token = sharedLinksStore!.token
      console.error('[SHARE-2] token=', token, '| url before goto=', page.url())
      await page.goto(BASE_URL + '/share/' + token, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)
      console.error('[SHARE-2] url after goto=', page.url())
      const nodeCount = await page.evaluate(() => document.querySelectorAll('g.smm-node').length)
      console.error('[SHARE-2] g.smm-node count after goto=', nodeCount)
      // SharePage 异步拉取快照并渲染只读导图
      await page.waitForFunction(
        () => document.querySelectorAll('g.smm-node').length > 0,
        undefined,
        { timeout: 15000, polling: 500 }
      )
      await page.waitForTimeout(600)

      const mainText = await page.locator('body').first().innerText()
      if (!mainText.includes('分享与附件测试项目')) {
        throw new Error('分享页未显示项目名快照')
      }
      // 只读导图应包含我们创建的任务节点文字
      const nodeTexts = await page.locator('g.smm-node text').allTextContents()
      if (!nodeTexts.includes('附件任务节点')) {
        throw new Error(`分享页只读导图未包含任务节点，实际: ${nodeTexts.join(' | ')}`)
      }
      // 品牌 footer
      const hasBrand = await page.locator('a:has-text("MindFlow")').first().isVisible().catch(() => false)
      if (!hasBrand) throw new Error('分享页缺少 MindFlow 品牌 footer')

      results.push({ name: 'SHARE-2 公共只读分享页渲染项目名 + 只读导图 + 品牌 footer', pass: true })
    } catch (e: any) {
      results.push({ name: 'SHARE-2 公共只读分享页渲染项目名 + 只读导图 + 品牌 footer', pass: false, detail: e.message })
    }

    // ============ ATTACH-1: 节点附件上传成功（Storage mock）============
    try {
      await page.goto(BASE_URL + '/project/' + projectId)
      await page.waitForFunction(
        () => document.querySelectorAll('g.smm-node').length > 0,
        undefined,
        { timeout: 15000, polling: 500 }
      )
      await page.waitForTimeout(600)

      await focusNodeByText(page, '附件任务节点')
      const viewDetailBtn2 = page.locator('button:has-text("查看详情")').first()
      await expect(viewDetailBtn2).toBeVisible({ timeout: 5000 })
      await viewDetailBtn2.click()
      await page.waitForTimeout(500)

      // 切到「附件」Tab
      const attachTab = page.locator('[data-base-ui-portal] button:has-text("附件")').first()
      await expect(attachTab).toBeVisible({ timeout: 5000 })
      await attachTab.click()
      await page.waitForTimeout(400)

      // 通过隐藏 file input 注入 PNG
      const fileInput = page.locator('input[type="file"]').first()
      await expect(fileInput).toBeAttached({ timeout: 5000 })
      const pngBuffer = Buffer.from(PNG_BASE64, 'base64')
      await fileInput.setInputFiles({
        name: 'test-share-attachment.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
      })

      // 等待上传成功 toast
      let uploadOk = false
      for (let i = 0; i < 16; i++) {
        await page.waitForTimeout(500)
        const bt = await page.locator('body').innerText().catch(() => '')
        if (bt.includes('附件上传成功')) {
          uploadOk = true
          break
        }
        if (bt.includes('用户未登录') || bt.includes('无法上传')) {
          throw new Error('附件上传被拒绝: ' + bt.slice(0, 120))
        }
      }
      if (!uploadOk) throw new Error('未检测到"附件上传成功"提示')

      results.push({ name: 'ATTACH-1 节点附件上传成功（Storage mock）', pass: true })
    } catch (e: any) {
      results.push({ name: 'ATTACH-1 节点附件上传成功（Storage mock）', pass: false, detail: e.message })
    }

    // ============ ATTACH-2: 附件出现在列表中（持久化到任务）============
    try {
      // 等待列表中出现文件名
      let nameVisible = false
      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(400)
        const bt = await page.locator('body').innerText().catch(() => '')
        if (bt.includes('test-share-attachment.png')) {
          nameVisible = true
          break
        }
      }
      if (!nameVisible) throw new Error('附件列表中未出现文件名 test-share-attachment.png')

      results.push({ name: 'ATTACH-2 附件出现在列表并持久化到任务', pass: true })
    } catch (e: any) {
      results.push({ name: 'ATTACH-2 附件出现在列表并持久化到任务', pass: false, detail: e.message })
    }
  } catch (e: any) {
    results.push({ name: 'SETUP 项目 + 任务节点创建成功', pass: false, detail: e.message })
  }

  return results
}
