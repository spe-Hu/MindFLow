import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const facts = ['本地优先 · 数据属于你', '离线可用 · 联网自动同步', '开源 · MIT License']

export default function Manifesto() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="bg-paper-deep py-24 sm:py-32" ref={ref}>
      <div className="mx-auto max-w-[1200px] px-6 sm:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="max-w-3xl"
        >
          <div className="font-mono text-xs tracking-[0.22em] text-ink-subtle mb-6">
            WHY — 为什么做 MindFlow
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.15] text-ink">
            思考和执行，
            <br />
            本不该住在两个软件里。
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-ink-muted max-w-2xl">
            思维导图负责发散，任务管理负责收敛。MindFlow 把两者放进同一张图：
            节点一键成任务，任务回写进图里。想法从冒出来那一刻起，就在被执行。
          </p>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
            {facts.map((f) => (
              <span key={f} className="font-mono text-xs text-ink-subtle tracking-wide flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
                {f}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}