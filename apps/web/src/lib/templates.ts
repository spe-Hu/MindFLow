export interface MindMapTemplate {
  id: string
  name: string
  description: string
  icon: string // lucide icon name
  tree_data: Record<string, unknown>
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createNode(
  text: string,
  children: Record<string, unknown>[] = [],
  options: { isTask?: boolean; priority?: string; dueDays?: number } = {}
): Record<string, unknown> {
  const uid = generateId()
  const data: Record<string, unknown> = {
    text,
    uid,
    expand: true,
  }
  if (options.isTask) {
    data._isTask = true
    data._status = 'todo'
    if (options.priority) {
      data._priority = options.priority
    }
    if (options.dueDays !== undefined) {
      const d = new Date()
      d.setDate(d.getDate() + options.dueDays)
      data._dueDate = d.toISOString()
    }
    // Default task styling
    data.fillColor = '#eff6ff'
    data.borderColor = '#93c5fd'
    data.color = '#1e40af'
  }
  return {
    data,
    children,
  }
}

/**
 * Predefined project templates for quick project creation.
 * Each template provides a ready-made mindmap structure.
 */
export const PROJECT_TEMPLATES: MindMapTemplate[] = [
  {
    id: 'blank',
    name: '空白项目',
    description: '从一个空白的思维导图开始',
    icon: 'FileText',
    tree_data: {
      data: {
        text: '',
        uid: 'root',
        expand: true,
        isRoot: true,
      },
      children: [],
    },
  },
  {
    id: 'product-dev',
    name: '产品开发',
    description: '从需求到上线的完整开发流程',
    icon: 'Rocket',
    tree_data: {
      data: {
        text: '',
        uid: 'root',
        expand: true,
        isRoot: true,
        children: [],
      },
      children: [
        createNode('需求分析', [
          createNode('用户调研', [], { isTask: true, priority: 'high', dueDays: 7 }),
          createNode('竞品分析', [], { isTask: true, priority: 'medium', dueDays: 14 }),
          createNode('需求文档', [], { isTask: true, priority: 'high', dueDays: 14 }),
        ]),
        createNode('设计阶段', [
          createNode('交互原型', [], { isTask: true, priority: 'high', dueDays: 21 }),
          createNode('视觉设计', [], { isTask: true, priority: 'medium', dueDays: 28 }),
          createNode('设计评审', [], { isTask: true, priority: 'medium', dueDays: 35 }),
        ]),
        createNode('开发实现', [
          createNode('技术方案', [], { isTask: true, priority: 'high', dueDays: 21 }),
          createNode('后端开发', [], { isTask: true, priority: 'high', dueDays: 49 }),
          createNode('前端开发', [], { isTask: true, priority: 'high', dueDays: 49 }),
          createNode('接口联调', [], { isTask: true, priority: 'medium', dueDays: 56 }),
        ]),
        createNode('测试上线', [
          createNode('功能测试', [], { isTask: true, priority: 'high', dueDays: 63 }),
          createNode('Bug 修复', [], { isTask: true, priority: 'urgent', dueDays: 70 }),
          createNode('上线发布', [], { isTask: true, priority: 'high', dueDays: 77 }),
          createNode('数据监控', [], { isTask: true, priority: 'low', dueDays: 84 }),
        ]),
      ],
    },
  },
  {
    id: 'thesis',
    name: '论文写作',
    description: '从选题到答辩的学术研究计划',
    icon: 'GraduationCap',
    tree_data: {
      data: {
        text: '',
        uid: 'root',
        expand: true,
        isRoot: true,
        children: [],
      },
      children: [
        createNode('选题与开题', [
          createNode('文献综述', [], { isTask: true, priority: 'high', dueDays: 14 }),
          createNode('研究问题界定', [], { isTask: true, priority: 'high', dueDays: 21 }),
          createNode('开题报告', [], { isTask: true, priority: 'high', dueDays: 30 }),
        ]),
        createNode('研究阶段', [
          createNode('实验设计/数据收集', [], { isTask: true, priority: 'high', dueDays: 60 }),
          createNode('数据分析', [], { isTask: true, priority: 'high', dueDays: 90 }),
          createNode('结果整理', [], { isTask: true, priority: 'medium', dueDays: 105 }),
        ]),
        createNode('论文撰写', [
          createNode('第一章 绪论', [], { isTask: true, priority: 'high', dueDays: 120 }),
          createNode('第二章 相关工作', [], { isTask: true, priority: 'high', dueDays: 135 }),
          createNode('第三章 方法论', [], { isTask: true, priority: 'high', dueDays: 150 }),
          createNode('第四章 实验结果', [], { isTask: true, priority: 'high', dueDays: 165 }),
          createNode('第五章 结论', [], { isTask: true, priority: 'medium', dueDays: 175 }),
        ]),
        createNode('答辩准备', [
          createNode('导师修改', [], { isTask: true, priority: 'high', dueDays: 190 }),
          createNode('格式审查', [], { isTask: true, priority: 'medium', dueDays: 200 }),
          createNode('答辩 PPT', [], { isTask: true, priority: 'high', dueDays: 210 }),
          createNode('模拟答辩', [], { isTask: true, priority: 'medium', dueDays: 217 }),
        ]),
      ],
    },
  },
  {
    id: 'event-planning',
    name: '活动策划',
    description: '从策划到执行的完整体系',
    icon: 'CalendarDays',
    tree_data: {
      data: {
        text: '',
        uid: 'root',
        expand: true,
        isRoot: true,
        children: [],
      },
      children: [
        createNode('前期策划', [
          createNode('确定活动主题', [], { isTask: true, priority: 'high', dueDays: 3 }),
          createNode('预算编制', [], { isTask: true, priority: 'high', dueDays: 5 }),
          createNode('场地考察', [], { isTask: true, priority: 'medium', dueDays: 7 }),
          createNode('物料清单', [], { isTask: true, priority: 'medium', dueDays: 10 }),
        ]),
        createNode('宣传推广', [
          createNode('宣传海报设计', [], { isTask: true, priority: 'medium', dueDays: 14 }),
          createNode('社交媒体推送', [], { isTask: true, priority: 'medium', dueDays: 21 }),
          createNode('报名渠道搭建', [], { isTask: true, priority: 'high', dueDays: 14 }),
        ]),
        createNode('现场执行', [
          createNode('流程彩排', [], { isTask: true, priority: 'high', dueDays: 28 }),
          createNode('人员分工', [], { isTask: true, priority: 'high', dueDays: 25 }),
          createNode('设备调试', [], { isTask: true, priority: 'high', dueDays: 29 }),
          createNode('签到接待', [], { isTask: true, priority: 'medium', dueDays: 30 }),
        ]),
        createNode('复盘总结', [
          createNode('费用结算', [], { isTask: true, priority: 'medium', dueDays: 35 }),
          createNode('效果评估', [], { isTask: true, priority: 'medium', dueDays: 37 }),
          createNode('经验归档', [], { isTask: true, priority: 'low', dueDays: 40 }),
        ]),
      ],
    },
  },
  {
    id: 'weekly-plan',
    name: '周计划',
    description: '高效的一周任务规划模板',
    icon: 'LayoutList',
    tree_data: {
      data: {
        text: '',
        uid: 'root',
        expand: true,
        isRoot: true,
        children: [],
      },
      children: [
        createNode('本周重点', [
          createNode('最重要的一件事', [], { isTask: true, priority: 'urgent', dueDays: 7 }),
          createNode('次要目标 A', [], { isTask: true, priority: 'high', dueDays: 7 }),
          createNode('次要目标 B', [], { isTask: true, priority: 'high', dueDays: 7 }),
        ]),
        createNode('学习成长', [
          createNode('阅读/课程', [], { isTask: true, priority: 'medium', dueDays: 7 }),
          createNode('技能练习', [], { isTask: true, priority: 'medium', dueDays: 7 }),
        ]),
        createNode('生活健康', [
          createNode('运动计划', [], { isTask: true, priority: 'medium', dueDays: 7 }),
          createNode('饮食记录', [], { isTask: true, priority: 'low', dueDays: 7 }),
        ]),
        createNode('复盘总结', [
          createNode('周五回顾', [], { isTask: true, priority: 'medium', dueDays: 5 }),
          createNode('下周规划', [], { isTask: true, priority: 'medium', dueDays: 6 }),
        ]),
      ],
    },
  },
]

/**
 * Get a template by its ID.
 */
export function getTemplateById(id: string): MindMapTemplate | undefined {
  return PROJECT_TEMPLATES.find((t) => t.id === id)
}

/**
 * Apply a template to create initial mindmap tree data.
 * The root node's text is replaced with the project name.
 */
export function applyTemplate(templateId: string, projectName: string): Record<string, unknown> {
  const tmpl = getTemplateById(templateId)
  if (!tmpl) {
    // Fallback to blank
    return {
      data: {
        text: projectName,
        uid: 'root',
        expand: true,
        isRoot: true,
      },
      children: [],
    }
  }

  // Deep clone and set root text to project name
  const tree = structuredClone(tmpl.tree_data) as Record<string, unknown>
  const rootData = (tree.data || {}) as Record<string, unknown>
  rootData.text = projectName
  return tree
}
