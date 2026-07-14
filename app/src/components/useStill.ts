import { useEffect, useRef, useState } from 'react'
import { placeholderStill, stillUrl } from '../lib/placeholder'
import { useGame, Gender } from '../store'

// 已确认加载成功的剧照 id：命中即首帧直出真图，不再闪占位图
const loaded = new Set<string>()
// 已确认缺失的 id（分性别变体只覆盖部分节点/职业，缺失是常态）：记住 404 不反复探测
const missing = new Set<string>()

// 分性别素材命名：stills/{id}_m.jpg / {id}_f.jpg（视频同理）。
// 变体只在"中性图与所选性别不符"的位置补拍，存在即优先、缺失回退中性图——两端同一规则。
export function genderSuffix(g: Gender | null): 'm' | 'f' | null {
  return g === 'male' ? 'm' : g === 'female' ? 'f' : null
}

// 待机页起全量预热（19 张 ≈ 4.8MB），到首个叙事节点前基本就绪；
// 选完性别后 App 会再预热对应性别的变体（缺失的探一次 404 即记账，不影响流程）
export function preloadStills(ids: string[]) {
  for (const id of ids) {
    if (loaded.has(id) || missing.has(id)) continue
    const img = new Image()
    img.onload = () => loaded.add(id)
    img.onerror = () => missing.add(id)
    img.src = stillUrl(id)
  }
}

// 动态剧照 /videos/{id}.mp4：存在即用（叠在静图上播一遍后定格尾帧），缺失/失败静图兜底
// 懒探测不预热——视频体积大，只在进入对应场景时按需检查
const motionLoaded = new Set<string>()
const motionMissing = new Set<string>()
export function motionUrl(id: string): string {
  return `${import.meta.env.BASE_URL}videos/${id}.mp4`
}
export function useMotion(id: string): string | null {
  const gender = useGame(s => s.gender)
  const sfx = genderSuffix(gender)
  const gid = sfx ? `${id}_${sfx}` : null
  const [, force] = useState(0)
  // 本场已起播的源就锁定不换：动态剧照只播一遍，中途换源会造成跳跃重播
  const pick = useRef<{ key: string; url: string } | null>(null)
  useEffect(() => {
    let alive = true
    const probes: HTMLVideoElement[] = []
    const probe = (pid: string) => {
      if (motionLoaded.has(pid) || motionMissing.has(pid)) return
      const v = document.createElement('video')
      v.muted = true
      v.preload = 'metadata'
      v.onloadeddata = () => { motionLoaded.add(pid); if (alive) force(x => x + 1) }
      v.onerror = () => { motionMissing.add(pid); if (alive) force(x => x + 1) }
      v.src = motionUrl(pid)
      v.load()
      probes.push(v)
    }
    if (gid) probe(gid)
    probe(id)
    return () => { alive = false; probes.forEach(v => v.removeAttribute('src')) }
  }, [id, gid])
  const key = `${id}|${gid ?? ''}`
  if (pick.current?.key === key) return pick.current.url
  let url: string | null = null
  if (gid && motionLoaded.has(gid)) url = motionUrl(gid)
  else if (motionLoaded.has(id)) {
    // 中性图已就绪：若性别变体还在探测中，等它定论（loaded/missing 二选一后 force 会再来）
    if (gid && !motionMissing.has(gid)) return null
    url = motionUrl(id)
  }
  if (url) pick.current = { key, url }
  return url
}

// 优先真实剧照 /stills/{id}.jpg：已预热则同步直出，未就绪先占位、载成后换；
// 选了性别且存在 {id}_{m|f}.jpg 变体时优先变体
export function useStill(id: string, palette: [string, string, string], label = ''): string {
  const gender = useGame(s => s.gender)
  const sfx = genderSuffix(gender)
  const gid = sfx ? `${id}_${sfx}` : null
  const [, force] = useState(0)
  useEffect(() => {
    let alive = true
    const probe = (pid: string) => {
      if (loaded.has(pid) || missing.has(pid)) return
      const img = new Image()
      img.onload = () => { loaded.add(pid); if (alive) force(v => v + 1) }
      img.onerror = () => { missing.add(pid); if (alive) force(v => v + 1) }
      img.src = stillUrl(pid)
    }
    if (gid) probe(gid)
    probe(id)
    return () => { alive = false }
  }, [id, gid])
  if (gid && loaded.has(gid)) return stillUrl(gid)
  if (loaded.has(id)) return stillUrl(id)
  return placeholderStill(id, palette, label)
}
