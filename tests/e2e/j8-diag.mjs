/**
 * Journey 8 辅助诊断 — 在测试运行中通过 page.evaluate 检查 DOM 状态
 */
export async function captureDomState(page) {
  return page.evaluate(() => {
    const svg = document.querySelector('svg')
    const groups = document.querySelectorAll('g.smm-node')
    const texts = []
    groups.forEach(g => {
      const t = g.querySelector('text')
      if (t) texts.push(t.textContent || '')
    })
    return {
      hasSvg: !!svg,
      groupCount: groups.length,
      texts,
      bodyText: document.body.innerText.slice(0, 300),
      diag: (window).__diag,
      svgHtml: svg ? svg.outerHTML.slice(0, 600) : 'no-svg',
    }
  })
}
