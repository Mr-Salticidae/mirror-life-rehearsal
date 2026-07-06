import { useEffect, useRef } from 'react'

// 胶片颗粒：一次性生成噪点贴图，CSS steps 抖动
let grainUrl: string | null = null
function makeGrain(): string {
  if (grainUrl) return grainUrl
  const s = 256
  const cv = document.createElement('canvas')
  cv.width = s; cv.height = s
  const ctx = cv.getContext('2d')!
  const img = ctx.createImageData(s, s)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  grainUrl = cv.toDataURL()
  return grainUrl
}

export default function GrainLayer() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.style.backgroundImage = `url(${makeGrain()})`
  }, [])
  return <div ref={ref} className="grain" />
}
