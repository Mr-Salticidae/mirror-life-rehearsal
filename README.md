# 54_镜像自我_BW互动影游

BW 展位互动影游 v2（对标《底特律：成为人类》）。初版（问卷+3D背景）已否决，本版为从零新建。
设计文档见 [DESIGN.md](DESIGN.md)，MJ 剧照清单见 [assets/PROMPTS.md](assets/PROMPTS.md)。

## 快速开始

```bash
cd app
npm install
npm run dev        # 开发 http://localhost:5174
npm run build      # 产物在 app/dist，全静态、零外网依赖
npm run preview    # 本地预览构建产物
```

## 展位部署（离线）

1. `npm run build`，把 `app/dist` 拷到展位机（或直接整个仓库）。
2. 静态服务任选其一：
   - `npm run preview`（vite 自带）
   - `npx serve dist`
3. Chrome/Edge kiosk 全屏：
   ```
   chrome --kiosk --autoplay-policy=no-user-gesture-required http://localhost:4173
   ```
4. 本地 AI（可选，不起也能跑）：LM Studio / Ollama 起 OpenAI 兼容服务，
   改 `app/public/config.json`（构建后为 `dist/config.json`）：
   ```json
   { "baseUrl": "http://127.0.0.1:1234/v1", "model": "qwen2.5-14b-instruct", "timeoutMs": 20000 }
   ```
   端点不可用时自动走本地模板报告（报告卡右上角显示 OFFLINE MODE）。

## 运维要点

- **待机**：闲置 120s 自动回吸引模式；任何异常由错误边界兜底回待机，不会白屏。
- **直达调试**：`/?career=soldier|painter|racer` 跳过叙事直进对应职业线。
- **剧照**：MJ 出图放 `app/public/stills/{id}.jpg`（清单见 assets/PROMPTS.md）；
  缺图自动用程序化占位图，流程不断。
- **BGM**：`app/public/audio/bgm.mp3`，可无；音效为 WebAudio 程序合成。
- **操作**：叙事=鼠标点击；FPS=点击锁定视角+鼠标射击；涂鸦=按住喷涂；赛车=←→/AD。

## 体验流程

待机 → 点亮镜子 → 三章五节点抉择（含 QTE 限时/超时=犹豫分支）→ 章间底特律式分支图
→ 职业判定（勇/彩/驰 暗数值，可在镜前换门）→ 迷你游戏（FPS/涂鸦/赛车）
→ RTX 本地 AI 人生预演报告 + 分享卡导出 → 重新预演。
