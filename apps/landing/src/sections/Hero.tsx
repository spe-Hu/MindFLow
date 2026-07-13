import { motion } from 'framer-motion'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
}

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
}

export default function Hero() {
  return (
    <section className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden pt-16">
      {/* Subtle top glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 h-[600px] w-[900px] -translate-x-1/2 opacity-40"
        style={{
          background: 'radial-gradient(ellipse 50% 40% at 50% 0%, rgba(124, 92, 252, 0.3), transparent)',
        }}
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 text-center"
      >
        {/* Badge */}
        <motion.div variants={item}>
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--border-medium)] bg-[var(--bg-surface)]/60 px-4 py-1.5 text-xs font-medium text-[var(--text-secondary)] backdrop-blur-xl">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            MindFlow v2.0 已发布
          </div>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          variants={item}
          className="text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl md:text-7xl lg:text-[5rem]"
        >
          <span className="text-[var(--text-primary)]">从思维到执行</span>
          <br />
          <span className="text-gradient">一张图管到底</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={item}
          className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)] md:text-xl"
        >
          MindFlow 将思维导图与任务管理深度合一。拆解思路、追踪进度、交付成果 —— 在同一个画布上完成，不再在多个工具间反复搬运。
        </motion.p>

        {/* CTAs */}
        <motion.div variants={item} className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#get-started"
            className="group inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-[var(--brand)]/20 transition-all hover:bg-[var(--brand-light)] hover:shadow-[var(--brand)]/30 active:scale-[0.97]"
          >
            免费开始使用
          </a>
          <a
            href="#features"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-medium)] bg-[var(--bg-surface)]/50 px-7 py-3.5 text-sm font-medium text-[var(--text-secondary)] backdrop-blur-xl transition-colors hover:border-[var(--brand)]/30 hover:text-[var(--text-primary)]"
          >
            查看功能
          </a>
        </motion.div>

        {/* Trust badges */}
        <motion.p variants={item} className="mt-6 text-xs text-[var(--text-muted)]">
          无需信用卡 · 本地优先 · 云端同步可选
        </motion.p>
      </motion.div>

      {/* Product mockup */}
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mt-16 w-full max-w-5xl px-6"
      >
        <div className="gradient-border relative overflow-hidden rounded-2xl shadow-2xl shadow-black/40">
          <div className="relative bg-[#111827] p-2">
            {/* Window chrome */}
            <div className="mb-2 flex items-center gap-2 px-2">
              <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <div className="h-3 w-3 rounded-full bg-[#28c840]" />
              <div className="ml-4 flex-1 rounded-md bg-[#1e293b] px-3 py-1 text-center text-[10px] text-[var(--text-muted)]">
                mindflow.app/project/awesome-product
              </div>
            </div>
            
            {/* App content */}
            <MindFlowMockUI />
          </div>
        </div>

        {/* Shadow below the mockup */}
        <div
          className="pointer-events-none absolute -bottom-10 left-1/2 h-20 w-[80%] -translate-x-1/2 opacity-30 blur-2xl"
          style={{ background: 'radial-gradient(ellipse, rgba(124, 92, 252, 0.4), transparent 70%)' }}
        />
      </motion.div>
    </section>
  )
}

function MindFlowMockUI() {
  return (
    <svg viewBox="0 0 900 500" className="w-full rounded-xl" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#0B0F19" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="rgba(0,0,0,0.3)" />
        </filter>
        <filter id="glowNode">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      {/* Background */}
      <rect width="900" height="500" rx="8" fill="url(#bgGrad)" />

      {/* Sidebar */}
      <rect x="0" y="0" width="200" height="500" rx="8" fill="#111827" />
      <rect x="0" y="0" width="200" height="500" rx="8" fill="rgba(124,92,252,0.03)" />
      
      {/* Sidebar items */}
      <rect x="16" y="16" width="24" height="24" rx="4" fill="#7C5CFC" />
      
      <rect x="16" y="60" width="168" height="28" rx="6" fill="rgba(124,92,252,0.12)" />
      <rect x="28" y="68" width="140" height="12" rx="2" fill="#7C5CFC" opacity="0.8" />
      
      <rect x="16" y="100" width="168" height="24" rx="4" fill="transparent" />
      <rect x="28" y="108" width="100" height="8" rx="2" fill="#334155" />
      
      <rect x="16" y="132" width="168" height="24" rx="4" fill="transparent" />
      <rect x="28" y="140" width="120" height="8" rx="2" fill="#334155" />
      
      <rect x="16" y="164" width="168" height="24" rx="4" fill="transparent" />
      <rect x="28" y="172" width="90" height="8" rx="2" fill="#334155" />

      <rect x="16" y="200" width="168" height="1" fill="#1e293b" />
      
      <text x="50" y="390" fontSize="10" fill="#475569" fontFamily="sans-serif">项目看板</text>
      <rect x="16" y="400" width="168" height="28" rx="6" fill="rgba(124,92,252,0.06)" />
      <rect x="28" y="408" width="12" height="12" rx="3" fill="#7C5CFC" opacity="0.6" />
      <rect x="48" y="410" width="80" height="8" rx="2" fill="#64748B" />
      
      <rect x="16" y="436" width="168" height="28" rx="6" fill="transparent" />
      <rect x="28" y="444" width="12" height="12" rx="3" fill="#0D9488" opacity="0.6" />
      <rect x="48" y="446" width="80" height="8" rx="2" fill="#475569" />

      {/* Main content - Mind Map */}
      {/* Grid dots */}
      <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="0.7" fill="#1e293b" />
      </pattern>
      <rect x="200" y="0" width="700" height="500" fill="url(#dots)" opacity="0.5" />

      {/* Mind map connections */}
      <g stroke="#334155" strokeWidth="2" strokeLinecap="round" opacity="0.6">
        <line x1="520" y1="180" x2="340" y2="100" />
        <line x1="520" y1="180" x2="340" y2="260" />
        <line x1="520" y1="180" x2="700" y2="100" />
        <line x1="520" y1="180" x2="700" y2="260" />
        <line x1="520" y1="180" x2="520" y2="380" />
      </g>

      {/* Child nodes */}
      {/* Top left */}
      <rect x="250" y="75" width="130" height="40" rx="10" fill="#1e293b" stroke="#4F46E5" strokeWidth="1" filter="url(#shadow)" />
      <text x="315" y="100" textAnchor="middle" fill="#94A3B8" fontSize="12" fontFamily="sans-serif">需求分析</text>
      
      {/* Bottom left */}
      <rect x="250" y="235" width="130" height="40" rx="10" fill="#1e293b" stroke="#059669" strokeWidth="1" filter="url(#shadow)" />
      <text x="315" y="260" textAnchor="middle" fill="#94A3B8" fontSize="12" fontFamily="sans-serif">竞品调研</text>
      <text x="365" y="245" textAnchor="middle" fill="white" fontSize="9" fontFamily="sans-serif">✓</text>
      <circle cx="365" cy="248" r="8" fill="#059669" opacity="0.8" />
      <text x="365" y="252" textAnchor="middle" fill="white" fontSize="8" fontFamily="sans-serif" fontWeight="bold">✓</text>

      {/* Top right */}
      <rect x="660" y="75" width="130" height="40" rx="10" fill="#1e293b" stroke="#D97706" strokeWidth="1" filter="url(#shadow)" />
      <text x="725" y="100" textAnchor="middle" fill="#94A3B8" fontSize="12" fontFamily="sans-serif">技术架构</text>

      {/* Bottom right */}
      <rect x="660" y="235" width="130" height="40" rx="10" fill="#1e293b" stroke="#BE123C" strokeWidth="1" filter="url(#shadow)" />
      <text x="725" y="260" textAnchor="middle" fill="#94A3B8" fontSize="12" fontFamily="sans-serif">里程碑</text>

      {/* Bottom center */}
      <rect x="460" y="350" width="120" height="40" rx="10" fill="#1e293b" stroke="#7C3AED" strokeWidth="1" filter="url(#shadow)" />
      <text x="520" y="375" textAnchor="middle" fill="#94A3B8" fontSize="12" fontFamily="sans-serif">发布计划</text>

      {/* Root node - highlighted */}
      <rect x="450" y="150" width="140" height="56" rx="14" fill="#7C5CFC" opacity="0.95" filter="url(#glowNode)" filter="url(#shadow)" />
      <rect x="450" y="150" width="140" height="56" rx="14" fill="url(#rootGrad)" opacity="0.95" />
      <defs>
        <linearGradient id="rootGrad" x1="450" y1="150" x2="590" y2="206">
          <stop stopColor="#7C5CFC" />
          <stop offset="1" stopColor="#5B3AC8" />
        </linearGradient>
      </defs>
      <text x="520" y="188" textAnchor="middle" fill="white" fontSize="16" fontFamily="sans-serif" fontWeight="600">产品发布</text>
      
      {/* Checkboxes */}
      <rect x="700" y="182" width="14" height="14" rx="3" fill="#F59E0B" opacity="0.9" />
      <text x="707" y="192" textAnchor="middle" fill="white" fontSize="8" fontFamily="sans-serif">!</text>
    </svg>
  )
}
