// 程序化音效（WebAudio 合成，零素材、可离线）；若 /audio/bgm.mp3 存在则叠加播放
let ctx: AudioContext | null = null
let bgmEl: HTMLAudioElement | null = null
let muted = false

function ac(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function setMuted(m: boolean) {
  muted = m
  if (bgmEl) bgmEl.muted = m
}
export function isMuted() { return muted }

export function startBgm() {
  if (bgmEl) { bgmEl.play().catch(() => {}); return }
  const el = new Audio(`${import.meta.env.BASE_URL}audio/bgm.mp3`)
  el.loop = true
  el.volume = 0.35
  el.muted = muted
  el.play().catch(() => { /* 无 bgm 文件则静默 */ })
  bgmEl = el
}

// 迷你游戏期间 BGM 闪避（让位给游戏音效），结束恢复
let duckTween = 0
export function duckBgm(on: boolean) {
  if (!bgmEl) return
  // 音效做减法后 BGM 需承担更多氛围，闪避幅度收窄
  const target = on ? 0.2 : 0.35
  clearInterval(duckTween)
  duckTween = window.setInterval(() => {
    if (!bgmEl) { clearInterval(duckTween); return }
    const d = target - bgmEl.volume
    if (Math.abs(d) < 0.02) { bgmEl.volume = target; clearInterval(duckTween); return }
    bgmEl.volume += d * 0.2
  }, 50)
}

function env(node: GainNode, t0: number, peak: number, decay: number) {
  const g = node.gain
  g.setValueAtTime(0.0001, t0)
  g.exponentialRampToValueAtTime(peak, t0 + 0.012)
  g.exponentialRampToValueAtTime(0.0001, t0 + decay)
}

function tone(freq: number, type: OscillatorType, peak: number, decay: number, detune = 0) {
  if (muted) return
  try {
    const a = ac(), t = a.currentTime
    const o = a.createOscillator(), g = a.createGain()
    o.type = type; o.frequency.value = freq; o.detune.value = detune
    env(g, t, peak, decay)
    o.connect(g).connect(a.destination)
    o.start(t); o.stop(t + decay + 0.05)
  } catch { /* noop */ }
}

function noise(peak: number, decay: number, lowpass = 4000) {
  if (muted) return
  try {
    const a = ac(), t = a.currentTime
    const len = Math.ceil(a.sampleRate * decay)
    const buf = a.createBuffer(1, len, a.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = a.createBufferSource(); src.buffer = buf
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass
    const g = a.createGain(); env(g, t, peak, decay)
    src.connect(f).connect(g).connect(a.destination)
    src.start(t)
  } catch { /* noop */ }
}

// 音效减法：砍掉所有振荡器"哔哔"层（square/sawtooth/高频短音是廉价感来源），
// 只保留噪声质感音与低频层；接口不变，调用点零改动
export const sfx = {
  hover: () => {},
  click: () => noise(0.06, 0.05, 5000),
  confirm: () => noise(0.13, 0.2, 1400),
  ignite: () => { noise(0.12, 0.9, 1200); tone(196, 'sine', 0.12, 1.2) },
  whoosh: () => noise(0.14, 0.5, 900),
  tick: () => {},
  heartbeat: () => { tone(55, 'sine', 0.22, 0.18); setTimeout(() => tone(50, 'sine', 0.16, 0.16), 140) },
  shot: () => noise(0.14, 0.1, 2500),
  hit: () => noise(0.09, 0.06, 5500),
  wrong: () => { noise(0.16, 0.3, 600); tone(80, 'sine', 0.08, 0.25) },
  spray: () => noise(0.05, 0.15, 2500),
  nitro: () => noise(0.1, 0.35, 1500),
  crash: () => { noise(0.25, 0.4, 800); tone(70, 'sine', 0.14, 0.3) },
}
