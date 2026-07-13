import { motion } from 'framer-motion'

const testimonials = [
  {
    quote: '以前我在 Xmind 里做思维导图，然后再手动把任务搬到滴答清单。MindFlow 让我省掉了这一步，推进效率至少提升了三成。',
    name: '林远帆',
    role: '产品总监',
    company: '某 SaaS 公司',
  },
  {
    quote: '同时管三个项目的时候，全局看板简直就是救命稻草。一眼就能知道今天该推进哪个节点，而不是在五个 App 之间来回翻。',
    name: '陈若水',
    role: '独立设计师',
    company: '',
  },
  {
    quote: '作为开发者，我对这类工具很挑剔。MindFlow 的离线支持和本地存储先跑起来、有网再同步的设定，对我来说太友好了。',
    name: '周牧之',
    role: '全栈工程师',
    company: '自由职业',
  },
]

export default function SocialProof() {
  return (
    <section id="reviews" className="relative py-28 md:py-36">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-[var(--brand-light)]">
            用户评价
          </p>
          <h2 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] md:text-5xl">
            他们都在用 MindFlow
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="gradient-border group relative flex flex-col rounded-2xl p-7 transition-all duration-300 hover:scale-[1.02]"
            >
              {/* Quote icon */}
              <svg className="mb-4" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 11H6C6 8.23858 8.23858 6 11 6V8C9.34315 8 8 9.34315 8 11H10V15H6V11H10Z" fill="#7C5CFC" opacity="0.6" />
                <path d="M18 11H14C14 8.23858 16.2386 6 19 6V8C17.3431 8 16 9.34315 16 11H18V15H14V11H18Z" fill="#7C5CFC" opacity="0.6" />
              </svg>

              <p className="flex-1 text-sm leading-relaxed text-[var(--text-primary)]">
                {t.quote}
              </p>

              <div className="mt-6 flex items-center gap-3 border-t border-[var(--border-subtle)] pt-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-subtle)] text-xs font-bold text-[var(--brand-light)]">
                  {t.name[0]}
                </div>
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">
                    {t.name}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {t.role}{t.company ? ` · ${t.company}` : ''}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
