import { motion } from 'framer-motion'
import { ArrowRight } from '@phosphor-icons/react'

export default function CTA() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-[1200px] px-6 sm:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-3xl px-8 py-20 sm:px-16 sm:py-24 text-center"
          style={{
            background: 'linear-gradient(135deg, #7C5CFC 0%, #9B7FFD 50%, #6938F5 100%)',
          }}
        >
          {/* subtle noise */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
            }}
          />

          <div className="relative z-10">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
              准备好整理你的思路了吗？
            </h2>
            <p className="mt-5 text-lg text-white/80 max-w-lg mx-auto">
              免费使用全部功能。无需信用卡，数据本地存储，登录即可云端同步。
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <a
                href="https://mindflow-app.pages.dev/auth"
                className="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-brand transition-all hover:bg-[#F5F5F4] hover:shadow-lg"
              >
                开始免费使用
                <ArrowRight size={18} weight="bold" className="transition-transform group-hover:translate-x-1" />
              </a>
            </div>
            <p className="mt-5 text-sm text-white/60">开源 · 免费 · 无广告</p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
