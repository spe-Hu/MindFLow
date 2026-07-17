import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { List, CaretDown } from '@phosphor-icons/react'

const links = [
  { label: '功能', href: '#features' },
  { label: '使用指南', href: '#how-it-works' },
  { label: '用户评价', href: '#social-proof' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-3 left-1/2 z-50 -translate-x-1/2 px-2 w-full max-w-[680px] transition-all duration-300 ${
        scrolled
          ? 'md:top-4 md:w-auto md:max-w-none md:px-0'
          : 'md:top-5 md:w-auto md:max-w-none md:px-0'
      }`}
    >
      <div
        className={`flex items-center justify-between rounded-2xl border px-4 py-2.5 backdrop-blur-md transition-all duration-300 md:px-6 md:py-3 ${
          scrolled
            ? 'bg-white/90 border-[rgba(0,0,0,0.08)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
            : 'bg-white/70 border-[rgba(0,0,0,0.06)]'
        }`}
      >
        <a href="#" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
            <List size={18} weight="bold" className="text-white" />
          </div>
          <span className="text-base font-semibold tracking-tight text-ink">
            MindFlow
          </span>
        </a>

        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="px-3 py-1.5 text-sm font-medium text-ink-subtle hover:text-ink rounded-lg transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <a
            href="https://mindflow-app.pages.dev/auth"
            className="px-4 py-2 text-sm font-medium text-ink rounded-lg border border-[rgba(0,0,0,0.08)] hover:border-[rgba(0,0,0,0.15)] hover:bg-[rgba(0,0,0,0.02)] transition-all"
          >
            登录
          </a>
          <a
            href="https://mindflow-app.pages.dev/auth"
            className="px-4 py-2 text-sm font-semibold text-white bg-ink rounded-lg hover:bg-[#1a1a1a] transition-colors">
            免费使用
          </a>
        </div>

        <button
          className="md:hidden p-1.5 rounded-lg hover:bg-[rgba(0,0,0,0.04)] transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="菜单"
        >
          <CaretDown size={20} className={`text-ink-muted transition-transform ${mobileOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {mobileOpen && (
        <div className="mt-2 rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/95 backdrop-blur-xl p-4 shadow-[0_4px_16px_rgba(0,0,0,0.06)] md:hidden">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="block py-2 text-sm font-medium text-ink-muted hover:text-ink"
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <div className="mt-3 flex gap-2 pt-3 border-t border-[rgba(0,0,0,0.06)]">
            <a href="https://mindflow-app.pages.dev/auth" className="flex-1 py-2.5 text-center text-sm font-medium text-ink border border-[rgba(0,0,0,0.08)] rounded-xl">登录</a>
            <a href="https://mindflow-app.pages.dev/auth" className="flex-1 py-2.5 text-center text-sm font-semibold text-white bg-ink rounded-xl">免费使用</a>
          </div>
        </div>
      )}
    </motion.nav>
  )
}
