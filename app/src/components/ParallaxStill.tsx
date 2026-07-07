import { useEffect, useRef } from 'react'

// 剧照视差层：鼠标微视差（外层）+ Ken Burns 慢推镜（内层），两个 transform 互不打架
// video 传入时叠动态剧照（只播一遍后定格尾帧，静图垫底防黑帧；缺素材/加载失败自然回退静图）
export default function ParallaxStill({ url, video, dim }: { url: string; video?: string | null; dim?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = ref.current
      if (!el) return
      // 幅度与 .scene-still 的 -3.5% 过扫描边距匹配，避免视差拖出黑边
      const dx = (e.clientX / innerWidth - 0.5) * -12
      const dy = (e.clientY / innerHeight - 0.5) * -7
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
      {video && (
        <video
          key={video}
          className={`scene-still scene-video ${dim ? 'consequence' : ''}`}
          src={video} autoPlay muted playsInline
        />
      )}
    </div>
  )
}
