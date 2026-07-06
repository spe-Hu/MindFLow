# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: all-journeys.spec.ts >> MindFlow E2E – All Journeys >> Journey 2 – 多项目 + 全局任务 (AC-6~AC-13)
- Location: tests/e2e/all-journeys.spec.ts:41:7

# Error details

```
Error: C6 设置页归档恢复: locator.innerText: Error: strict mode violation: locator('aside') resolved to 2 elements:
    1) <aside class="w-60 flex flex-col border-r border-border-default bg-bg-surface shrink-0">…</aside> aka getByText('工作台全局任务日历最近编辑E2E-项目A-')
    2) <aside class="w-64 shrink-0 border-r border-border-default bg-bg-surface flex flex-col">…</aside> aka getByText('设置管理您的偏好与数据账户云端同步外观AI 助手存储快捷键')

Call log:
  - waiting for locator('aside')


expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e5]:
        - button "收起侧边栏" [ref=e6] [cursor=pointer]:
          - img
        - generic [ref=e7]:
          - img [ref=e9]
          - generic [ref=e14]: MindFlow
      - generic [ref=e15]:
        - button "全局搜索 Cmd+K" [ref=e16] [cursor=pointer]:
          - img [ref=e17]
          - generic [ref=e20]: 全局搜索
          - generic [ref=e21]: Cmd+K
        - button "通知" [ref=e23] [cursor=pointer]:
          - img [ref=e24]
        - button "用" [ref=e28] [cursor=pointer]:
          - generic [ref=e29]: 用
    - generic [ref=e30]:
      - complementary [ref=e31]:
        - generic [ref=e32]:
          - button "工作台" [ref=e33] [cursor=pointer]:
            - img [ref=e34]
            - text: 工作台
          - button "全局任务" [ref=e36] [cursor=pointer]:
            - img [ref=e37]
            - text: 全局任务
          - button "日历" [ref=e42] [cursor=pointer]:
            - img [ref=e43]
            - text: 日历
        - generic [ref=e45]:
          - generic [ref=e46]:
            - img [ref=e47]
            - generic [ref=e50]: 最近编辑
          - button "E2E-项目A-1783312763348" [ref=e51] [cursor=pointer]:
            - generic [ref=e53]: E2E-项目A-1783312763348
          - button "E2E-项目B-1783312763348" [ref=e54] [cursor=pointer]:
            - generic [ref=e56]: E2E-项目B-1783312763348
        - separator
        - generic [ref=e57]:
          - generic [ref=e58]:
            - generic [ref=e59]: 项目
            - button "新建项目" [ref=e60] [cursor=pointer]:
              - img
          - generic [ref=e61]:
            - generic [ref=e62]:
              - button "E2E-项目A-1783312763348" [ref=e63] [cursor=pointer]:
                - generic [ref=e65]: E2E-项目A-1783312763348
              - button [ref=e67] [cursor=pointer]:
                - img [ref=e68]
            - generic [ref=e72]:
              - button "E2E-项目B-1783312763348" [ref=e73] [cursor=pointer]:
                - generic [ref=e75]: E2E-项目B-1783312763348
              - button [ref=e77] [cursor=pointer]:
                - img [ref=e78]
        - separator
        - button "设置" [ref=e83] [cursor=pointer]:
          - img [ref=e84]
          - text: 设置
        - generic [ref=e88]:
          - generic [ref=e90]: 本
          - generic [ref=e91]:
            - paragraph [ref=e92]: 本地用户
            - paragraph [ref=e93]: 本地模式
      - main [ref=e94]:
        - generic [ref=e95]:
          - complementary [ref=e96]:
            - generic [ref=e97]:
              - heading "设置" [level=2] [ref=e98]
              - paragraph [ref=e99]: 管理您的偏好与数据
            - navigation [ref=e100]:
              - button "账户" [ref=e101] [cursor=pointer]:
                - img [ref=e102]
                - generic [ref=e105]: 账户
              - button "云端同步" [ref=e106] [cursor=pointer]:
                - img [ref=e107]
                - generic [ref=e109]: 云端同步
              - button "外观" [ref=e110] [cursor=pointer]:
                - img [ref=e111]
                - generic [ref=e117]: 外观
              - button "AI 助手" [ref=e118] [cursor=pointer]:
                - img [ref=e119]
                - generic [ref=e122]: AI 助手
              - button "存储" [ref=e123] [cursor=pointer]:
                - img [ref=e124]
                - generic [ref=e128]: 存储
              - button "快捷键" [ref=e129] [cursor=pointer]:
                - img [ref=e130]
                - generic [ref=e132]: 快捷键
            - generic [ref=e134]:
              - img [ref=e136]
              - generic [ref=e139]:
                - paragraph [ref=e140]: MindFlow
                - paragraph [ref=e141]: v1.1
          - main [ref=e142]:
            - generic [ref=e143]:
              - generic [ref=e144]:
                - generic [ref=e145]:
                  - heading "账户信息" [level=3] [ref=e146]
                  - paragraph [ref=e147]: 管理您的个人资料与登录状态
                - generic [ref=e148]:
                  - generic [ref=e149]:
                    - generic [ref=e150]:
                      - generic [ref=e151]: 显示名称
                      - textbox "输入显示名称" [ref=e152]
                    - generic [ref=e153]:
                      - generic [ref=e154]: 用户名
                      - textbox "输入用户名" [ref=e155]
                  - generic [ref=e156]:
                    - button "保存更改" [ref=e157] [cursor=pointer]
                    - button "退出登录" [ref=e158] [cursor=pointer]:
                      - img
                      - text: 退出登录
                  - separator
                  - generic [ref=e159]:
                    - generic [ref=e160]:
                      - paragraph [ref=e161]: 删除账户
                      - paragraph [ref=e162]: 此操作不可撤销，所有数据将被永久删除
                    - button "删除账户" [ref=e163] [cursor=pointer]
              - generic [ref=e164]:
                - generic [ref=e165]:
                  - heading "云端同步" [level=3] [ref=e166]
                  - paragraph [ref=e167]: 将本地数据备份到云端，多设备同步
                - generic [ref=e169]:
                  - generic [ref=e170]:
                    - img [ref=e172]
                    - generic [ref=e176]:
                      - paragraph [ref=e177]: 网络在线
                      - paragraph [ref=e178]: "上次同步: 尚未同步"
                  - generic [ref=e179]:
                    - paragraph [ref=e180]: 未登录
                    - paragraph [ref=e181]: 登录后可将数据同步到云端，多设备访问
                  - generic [ref=e182]:
                    - button "立即同步（上传）" [disabled]:
                      - img
                      - text: 立即同步（上传）
                    - button "从云端恢复" [disabled]:
                      - img
                      - text: 从云端恢复
              - generic [ref=e183]:
                - generic [ref=e184]:
                  - heading "外观" [level=3] [ref=e185]
                  - paragraph [ref=e186]: 自定义界面主题和布局偏好
                - generic [ref=e187]:
                  - generic [ref=e188]:
                    - generic [ref=e189]: 主题
                    - generic [ref=e190]:
                      - button "浅色" [ref=e191] [cursor=pointer]: 浅色
                      - button "深色" [ref=e193] [cursor=pointer]: 深色
                      - button "跟随系统" [ref=e195] [cursor=pointer]: 跟随系统
                  - separator
                  - generic [ref=e197]:
                    - generic [ref=e198]:
                      - generic [ref=e199]: 侧边栏宽度
                      - paragraph [ref=e200]: 调整左侧项目管理面板的宽度
                    - generic [ref=e201]:
                      - generic [ref=e203]: 240px
                      - group:
                        - generic:
                          - slider [ref=e205]: "240"
                          - slider [ref=e207]: "240"
                  - separator
                  - generic [ref=e208]:
                    - generic [ref=e209]:
                      - generic [ref=e210]: 紧凑模式
                      - paragraph [ref=e211]: 列表行高从 48px 降至 36px，节省屏幕空间
                    - switch [ref=e212]
                    - checkbox [ref=e213]
              - generic [ref=e214]:
                - generic [ref=e215]:
                  - heading "AI 助手" [level=3] [ref=e216]
                  - paragraph [ref=e217]: 配置外部 LLM API，让 AI 生成更灵活的思维导图结构
                - generic [ref=e218]:
                  - generic [ref=e219]:
                    - generic [ref=e220]:
                      - generic [ref=e221]: 启用外部 AI
                      - paragraph [ref=e222]: 开启后，新建项目时可选 AI 生成模式（需配置 API Key）
                    - switch [ref=e223]
                    - checkbox [ref=e224]
                  - separator
                  - generic [ref=e225]:
                    - button "保存配置" [ref=e226] [cursor=pointer]
                    - paragraph [ref=e227]: 未启用外部 AI 时，AI 生成将使用本地规则引擎
              - generic [ref=e228]:
                - generic [ref=e229]:
                  - heading "存储管理" [level=3] [ref=e230]
                  - paragraph [ref=e231]: 查看数据用量、备份与健康状态
                - generic [ref=e232]:
                  - generic [ref=e233]:
                    - generic [ref=e234]:
                      - img [ref=e236]
                      - generic [ref=e238]: 项目
                    - paragraph [ref=e239]: "1"
                    - paragraph [ref=e240]: 归档 1
                  - generic [ref=e241]:
                    - generic [ref=e242]:
                      - img [ref=e244]
                      - generic [ref=e248]: 节点
                    - paragraph [ref=e249]: "5"
                  - generic [ref=e250]:
                    - generic [ref=e251]:
                      - img [ref=e253]
                      - generic [ref=e258]: 任务
                    - paragraph [ref=e259]: "3"
                    - paragraph [ref=e260]: 完成 1
                  - generic [ref=e261]:
                    - generic [ref=e262]:
                      - img [ref=e264]
                      - generic [ref=e267]: 大小
                    - paragraph [ref=e268]: 2 KB
                - generic [ref=e269]:
                  - heading "数据备份" [level=4] [ref=e270]
                  - generic [ref=e272]:
                    - generic [ref=e273]: IndexedDB 用量
                    - generic [ref=e274]: 2 KB / 50 MB
                  - generic [ref=e277]:
                    - img [ref=e278]
                    - paragraph [ref=e282]: 尚未导出过数据备份，建议定期导出以防止数据丢失
                  - generic [ref=e283]:
                    - button "导出数据" [ref=e284] [cursor=pointer]:
                      - img
                      - text: 导出数据
                    - button "导入数据" [ref=e285] [cursor=pointer]:
                      - img
                      - text: 导入数据
                    - button "清除缓存" [ref=e286] [cursor=pointer]:
                      - img
                      - text: 清除缓存
                - generic [ref=e287]:
                  - generic [ref=e288]:
                    - generic [ref=e289]:
                      - heading "数据健康检查" [level=4] [ref=e290]
                      - paragraph [ref=e291]: 扫描数据一致性，自动修复异常
                    - button "运行检查" [ref=e293] [cursor=pointer]:
                      - img
                      - text: 运行检查
                  - paragraph [ref=e294]: 点击「运行检查」扫描数据一致性
                - generic [ref=e295]:
                  - heading "已归档项目" [level=4] [ref=e296]
                  - paragraph [ref=e297]: 暂无已归档项目
              - generic [ref=e298]:
                - generic [ref=e299]:
                  - heading "快捷键" [level=3] [ref=e300]
                  - paragraph [ref=e301]: 提升效率的键盘操作
                - generic [ref=e303]:
                  - generic [ref=e304]:
                    - generic [ref=e305]: 全局搜索
                    - generic [ref=e306]: Cmd / Ctrl + K
                  - generic [ref=e307]:
                    - generic [ref=e308]: 新建项目
                    - generic [ref=e309]: Cmd / Ctrl + Shift + N
                  - generic [ref=e310]:
                    - generic [ref=e311]: 创建同级节点
                    - generic [ref=e312]: Enter
                  - generic [ref=e313]:
                    - generic [ref=e314]: 创建子节点
                    - generic [ref=e315]: Tab
                  - generic [ref=e316]:
                    - generic [ref=e317]: 删除节点
                    - generic [ref=e318]: Delete / Backspace
                  - generic [ref=e319]:
                    - generic [ref=e320]: 展开/折叠节点
                    - generic [ref=e321]: Space
                  - generic [ref=e322]:
                    - generic [ref=e323]: 转为任务 / 取消
                    - generic [ref=e324]: T
    - region "Notifications alt+T"
  - button "番茄钟" [ref=e326] [cursor=pointer]:
    - img [ref=e327]
```

# Test source

```ts
  1  | import { test, expect, Page } from '@playwright/test'
  2  | import { runJourney1 } from './journey-1'
  3  | import { runJourney2 } from './journey-2'
  4  | import { runJourney3 } from './journey-3'
  5  | import { runJourney4 } from './journey-4'
  6  | import { runJourney5 } from './journey-5'
  7  | import { runJourney6 } from './journey-6'
  8  | 
  9  | import { runJourney7 } from './journey-7'
  10 | 
  11 | async function clearIndexedDB(page: Page) {
  12 |   await page.goto('/auth')
  13 |   await page.evaluate(() => {
  14 |     return new Promise<void>((resolve) => {
  15 |       const req = indexedDB.deleteDatabase('mindflow-db')
  16 |       req.onsuccess = () => resolve()
  17 |       req.onerror = () => resolve()
  18 |       req.onblocked = () => resolve()
  19 |     })
  20 |   })
  21 |   await page.waitForTimeout(300)
  22 | }
  23 | 
  24 | async function assertResults(results: { name: string; pass: boolean; detail?: string }[]) {
  25 |   for (const r of results) {
  26 |     if (!r.pass) {
  27 |       // eslint-disable-next-line no-console
  28 |       console.error(`FAIL: ${r.name} – ${r.detail || ''}`)
  29 |     }
> 30 |     expect(r.pass, `${r.name}: ${r.detail || ''}`).toBe(true)
     |                                                    ^ Error: C6 设置页归档恢复: locator.innerText: Error: strict mode violation: locator('aside') resolved to 2 elements:
  31 |   }
  32 | }
  33 | 
  34 | test.describe('MindFlow E2E – All Journeys', () => {
  35 |   test('Journey 1 – 单项目完整链路 (AC-1~AC-5)', async ({ page }) => {
  36 |     await clearIndexedDB(page)
  37 |     const results = await runJourney1(page)
  38 |     await assertResults(results)
  39 |   })
  40 | 
  41 |   test('Journey 2 – 多项目 + 全局任务 (AC-6~AC-13)', async ({ page }) => {
  42 |     await clearIndexedDB(page)
  43 |     const results = await runJourney2(page)
  44 |     await assertResults(results)
  45 |   })
  46 | 
  47 |   test('Journey 3 – 全局搜索 (S5)', async ({ page }) => {
  48 |     await clearIndexedDB(page)
  49 |     const results = await runJourney3(page)
  50 |     await assertResults(results)
  51 |   })
  52 | 
  53 |   test('Journey 4 – 日历视图 (S4)', async ({ page }) => {
  54 |     await clearIndexedDB(page)
  55 |     const results = await runJourney4(page)
  56 |     await assertResults(results)
  57 |   })
  58 | 
  59 |   test('Journey 5 – 项目重命名/删除/列表/筛选/空状态 (M11/M13)', async ({ page }) => {
  60 |     await clearIndexedDB(page)
  61 |     const results = await runJourney5(page)
  62 |     await assertResults(results)
  63 |   })
  64 | 
  65 |   test('Journey 6 – 节点删除/布局切换/任务反操作/主题/归档 (M1/M2/M3/M8/C6)', async ({ page }) => {
  66 |     await clearIndexedDB(page)
  67 |     const results = await runJourney6(page)
  68 |     await assertResults(results)
  69 |   })
  70 | 
  71 |   test('Journey 7 – 项目模板系统 (产品开发/周计划/空白模板)', async ({ page }) => {
  72 |     await clearIndexedDB(page)
  73 |     const results = await runJourney7(page)
  74 |     await assertResults(results)
  75 |   })
  76 | })
  77 | 
```