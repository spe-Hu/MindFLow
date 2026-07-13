import { motion } from 'framer-motion'

export default function CTA() {
  return (
    <section id="get-started" className="relative py-28 md:py-36">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-3xl px-8 py-20 text-center md:px-16 md:py-28"
          style={{
            background: 'linear-gradient(135deg, #1a1038 0%, #0B0F19 50%, #1a1038 100%)',
          }}
        >
          {/* Animated glow orbs inside CTA */}
          <div
            className="pointer-events-none absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full opacity-40 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(124, 92, 252, 0.4), transparent)' }}
          />
          <div
            className="pointer-events-none absolute -bottom-20 right-20 h-60 w-60 rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(159, 134, 255, 0.4), transparent)' }}
          />

          {/* Border glow */}
          <div
            className="pointer-events-none absolute inset-0 rounded-3xl"
            style={{
              boxShadow: 'inset 0 0 0 1px rgba(124, 92, 252, 0.2), 0 0 80px rgba(124, 92, 252, 0.1)',
            }}
          />

          <div className="relative z-10">
            <h2 className="mx-auto max-w-2xl text-4xl font-bold text-white md:text-5xl">
              告别工具间的来回搬运
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-lg text-[var(--text-secondary)]">
              免费注册，立刻开始规划你的第一个项目。思维导图、任务看板、日历视图，一次到位。
            </p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mt-10"
            >
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-[#0B0F19] shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                免费开始使用
              </a>
              <p className="mt-4 text-sm text-[var(--text-muted)]">
                无需信用卡 · 数据存储在本地 · 云端同步可选
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
