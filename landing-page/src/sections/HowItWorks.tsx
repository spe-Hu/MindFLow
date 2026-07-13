import { motion } from 'framer-motion'

const steps = [
  {
    num: '01',
    title: '梳理思路',
    desc: '在思维导图中拆解项目。拖拽节点、自由布局、多种结构，把复杂的项目拆成一张清晰的骨架图。',
    detail: '支持逻辑图、树形图、组织结构图、鱼骨图等 6 种布局，每个项目独立画布。',
    color: '#7C5CFC',
  },
  {
    num: '02',
    title: '标记任务',
    desc: '在想执行的地方一键标记节点为任务。复选框、截止日期、优先级字段自动出现，同步到看板。',
    detail: '任务状态（To Do / In Progress / Done）与导图节点实时双向同步，改一处，处处更新。',
    color: '#0D9488',
  },
  {
    num: '03',
    title: '持续推进',
    desc: '在项目看板中拖拽改状态，在日历视图中鸟瞰进度。导图、看板、日历三者永不脱节。',
    detail: '全局搜索、番茄钟、甘特图、Dashboard 仪表盘，为执行力全方位护航。',
    color: '#D97706',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-28 md:py-36">
      {/* Subtle section bg */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(124,92,252,0.02)] to-transparent" />

      <div className="section-container relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="mb-20 text-center"
        >
          <h2 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] md:text-5xl">
            三步，把事情推进到底
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-[var(--text-secondary)]">
            没有复杂的学习路径。理解三步背后的逻辑，就能驾驭所有项目。
          </p>
        </motion.div>

        <div className="relative">
          {/* Vertical connecting line */}
          <div className="absolute top-0 bottom-0 left-5 w-px bg-[var(--border-subtle)] md:left-1/2 md:-translate-x-px" />

          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: 0.15 * i, ease: [0.16, 1, 0.3, 1] }}
              className={`relative mb-16 flex flex-col gap-8 md:mb-24 md:flex-row md:items-center ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}
            >
              {/* Number bubble */}
              <div className="absolute left-5 top-0 z-10 -translate-x-1/2 md:left-1/2">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shadow-lg"
                  style={{ background: step.color, boxShadow: `0 0 20px ${step.color}60` }}
                >
                  {step.num}
                </div>
              </div>

              {/* Content */}
              <div className={`pl-12 md:w-1/2 md:pl-0 ${i % 2 === 1 ? 'md:pr-16 md:text-right' : 'md:pl-16'}`}>
                <div className="glass-card rounded-2xl p-7">
                  <h3 className="text-2xl font-bold text-[var(--text-primary)]">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-[var(--text-secondary)]">
                    {step.desc}
                  </p>
                  <div
                    className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium"
                    style={{ backgroundColor: step.color + '15', color: step.color }}
                  >
                    {step.detail}
                  </div>
                </div>
              </div>

              {/* Spacer for layout */}
              <div className="hidden md:block md:w-1/2" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
