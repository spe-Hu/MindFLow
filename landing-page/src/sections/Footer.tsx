import { GithubLogo, TwitterLogo, EnvelopeSimple } from '@phosphor-icons/react'

const footerLinks = [
  {
    title: '产品',
    links: ['功能介绍', '定价', '更新日志', '路线图'],
  },
  {
    title: '资源',
    links: ['使用指南', '快捷键列表', '常见问题', 'API 文档'],
  },
  {
    title: '社区',
    links: ['GitHub', '反馈建议', '联系我们'],
  },
]

export default function Footer() {
  return (
    <footer className="relative border-t border-[var(--border-subtle)] bg-[#0B0F19]">
      <div className="section-container py-16">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          {/* Brand */}
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L14 8H20L15 12L17 18L12 14L7 18L9 12L4 8H10L12 2Z" fill="#7C5CFC" />
                <defs>
                  <linearGradient id="footerLogo" x1="4" y1="8" x2="20" y2="18">
                    <stop stopColor="#7C5CFC" />
                    <stop offset="1" stopColor="#C4B5FD" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="text-base font-semibold text-[var(--text-primary)]">
                MindFlow
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
              思维导图与任务管理深度融合，从发散到收敛，一张图管到底。
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a href="#" className="glass-card flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
                <GithubLogo size={18} weight="duotone" />
              </a>
              <a href="#" className="glass-card flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
                <TwitterLogo size={18} weight="duotone" />
              </a>
              <a href="#" className="glass-card flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
                <EnvelopeSimple size={18} weight="duotone" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-10 md:gap-16">
            {footerLinks.map(col => (
              <div key={col.title}>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                  {col.title}
                </h4>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {col.links.map(link => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--brand-light)]"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-6 md:flex-row">
          <p className="text-xs text-[var(--text-muted)]">
            &copy; {new Date().getFullYear()} MindFlow. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--brand-light)]">
              隐私政策
            </a>
            <a href="#" className="text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--brand-light)]">
              服务条款
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
