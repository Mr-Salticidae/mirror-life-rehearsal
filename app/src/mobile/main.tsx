// 手机扫码报告页入口（r.html）：从 URL 片段还原报告数据，本地渲染完整图文报告
// 部署在内测预览站上，与主站同一构建产物，剧照直接复用站上 stills/
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { decodePayload, SharePayload } from '../lib/share'
import MobileReport from './MobileReport'
import './mobile.css'

function Notice({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="m-notice">
      <div className="m-notice-mirror">镜</div>
      <h1>{title}</h1>
      {lines.map((l, i) => <p key={i}>{l}</p>)}
    </div>
  )
}

async function boot() {
  const root = createRoot(document.getElementById('root')!)
  if (!location.hash || location.hash.length < 2) {
    root.render(
      <StrictMode>
        <Notice title="镜像自我 · 人生预演" lines={[
          '这里是预演报告的查看页。',
          '请在展台完成一次人生预演，扫描报告上的二维码打开专属报告。',
        ]} />
      </StrictMode>,
    )
    return
  }
  let payload: SharePayload | null = null
  try {
    payload = await decodePayload(location.hash)
  } catch { /* 交给下方统一提示 */ }
  if (!payload) {
    root.render(
      <StrictMode>
        <Notice title="报告没能展开" lines={[
          '链接可能不完整，或浏览器版本过旧。',
          '请回到展台重新扫码；也可以换系统自带浏览器再试一次。',
        ]} />
      </StrictMode>,
    )
    return
  }
  document.title = `镜像自我 · ${payload.ti}`
  root.render(
    <StrictMode>
      <MobileReport p={payload} />
    </StrictMode>,
  )
}

boot()
