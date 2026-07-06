const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await page.goto('http://127.0.0.1:5179/');
  await page.waitForTimeout(2000);
  await page.locator('button:has-text("离线模式")').click();
  await page.waitForTimeout(500);
  await page.locator('button:has-text("新建项目")').click();
  await page.waitForTimeout(300);
  const input = page.locator('input[placeholder="项目名称"]').first();
  await input.fill('Debug-Prj-' + Date.now());
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/project\/.+/, { timeout: 5000 });
  await page.waitForTimeout(1500);
  await page.locator('g.smm-node text').first().click();
  await page.waitForTimeout(300);
  console.log('Before Tab - smm-node count:', await page.locator('g.smm-node').count());
  console.log('Before Tab - edit-wrap count:', await page.locator('div.smm-node-edit-wrap').count());
  await page.keyboard.press('Tab');
  await page.waitForTimeout(500);
  console.log('After Tab - edit-wrap count:', await page.locator('div.smm-node-edit-wrap').count());
  console.log('After Tab - edit-wrap visible:', await page.locator('div.smm-node-edit-wrap').isVisible().catch(() => false));
  await browser.close();
})();
