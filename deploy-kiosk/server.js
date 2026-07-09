// 展台静态服务器（零依赖，node.exe 单文件即可运行）
// 特性：视频/音频 Range 断点支持（拖动/循环必需）、正确 MIME、config.json 永不缓存（改配置刷新即生效）
// 用法：node server.js [端口]（默认 8420，只监听本机 127.0.0.1）
const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = Number(process.argv[2]) || 8420
const ROOT = path.join(__dirname, 'app')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.mp3': 'audio/mpeg',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
}

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split('?')[0].split('#')[0])
    if (urlPath === '/') urlPath = '/index.html'
    const file = path.normalize(path.join(ROOT, urlPath))
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end() } // 防目录穿越
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end('not found') }

    const ext = path.extname(file).toLowerCase()
    const mime = MIME[ext] || 'application/octet-stream'
    const stat = fs.statSync(file)
    // config.json 与 html 永不缓存（现场改配置/切换止血构建后刷新即生效）；
    // 其余资产给长缓存（文件名带哈希/内容稳定）
    const noStore = path.basename(file) === 'config.json' || ext === '.html'
    const cache = noStore ? 'no-store' : 'public, max-age=86400'

    const range = req.headers.range
    if (range && /^bytes=/.test(range)) {
      const [s, e] = range.replace('bytes=', '').split('-')
      const start = parseInt(s, 10) || 0
      const end = e ? Math.min(parseInt(e, 10), stat.size - 1) : stat.size - 1
      if (start >= stat.size) { res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }); return res.end() }
      res.writeHead(206, {
        'Content-Type': mime, 'Cache-Control': cache, 'Accept-Ranges': 'bytes',
        'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1,
      })
      fs.createReadStream(file, { start, end }).pipe(res)
    } else {
      res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': cache, 'Accept-Ranges': 'bytes', 'Content-Length': stat.size })
      fs.createReadStream(file).pipe(res)
    }
  } catch (err) {
    console.error('[server]', err.message)
    res.writeHead(500); res.end()
  }
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[server] 端口 ${PORT} 已被占用——服务可能已在运行，请勿重复启动（或先跑 停止展台.bat）`)
  } else {
    console.error('[server]', err.message)
  }
  process.exit(1)
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`镜像自我·人生预演 展台服务已启动: http://127.0.0.1:${PORT}`)
  console.log(`资源目录: ${ROOT}`)
})
