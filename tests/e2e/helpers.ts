import { Page } from '@playwright/test'

/**
 * Click the first SVG node in simple-mind-map, bypassing Playwright viewport checks.
 * Uses event dispatch directly to avoid "Element is outside of the viewport" errors
 * on transformed SVG <g> elements.
 */
export async function clickSVGNode(page: Page, selector = 'g.smm-node') {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel) as SVGElement | null
    if (!el) return
    // Prefer the visible <text> child; fall back to the <g> itself
    const target = (el.querySelector('text') as SVGElement | null) || el
    target.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true })
    )
  }, selector)
}

/**
 * Wait for the mindmap canvas to be fully initialized and visible.
 * Guards against the async setData + visibility:hidden → visible race
 * introduced by the "闪烁根治" fix.
 */
export async function waitForCanvasReady(page: Page, timeout = 10000) {
  await page.waitForFunction(
    () => {
      const mm = (window as any).__mindMap
      if (!mm || !mm.renderer || !mm.renderer.root) return false
      const container = document.querySelector('.mind-map-container') as HTMLElement | null
      if (container && container.style.visibility === 'hidden') return false
      return true
    },
    { timeout }
  ).catch(() => {})
  await page.waitForTimeout(300)
}

export async function focusMindmapRoot(page: Page) {
  await waitForCanvasReady(page)
  await page.evaluate(() => {
    const mm = (window as any).__mindMap
    const root = mm?.renderer?.root
    if (root) {
      root.active()
    }
  })
  await page.waitForTimeout(200)
}

/**
 * Find a node by text in the mind map tree and activate it programmatically.
 * Traverses the tree from root using nodeData.children and activates via node.active().
 */
export async function focusNodeByText(page: Page, text: string) {
  await waitForCanvasReady(page)
  await page.evaluate((searchText) => {
    const mm = (window as any).__mindMap
    const root = mm?.renderer?.root
    if (!root) return

    // Traverse RENDER tree (not data tree), render nodes have .children and .active()
    function findRenderNode(node: any): any | undefined {
      if (node?.nodeData?.data?.text === searchText) return node
      const children = node?.children || []
      for (const child of children) {
        const found = findRenderNode(child)
        if (found) return found
      }
      return undefined
    }

    const target = findRenderNode(root)
    if (target && target.active) {
      target.active()
      // 手动补发 node_active 事件，确保 React state 同步更新
      // simple-mind-map 内部 emitNodeActiveEvent 使用 setTimeout(...,0)
      // 在 E2E 中该异步派发偶发失效，直接 emit 可绕过
      if (mm.emit) {
        mm.emit('node_active', target, mm.renderer.activeNodeList)
      }
    }
  }, text)
  await page.waitForTimeout(300)
}

/**
 * Programmatically insert a child node via simple-mind-map API.
 * Bypasses flaky headless keyboard events. The new node is auto-activated.
 */
export async function addMindMapChildViaAPI(page: Page, text: string) {
  await waitForCanvasReady(page)
  await page.evaluate((nodeText) => {
    const mm = (window as any).__mindMap
    const root = mm?.renderer?.root
    if (root && mm.renderer.insertChildNode) {
      mm.renderer.insertChildNode(false, [root], { text: nodeText })
    }
  }, text)
  // wait for async render() + DOM update
  await page.waitForTimeout(1000)
}

/**
 * Toggle the active node to task status by pressing 'T'.
 * The floating toolbar may not appear in headless; the keyboard shortcut
 * reads renderer.activeNodeList directly and is always reliable.
 */
export async function toggleTaskViaKeyboard(page: Page) {
  await page.waitForTimeout(200)
  await page.keyboard.press('t')
  await page.waitForTimeout(500)
}

/**
 * Get all visible node texts from the mind map canvas.
 * Filters out the fake root node used by simple-mind-map for layout.
 */
export async function getNodeTexts(page: Page): Promise<string[]> {
  const nodes = await page.locator('.smm-node:not([isfakerootnode="true"])').all()
  const texts: string[] = []
  for (const n of nodes) {
    const t = (await n.textContent()) || ''
    if (t) texts.push(t.trim())
  }
  return texts
}
