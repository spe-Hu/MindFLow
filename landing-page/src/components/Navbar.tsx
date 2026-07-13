import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { List } from '@phosphor-icons/react'

const navLinks = [
  { label: '功能', href: '#features' },
  { label: '流程', href: '#how-it-works' },
  { label: '评价', href: '#reviews' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'border-b border-[var(--border-subtle)] bg-[#0B0F19]/70 backdrop-blur-2xl'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L14 8H20L15 12L17 18L12 14L7 18L9 12L4 8H10L12 2Z" fill="#7C5CFC" />
            <path d="M12 3L13.5 8H18.5L14.5 11.5L16 17L12 14L8 17L9.5 11.5L5.5 8H10.5L12 3Z" fill="url(#logoGrad)" />
            <defs>
              <linearGradient id="logoGrad" x1="5.5" y1="8" x2="18.5" y2="17" gradientUnits="userSpaceOnUse">
                <stop stopColor="#7C5CFC" />
                <stop offset="1" stopColor="#C4B5FD" />
              </linearGradient>
            </defs>
          </svg>
          <span className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            MindFlow
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]/50 px-2 py-1 backdrop-blur-xl md:flex">
          {navLinks.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <a
            href="#get-started"
            className="hidden items-center gap-1.5 rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#0B0F19] transition-all hover:bg-white/90 active:scale-[0.97] md:inline-flex"
          >
            免费开始使用
          </a>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-primary)] md:hidden"
            onClick={() => setMobileOpen(prev => !prev)}
          >
            <List size={22} weight="bold" />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-b border-[var(--border-subtle)] bg-[#0B0F19]/95 backdrop-blur-2xl md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              {navLinks.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="#get-started"
                onClick={() => setMobileOpen(false)}
                className="mt-2 rounded-full bg-white px-5 py-2.5 text-center text-sm font-semibold text-[#0B0F19]"
              >
                免费开始使用
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
