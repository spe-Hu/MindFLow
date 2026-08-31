import { GithubLogo } from '@phosphor-icons/react'

const columns = [
  {
    title: '产品',
    items: [
      { label: '能力清单', href: '#features' },
      { label: '工作方式', href: '#how-it-works' },
      { label: '更新', href: '#changelog' },
    ],
  },
  {
    title: '资源',
    items: [
      { label: 'GitHub 仓库', href: 'https://github.com/spe-Hu/MindFLow' },
      { label: '问题追踪', href: 'https://github.com/spe-Hu/MindFLow/issues' },
      { label: 'MIT 开源协议', href: 'https://github.com/spe-Hu/MindFLow' },
    ],
  },
  {
    title: '开始',
    items: [
      { label: '登录 / 注册', href: 'https://mindflow-app.pages.dev/auth' },
      { label: '直接进入 App', href: 'https://mindflow-app.pages.dev' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-night-900 border-t border-lineDark">
      <div className="mx-auto max-w-[1200px] px-6 sm:px-12 py-14 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/favicon.svg" alt="" className="h-7 w-7" />
              <span className="text-[15px] font-semibold tracking-tight text-paper">MindFlow</span>
            </div>
            <p className="text-sm text-dm-muted leading-relaxed max-w-xs">
              思维导图 × 任务管理。<br />
              让想清楚和做下去，发生在同一张图里。
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-mono text-[10px] uppercase tracking-[0.18em] text-dm-muted/70 mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      target={item.href.startsWith('http') ? '_blank' : undefined}
                      rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                      className="text-sm text-dm-muted hover:text-paper transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-lineDark flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-mono text-[11px] text-dm-muted/60">© 2026 MindFlow · MIT License</p>
          <a
            href="https://github.com/spe-Hu/MindFLow"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="text-dm-muted hover:text-paper transition-colors"
          >
            <GithubLogo size={18} />
          </a>
        </div>
      </div>
    </footer>
  )
}