// 金色浮尘粒子：确定性伪随机（不依赖 Math.random，参数可复现）
export default function Dust({ count = 14 }: { count?: number }) {
  return (
    <div className="dust-field" aria-hidden>
      {Array.from({ length: count }).map((_, i) => {
        const seed = (i * 2654435761) >>> 0
        const left = (seed % 97) + 1.5              // 1.5% ~ 98.5%
        const dur = 9 + (seed % 11)                 // 9~19s
        const delay = -(seed % 13)                  // 负延迟：入场即已散布
        const drift = ((seed % 60) - 30)            // -30~30px 横漂
        const size = 2 + (seed % 3)
        return (
          <span
            key={i}
            className="dust"
            style={{
              left: `${left}%`,
              width: size, height: size,
              animationDuration: `${dur}s`,
              animationDelay: `${delay}s`,
              ['--drift' as string]: `${drift}px`,
            }}
          />
        )
      })}
    </div>
  )
}
