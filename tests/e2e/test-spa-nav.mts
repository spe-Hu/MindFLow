import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:5173'

async function run() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  await page.goto(BASE_URL + '/auth')
  await page.waitForTimeout(1500)
  await page.locator('button:has-text("离线使用，数据仅存本地")').click()
  await page.waitForTimeout(2000)
  console.log('After click URL:', page.url())

  await page.locator('aside button[aria-label="新建项目"]').first().click()
  await page.waitForTimeout(500)
  await page.locator('input#project-name').fill('NavTest-' + Date.now())
  await page.locator('div[role="dialog"] button:has-text("创建")').click()

  console.log('Before waitForURL(/project/)...')
  try {
    await page.waitForURL(/\/project\/.+/, { timeout: 5000 })
    console.log('waitForURL /project/ SUCCESS')
  } catch (e: any) {
    console.log('waitForURL /project/ FAILED:', e.message)
  }

  await page.waitForTimeout(2000)
  console.log('Current URL:', page.url())

  // Test calendar nav
  await page.locator('aside button:has-text("日历")').click()
  console.log('Before waitForURL(/calendar/)...')
  try {
    await page.waitForURL(/\/calendar/, { timeout: 5000 })
    console.log('waitForURL /calendar/ SUCCESS')
  } catch (e: any) {
    console.log('waitForURL /calendar/ FAILED:', e.message)
  }
  console.log('Current URL:', page.url())

  await browser.close()
}

run().catch(console.error)
