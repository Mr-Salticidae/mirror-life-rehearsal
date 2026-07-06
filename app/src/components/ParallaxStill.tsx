import { useEffect, useRef } from 'react'

// 剧照视差层：鼠标微视差（外层）+ Ken Burns 慢推镜（内层），两个 transform 互不打架
export default function ParallaxStill({ url, dim }: { url: string; dim?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = ref.current
      if (!el) return
      const dx = (e.clientX / innerWidth - 0.5) * -18
      const dy = (e.clientY / innerHeight - 0.5) * -10
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])
  return (
    <div ref={ref} className="parallax-wrap">
      <div
        className={`scene-still ${dim ? 'consequence' : ''}`}
        style={{ backgroundImage: `url(${url})` }}
      />
    </div>
  )
}
