import { motion } from 'framer-motion'
import { ArrowRight, GithubLogo } from '@phosphor-icons/react'

export default function CTA() {
  return (
    <section className="bg-night-900 py-28 sm:py-36">
      <div className="mx-auto max-w-[1200px] px-6 sm:px-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="mx-auto max-w-2xl text-center"
        >
          <div className="font-mono text-xs tracking-[0.22em] text-dm-muted mb-7">
            START — 现在开始
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.12] text-paper">
            搭建你的下一张图。
          </h2>
          <p className="mt-5 text-lg text-dm-muted">
            免费使用全部功能。数据本地优先，登录即可云端同步。
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://mindflow-app.pages.dev/auth"
              className="group inline-flex h-12 items-center gap-2 rounded-xl bg-paper px-7 text-base font-medium text-ink transition-colors duration-150 hover:bg-white"
            >
              开始免费使用
              <ArrowRight size={17} weight="bold" className="transition-transform duration-150 group-hover:translate-x-0.5" />
            </a>
            <a
              href="https://github.com/spe-Hu/MindFLow"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-lineDark px-7 text-base font-medium text-dm-text transition-colors duration-150 hover:border-[rgba(242,238,230,0.3)]"
            >
              <GithubLogo size={18} />
              GitHub 开源
            </a>
          </div>
          <div className="mt-8 font-mono text-xs text-dm-muted/70 tracking-wide">
            Web · PWA · 跨平台，数据可导出，永不被锁定
          </div>
        </motion.div>
      </div>
    </section>
  )
}