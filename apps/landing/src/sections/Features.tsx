import { motion } from 'framer-motion'

const features = [
  {
    title: '思维导图',
    desc: '拖拽节点、自由布局、多种结构。把一个想法拆成骨架，一眼看清全貌。',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7C5CFC" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="4" r="2.5" />
        <circle cx="4" cy="10" r="2.5" />
        <circle cx="20" cy="10" r="2.5" />
        <circle cx="4" cy="18" r="2.5" />
        <circle cx="20" cy="18" r="2.5" />
        <line x1="10" y1="5.5" x2="6" y2="8.5" />
        <line x1="14" y1="5.5" x2="18" y2="8.5" />
        <line x1="4" y1="12.5" x2="4" y2="15.5" />
        <line x1="20" y1="12.5" x2="20" y2="15.5" />
      </svg>
    ),
    spans: 'md:col-span-2 md:row-span-2',
    bg: 'linear-gradient(135deg, rgba(124,92,252,0.08), rgba(159,134,255,0.04))',
  },
  {
    title: '节点即任务',
    desc: '任意节点一键标记为任务，复选框、截止日期、优先级自动同步。',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
    spans: 'md:col-span-1',
    bg: 'linear-gradient(135deg, rgba(13,148,136,0.08), rgba(13,148,136,0.02))',
  },
  {
    title: '项目看板',
    desc: 'To Do / In Progress / Done 三列拖拽看板，状态实时回写导图。',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    spans: 'md:col-span-1',
    bg: 'linear-gradient(135deg, rgba(217,119,6,0.08), rgba(217,119,6,0.02))',
  },
  {
    title: '日历与甘特',
    desc: '月视图 + 周视图 + 甘特时间线，按截止日期鸟瞰全局进度。',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#BE123C" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    spans: 'md:col-span-1',
    bg: 'linear-gradient(135deg, rgba(190,18,60,0.08), rgba(190,18,60,0.02))',
  },
  {
    title: '云端同步',
    desc: '本地 IndexedDB 优先 + Supabase 云端双向自动同步，离线也能用。',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round">
        <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
      </svg>
    ),
    spans: 'md:col-span-1',
    bg: 'linear-gradient(135deg, rgba(79,70,229,0.08), rgba(79,70,229,0.02))',
  },
  {
    title: 'AI 生成',
    desc: '输入一句话主题，AI 自动生成完整思维导图骨架，快速启动新项目。',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    spans: 'md:col-span-2',
    bg: 'linear-gradient(135deg, rgba(124,92,252,0.08), rgba(159,134,255,0.04))',
  },
]

export default function Features() {
  return (
    <section id="features" className="relative py-28 md:py-36">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="mb-16 text-center"
        >
          <h2 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] md:text-5xl">
            围绕项目推进而设计
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-[var(--text-secondary)]">
            每个工具都为了解决一个真实问题，从发散思考到落地执行，衔接自然。
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className={`${feat.spans} group relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] p-7 transition-all duration-300 hover:border-[var(--brand)]/30`}
              style={{ background: feat.bg }}
            >
              {/* glow on hover */}
              <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background: 'radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(124,92,252,0.06), transparent 40%)',
                }}
              />

              <div className="relative z-10">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--bg-surface)]/80 ring-1 ring-[var(--border-medium)]">
                  {feat.icon}
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {feat.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {feat.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
