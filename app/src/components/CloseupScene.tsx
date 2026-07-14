import { useEffect, useRef, useState } from 'react'
import { useGame } from '../store'
import { sfx } from '../lib/audio'
import { generateCloseup, CloseupSection, CloseupReport } from '../lib/closeup'

// 镜中特写：拍照/上传 → 镜面扫描 → AI 读心五段（选完性别、进序幕之前）
// 照片只存在本组件内存里，离开该阶段即随组件销毁；除发往 config.json 配置的本机端点外不去任何地方
type Stage = 'pick' | 'cam' | 'read'

// 送模型前压到长边 ≤896 的 JPEG：读图够用，dataURL 负载小一个量级
const MAX_EDGE = 896
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(shrink(img)) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')) }
    img.src = url
  })
}
function shrink(src: HTMLImageElement | HTMLVideoElement, mirror = false): string {
  const w = src instanceof HTMLVideoElement ? src.videoWidth : src.naturalWidth
  const h = src instanceof HTMLVideoElement ? src.videoHeight : src.naturalHeight
  const k = Math.min(1, MAX_EDGE / Math.max(w, h))
  const cv = document.createElement('canvas')
  cv.width = Math.round(w * k); cv.height = Math.round(h * k)
  const ctx = cv.getContext('2d')!
  if (mirror) { ctx.translate(cv.width, 0); ctx.scale(-1, 1) } // 拍照按镜像存——所见即所得
  ctx.drawImage(src, 0, 0, cv.width, cv.height)
  return cv.toDataURL('image/jpeg', 0.85)
}

export default function CloseupScene() {
  const setPhase = useGame(s => s.setPhase)
  const gender = useGame(s => s.gender)

  const [stage, setStage] = useState<Stage>('pick')
  const [photo, setPhoto] = useState<string | null>(null)
  const [sections, setSections] = useState<CloseupSection[]>([])
  const [report, setReport] = useState<CloseupReport | null>(null)
  const [toast, setToast] = useState('')
  const [camToast, setCamToast] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const runRef = useRef(0)          // 递增令牌：重来/离开后旧请求的回调一律作废
  const toastTimer = useRef(0)

  const say = (setter: (s: string) => void, msg: string) => {
    setter(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setter(''), 2600)
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }
  useEffect(() => () => { stopCamera(); runRef.current++ }, [])

  // ---------- 读心 ----------
  const analyze = (dataUrl: string) => {
    const run = ++runRef.current
    sfx.confirm()
    setPhoto(dataUrl); setSections([]); setReport(null); setStage('read')
    generateCloseup(dataUrl, gender, secs => {
      if (runRef.current === run) setSections(secs)
    }).then(r => {
      if (runRef.current !== run) return
      setSections(r.sections); setReport(r)
      sfx.ignite()
    })
  }

  // ---------- 上传 ----------
  const onFile = async (f: File | undefined | null) => {
    if (!f) return
    if (!f.type.startsWith('image/')) return say(setToast, '请选择图片文件')
    try { analyze(await fileToDataUrl(f)) }
    catch { say(setToast, '这张图读不出来 · 换一张试试') }
  }

  // ---------- 拍照 ----------
  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return say(setToast, '当前设备不支持拍照 · 请改用上传')
    try {
      const st = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      })
      streamRef.current = st
      setStage('cam')
      sfx.confirm()
    } catch { say(setToast, '无法访问摄像头 · 请改用上传') }
  }
  // video 元素随 stage 切换才挂载，流在 effect 里接上
  useEffect(() => {
    if (stage === 'cam' && videoRef.current && streamRef.current)
      videoRef.current.srcObject = streamRef.current
  }, [stage])

  const capture = () => {
    const v = videoRef.current
    if (!v || !streamRef.current) return say(setCamToast, '摄像头未就绪')
    if (!v.videoWidth) return say(setCamToast, '画面未就绪 · 稍候再试')
    const shot = shrink(v, true)
    stopCamera()
    analyze(shot)
  }

  const backToPick = () => {
    runRef.current++            // 作废进行中的生成
    stopCamera()
    setStage('pick'); setPhoto(null); setSections([]); setReport(null)
    sfx.confirm()
  }

  const done = !!report
  const scanning = stage === 'read' && !done

  return (
    <div className="closeup-scene fade-in">
      {/* ===== 选择：上传 / 拍照 ===== */}
      {stage !== 'read' && (
        <div className="cu-hero">
          <div className="kicker">镜像自我 · 人生预演</div>
          <h1 className="cu-title">镜 中 特 写</h1>
          <div className="cu-tagline">给我一张脸 · 镜子替你读出它没说出口的故事</div>

          {stage === 'pick' && (
            <section className="cu-panel" data-testid="closeup-pick">
              <div className="cu-rk">CHARACTER CLOSE-UP · 人物特写</div>
              <h2>拍照或上传 · 镜中读心即刻开始</h2>
              <div
                className="cu-drop"
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag') }}
                onDragLeave={e => e.currentTarget.classList.remove('drag')}
                onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('drag'); onFile(e.dataTransfer.files?.[0]) }}
              >
                <svg className="cu-lens" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                  <circle cx="32" cy="33" r="20" stroke="currentColor" strokeWidth="2.5" opacity=".55" />
                  <circle cx="32" cy="33" r="11" stroke="currentColor" strokeWidth="3" />
                  <circle cx="40" cy="25" r="3" fill="currentColor" />
                  <path d="M18 12h6l3 5h10l3-5h6" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
                </svg>
                <div className="cu-d-title">将照片拖到这里</div>
                <div className="cu-d-hint">支持 JPG / PNG · 正脸特写效果最佳<br />照片仅用于本次读心 · 不保存不上传</div>
              </div>
              <div className="cu-actions">
                <button className="cu-btn" data-testid="closeup-cam" onClick={startCamera}>拍　照</button>
                <button className="cu-btn-ghost" data-testid="closeup-upload" onClick={() => fileRef.current?.click()}>上传图片</button>
                <button className="cu-btn-ghost" data-testid="closeup-skip" onClick={() => { sfx.confirm(); setPhase('prologue') }}>跳过 · 直接预演</button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" hidden
                onChange={e => { onFile(e.target.files?.[0]); e.target.value = '' }} />
              <div className={`cu-toast${toast ? ' show' : ''}`}>{toast}</div>
            </section>
          )}

          {stage === 'cam' && (
            <section className="cu-panel" data-testid="closeup-cam-panel">
              <div className="cu-rk">LIVE VIEW · 取景</div>
              <h2>看着镜中的自己</h2>
              <div className="cu-honor">按下快门 · 把这一刻交给镜子</div>
              <div className="cu-cam-wrap">
                <video ref={videoRef} autoPlay playsInline muted />
                <div className="cu-cam-frame"><i /><i /></div>
                <div className="cu-cam-cross" />
              </div>
              <div className="cu-actions">
                <button className="cu-btn" data-testid="closeup-shot" onClick={capture}>快　门</button>
                <button className="cu-btn-ghost" onClick={backToPick}>取　消</button>
              </div>
              <div className={`cu-toast${camToast ? ' show' : ''}`}>{camToast}</div>
            </section>
          )}
        </div>
      )}

      {/* ===== 读心：左扫描 右五段 ===== */}
      {stage === 'read' && (
        <section className="cu-read" data-testid="closeup-read">
          <div className="cu-read-head">
            <div className="cu-lk">MIRROR READING · 镜中读心</div>
            <h2>镜中所见，皆是你未说出口的自己</h2>
            <div className="cu-lh">同一张脸，五重特写——镜子替你把它读成了一段旁白</div>
          </div>

          <div className="cu-read-body">
            <div className="cu-dh-col">
              <div className={`cu-dh-stage${scanning ? ' scanning' : ''}${done ? ' done' : ''}`}>
                <span className="cu-hud tl" /><span className="cu-hud tr" />
                <span className="cu-hud bl" /><span className="cu-hud br" />
                <div className="cu-dh-tag">MIRROR SCAN</div>
                {photo && <img className="cu-dh-photo" src={photo} alt="" />}
                <div className="cu-dh-beam" />
                <div className="cu-dh-progress"><i /></div>
                <div className="cu-dh-status">
                  {done
                    ? (report!.fromAI ? '读心完成 · COMPLETE' : '镜面朦胧 · 以直觉代读')
                    : <>正在读心 · ANALYZING<span className="dots" /></>}
                </div>
              </div>
              <div className="cu-dh-cap">
                镜中人 · <b>{gender === 'female' ? '她' : gender === 'male' ? '他' : '你'}的此刻</b>
                {done && report!.fromAI && report!.stats && (
                  <span className="cu-ai-stats"> · {report!.stats.chars} 字 / {report!.stats.seconds.toFixed(1)}s</span>
                )}
              </div>
            </div>

            <div className="cu-read-col">
              {sections.length === 0 && (
                <div className="cu-think">
                  <div className="cu-think-orb" />
                  <div className="cu-think-txt">镜中读心 · 正在解析这张脸<span className="dots" /></div>
                </div>
              )}
              <div className="cu-sections">
                {sections.map((s, i) => (
                  <div className={`cu-sec in${s.idx === '05' ? ' summary' : ''}`} key={s.idx}
                    style={{ animationDelay: `${Math.min(i * 0.1, 0.3)}s` }}>
                    <div className="cu-sec-head">
                      <span className="cu-sec-idx">{s.idx}</span>
                      <span className="cu-sec-key">{s.key}</span>
                      <span className="cu-sec-en">{s.keyEn}</span>
                    </div>
                    {s.sub && <div className="cu-sec-sub">{s.sub}</div>}
                    <div className="cu-pts">
                      {s.points.map((p, j) => (
                        <p className="cu-pt" key={j}>
                          {p.label && <span className="cu-pt-label">{p.label}</span>}
                          {p.text.split(/\*\*(.+?)\*\*/g).map((seg, k) =>
                            k % 2 ? <strong key={k}>{seg}</strong> : seg)}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="cu-read-actions">
            <button className="cu-btn-ghost" data-testid="closeup-retake" onClick={backToPick}>重新拍照 / 上传</button>
            <button className={`cu-btn${done ? '' : ' dim'}`} data-testid="closeup-go"
              onClick={() => { sfx.confirm(); setPhase('prologue') }}>
              开 始 预 演
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
