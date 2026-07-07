import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { useGame } from './store'
import './styles.css'

// DEV-only QA 钩子：控制台可直构造任意剧情状态做回归（生产构建剔除）
if (import.meta.env.DEV) (window as any).__game = useGame

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
