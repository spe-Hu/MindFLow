import { motion } from 'framer-motion'
import { ArrowRight } from '@phosphor-icons/react'

/* ═══════════════════════════════════════════════════
   产品 Mock —— 深色窗框里的思维导图工作台
   调色对齐应用暗色模式的中性色阶，品牌紫只出现在
   节点/连线/徽标内部（Cursor 式：彩色留给产品本身）。
   ═══════════════════════════════════════════════════ */

function SidebarStrip({ delay }: { delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
      className="h-5 rounded-md bg-[#242019] w-full"
    />
  )
}

function Node({
  children,
  top,
  left,
  w,
  h,
  variant = 'default',
  badge,
  delay = 0,
}: {
  children: React.ReactNode
  top: number
  left: number
  w: number
  h: number
  variant?: 'primary' | 'default' | 'task'
  badge?: string
  delay?: number
}) {
  const base =
    'absolute flex items-center justify-center text-[11px] font-medium rounded-xl whitespace-nowrap select-none'
  const cls =
    variant === 'primary'
      ? `${base} bg-brand text-white shadow-[0_8px_24px_rgba(124,92,252,0.35)]`
      : variant === 'task'
      ? `${base} bg-[#211D19] text-brand-soft border-[1.5px] border-brand/40`
      : `${base} bg-[#211D19] text-[#C9C2B6] border border-lineDark`

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.82, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      className={cls}
      style={{ top, left, width: w, height: h }}
    >
      {children}
      {badge && (
        <span className="ml-1.5 inline-flex h-[14px] items-center rounded px-[3px] text-[7px] font-bold bg-brand/15 text-brand-soft">
          {badge}
        </span>
      )}
    </motion.div>
  )
}

function Link({ ax, ay, bx, by, delay = 0 }: { ax: number; ay: number; bx: number; by: number; delay?: number }) {
  return (
    <motion.line
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 0.45 }}
      transition={{ duration: 0.6, delay }}
      x1={ax}
      y1={ay}
      x2={bx}
      y2={by}
      stroke="#7C5CFC"
      strokeWidth={1.5}
    />
  )
}

/* ── 布局常量（沿用验证过的几何，不要单独改动）── */
const SIDEBAR_W = 110
const CANVAS_W  = 540
const CANVAS_H  = 400
const TOTAL_W   = SIDEBAR_W + CANVAS_W // 650

/* ── 节点坐标 ────────────────────────────────────
   根节点居中偏上；第二层两节点水平拉开；
   第三层 4 个叶子均匀分布（间隙 ≥ 24px）；
   第四层合并节点居中；看板面板在右下不与节点相交。
──────────────────────────────────────────────── */
type MapNode = {
  id: string
  label: string
  t: number
  l: number
  w: number
  h: number
  v?: 'primary' | 'task'
  badge?: string
  d: number
}

const NODES: readonly MapNode[] = [
  { id: 'root', label: '产品规划',      t: 48,  l: 220, w: 100, h: 32, v: 'primary',           d: 0.15 },
  { id: 'n1',   label: '市场调研',      t: 118, l: 98,  w: 86,  h: 26,                         d: 0.35 },
  { id: 'n2',   label: '原型设计',      t: 118, l: 356, w: 86,  h: 26,                         d: 0.4  },
  { id: 'n3',   label: '竞品分析',      t: 188, l: 42,  w: 80,  h: 24, v: 'task', badge: 'P1', d: 0.5  },
  { id: 'n4',   label: '用户访谈',      t: 188, l: 148, w: 80,  h: 24, v: 'task', badge: 'P2', d: 0.55 },
  { id: 'n5',   label: 'UI 设计',       t: 188, l: 270, w: 72,  h: 24, v: 'task', badge: 'P3', d: 0.6  },
  { id: 'n6',   label: '技术选型',      t: 188, l: 376, w: 80,  h: 24,                         d: 0.65 },
  { id: 'n7',   label: '开发评审 → 看板', t: 248, l: 205, w: 130, h: 28, v: 'task',              d: 0.75 },
]

const mid = (n: (typeof NODES)[number]) => n.l + n.w / 2
const btm = (n: (typeof NODES)[number]) => n.t + n.h

const LINKS = [
  { ax: mid(NODES[0]), ay: btm(NODES[0]), bx: mid(NODES[1]), by: NODES[1].t, d: 0.3  },
  { ax: mid(NODES[0]), ay: btm(NODES[0]), bx: mid(NODES[2]), by: NODES[2].t, d: 0.32 },
  { ax: mid(NODES[1]), ay: btm(NODES[1]), bx: mid(NODES[3]), by: NODES[3].t, d: 0.45 },
  { ax: mid(NODES[1]), ay: btm(NODES[1]), bx: mid(NODES[4]), by: NODES[4].t, d: 0.47 },
  { ax: mid(NODES[2]), ay: btm(NODES[2]), bx: mid(NODES[5]), by: NODES[5].t, d: 0.5  },
  { ax: mid(NODES[2]), ay: btm(NODES[2]), bx: mid(NODES[6]), by: NODES[6].t, d: 0.52 },
  { ax: mid(NODES[3]), ay: btm(NODES[3]), bx: mid(NODES[7]), by: NODES[7].t, d: 0.68 },
  { ax: mid(NODES[4]), ay: btm(NODES[4]), bx: mid(NODES[7]), by: NODES[7].t, d: 0.7  },
] as const

function ProductMock() {
  return (
    <div
      className="rounded-2xl bg-night-800 ring-1 ring-lineDark shadow-[0_32px_80px_-24px_rgba(23,19,14,0.45)] overflow-hidden"
      style={{ width: TOTAL_W }}
    >
      {/* ── 窗口栏：mono 路径像 Cursor 的终端窗口 ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-lineDark">
        <div className="h-2.5 w-2.5 rounded-full bg-[#3A342C]" />
        <div className="h-2.5 w-2.5 rounded-full bg-[#3A342C]" />
        <div className="h-2.5 w-2.5 rounded-full bg-[#3A342C]" />
        <span className="mx-auto font-mono text-[10px] text-dm-muted">~/mindflow/产品规划 — 思维导图</span>
        <div className="w-10" />
      </div>

      {/* ── 应用主体 ── */}
      <div className="flex" style={{ height: CANVAS_H }}>
        {/* Sidebar */}
        <div
          className="flex flex-col gap-2 p-3 border-r border-lineDark bg-night-900"
          style={{ width: SIDEBAR_W }}
        >
          <div className="flex items-center gap-2 mb-2">
            <img src="/favicon.svg" alt="" className="h-6 w-6" />
            <span className="text-[10px] font-bold text-dm-text">MindFlow</span>
          </div>
          <SidebarStrip delay={0.15} />
          <div className="h-5 rounded-md w-full flex items-center px-2 bg-brand/15">
            <div className="h-1.5 w-1.5 rounded-full bg-brand mr-1.5" />
            <div className="h-2 w-14 rounded bg-brand/25" />
          </div>
          <SidebarStrip delay={0.25} />
          <SidebarStrip delay={0.3} />
          <SidebarStrip delay={0.35} />
          <div className="mt-auto">
            <div className="font-mono text-[7px] text-dm-muted uppercase tracking-[0.18em] mb-1.5">
              最近编辑
            </div>
            <SidebarStrip delay={0.4} />
            <SidebarStrip delay={0.45} />
          </div>
        </div>

        {/* ── 画布 ── */}
        <div className="relative flex-1 bg-night" style={{ width: CANVAS_W }}>
          {/* 点阵网格 */}
          <div
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(242,238,230,0.05) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          {/* Toolbar */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20">
            <div className="h-7 px-3 rounded-lg bg-night-800 ring-1 ring-lineDark font-mono text-[10px] text-dm-muted flex items-center">
              产品规划 v2024Q4
            </div>
            <div className="flex gap-1.5">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="h-7 w-7 rounded-lg bg-night-800 ring-1 ring-lineDark flex items-center justify-center"
                >
                  <div className="h-3 w-3 rounded-full border border-[#3A342C]" />
                </div>
              ))}
            </div>
          </div>

          {/* 连线 */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            {LINKS.map((lk, i) => (
              <Link key={i} ax={lk.ax} ay={lk.ay} bx={lk.bx} by={lk.by} delay={lk.d} />
            ))}
          </svg>

          {/* 节点 */}
          {NODES.map((n) => (
            <Node
              key={n.id}
              top={n.t}
              left={n.l}
              w={n.w}
              h={n.h}
              variant={n.v}
              badge={n.badge}
              delay={n.d}
            >
              {n.label}
            </Node>
          ))}

          {/* ── 浮动看板面板 ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="absolute z-20 rounded-xl bg-night-800 ring-1 ring-lineDark p-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
            style={{ right: 12, bottom: 12, width: 118 }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="font-mono text-[8px] text-dm-muted uppercase tracking-[0.14em]">看板视图</div>
              <div className="h-1 w-5 rounded-full bg-[#2B261F]" />
            </div>
            <div className="grid grid-cols-4 gap-1 mb-1">
              {[
                { bg: 'rgba(124,92,252,0.16)', hint: 'rgba(124,92,252,0.55)' },
                { bg: 'rgba(63,185,80,0.14)',  hint: 'rgba(63,185,80,0.5)' },
                { bg: 'rgba(210,153,34,0.14)', hint: 'rgba(210,153,34,0.5)' },
                { bg: 'rgba(242,238,230,0.06)', hint: 'rgba(242,238,230,0.18)' },
              ].map((c, i) => (
                <div key={i} className="h-7 rounded-md flex items-center justify-center" style={{ background: c.bg }}>
                  <div className="h-1 w-4 rounded-full" style={{ background: c.hint }} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-1">
              {['rgba(124,92,252,0.10)', 'rgba(63,185,80,0.09)', 'rgba(210,153,34,0.09)', 'rgba(242,238,230,0.04)'].map((bg, i) => (
                <div key={i} className="h-4 rounded-md opacity-80" style={{ background: bg }} />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Hero —— Cursor 式：居中宣言 + 深色产品窗
   ═══════════════════════════════════════════════════ */

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-paper">
      <div className="mx-auto max-w-[1200px] px-6 sm:px-12 pt-36 pb-24 md:pt-44 md:pb-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="font-mono text-xs tracking-[0.22em] text-ink-subtle mb-7">
            [ 思维导图 × 任务管理 ]
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-[-0.035em] leading-[1.08] text-ink">
            想清楚，做下去，
            <br />
            一张图。
          </h1>

          <p className="mt-6 text-lg md:text-xl leading-relaxed text-ink-muted max-w-2xl mx-auto">
            在图里发散，点一下就成任务。看板、日历、甘特图
            从同一张思维导图里自然生长出来。
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://mindflow-app.pages.dev/auth"
              className="group inline-flex h-12 items-center gap-2 rounded-xl bg-ink px-7 text-base font-medium text-paper transition-colors duration-150 hover:bg-night"
            >
              现在开始
              <ArrowRight size={17} weight="bold" className="transition-transform duration-150 group-hover:translate-x-0.5" />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center rounded-xl border border-line-strong px-7 text-base font-medium text-ink transition-colors duration-150 hover:border-ink"
            >
              了解工作方式
            </a>
          </div>

          <div className="mt-7 font-mono text-xs text-ink-faint tracking-wide">
            免费 · 无需信用卡 · 本地优先 · 开源
          </div>
        </motion.div>

        {/* ── 深色产品窗 ── */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: 'easeOut' }}
          className="mt-16 md:mt-20"
        >
          <div className="hero-mock-frame">
            <div className="hero-mock-inner">
              <ProductMock />
            </div>
          </div>
          <div className="mt-5 text-center font-mono text-[11px] text-ink-faint tracking-wide">
            思维导图 → 任务 · 一个工作台内的真实界面
          </div>
        </motion.div>
      </div>
    </section>
  )
}