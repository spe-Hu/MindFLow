import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Quotes } from '@phosphor-icons/react'

const testimonials = [
  {
    name: '陈明远',
    role: '独立开发者',
    content: '以前我做项目规划要用三个工具：思维导图 + Trello + Notion。MindFlow 把这三者集成在一起，我只需要在一张图上思考，然后任务自动进入看板。效率至少提升了一倍。',
  },
  {
    name: '林晓薇',
    role: '产品经理 · 某 AI 初创公司',
    content: '团队需求的梳理是我每天最头疼的事。MindFlow 的大纲-导图联动功能太好用了，编辑大纲的同时导图自动更新。现在团队所有需求评审都用它了。',
  },
  {
    name: '张伟生',
    role: '自由设计师',
    content: '最打动我的是"本地优先"。我的项目数据全部存在本地 IndexedDB 里，安全感十足。云端同步可以手动控制，不会偷偷上传我的设计思路。',
  },
]

export default function SocialProof() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section id="social-proof" className="bg-white py-24 sm:py-32 lg:py-40" ref={ref}>
      <div className="mx-auto max-w-[1200px] px-6 sm:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16 md:mb-20 text-center md:text-left"
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl md:text-5xl">
            用户们怎么说
          </h2>
          <p className="mt-4 text-lg text-ink-subtle max-w-xl">
            近万名用户正在用 MindFlow 管理他们的项目和创意。
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
              className="relative rounded-2xl border border-[rgba(0,0,0,0.06)] bg-[#FAFAFA] p-7 sm:p-8 transition-all duration-300 hover:border-brand/20 hover:shadow-[0_4px_20px_rgba(124,92,252,0.06)] group"
            >
              <Quotes size={28} weight="fill" className="text-brand/20 mb-4" />
              <p className="text-[0.9375rem] leading-relaxed text-ink-muted mb-6">{t.content}</p>
              <div className="flex items-center gap-3 pt-5 border-t border-[rgba(0,0,0,0.06)]">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F0E8FF] text-brand text-sm font-bold">
                  {t.name[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink">{t.name}</div>
                  <div className="text-xs text-ink-faint">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
