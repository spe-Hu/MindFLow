/**
 * AI 辅助生成思维导图
 *
 * 可插拔生成引擎：
 * - 本地规则引擎（默认）：基于主题语义识别 + 模板骨架匹配，毫秒级生成
 * - 外部 LLM API（可选）：在 Settings 中配置 API Key，调用 OpenAI 兼容接口
 */

import { createNode, applyTemplate, getTemplateById } from './templates'
import { db } from './db'
import { devWarn } from './devConsole'

export interface AIGenerateOptions {
  theme: string
  /** 强制使用外部 API；仅在配置了 API Key 时生效 */
  preferApi?: boolean
}

export interface AIGenerateResult {
  tree_data: Record<string, unknown>
  usedTemplate: string
  source: 'api' | 'local'
}

export interface AIConfig {
  enabled: boolean
  apiKey: string
  baseUrl: string
  model: string
  preferApi: boolean
}

const DEFAULT_CONFIG: AIConfig = {
  enabled: false,
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  preferApi: false,
}

/** 从 IndexedDB 加载 AI 配置（若无则返回默认） */
export async function loadAIConfig(): Promise<AIConfig> {
  try {
    const keys = ['ai-enabled', 'ai-api-key', 'ai-base-url', 'ai-model', 'ai-prefer-api']
    const rows = await db.settings.where('key').anyOf(keys).toArray()
    const map: Record<string, unknown> = {}
    for (const r of rows) map[r.key] = r.value
    return {
      enabled:  map['ai-enabled']    === true || map['ai-enabled']    === 'true',
      apiKey:   (map['ai-api-key']   as string)  || DEFAULT_CONFIG.apiKey,
      baseUrl:  (map['ai-base-url']  as string)  || DEFAULT_CONFIG.baseUrl,
      model:    (map['ai-model']     as string)  || DEFAULT_CONFIG.model,
      preferApi: map['ai-prefer-api'] === true || map['ai-prefer-api'] === 'true',
    }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

/** 保存 AI 配置到 IndexedDB */
export async function saveAIConfig(cfg: AIConfig): Promise<void> {
  await db.settings.bulkPut([
    { key: 'ai-enabled',    value: cfg.enabled },
    { key: 'ai-api-key',    value: cfg.apiKey },
    { key: 'ai-base-url',   value: cfg.baseUrl },
    { key: 'ai-model',      value: cfg.model },
    { key: 'ai-prefer-api', value: cfg.preferApi },
  ])
}

// --------------------------------------------------
// 1. 主题语义识别规则
// --------------------------------------------------

interface ThemeRule {
  id: string
  keywords: string[]
}

const THEME_RULES: ThemeRule[] = [
  {
    id: 'product-dev',
    keywords: [
      '产品', '项目', '开发', '系统', '平台', 'app', '应用', 'api',
      '前端', '后端', '网站', '小程序', '软件', '功能', '迭代', '版本',
    ],
  },
  {
    id: 'thesis',
    keywords: [
      '论文', '研究', '学术', '答辩', '开题', '文献', '实验',
      '课题', '报告', '期刊', '综述', '毕业',
    ],
  },
  {
    id: 'event-planning',
    keywords: [
      '活动', '会议', '庆典', '团建', '策划', '发布会', '年会',
      '展会', '沙龙', '聚会', '婚礼', '派对', '仪式',
    ],
  },
  {
    id: 'weekly-plan',
    keywords: [
      '周计划', '本周', '下周', '月度', '日报', '周报',
      '计划', '待办', '日程', 'routine', 'todo',
    ],
  },
]

/** 根据主题文本匹配最相近的模板类型 */
function detectThemeType(theme: string): string {
  const lower = theme.toLowerCase()
  for (const rule of THEME_RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) {
      return rule.id
    }
  }
  return 'generic'
}

// --------------------------------------------------
// 2. 本地规则引擎 — 通用骨架
// --------------------------------------------------

/** 当主题不匹配任何已知模板时，使用通用 OKR + 执行骨架 */
function createGenericTree(theme: string): Record<string, unknown> {
  return {
    data: {
      text: theme,
      uid: 'root',
      expand: true,
      isRoot: true,
      children: [],
    },
    children: [
      createNode('核心目标', [
        createNode('明确项目愿景', [], { isTask: true, priority: 'high', dueDays: 3 }),
        createNode('定义关键成果', [], { isTask: true, priority: 'high', dueDays: 7 }),
        createNode('设定验收标准', [], { isTask: true, priority: 'medium', dueDays: 7 }),
      ]),
      createNode('执行计划', [
        createNode('前期调研与准备', [], { isTask: true, priority: 'high', dueDays: 14 }),
        createNode('核心任务拆解', [], { isTask: true, priority: 'high', dueDays: 21 }),
        createNode('阶段性交付物', [], { isTask: true, priority: 'high', dueDays: 30 }),
        createNode('质量检查与测试', [], { isTask: true, priority: 'medium', dueDays: 35 }),
      ]),
      createNode('资源与风险', [
        createNode('资源需求梳理', [], { isTask: true, priority: 'medium', dueDays: 10 }),
        createNode('潜在风险识别', [], { isTask: true, priority: 'medium', dueDays: 14 }),
        createNode('应急预案制定', [], { isTask: true, priority: 'low', dueDays: 21 }),
      ]),
      createNode('复盘与度量', [
        createNode('数据指标设定', [], { isTask: true, priority: 'medium', dueDays: 14 }),
        createNode('阶段性复盘', [], { isTask: true, priority: 'medium', dueDays: 30 }),
        createNode('最终总结归档', [], { isTask: true, priority: 'low', dueDays: 40 }),
      ]),
    ],
  }
}

// --------------------------------------------------
// 3. 外部 LLM API 层（可选）
// --------------------------------------------------

const SYSTEM_PROMPT = `你是 MindFlow 思维导图结构生成专家。用户输入一个项目主题，你需要生成一个结构化的思维导图 JSON。

要求：
1. 根节点 text 为用户输入的主题
2. 生成 3-5 个一级分支，每个分支下 2-4 个具体节点
3. 至少一半节点标记为任务节点（含 _isTask=true、_priority、_dueDate）
4. 节点层级不超过 2 层（一级分支 + 二级叶子）
5. 输出格式必须是纯 JSON，可直接作为 JavaScript 对象解析
6. JSON 结构：
{
  "data": { "text": "主题", "uid": "root", "expand": true, "isRoot": true, "children": [] },
  "children": [
    {
      "data": { "text": "分支1", "uid": "...", "expand": true },
      "children": [
        { "data": { "text": "子节点", "uid": "...", "_isTask": true, "_status": "todo", "_priority": "high", "_dueDate": "2026-07-13T00:00:00.000Z", "fillColor": "#eff6ff", "borderColor": "#93c5fd", "color": "#1e40af" }, "children": [] }
      ]
    }
  ]
}
7. uid 使用任意唯一字符串即可
8. _dueDate 是距离当前日期 7~60 天之后的 ISO 字符串
9. 所有 JSON 键必须双引号包裹，不要添加任何 markdown 代码块标记，只输出纯 JSON
`

async function callLLMForMindMap(theme: string, cfg: AIConfig): Promise<Record<string, unknown> | null> {
  const apiKey = cfg.apiKey.trim()
  if (!apiKey || !cfg.enabled) return null

  try {
    const resp = await fetch(`${cfg.baseUrl || 'https://api.openai.com/v1'}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `主题：${theme}` },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!resp.ok) {
      devWarn('[AI MindMap] LLM API error:', resp.status, await resp.text())
      return null
    }

    const json = await resp.json()
    const content = json.choices?.[0]?.message?.content as string | undefined
    if (!content) return null

    // 清理 markdown 代码块
    const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
    const parsed = JSON.parse(cleaned) as Record<string, unknown>
    return parsed
  } catch (err) {
    devWarn('[AI MindMap] LLM call failed:', err)
    return null
  }
}

// --------------------------------------------------
// 4. 主入口
// --------------------------------------------------

/**
 * 根据主题生成思维导图 tree_data。
 *
 * 策略：
 * 1. 如果 preferApi=true 且配置了 OpenAI Key → 尝试调用 API
 * 2. API 失败或无 Key → 回退到本地规则引擎
 * 3. 本地引擎：语义匹配模板骨架 → 个性化根节点文本
 * 4. 无匹配模板 → 使用通用 OKR 骨架
 */
export async function generateMindMapByAI(
  options: AIGenerateOptions
): Promise<AIGenerateResult> {
  const { theme, preferApi } = options

  const cfg = await loadAIConfig()

  // 尝试 API 模式
  if ((preferApi || cfg.preferApi) && cfg.enabled && cfg.apiKey) {
    const apiTree = await callLLMForMindMap(theme, cfg)
    if (apiTree) {
      return { tree_data: apiTree, usedTemplate: 'llm-api', source: 'api' }
    }
  }

  // 本地规则引擎
  const type = detectThemeType(theme)

  if (type !== 'generic') {
    const tmpl = getTemplateById(type)
    if (tmpl) {
      const tree = applyTemplate(type, theme)
      return { tree_data: tree, usedTemplate: type, source: 'local' }
    }
  }

  // 通用骨架
  const tree = createGenericTree(theme)
  return { tree_data: tree, usedTemplate: 'generic', source: 'local' }
}
