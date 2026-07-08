import { test, expect } from '@playwright/test'
import { runJourney10 } from './journey-10'

test('Journey 10 – 只读分享链接 (C2) + 节点附件 (C5)', async ({ page }) => {
  const results = await runJourney10(page)
  for (const r of results) {
    if (!r.pass) console.error(`FAIL: ${r.name} – ${r.detail || ''}`)
    expect(r.pass, `${r.name}: ${r.detail || ''}`).toBe(true)
  }
})
