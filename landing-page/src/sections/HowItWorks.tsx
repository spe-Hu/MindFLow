import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

/* 深色 mini visuals —— 与 Hero 产品窗同一套暗夜色阶 */

function VisualMindmap() {
  return (
    <div className="rounded-2xl bg-night-800 ring-1 ring-lineDark p-6">
      <div className="space-y-3">
        <div className="inline-block rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
          产品规划
        </div>
        <div className="pl-4 space-y-2.5">
          {['功能定义', '竞品分析', '用户调研'].map((t) => (
            <div key={t} className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[#3A342C]" />
              <span className="text-sm text-dm-muted">{t}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 pt-4 border-t border-lineDark font-mono text-[10px] text-dm-muted tracking-wide">
        左键拖拽 · 右键新建 · 无限层级
      </div>
    </div>
  )
}

function VisualKanban() {
  return (
    <div className="rounded-2xl bg-night-800 ring-1 ring-lineDark p-6">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-dm-text">
        <div className="h-3 w-5 rounded-sm bg-brand" />
        待处理
        <span className="rounded-full bg-[#2B261F] px-2 py-0.5 font-mono text-[10px] font-normal text-dm-muted">3</span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-lg bg-[#211D19] ring-1 ring-lineDark p-3">
          <div className="h-3 w-3 rounded-sm border-2 border-brand" />
          <span className="flex-1 text-sm text-dm-text">设计原型图</span>
          <span className="rounded-md bg-[rgba(210,153,34,0.15)] px-2 py-0.5 text-[10px] font-semibold text-[#E5B84C]">P0</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-[#211D19] ring-1 ring-lineDark p-3">
          <div className="h-3 w-3 rounded-sm border-2 border-[#4A443B]" />
          <span className="flex-1 text-sm text-dm-muted">编写技术选型文档</span>
          <span className="rounded-md bg-[rgba(63,185,80,0.14)] px-2 py-0.5 text-[10px] font-semibold text-[#6FD08A]">P2</span>
        </div>
      </div>
      <div className="mt-5 pt-4 border-t border-lineDark font-mono text-[10px] text-dm-muted tracking-wide">
        按 T — 节点即刻成任务
      </div>
    </div>
  )
}

function VisualDone() {
  return (
    <div className="rounded-2xl bg-night-800 ring-1 ring-lineDark p-6">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-dm-text">
        <div className="h-3 w-5 rounded-sm bg-[#3FB950]" />
        已完成
      </div>
      <div className="space-y-2">
        {[
          { t: '竞品分析报告', d: '2 天前' },
          { t: '用户调研问卷', d: '5 天前' },
        ].map((r) => (
          <div key={r.t} className="flex items-center gap-2 rounded-lg bg-[#1C1916] ring-1 ring-lineDark p-3 opacity-70">
            <div className="h-3 w-3 rounded-sm bg-[#3FB950]" />
            <span className="flex-1 text-sm text-dm-muted line-through">{r.t}</span>
            <span className="font-mono text-[10px] text-dm-muted">{r.d}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 pt-4 border-t border-lineDark font-mono text-[10px] text-dm-muted tracking-wide">
        看板流转 · 日历排期 · 番茄钟专注
      </div>
    </div>
  )
}

const steps = [
  {
    num: '01',
    title: '铺陈',
    description: '新建一张导图，把脑子里的想法全部摊开。层级不限，结构随心——思考的第一步是看见全貌。',
    visual: <VisualMindmap />,
  },
  {
    num: '02',
    title: '标记',
    description: '关键节点右键或按 T「转为任务」，配上优先级与截止日。想法与待办之间，只有一次按键的距离。',
    visual: <VisualKanban />,
  },
  {
    num: '03',
    title: '推进',
    description: '拖卡片、排日历、开番茄钟。所有进度写回同一张图——不用在工具之间搬运上下文。',
    visual: <VisualDone />,
  },
]

export default function HowItWorks() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="how-it-works" className="bg-night py-24 sm:py-32" ref={ref}>
      <div className="mx-auto max-w-[1200px] px-6 sm:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mb-16 md:mb-24"
        >
          <div className="font-mono text-xs tracking-[0.22em] text-dm-muted mb-6">
            HOW IT WORKS — 工作方式
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] text-paper">
            三步，一个闭环。
          </h2>
          <p className="mt-5 text-lg text-dm-muted max-w-xl">
            不切换工具。从发散思考到落地执行，在同一张图里走完。
          </p>
        </motion.div>

        <div className="space-y-20 md:space-y-28">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className={`grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 items-center ${
                i % 2 === 1 ? 'md:[direction:rtl]' : ''
              }`}
            >
              <div className={i % 2 === 1 ? 'md:[direction:ltr]' : ''}>
                <div className="font-mono text-sm text-brand-soft mb-4">{step.num}</div>
                <h3 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] text-paper mb-4">
                  {step.title}
                </h3>
                <p className="text-base leading-relaxed text-dm-muted max-w-md">
                  {step.description}
                </p>
              </div>
              <div className={i % 2 === 1 ? 'md:[direction:ltr]' : ''}>{step.visual}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}