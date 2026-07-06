import { chromium } from 'playwright'

const BASE_URL = 'http://127.0.0.1:5179'

async function run() {
  console.log('Launching browser...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } })
  const page = await context.newPage()

  console.log('Goto auth...')
  await page.goto(BASE_URL + '/auth')
  await page.waitForLoadState('networkidle')
  console.log('Auth page loaded')

  const btn = page.locator('button:has-text("离线使用，数据仅存本地")')
  console.log('Offline btn visible:', await btn.isVisible().catch(() => false))

  await btn.click()
  console.log('Clicked offline btn')

  // Use simple sleep instead of waitForURL to avoid SPA load issues
  await page.waitForTimeout(3000)
  console.log('Current URL:', page.url())

  // Try create project
  console.log('Click new project btn...')
  await page.locator('aside button[aria-label="新建项目"]').first().click()
  await page.waitForTimeout(500)

  console.log('Fill project name...')
  await page.locator('input#project-name').fill('E2E-Smoke-' + Date.now())

  console.log('Click create btn...')
  await page.locator('div[role="dialog"] button:has-text("创建")').click()

  await page.waitForTimeout(3000)
  console.log('URL after create:', page.url())

  const sidebarText = await page.locator('aside').innerText()
  console.log('Sidebar contains project?', sidebarText.includes('E2E-Smoke'))

  const smmCount = await page.locator('g.smm-node').count()
  console.log('smm-node count:', smmCount)

  // Try click root and Tab
  if (smmCount > 0) {
    await page.locator('g.smm-node').first().click({ force: true })
    await page.waitForTimeout(300)
    console.log('Clicked root, active:', await page.evaluate(() => document.activeElement?.tagName))

    await page.keyboard.press('Tab')
    await page.waitForTimeout(800)
    console.log('After Tab, active:', await page.evaluate(() => document.activeElement?.tagName))

    await page.keyboard.type('需求分析', { delay: 30 })
    await page.waitForTimeout(500)
    console.log('After type, active:', await page.evaluate(() => document.activeElement?.tagName))

    await page.keyboard.press('Enter')
    await page.waitForTimeout(800)

    const texts = await page.locator('g.smm-node text').allTextContents()
    console.log('Final smm texts:', JSON.stringify(texts))
  }

  await browser.close()
  console.log('Done')
}

run().catch((e) => {
  console.error('Fatal:', e.message)
  process.exit(1)
})
