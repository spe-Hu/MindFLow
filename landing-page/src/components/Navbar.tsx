import { useState, useEffect } from 'react'
import { ArrowUpRight, GithubLogo, List, X } from '@phosphor-icons/react'

const links = [
  { label: '能力', href: '#features' },
  { label: '工作方式', href: '#how-it-works' },
  { label: '使用时刻', href: '#moments' },
  { label: '更新', href: '#changelog' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-paper/85 backdrop-blur-md border-b border-line'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6 sm:px-12">
        <a href="#" className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="h-7 w-7" />
          <span className="text-[15px] font-semibold tracking-tight text-ink">MindFlow</span>
        </a>

        <div className="hidden md:flex items-center gap-7">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm text-ink-subtle hover:text-ink transition-colors duration-150"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <a
            href="https://github.com/spe-Hu/MindFLow"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="text-ink-subtle hover:text-ink transition-colors duration-150"
          >
            <GithubLogo size={20} />
          </a>
          <a
            href="https://mindflow-app.pages.dev/auth"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink px-4 text-sm font-medium text-paper transition-colors duration-150 hover:bg-night"
          >
            开始使用
            <ArrowUpRight size={14} weight="bold" />
          </a>
        </div>

        <button
          className="md:hidden p-1.5 text-ink-muted"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="菜单"
        >
          {mobileOpen ? <X size={22} /> : <List size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-line bg-paper/95 backdrop-blur-md px-6 py-4">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="block py-2.5 text-sm text-ink-muted hover:text-ink"
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <a
            href="https://mindflow-app.pages.dev/auth"
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-paper"
          >
            开始使用
          </a>
        </div>
      )}
    </nav>
  )
}