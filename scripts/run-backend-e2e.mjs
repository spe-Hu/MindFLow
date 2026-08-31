#!/usr/bin/env node
// scripts/run-backend-e2e.mjs
// 一键在本地跑真实后端 E2E 测试。
// 用法（在项目根目录）:
//   node scripts/run-backend-e2e.mjs                # 跑全部
//   node scripts/run-backend-e2e.mjs -- 16          # 跑 J16
//   node scripts/run-backend-e2e.mjs -- 16,17       # 跑 J16+J17

import { spawn, execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
process.chdir(ROOT)

const PORT = process.env.MF_PORT || '5179'
const URL = process.env.MF_BASE_URL || `http://localhost:${PORT}`

// 1. 检查 dev server
async function isUp(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(2000) })
    return r.ok || r.status === 200 || r.status < 500
  } catch { return false }
}

if (!(await isUp(URL))) {
  console.error(`❌ Dev server not running at ${URL}`)
  console.error(`   Start it first: npm run dev:web`)
  process.exit(1)
}
console.log(`✅ Dev server up at ${URL}`)

// 2. 解析参数：-- 16,17 → journey-16, journey-17
const arg = (process.argv.find(a => a.startsWith('--')) || '').replace(/^--/, '').trim()
const filter = arg ? arg.split(',').map(n => `journey-${n.padStart(2, '0')}`) : []

const cmd = [
  'npx',
  'playwright',
  'test',
  ...(filter.length ? [filter.join('|')] : ['tests/e2e/backend-integration']),
  '--config', 'tests/e2e/backend-integration/backend-integration.config.ts',
]

console.log('🧪 Running:', cmd.join(' '))
console.log('')

const child = spawn(cmd[0], cmd.slice(1), { stdio: 'inherit' })
child.on('exit', c => process.exit(c ?? 0))