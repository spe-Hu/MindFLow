import { motion } from 'framer-motion'
import { ArrowRight } from '@phosphor-icons/react'

/* ═══════════════════════════════════════════════════
   产品 Mock UI — 大幅增加间距，彻底消除重叠
   策略：
   1. Canvas 宽度充裕（540）→ 节点横向拉开
   2. 垂直间距每层 > 36px
   3. 看板面板缩小、右下定位、和节点不重叠
   4. 删除节点详情面板（多余且干扰）
   ═══════════════════════════════════════════════════ */

function SidebarStrip({ delay }: { delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
      className="h-5 rounded-md bg-[#F5F5F4] w-full"
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
  const base = 'absolute flex items-center justify-center text-[11px] font-medium rounded-xl whitespace-nowrap shadow-sm select-none'
  const cls =
    variant === 'primary'
      ? `${base} bg-[#7C5CFC] text-white shadow-[0_4px_16px_rgba(124,92,252,0.28)]`
      : variant === 'task'
      ? `${base} bg-white text-[#7C5CFC] border-[1.5px] border-[#7C5CFC]/30`
      : `${base} bg-white text-[#555] border border-[#E5E5E5]`

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
        <span className="ml-1.5 inline-flex h-[14px] items-center rounded px-[3px] text-[7px] font-bold bg-[#7C5CFC]/10 text-[#7C5CFC]">
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
      animate={{ pathLength: 1, opacity: 0.3 }}
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

/* ── 布局常量 ──────────────────────────────── */
const SIDEBAR_W = 110          // 侧边栏宽度
const CANVAS_W  = 540          // 画布宽度（关键：给节点足够空间）
const CANVAS_H  = 400          // 画布高度
const TOTAL_W   = SIDEBAR_W + CANVAS_W // 110 + 540 = 650

/* ── 节点坐标（canvas 内部相对坐标）───────────
   设计理念：
   - 根节点居中偏上
   - 第二层两个节点水平拉开（中心间距 > 140）
   - 第三层 4 个叶子节点均匀分布（相邻间距 ≥ 24）
   - 第四层一个合并节点，居中连接两个叶子
   - 看板面板放右下，和任何节点水平/垂直都不接触
───────────────────────────────────────────── */
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

/* 节点几何辅助函数 */
const mid = (n: typeof NODES[number]) => n.l + n.w / 2
const btm = (n: typeof NODES[number]) => n.t + n.h

/* 连接线（从父节点底部中心 → 子节点顶部中心） */
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

/* ── 间距自查 ────────────────────────────────
   第三层叶子节点 x 边界：
   n3: [42, 122]   n4: [148, 228]   n5: [270, 342]   n6: [376, 456]
   n3→n4 gap: 148-122 = 26px ✓
   n4→n5 gap: 270-228 = 42px ✓
   n5→n6 gap: 376-342 = 34px ✓

   第二层节点 x 边界：
   n1: [98, 184]   n2: [356, 442]
   中心间距: 356+43 - (98+43) = 399-141 = 258px ✓

   看板面板：right=14, w=120 → left=540-14-120=406
   n6 right=456 > kanban left=406?  但垂直：
   n6 bottom=188+24=212, kanban top ≈ 400-14-78=308 → gap=96px ✓
   水平：n6 right=456, kanban left=406 → n6 在 kanban 左侧内部？
   不，406 < 456 但 212 < 308（垂直不重叠），所以视觉上不会重叠

   再看 n7: l=205, w=130 → right=335
   kanban left=406 → gap=71px ✓
   n7 bottom=270+28=298, kanban top=308 → gap=10px（略紧）
   把 n7 移到 t=260, bottom=288, gap=20px ✓
───────────────────────────────────────────── */

function ProductMock() {
  return (
    <div
      className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden shrink-0"
      style={{ width: TOTAL_W, transform: 'scale(0.88)', transformOrigin: 'right center' }}
    >
      {/* ── Browser chrome ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[rgba(0,0,0,0.06)] bg-[#FAFAFA]">
        <div className="h-3 w-3 rounded-full bg-[#E5E5E5]" />
        <div className="h-3 w-3 rounded-full bg-[#E5E5E5]" />
        <div className="h-3 w-3 rounded-full bg-[#E5E5E5]" />
      </div>

      {/* ── App body ── */}
      <div className="flex" style={{ height: CANVAS_H }}>
        {/* Sidebar */}
        <div
          className="flex flex-col gap-2 p-3 border-r border-[rgba(0,0,0,0.06)]"
          style={{ width: SIDEBAR_W }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="h-7 w-7 rounded-lg bg-[#7C5CFC] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div>
            <span className="text-[10px] font-bold text-[#222]">MindFlow</span>
          </div>
          <SidebarStrip delay={0.15} />
          <div className="h-5 rounded-md w-full flex items-center px-2 bg-[#7C5CFC]/8">
            <div className="h-1.5 w-1.5 rounded-full bg-[#7C5CFC] mr-1.5" />
            <div className="h-2 w-14 rounded bg-[#7C5CFC]/18" />
          </div>
          <SidebarStrip delay={0.25} />
          <SidebarStrip delay={0.3} />
          <SidebarStrip delay={0.35} />
          <div className="mt-auto">
            <div className="text-[7px] text-[#999] uppercase tracking-wider mb-1.5 font-semibold">
              最近编辑
            </div>
            <SidebarStrip delay={0.4} />
            <SidebarStrip delay={0.45} />
          </div>
        </div>

        {/* ── Canvas ── */}
        <div className="relative flex-1 bg-[#F5F5F4]" style={{ width: CANVAS_W }}>
          {/* Toolbar */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20">
            <div className="h-7 px-3 rounded-lg bg-white border border-[rgba(0,0,0,0.06)] text-[10px] font-semibold text-[#555] flex items-center shadow-sm">
              产品规划 v2024Q4
            </div>
            <div className="flex gap-1.5">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="h-7 w-7 rounded-lg bg-white border border-[rgba(0,0,0,0.06)] flex items-center justify-center shadow-sm"
                >
                  <div className="h-3 w-3 rounded-full border border-[#E5E5E5]" />
                </div>
              ))}
            </div>
          </div>

          {/* Connection lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            <defs>
              <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6" fill="none" stroke="#7C5CFC" strokeWidth={1} />
              </marker>
            </defs>
            {LINKS.map((lk, i) => (
              <Link key={i} ax={lk.ax} ay={lk.ay} bx={lk.bx} by={lk.by} delay={lk.d} />
            ))}
          </svg>

          {/* Mind Map Nodes */}
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

          {/* ── Floating Kanban Panel ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="absolute z-20 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
            style={{ right: 12, bottom: 12, width: 118 }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[9px] font-bold text-[#333] uppercase tracking-wider">看板视图</div>
              <div className="h-1 w-5 rounded-full bg-[#F5F5F4]" />
            </div>
            <div className="grid grid-cols-4 gap-1 mb-1">
              {[
                { bg: '#F0E8FF', hint: 'rgba(124,92,252,0.2)' },
                { bg: '#E8F5E9', hint: 'rgba(76,175,80,0.2)' },
                { bg: '#FFF3E0', hint: 'rgba(255,152,0,0.2)' },
                { bg: '#F5F5F4', hint: 'rgba(0,0,0,0.08)' },
              ].map((c, i) => (
                <div key={i} className="h-7 rounded-md flex items-center justify-center" style={{ background: c.bg }}>
                  <div className="h-1 w-4 rounded-full" style={{ background: c.hint }} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-1">
              {['#F0E8FF', '#E8F5E9', '#FFF3E0', '#F5F5F4'].map((bg, i) => (
                <div key={i} className="h-4 rounded-md opacity-70" style={{ background: bg }} />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   Hero Section
   ═══════════════════════════════════════════════════ */

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-white">
      {/* 背景装饰光晕 */}
      <div
        className="pointer-events-none absolute -right-40 top-1/4 h-[600px] w-[600px] rounded-full opacity-[0.06]"
        style={{ background: 'radial-gradient(circle, #7C5CFC, transparent 60%)' }}
      />
      <div
        className="pointer-events-none absolute -left-20 bottom-0 h-[400px] w-[400px] rounded-full opacity-[0.04]"
        style={{ background: 'radial-gradient(circle, #7C5CFC, transparent 60%)' }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-6 sm:px-12 pt-32 pb-20 md:pt-40 md:pb-28 lg:pt-48 lg:pb-36">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-12 items-center">
          {/* ── Left copy ── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,0,0,0.08)] bg-[#FAFAFA] px-3.5 py-1.5 mb-8">
              <span className="inline-block h-2 w-2 rounded-full bg-brand" />
              <span className="text-sm font-medium text-ink-muted">思维导图 × 任务管理，在一个工具里</span>
            </div>

            <h1 className="text-[2.75rem] font-extrabold tracking-tight leading-[1.1] text-ink sm:text-5xl md:text-6xl lg:text-[3.75rem]">
              从发散到收敛，
              <br />
              <span className="text-brand">一张图管到底</span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-ink-subtle max-w-lg">
              用思维导图整理你的所有想法，一键将节点转化为可执行的任务。实时追踪项目进度，看板、日历、甘特图一手掌控。你的个人项目管理中枢。
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a
                href="https://mindflow-app.pages.dev/auth"
                className="group inline-flex items-center gap-2 rounded-xl bg-ink px-7 py-3.5 text-base font-semibold text-white transition-all hover:bg-[#1a1a1a] hover:shadow-lg hover:shadow-[rgba(0,0,0,0.12)]"
              >
                开始免费使用
                <ArrowRight size={18} weight="bold" className="transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="https://mindflow-app.pages.dev/auth"
                className="inline-flex items-center rounded-xl border border-[rgba(0,0,0,0.1)] bg-white px-7 py-3.5 text-base font-semibold text-ink transition-all hover:border-[rgba(0,0,0,0.18)] hover:bg-[#FAFAFA]"
              >
                查看演示
              </a>
            </div>

            <div className="mt-10 flex items-center gap-6 text-sm text-ink-faint">
              {['无需信用卡', '本地优先，数据私有'].map((t) => (
                <span key={t} className="flex items-center gap-2">
                  <svg width="14" height="14" fill="none">
                    <path d="M2 7l4 4 6-8" stroke="#7C5CFC" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t}
                </span>
              ))}
            </div>
          </motion.div>

          {/* ── Right — Product Mock ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
            className="relative hidden lg:flex justify-end"
          >
            <ProductMock />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
