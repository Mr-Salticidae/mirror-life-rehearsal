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

export const sfx = {
  hover: () => tone(880, 'sine', 0.06, 0.08),
  click: () => { tone(520, 'triangle', 0.12, 0.12); noise(0.05, 0.06, 6000) },
  confirm: () => { tone(392, 'sine', 0.14, 0.35); tone(587.3, 'sine', 0.1, 0.45); tone(784, 'sine', 0.08, 0.6) },
  ignite: () => { noise(0.12, 0.9, 1200); tone(196, 'sine', 0.12, 1.2); tone(392, 'sine', 0.06, 1.5) },
  whoosh: () => noise(0.14, 0.5, 900),
  tick: () => tone(1200, 'square', 0.045, 0.05),
  heartbeat: () => { tone(55, 'sine', 0.22, 0.18); setTimeout(() => tone(50, 'sine', 0.16, 0.16), 140) },
  shot: () => { noise(0.2, 0.12, 3000); tone(140, 'square', 0.1, 0.1) },
  hit: () => { tone(660, 'triangle', 0.14, 0.15); tone(990, 'sine', 0.08, 0.2) },
  wrong: () => { tone(160, 'sawtooth', 0.14, 0.3); tone(110, 'sawtooth', 0.1, 0.4) },
  spray: () => noise(0.05, 0.15, 2500),
  nitro: () => { tone(220, 'sawtooth', 0.1, 0.4); tone(440, 'sawtooth', 0.07, 0.5) },
  crash: () => { noise(0.25, 0.4, 800); tone(80, 'square', 0.18, 0.35) },
}
