import { List, GithubLogo, Envelope } from '@phosphor-icons/react'

const links = {
  产品: [
    { label: '功能特性', href: '#features' },
    { label: '使用指南', href: '#how-it-works' },
    { label: '用户评价', href: '#social-proof' },
    { label: '更新日志', href: '#' },
  ],
  支持: [
    { label: '文档', href: '#' },
    { label: '常见问题', href: '#' },
    { label: '反馈建议', href: '#' },
    { label: '开源协议', href: '#' },
  ],
  社区: [
    { label: 'GitHub', href: '#' },
    { label: '加入讨论', href: '#' },
    { label: '问题追踪', href: '#' },
  ],
}

export default function Footer() {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto max-w-[1200px] px-6 sm:px-12 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
                <List size={18} weight="bold" className="text-white" />
              </div>
              <span className="text-base font-bold tracking-tight text-white">MindFlow</span>
            </div>
            <p className="text-sm text-white/50 leading-relaxed mb-5">
              思维导图与任务管理深度融合。<br />
              让思考与执行不再割裂。
            </p>
            <div className="flex items-center gap-3">
              <a href="#" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white/70 hover:bg-white/15 hover:text-white transition-all">
                <GithubLogo size={18} weight="bold" />
              </a>
              <a href="#" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white/70 hover:bg-white/15 hover:text-white transition-all">
                <Envelope size={18} weight="bold" />
              </a>
            </div>
          </div>

          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">{category}</h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-sm text-white/60 hover:text-white transition-colors">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40">MindFlow. 开源思维导图与任务管理工具</p>
          <p className="text-xs text-white/40">Powered by React + Supabase + love</p>
        </div>
      </div>
    </footer>
  )
}
