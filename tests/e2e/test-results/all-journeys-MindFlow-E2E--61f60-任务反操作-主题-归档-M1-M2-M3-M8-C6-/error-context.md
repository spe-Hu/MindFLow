# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: all-journeys.spec.ts >> MindFlow E2E – All Journeys >> Journey 6 – 节点删除/布局切换/任务反操作/主题/归档 (M1/M2/M3/M8/C6)
- Location: tests/e2e/all-journeys.spec.ts:65:7

# Error details

```
Error: ARCHIVE 项目归档 → 侧边栏消失 → Settings 恢复 → 重现: locator.innerText: Error: strict mode violation: locator('main') resolved to 2 elements:
    1) <main class="flex-1 overflow-hidden">…</main> aka getByRole('main').filter({ hasText: '设置管理您的偏好与数据账户云端同步外观AI 助手存储快捷键' })
    2) <main data-settings-scroll="true" class="flex-1 overflow-y-auto bg-bg-primary scroll-smooth">…</main> aka getByRole('main').filter({ hasText: '设置管理您的偏好与数据账户云端同步外观AI 助手存储快捷键' }).getByRole('main')

Call log:
  - waiting for locator('main')


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
          - button "E2E-Layout-1783312798631" [ref=e51] [cursor=pointer]:
            - generic [ref=e53]: E2E-Layout-1783312798631
          - button "E2E-TaskOff-1783312798631" [ref=e54] [cursor=pointer]:
            - generic [ref=e56]: E2E-TaskOff-1783312798631
          - button "E2E-NodeDel-1783312798631" [ref=e57] [cursor=pointer]:
            - generic [ref=e59]: E2E-NodeDel-1783312798631
        - separator
        - generic [ref=e60]:
          - generic [ref=e61]:
            - generic [ref=e62]: 项目
            - button "新建项目" [ref=e63] [cursor=pointer]:
              - img
          - generic [ref=e64]:
            - generic [ref=e65]:
              - button "E2E-Layout-1783312798631" [ref=e66] [cursor=pointer]:
                - generic [ref=e68]: E2E-Layout-1783312798631
              - button [ref=e70] [cursor=pointer]:
                - img [ref=e71]
            - generic [ref=e75]:
              - button "E2E-NodeDel-1783312798631" [ref=e76] [cursor=pointer]:
                - generic [ref=e78]: E2E-NodeDel-1783312798631
              - button [ref=e80] [cursor=pointer]:
                - img [ref=e81]
            - generic [ref=e85]:
              - button "E2E-TaskOff-1783312798631" [ref=e86] [cursor=pointer]:
                - generic [ref=e88]: E2E-TaskOff-1783312798631
              - button [ref=e90] [cursor=pointer]:
                - img [ref=e91]
        - separator
        - button "设置" [ref=e96] [cursor=pointer]:
          - img [ref=e97]
          - text: 设置
        - generic [ref=e101]:
          - generic [ref=e103]: 本
          - generic [ref=e104]:
            - paragraph [ref=e105]: 本地用户
            - paragraph [ref=e106]: 本地模式
      - main [ref=e107]:
        - generic [ref=e108]:
          - complementary [ref=e109]:
            - generic [ref=e110]:
              - heading "设置" [level=2] [ref=e111]
              - paragraph [ref=e112]: 管理您的偏好与数据
            - navigation [ref=e113]:
              - button "账户" [ref=e114] [cursor=pointer]:
                - img [ref=e115]
                - generic [ref=e118]: 账户
              - button "云端同步" [ref=e119] [cursor=pointer]:
                - img [ref=e120]
                - generic [ref=e122]: 云端同步
              - button "外观" [ref=e123] [cursor=pointer]:
                - img [ref=e124]
                - generic [ref=e130]: 外观
              - button "AI 助手" [ref=e131] [cursor=pointer]:
                - img [ref=e132]
                - generic [ref=e135]: AI 助手
              - button "存储" [ref=e136] [cursor=pointer]:
                - img [ref=e137]
                - generic [ref=e141]: 存储
              - button "快捷键" [ref=e142] [cursor=pointer]:
                - img [ref=e143]
                - generic [ref=e145]: 快捷键
            - generic [ref=e147]:
              - img [ref=e149]
              - generic [ref=e152]:
                - paragraph [ref=e153]: MindFlow
                - paragraph [ref=e154]: v1.1
          - main [ref=e155]:
            - generic [ref=e156]:
              - generic [ref=e157]:
                - generic [ref=e158]:
                  - heading "账户信息" [level=3] [ref=e159]
                  - paragraph [ref=e160]: 管理您的个人资料与登录状态
                - generic [ref=e161]:
                  - generic [ref=e162]:
                    - generic [ref=e163]:
                      - generic [ref=e164]: 显示名称
                      - textbox "输入显示名称" [ref=e165]
                    - generic [ref=e166]:
                      - generic [ref=e167]: 用户名
                      - textbox "输入用户名" [ref=e168]
                  - generic [ref=e169]:
                    - button "保存更改" [ref=e170] [cursor=pointer]
                    - button "退出登录" [ref=e171] [cursor=pointer]:
                      - img
                      - text: 退出登录
                  - separator
                  - generic [ref=e172]:
                    - generic [ref=e173]:
                      - paragraph [ref=e174]: 删除账户
                      - paragraph [ref=e175]: 此操作不可撤销，所有数据将被永久删除
                    - button "删除账户" [ref=e176] [cursor=pointer]
              - generic [ref=e177]:
                - generic [ref=e178]:
                  - heading "云端同步" [level=3] [ref=e179]
                  - paragraph [ref=e180]: 将本地数据备份到云端，多设备同步
                - generic [ref=e182]:
                  - generic [ref=e183]:
                    - img [ref=e185]
                    - generic [ref=e189]:
                      - paragraph [ref=e190]: 网络在线
                      - paragraph [ref=e191]: "上次同步: 尚未同步"
                  - generic [ref=e192]:
                    - paragraph [ref=e193]: 未登录
                    - paragraph [ref=e194]: 登录后可将数据同步到云端，多设备访问
                  - generic [ref=e195]:
                    - button "立即同步（上传）" [disabled]:
                      - img
                      - text: 立即同步（上传）
                    - button "从云端恢复" [disabled]:
                      - img
                      - text: 从云端恢复
              - generic [ref=e196]:
                - generic [ref=e197]:
                  - heading "外观" [level=3] [ref=e198]
                  - paragraph [ref=e199]: 自定义界面主题和布局偏好
                - generic [ref=e200]:
                  - generic [ref=e201]:
                    - generic [ref=e202]: 主题
                    - generic [ref=e203]:
                      - button "浅色" [ref=e204] [cursor=pointer]: 浅色
                      - button "深色" [ref=e206] [cursor=pointer]: 深色
                      - button "跟随系统" [ref=e208] [cursor=pointer]: 跟随系统
                  - separator
                  - generic [ref=e210]:
                    - generic [ref=e211]:
                      - generic [ref=e212]: 侧边栏宽度
                      - paragraph [ref=e213]: 调整左侧项目管理面板的宽度
                    - generic [ref=e214]:
                      - generic [ref=e216]: 240px
                      - group:
                        - generic:
                          - slider [ref=e218]: "240"
                          - slider [ref=e220]: "240"
                  - separator
                  - generic [ref=e221]:
                    - generic [ref=e222]:
                      - generic [ref=e223]: 紧凑模式
                      - paragraph [ref=e224]: 列表行高从 48px 降至 36px，节省屏幕空间
                    - switch [ref=e225]
                    - checkbox [ref=e226]
              - generic [ref=e227]:
                - generic [ref=e228]:
                  - heading "AI 助手" [level=3] [ref=e229]
                  - paragraph [ref=e230]: 配置外部 LLM API，让 AI 生成更灵活的思维导图结构
                - generic [ref=e231]:
                  - generic [ref=e232]:
                    - generic [ref=e233]:
                      - generic [ref=e234]: 启用外部 AI
                      - paragraph [ref=e235]: 开启后，新建项目时可选 AI 生成模式（需配置 API Key）
                    - switch [ref=e236]
                    - checkbox [ref=e237]
                  - separator
                  - generic [ref=e238]:
                    - button "保存配置" [ref=e239] [cursor=pointer]
                    - paragraph [ref=e240]: 未启用外部 AI 时，AI 生成将使用本地规则引擎
              - generic [ref=e241]:
                - generic [ref=e242]:
                  - heading "存储管理" [level=3] [ref=e243]
                  - paragraph [ref=e244]: 查看数据用量、备份与健康状态
                - generic [ref=e245]:
                  - generic [ref=e246]:
                    - generic [ref=e247]:
                      - img [ref=e249]
                      - generic [ref=e251]: 项目
                    - paragraph [ref=e252]: "3"
                    - paragraph [ref=e253]: 归档 1
                  - generic [ref=e254]:
                    - generic [ref=e255]:
                      - img [ref=e257]
                      - generic [ref=e261]: 节点
                    - paragraph [ref=e262]: "7"
                  - generic [ref=e263]:
                    - generic [ref=e264]:
                      - img [ref=e266]
                      - generic [ref=e271]: 任务
                    - paragraph [ref=e272]: "0"
                    - paragraph [ref=e273]: 完成 0
                  - generic [ref=e274]:
                    - generic [ref=e275]:
                      - img [ref=e277]
                      - generic [ref=e280]: 大小
                    - paragraph [ref=e281]: 2 KB
                - generic [ref=e282]:
                  - heading "数据备份" [level=4] [ref=e283]
                  - generic [ref=e285]:
                    - generic [ref=e286]: IndexedDB 用量
                    - generic [ref=e287]: 2 KB / 50 MB
                  - generic [ref=e290]:
                    - img [ref=e291]
                    - paragraph [ref=e295]: 尚未导出过数据备份，建议定期导出以防止数据丢失
                  - generic [ref=e296]:
                    - button "导出数据" [ref=e297] [cursor=pointer]:
                      - img
                      - text: 导出数据
                    - button "导入数据" [ref=e298] [cursor=pointer]:
                      - img
                      - text: 导入数据
                    - button "清除缓存" [ref=e299] [cursor=pointer]:
                      - img
                      - text: 清除缓存
                - generic [ref=e300]:
                  - generic [ref=e301]:
                    - generic [ref=e302]:
                      - heading "数据健康检查" [level=4] [ref=e303]
                      - paragraph [ref=e304]: 扫描数据一致性，自动修复异常
                    - button "运行检查" [ref=e306] [cursor=pointer]:
                      - img
                      - text: 运行检查
                  - paragraph [ref=e307]: 点击「运行检查」扫描数据一致性
                - generic [ref=e308]:
                  - heading "已归档项目" [level=4] [ref=e309]
                  - generic [ref=e311]:
                    - generic [ref=e314]: E2E-Archive-1783312798631
                    - generic [ref=e315]:
                      - button "恢复" [ref=e316] [cursor=pointer]:
                        - img
                        - text: 恢复
                      - button [ref=e317] [cursor=pointer]:
                        - img
              - generic [ref=e318]:
                - generic [ref=e319]:
                  - heading "快捷键" [level=3] [ref=e320]
                  - paragraph [ref=e321]: 提升效率的键盘操作
                - generic [ref=e323]:
                  - generic [ref=e324]:
                    - generic [ref=e325]: 全局搜索
                    - generic [ref=e326]: Cmd / Ctrl + K
                  - generic [ref=e327]:
                    - generic [ref=e328]: 新建项目
                    - generic [ref=e329]: Cmd / Ctrl + Shift + N
                  - generic [ref=e330]:
                    - generic [ref=e331]: 创建同级节点
                    - generic [ref=e332]: Enter
                  - generic [ref=e333]:
                    - generic [ref=e334]: 创建子节点
                    - generic [ref=e335]: Tab
                  - generic [ref=e336]:
                    - generic [ref=e337]: 删除节点
                    - generic [ref=e338]: Delete / Backspace
                  - generic [ref=e339]:
                    - generic [ref=e340]: 展开/折叠节点
                    - generic [ref=e341]: Space
                  - generic [ref=e342]:
                    - generic [ref=e343]: 转为任务 / 取消
                    - generic [ref=e344]: T
    - region "Notifications alt+T"
  - button "番茄钟" [ref=e346] [cursor=pointer]:
    - img [ref=e347]
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
     |                                                    ^ Error: ARCHIVE 项目归档 → 侧边栏消失 → Settings 恢复 → 重现: locator.innerText: Error: strict mode violation: locator('main') resolved to 2 elements:
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