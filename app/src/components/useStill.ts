import { useEffect, useState } from 'react'
import { placeholderStill, stillUrl } from '../lib/placeholder'

// 优先真实剧照 /stills/{id}.jpg，加载失败回退程序化占位图
export function useStill(id: string, palette: [string, string, string], label = ''): string {
  const [url, setUrl] = useState<string>(() => placeholderStill(id, palette, label))
  useEffect(() => {
    let alive = true
    const real = stillUrl(id)
    const img = new Image()
    img.onload = () => { if (alive) setUrl(real) }
    img.onerror = () => { /* 保持占位图 */ }
    img.src = real
    return () => { alive = false }
  }, [id])
  return url
}
