import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { ArrowUpRight } from '@phosphor-icons/react'

const entries = [
  { date: '2026-08', tag: 'ENGINE',   text: '同步引擎 Phase 1 重构：LWW 冲突感知、离线队列、Realtime 订阅。' },
  { date: '2026-08', tag: 'TESTING',  text: '真实后端 E2E：J16–J22 覆盖自动同步、多端冲突、离线回放。' },
  { date: '2026-07', tag: 'TESTING',  text: '15 条完整用户旅程回归套件，90+ 断言持续守护。' },
  { date: '2026-07', tag: 'SYNC',     text: 'Obsidian .smm.md 双向同步，本地工作区上线。' },
  { date: '2026-06', tag: 'PLATFORM', text: 'PWA 离线可用，完整暗色模式。' },
]

export default function Changelog() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section id="changelog" className="bg-paper-deep py-24 sm:py-32" ref={ref}>
      <div className="mx-auto max-w-[1200px] px-6 sm:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mb-12 md:mb-14 flex flex-wrap items-end justify-between gap-6"
        >
          <div>
            <div className="font-mono text-xs tracking-[0.22em] text-ink-subtle mb-6">
              CHANGELOG — 更新
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] text-ink">
              持续打磨中。
            </h2>
          </div>
          <a
            href="https://github.com/spe-Hu/MindFLow"
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-1.5 font-mono text-xs text-ink-muted hover:text-ink transition-colors"
          >
            在 GitHub 上查看
            <ArrowUpRight size={14} weight="bold" className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </motion.div>

        <div>
          {entries.map((e, i) => (
            <motion.div
              key={`${e.date}-${e.text}`}
              initial={{ opacity: 0, y: 14 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: 0.1 + i * 0.06, ease: 'easeOut' }}
              className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-line py-5"
            >
              <span className="font-mono text-xs text-ink-faint w-20 shrink-0">{e.date}</span>
              <span className="font-mono text-[10px] tracking-[0.14em] text-brand bg-brand/10 rounded px-1.5 py-0.5 shrink-0">
                {e.tag}
              </span>
              <span className="text-[15px] text-ink-muted flex-1 min-w-[240px]">{e.text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}