import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const capabilities = [
  { n: '01', title: '无限画布思维导图', desc: '任意层级、自由拖拽、多种布局，思路不受版面约束。' },
  { n: '02', title: '节点一键转任务', desc: '选中节点按 T 即成任务，优先级、截止日、标签随手标注。' },
  { n: '03', title: '全局任务与看板', desc: '跨项目聚合所有任务，列表与看板视图自由切换。' },
  { n: '04', title: '日历与甘特图', desc: '截止日自动落进月/周视图，项目进度在时间线上展开。' },
  { n: '05', title: '番茄钟', desc: '内置专注计时，每一轮专注都被计数和沉淀。' },
  { n: '06', title: '大纲联动', desc: '左侧写大纲，右侧导图实时同步，用 Markdown 的速度思考。' },
  { n: '07', title: 'AI 生成骨架', desc: '输入主题即得结构化导图；兼容任意 OpenAI API，也可本地规则离线生成。' },
  { n: '08', title: '云端同步，离线优先', desc: 'IndexedDB 本地优先，Supabase 增量同步，冲突可感知、可裁决。' },
  { n: '09', title: 'Obsidian 双向同步', desc: '直接读写 .smm.md 文件，与 simple-mind-map 工作流无缝共存。' },
  { n: '10', title: '分享与导出', desc: '只读链接分享项目；JSON / CSV / PNG / SVG / Markdown / PDF 自由导出。' },
]

export default function Features() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="features" className="bg-paper py-24 sm:py-32" ref={ref}>
      <div className="mx-auto max-w-[1200px] px-6 sm:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mb-14 md:mb-16"
        >
          <div className="font-mono text-xs tracking-[0.22em] text-ink-subtle mb-6">
            CAPABILITIES — 能力清单
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] text-ink">
            一个工作台，
            <br className="sm:hidden" />
            装下从想法到交付。
          </h2>
          <p className="mt-5 text-lg text-ink-muted max-w-xl">
            不堆砌功能，每一项都服务于同一条主线：让想清楚的事被执行。
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16">
          {capabilities.map((c, i) => (
            <motion.div
              key={c.n}
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.04, ease: 'easeOut' }}
              className="group flex gap-6 border-t border-line py-7"
            >
              <span className="font-mono text-xs text-ink-faint pt-1 shrink-0">{c.n}</span>
              <div>
                <h3 className="text-[17px] font-semibold text-ink mb-1.5 transition-colors duration-150 group-hover:text-brand">
                  {c.title}
                </h3>
                <p className="text-[15px] leading-relaxed text-ink-subtle">{c.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}