import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:5173'

async function run() {
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } })
  const page = await context.newPage()

  // enterLocalMode equivalent
  await page.goto(BASE_URL + '/auth')
  await page.waitForLoadState('networkidle')
  await page.locator('button:has-text("离线使用，数据仅存本地")').click()
  await page.waitForURL(/\/project\/.+/, { timeout: 10000 })
  console.log('Post auth URL:', page.url())
  await page.waitForTimeout(1500)

  // Screenshot before Tab
  await page.screenshot({ path: '/Users/wentao.hu/Documents/HomePage/00-projects/00-doing/MindFlow/Mindflow-workbuddy/tests/e2e/screenshots/before-tab.png' })

  // Tab to create child
  await page.keyboard.press('Tab')
  await page.waitForTimeout(800)
  await page.screenshot({ path: '/Users/wentao.hu/Documents/HomePage/00-projects/00-doing/MindFlow/Mindflow-workbuddy/tests/e2e/screenshots/after-tab.png' })

  // Check if there's an active editable element
  const activeInfo = await page.evaluate(() => {
    const el = document.activeElement
    return {
      tag: el?.tagName,
      className: el?.className,
      contentEditable: (el as HTMLElement)?.contentEditable,
      text: el?.textContent?.slice(0, 100),
    }
  })
  console.log('Active element after Tab:', JSON.stringify(activeInfo))

  // Type text
  await page.keyboard.type('需求分析', { delay: 40 })
  await page.waitForTimeout(600)
  await page.screenshot({ path: '/Users/wentao.hu/Documents/HomePage/00-projects/00-doing/MindFlow/Mindflow-workbuddy/tests/e2e/screenshots/after-type.png' })

  const activeInfo2 = await page.evaluate(() => {
    const el = document.activeElement
    return {
      tag: el?.tagName,
      className: el?.className,
      contentEditable: (el as HTMLElement)?.contentEditable,
      text: el?.textContent?.slice(0, 100),
    }
  })
  console.log('Active element after type:', JSON.stringify(activeInfo2))

  // Press Enter
  await page.keyboard.press('Enter')
  await page.waitForTimeout(800)
  await page.screenshot({ path: '/Users/wentao.hu/Documents/HomePage/00-projects/00-doing/MindFlow/Mindflow-workbuddy/tests/e2e/screenshots/after-enter.png' })

  // Check nodes
  const smmTexts = await page.locator('g.smm-node text').allTextContents()
  console.log('smm-node texts:', JSON.stringify(smmTexts))

  await browser.close()
}

run().catch(console.error)
