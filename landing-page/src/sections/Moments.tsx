import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const scenes = [
  {
    n: 'SCENE_01',
    title: '独立开发者',
    desc: '从灵光一现到版本发布：一张图拆需求、转任务、盯排期。一个标签页，就是整个作战室。',
  },
  {
    n: 'SCENE_02',
    title: '产品经理',
    desc: '评审前把脑暴落成结构：需求树即任务树。会上投屏的那一张，就是可执行的清单。',
  },
  {
    n: 'SCENE_03',
    title: '论文与创作',
    desc: '把庞杂资料拆成章节与待办：大纲与导图互相同步，写作进度一眼见底。',
  },
]

export default function Moments() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section id="moments" className="bg-paper py-24 sm:py-32" ref={ref}>
      <div className="mx-auto max-w-[1200px] px-6 sm:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mb-14 md:mb-16"
        >
          <div className="font-mono text-xs tracking-[0.22em] text-ink-subtle mb-6">
            SCENES — 使用时刻
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] text-ink">
            它在这些时刻登场。
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scenes.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: 'easeOut' }}
              className="rounded-2xl bg-paper-deep p-8 transition-colors duration-200 hover:bg-[#EAE4D8]"
            >
              <div className="font-mono text-[10px] tracking-[0.18em] text-ink-faint mb-6">{s.n}</div>
              <h3 className="text-lg font-semibold text-ink mb-3">{s.title}</h3>
              <p className="text-[15px] leading-relaxed text-ink-muted">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}