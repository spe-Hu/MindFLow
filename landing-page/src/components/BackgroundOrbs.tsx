import { memo } from 'react'

const orbs = [
  { size: 400, x: '10%', y: '20%', color: 'rgba(124, 92, 252, 0.15)', duration: 20 },
  { size: 350, x: '70%', y: '30%', color: 'rgba(159, 134, 255, 0.12)', duration: 25 },
  { size: 300, x: '30%', y: '60%', color: 'rgba(124, 92, 252, 0.1)', duration: 22 },
  { size: 250, x: '80%', y: '70%', color: 'rgba(196, 181, 253, 0.08)', duration: 18 },
  { size: 450, x: '50%', y: '50%', color: 'rgba(124, 92, 252, 0.06)', duration: 30 },
]

export default memo(function BackgroundOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      {orbs.map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            filter: 'blur(60px)',
            animation: `float ${orb.duration}s ease-in-out infinite`,
            animationDelay: `${i * 3}s`,
          }}
        />
      ))}
      {/* Subtle noise overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }}
      />
    </div>
  )
})
