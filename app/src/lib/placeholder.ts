// 程序化占位剧照：MJ 图未就位时按调色板生成电影感渐变图，保证全流程可跑
const cache = new Map<string, string>()

export function placeholderStill(id: string, palette: [string, string, string], label = ''): string {
  const key = id + palette.join()
  const hit = cache.get(key)
  if (hit) return hit

  const w = 1920, h = 1080
  const cv = document.createElement('canvas')
  cv.width = w; cv.height = h
  const ctx = cv.getContext('2d')!

  // 主渐变（斜向，像逆光）
  const g = ctx.createLinearGradient(0, h, w, 0)
  g.addColorStop(0, palette[0])
  g.addColorStop(0.55, palette[1])
  g.addColorStop(1, palette[0])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  // 远处光源
  const cx = w * 0.62, cy = h * 0.38
  const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.55)
  rg.addColorStop(0, palette[2] + 'cc')
  rg.addColorStop(0.35, palette[2] + '33')
  rg.addColorStop(1, 'transparent')
  ctx.fillStyle = rg
  ctx.fillRect(0, 0, w, h)

  // 伪地平线剪影
  ctx.fillStyle = '#00000066'
  ctx.beginPath()
  ctx.moveTo(0, h * 0.78)
  let seed = 0
  for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0
  for (let x = 0; x <= w; x += 60) {
    seed = (seed * 1103515245 + 12345) >>> 0
    const y = h * 0.78 - (seed % 1000) / 1000 * h * 0.12
    ctx.lineTo(x, y)
  }
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill()

  // 主角背影剪影（居中偏下）
  ctx.fillStyle = '#000000aa'
  ctx.beginPath()
  ctx.ellipse(w * 0.5, h * 0.62, w * 0.018, w * 0.018, 0, 0, Math.PI * 2) // 头
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(w * 0.5 - w * 0.03, h * 0.94)
  ctx.quadraticCurveTo(w * 0.5 - w * 0.032, h * 0.66, w * 0.5, h * 0.655)
  ctx.quadraticCurveTo(w * 0.5 + w * 0.032, h * 0.66, w * 0.5 + w * 0.03, h * 0.94)
  ctx.closePath(); ctx.fill()

  // 暗角
  const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.95)
  vg.addColorStop(0, 'transparent')
  vg.addColorStop(1, '#000000b8')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, w, h)

  if (label) {
    ctx.fillStyle = '#ffffff22'
    ctx.font = '28px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`[占位 · ${label}]`, w - 40, h - 40)
  }

  const url = cv.toDataURL('image/jpeg', 0.82)
  cache.set(key, url)
  return url
}

// 剧照加载：优先 /stills/{id}.jpg，失败回退占位图
export function stillUrl(id: string): string {
  return `${import.meta.env.BASE_URL}stills/${id}.jpg`
}
