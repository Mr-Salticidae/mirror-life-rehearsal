import { useEffect, useState } from 'react'
import { placeholderStill, stillUrl } from '../lib/placeholder'

// 已确认加载成功的剧照 id：命中即首帧直出真图，不再闪占位图
const loaded = new Set<string>()

// 待机页起全量预热（19 张 ≈ 4.8MB），到首个叙事节点前基本就绪
export function preloadStills(ids: string[]) {
  for (const id of ids) {
    if (loaded.has(id)) continue
    const img = new Image()
    img.onload = () => loaded.add(id)
    img.onerror = () => { /* 缺图保持占位回退 */ }
    img.src = stillUrl(id)
  }
}

// 优先真实剧照 /stills/{id}.jpg：已预热则同步直出，未就绪先占位、载成后换
export function useStill(id: string, palette: [string, string, string], label = ''): string {
  const [, force] = useState(0)
  useEffect(() => {
    if (loaded.has(id)) return
    let alive = true
    const img = new Image()
    img.onload = () => { loaded.add(id); if (alive) force(v => v + 1) }
    img.onerror = () => { /* 保持占位图 */ }
    img.src = stillUrl(id)
    return () => { alive = false }
  }, [id])
  return loaded.has(id) ? stillUrl(id) : placeholderStill(id, palette, label)
}
