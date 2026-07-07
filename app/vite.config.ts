import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5174 },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('index.html', import.meta.url)),
        // 手机扫码报告页（随内测预览站部署，展台二维码指向 r.html#<payload>）
        r: fileURLToPath(new URL('r.html', import.meta.url)),
      },
    },
  },
})
