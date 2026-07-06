import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:5173'

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } })
  const page = await context.newPage()

  await page.goto(BASE_URL + '/auth')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)

  const btn = page.locator('button:has-text("离线使用，数据仅存本地")')
  console.log('Button visible?', await btn.isVisible().catch(() => false))
  await btn.click()
  await page.waitForTimeout(2500)
  console.log('Current URL:', page.url())

  // Try clicking on the first smm-node (root) before Tab
  const rootNode = page.locator('g.smm-node').first()
  console.log('Root node count:', await rootNode.count())
  if (await rootNode.count() > 0) {
    await rootNode.click({ force: true })
    await page.waitForTimeout(300)
    console.log('Clicked root node')
  }

  const activeBeforeTab = await page.evaluate(() => document.activeElement?.tagName)
  console.log('Active element before Tab:', activeBeforeTab)

  await page.keyboard.press('Tab')
  await page.waitForTimeout(800)

  const activeInfo = await page.evaluate(() => {
    const el = document.activeElement
    return {
      tag: el?.tagName,
      className: el?.className,
      contentEditable: (el as HTMLElement)?.contentEditable,
      text: el?.textContent?.slice(0, 100),
    }
  })
  console.log('After Tab:', JSON.stringify(activeInfo, null, 2))

  await page.keyboard.type('需求分析', { delay: 40 })
  await page.waitForTimeout(600)

  const activeInfo2 = await page.evaluate(() => {
    const el = document.activeElement
    return {
      tag: el?.tagName,
      className: el?.className,
      contentEditable: (el as HTMLElement)?.contentEditable,
      text: el?.textContent?.slice(0, 100),
    }
  })
  console.log('After type:', JSON.stringify(activeInfo2, null, 2))

  await page.keyboard.press('Enter')
  await page.waitForTimeout(800)

  const smmTexts = await page.locator('g.smm-node text').allTextContents()
  console.log('smm-node texts:', JSON.stringify(smmTexts))

  await browser.close()
}

run().catch(console.error)
