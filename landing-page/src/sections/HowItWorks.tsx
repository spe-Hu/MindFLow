import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const steps = [
  {
    num: '01',
    title: '梳理思路',
    description: '新建一个思维导图，把头脑中的所有想法一一铺陈开来。支持无限层级展开，左键拖拽节点，右键快捷添加子节点。你的思考，无限制地生长。',
    visual: (
      <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-6 shadow-sm">
        <div className="space-y-3">
          <div className="inline-block rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">产品规划</div>
          <div className="pl-4 space-y-2">
            <div className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-[#ccc]" /><span className="text-sm text-ink-muted">功能定义</span></div>
            <div className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-[#ccc]" /><span className="text-sm text-ink-muted">竞品分析</span></div>
            <div className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-[#ccc]" /><span className="text-sm text-ink-muted">用户调研</span></div>
          </div>
        </div>
      </div>
    ),
  },
  {
    num: '02',
    title: '标记任务',
    description: '关键节点右键点击"转为任务"，自动填入看板。为任务设置优先级、截止时间、标签和负责人。从"想法"到"待办"只需要一次点击。',
    visual: (
      <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
          <div className="h-3 w-5 rounded-sm bg-[#7C5CFC]" />
          待处理 <span className="rounded-full bg-[#F5F5F4] px-2 py-0.5 text-xs font-normal text-ink-faint">3</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-lg border border-[rgba(0,0,0,0.06)] bg-white p-3">
            <div className="h-3 w-3 rounded-sm border-2 border-[#7C5CFC]" />
            <span className="flex-1 text-sm text-ink">设计原型图</span>
            <span className="rounded-md bg-[#FFF3E0] px-2 py-0.5 text-[10px] font-semibold text-[#E65100]">P0</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-[rgba(0,0,0,0.06)] bg-white p-3">
            <div className="h-3 w-3 rounded-sm border-2 border-[#ccc]" />
            <span className="flex-1 text-sm text-ink-muted">编写技术选型文档</span>
            <span className="rounded-md bg-[#E8F5E9] px-2 py-0.5 text-[10px] font-semibold text-[#2E7D32]">P2</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    num: '03',
    title: '持续推进',
    description: '拖拽卡片在看板中流转，日历视图安排具体排期，番茄钟保持专注执行。所有数据本地优先存储，登录即同步云端，随时随地持续推进。',
    visual: (
      <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-sm font-bold text-ink">
          <div className="h-3 w-5 rounded-sm bg-[#4CAF50]" />
          已完成
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-lg border border-[rgba(0,0,0,0.06)] bg-[#FAFAFA] p-3 opacity-70">
            <div className="h-3 w-3 rounded-sm bg-[#4CAF50]" />
            <span className="flex-1 text-sm text-ink-muted line-through">竞品分析报告</span>
            <span className="text-xs text-ink-faint">2天前</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-[rgba(0,0,0,0.06)] bg-[#FAFAFA] p-3 opacity-70">
            <div className="h-3 w-3 rounded-sm bg-[#4CAF50]" />
            <span className="flex-1 text-sm text-ink-muted line-through">用户调研问卷</span>
            <span className="text-xs text-ink-faint">5天前</span>
          </div>
        </div>
      </div>
    ),
  },
]

export default function HowItWorks() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="how-it-works" className="bg-[#F5F5F4] py-24 sm:py-32 lg:py-40" ref={ref}>
      <div className="mx-auto max-w-[1200px] px-6 sm:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16 md:mb-24"
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl md:text-5xl">
            三步完成项目闭环
          </h2>
          <p className="mt-4 text-lg text-ink-subtle max-w-xl">
            不用切换多个工具。在 MindFlow 里，从发散思考到落地执行，三个步骤一气呵成。
          </p>
        </motion.div>

        <div className="space-y-20 md:space-y-28">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.15 + i * 0.1 }}
              className={`grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center ${
                i % 2 === 1 ? 'md:[direction:rtl]' : ''
              }`}
            >
              <div className={i % 2 === 1 ? 'md:[direction:ltr]' : ''}>
                <div className="inline-block mb-6">
                  <span className="text-7xl font-black text-[rgba(124,92,252,0.12)] leading-none">
                    {step.num}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-ink sm:text-3xl mb-4">{step.title}</h3>
                <p className="text-[0.9375rem] leading-relaxed text-ink-subtle max-w-md">
                  {step.description}
                </p>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.6, delay: 0.3 + i * 0.1 }}
                className={i % 2 === 1 ? 'md:[direction:ltr]' : ''}
              >
                {step.visual}
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
