import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import {
  TreeStructure,
  Kanban,
  Lightning,
  TextAlignLeft,
  CalendarCheck,
  Flame,
  PencilSimple,
} from '@phosphor-icons/react'

const features = [
  {
    icon: TreeStructure,
    title: '无限画布思维导图',
    description: '支持任意层级的节点展开，自由拖拽布局。发散思路不受约束，让创意自然流淌。',
    colSpan: 2,
    rowSpan: 2,
  },
  {
    icon: Kanban,
    title: '节点转任务',
    description: '选中任意思维导图节点，一键转为可管理的任务项并进入看板视图。',
  },
  {
    icon: Lightning,
    title: 'AI 智能生成',
    description: '输入主题，AI 即刻生成结构化导图——含任务节点、优先级与截止期。支持任意 OpenAI 兼容 API；未配置时自动使用本地规则引擎离线生成。',
  },
  {
    icon: TextAlignLeft,
    title: '大纲与导图联动',
    description: '左侧大纲编辑，右侧导图实时同步。支持双向更新、拖拽排序。',
  },
  {
    icon: CalendarCheck,
    title: '日历与周视图',
    description: '所有任务自动落入日历，支持月视图和周视图，时间规划一目了然。',
  },
  {
    icon: Flame,
    title: '番茄钟专注模式',
    description: '集成的番茄钟计时器，帮你保持专注。每次专注都是生产力的累积。',
  },
  {
    icon: PencilSimple,
    title: '节点详情 + Markdown',
    description: '每个节点都有独立的详情面板，支持 Markdown 笔记、标签、截止时间。',
  },
]

export default function Features() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="features" className="relative bg-white py-24 sm:py-32 lg:py-40" ref={ref}>
      <div className="mx-auto max-w-[1200px] px-6 sm:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16 md:mb-20"
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl md:text-5xl">
            一张图连接所有工作
          </h2>
          <p className="mt-4 text-lg text-ink-subtle max-w-xl">
            从思维导图到任务执行，从卡诺看板到日历排期，MindFlow 把项目管理的关键环节无缝串联。
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.06 }}
                className={`group relative rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-6 sm:p-8 transition-all duration-300 hover:border-[rgba(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 ${
                  f.colSpan ? `md:col-span-${f.colSpan}` : ''
                } ${f.rowSpan ? 'md:row-span-2' : ''}`}
              >
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5F5F4] text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                  <Icon size={22} weight="duotone" />
                </div>
                <h3 className="text-lg font-bold text-ink mb-2">{f.title}</h3>
                <p className="text-[0.9375rem] leading-relaxed text-ink-subtle">{f.description}</p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
