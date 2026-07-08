# 54_镜像自我_BW互动影游

BW 展位互动影游 v2（对标《底特律：成为人类》）。初版（问卷+3D背景）已否决，本版为从零新建。
设计文档见 [DESIGN.md](DESIGN.md)，MJ 剧照清单见 [assets/PROMPTS.md](assets/PROMPTS.md)。

**协作者从这里开始 →** [COLLABORATION.md](COLLABORATION.md)（分工、内容基准、文风铁律、提交流程），
内容交付模板在 [content/TEMPLATES.md](content/TEMPLATES.md)。内容组只动 `content/`，不动 `app/`。

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

- **待机**：闲置 120s 自动回吸引模式；渲染异常由错误边界兜底回待机。
  游戏阶段另有独立看门狗：60s 无输入（弃玩）或单局超 180s（画面冻结/GPU 上下文丢失）强制回待机；
  三个 3D 游戏均监听 `webglcontextlost`、主循环带异常兜底——按当前成绩提前结算，不冻屏。
- **直达调试**：`/?career=soldier|painter|racer` 跳过叙事直进对应职业线。
- **剧照**：MJ 出图放 `app/public/stills/{id}.jpg`（清单见 assets/PROMPTS.md）；
  缺图自动用程序化占位图，流程不断。
- **BGM**：`app/public/audio/bgm.mp3`，可无；音效为 WebAudio 程序合成。
- **操作**：叙事=鼠标点击；FPS=点击锁定视角+鼠标射击；涂鸦=按住喷涂；赛车=←→/AD。

## 体验流程（迭代三·五结局架构）

待机（今日人生墙滚动）→ 按住擦亮镜子 → 三章**八节点**抉择（QTE 限时、长按推门、
回响台词会记得你之前的选择；F/C/H 为四选项节点）→ 章间底特律式分支图 →
**五维路由**（守/创/疾/韵/远，开方阻尼归一化，可在镜前换门）→ 五结局迷你游戏
（哨兵 FPS / 画家涂鸦 / 赛车手竞速 / 音乐人节奏打击 / 宇航员纵向飞行射击）→ S/A/B 评级演出
→ 分档称号（15 池）+ **GPTI 式人格卡**（4 轴 % + 类型代码 + slogan + 镜子没给你的人生）
+ RTX 本地 AI 报告 + 分享卡导出 → 上人生墙 → 重新预演。

设计基准：[content/五结局扩容计划_db.md](content/五结局扩容计划_db.md)（内容组 danbao757 提案，主导已批）。
调试直达：`/?career=soldier|painter|racer|musician|astronaut`。
