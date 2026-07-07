# 结局海报变体图 · MJ 提示词包（v2 · V8.1+preview 版）

> 2026-07-07 晚 · 主导 + Claude 协作用（v2：2026-07-07 按 prompt-optimizer 规范重写，升级 `--v 8.1 --preview`）
> 目标：每个职业结局 × 4 种"路线印记" = **20 张变体结局剧照**，让不同选择路线得到不同气质的结局海报
> （例：一路选"保护别人"走到宇航员 → 拿到的是**守望型宇航员**的海报）

## 0. 代码已就绪（随放随生效）

- 命名规则：`end_{职业}_{印记}.jpg` → 放入 `app/public/stills/`
- 游戏会按玩家路线的**次强倾向**自动选变体；**没放的变体自动回退基础结局图**——可以分批交付，放几张生效几张
- 印记文案与海报副标题（"守望型宇航员的一生"、印记短句）已内置，只缺图
- 规格：**1920 宽 JPG**（16:9），与现有 19 张剧照一致；单张 ≤400KB 为佳

## 1. 一致性策略（先做这步）

为保持与现有结局图同一气质：每个职业生成变体时，把现有基础图
（`app/public/stills/end_{career}.jpg`）上传 MJ 作 **--sref**（风格锚），
人物容易跳戏时叠 **--oref**（V8.1 Omni Reference 锁人）。

**通用后缀（每条 prompt 已带）**：

```
cinematic film still, deep blue and warm gold color grading, 35mm lens, shallow depth of field --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality
```

### ⚠️ --preview 使用须知（V8.2 预览模型）

- `--preview` 挂在 V8.1 prompt 上即切到 **V8.2 in-development 模型**，美学更新但**不同 session 间风格可能漂移**，且仅 **midjourney.com 网页版**可用（Discord 无效）。
- 因此本包 20 张**尽量一个 session 内集中生成**，全程保持同一 `--sref` 锚，把漂移压到最小。
- **兜底规则**：某条与基础图气质对不上时，先去掉 `--preview` 用纯 `--v 8.1 --style raw` 重跑该条再对比——一致性优先于新模型美学。
- `--preview` 对 personalization / moodboard 的影响最明显，本包**不要**叠加个性化配置。

## 2. 提示词总表（20 条，直接复制）

### 哨兵 end_soldier_*（基础场景：风雪边境哨位）

| 文件名 | Prompt |
|---|---|
| `end_soldier_create.jpg` | A young Chinese sentry at a snowy border post at night, sketching constellations in a small notebook between watches, rifle resting beside, warm flashlight glow as the single light source, intimate medium close-up, subject off-center with dark negative space, cinematic film still, deep blue and warm gold color grading, 35mm lens, shallow depth of field --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality |
| `end_soldier_swift.jpg` | A young Chinese sentry sprinting through blowing snow along the border fence at night, low-angle dynamic diagonal composition, snow streaking with motion blur, breath visible, urgent warm searchlight rim lighting from behind, cinematic film still, deep blue and warm gold color grading, 35mm lens, shallow depth of field --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality |
| `end_soldier_rhythm.jpg` | A young Chinese sentry on night watch tapping a quiet beat on his rifle strap, medium shot framed inside the watchtower lamp's warm pool of light, snowflakes drifting in rhythm past the lamp, faint smile, cinematic film still, deep blue and warm gold color grading, 35mm lens, shallow depth of field --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality |
| `end_soldier_far.jpg` | A young Chinese sentry at a snowy border post gazing far beyond the fence at the starry horizon, extreme wide shot, vast negative space of night sky, tiny warm human figure against immense cold distance, cinematic film still, deep blue and warm gold color grading, 35mm lens, shallow depth of field --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality |

### 画家 end_painter_*（基础场景：黎明城市墙前）

| 文件名 | Prompt |
|---|---|
| `end_painter_guard.jpg` | A Chinese street painter at dawn finishing a huge mural that shelters small painted figures under painted wings, spray cans at his feet, low-angle wide shot with the mural dominating the frame, first golden light raking across the wall, protective tender mood, cinematic film still, deep blue and warm gold color grading, 35mm lens, shallow depth of field --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality |
| `end_painter_swift.jpg` | A Chinese street painter racing the sunrise, arm sweeping a bold arc of paint across a city wall, paint droplets frozen mid-air, energetic diagonal composition, fast-shutter kinetic feel, cinematic film still, deep blue and warm gold color grading, 35mm lens, shallow depth of field --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality |
| `end_painter_rhythm.jpg` | A Chinese street painter dancing while spraying a wall at dawn, headphones on, medium wide shot, paint strokes flowing like sound waves across the mural, joyful motion, cinematic film still, deep blue and warm gold color grading, 35mm lens, shallow depth of field --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality |
| `end_painter_far.jpg` | A Chinese street painter stepping far back from a finished mural at dawn, extreme wide shot, small figure looking up at an enormous wall painting of a distant horizon, contemplative scale contrast, cinematic film still, deep blue and warm gold color grading, 35mm lens, shallow depth of field --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality |

### 赛车手 end_racer_*（基础场景：雨夜环线）

| 文件名 | Prompt |
|---|---|
| `end_racer_guard.jpg` | A Chinese night racer stopped on a rainy ring road, standing in headlight beams guiding another stalled Chinese driver to safety, wide shot with two backlit silhouettes inside the beams, rain glittering gold in the light, quiet heroic mood, cinematic film still, deep blue and warm gold color grading, 35mm lens, shallow depth of field --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality |
| `end_racer_create.jpg` | A Chinese night racer in a garage at 3am, hood open, inventing an impossible hand-built engine glowing warm gold as the single light source, medium shot, blueprints and neon sketches around, cinematic film still, deep blue and warm gold color grading, 35mm lens, shallow depth of field --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality |
| `end_racer_rhythm.jpg` | A Chinese night racer drumming fingers on the steering wheel at a red light in the rain, close-up through the rain-streaked windshield, wipers keeping the beat, bokeh city lights pulsing like a metronome, cinematic film still, deep blue and warm gold color grading, 35mm lens, shallow depth of field --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality |
| `end_racer_far.jpg` | A Chinese night racer parked at the highest curve of the ring road, extreme wide night vista, looking out over the entire glittering city and the road vanishing into the horizon, small figure against vast distance, cinematic film still, deep blue and warm gold color grading, 35mm lens, shallow depth of field --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality |

### 音乐人 end_musician_*（基础场景：地下 livehouse 舞台）

| 文件名 | Prompt |
|---|---|
| `end_musician_guard.jpg` | A Chinese underground musician on a small livehouse stage, stepping off stage mid-song to hand the microphone to a crying Chinese stranger in the crowd, medium wide shot, one warm spotlight framing both figures inside surrounding darkness, tender guardian mood, cinematic film still, deep blue and warm gold color grading, 35mm lens, shallow depth of field --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality |
| `end_musician_create.jpg` | A Chinese underground musician on stage playing a strange hand-modified guitar, medium shot, impossible dreamlike instruments around, golden stage light flowing like liquid imagination, cinematic film still, deep blue and warm gold color grading, 35mm lens, shallow depth of field --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality |
| `end_musician_swift.jpg` | A Chinese underground musician mid-jump on a livehouse stage, low-angle shot frozen at the exact peak of motion, hair and cables flying, strobe light, raw kinetic energy, cinematic film still, deep blue and warm gold color grading, 35mm lens, shallow depth of field --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality |
| `end_musician_far.jpg` | A Chinese underground musician alone after the show, sitting on the stage edge looking up through a skylight at the stars, guitar on lap, wide shot, small warm figure in a big dark room, large negative space above, cinematic film still, deep blue and warm gold color grading, 35mm lens, shallow depth of field --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality |

### 宇航员 end_astronaut_*（基础场景：空间站/舱外星空）

| 文件名 | Prompt |
|---|---|
| `end_astronaut_guard.jpg` | A Chinese astronaut during a spacewalk keeping one steady hand on a fellow Chinese astronaut's tether, protective calm posture, medium shot, Earth glowing warm below as atmospheric background depth, guardian in the void, cinematic film still, deep blue and warm gold color grading, 35mm lens, shallow depth of field --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality |
| `end_astronaut_create.jpg` | A Chinese astronaut inside a space station cupola sketching the Earth, medium close-up, floating pencils and drifting pages of drawings as a soft foreground layer, playful zero-gravity creativity, warm cabin light, cinematic film still, deep blue and warm gold color grading, 35mm lens, shallow depth of field --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality |
| `end_astronaut_swift.jpg` | A Chinese astronaut riding the station's robotic arm as it swings fast over the Earth's sunrise line, dynamic diagonal composition, golden dawn lens flare on the visor, sense of speed against the planet's curve, cinematic film still, deep blue and warm gold color grading, 35mm lens, shallow depth of field --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality |
| `end_astronaut_rhythm.jpg` | A Chinese astronaut floating in a space station corridor tapping a beat on the hull, medium shot down the corridor's leading lines, tools and droplets floating in rhythmic orbit as foreground detail, faint music-like light pulses, cinematic film still, deep blue and warm gold color grading, 35mm lens, shallow depth of field --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality |

## 3. v2 改了什么（逐类拆解）

| 原来 | 现在 | 为什么 |
|---|---|---|
| `--v 6.1` | `--v 8.1 --preview` | 升到当前最新：V8.1 正式版 + V8.2 预览美学 |
| （无） | `--style raw` | 压掉 MJ 自动美化，保住剧照的真实电影质感 |
| （无） | `--no text, watermark, logo, blurry, low quality` | 海报后期要自己排字，图上绝不能带字/水印 |
| `deep blue night palette with warm golden accents` | `deep blue and warm gold color grading` | 调色用 color grading 表达，比 palette 描述更稳 |
| `35mm` | `35mm lens` | 明确是镜头语言，避免被当成胶片颗粒词 |
| 8 条缺构图意图 | 每条补齐 1 个构图/镜头短语（medium close-up / low-angle wide / extreme wide / 前景层等） | 让模型先知道"第一眼看哪里"，主体不糊焦 |
| 人物无人种限定 | 全部人物（含配角：被救司机/哭泣观众/同行宇航员）加 **Chinese** | 与现有 19 张剧照的中国面孔保持一致，MJ 默认易出欧美脸 |

## 4. 审图标准（每张过一遍）

- [ ] 与基础结局图同一人物气质（发型/年龄/体型不跳戏；必要时用 --oref 锁人）
- [ ] 深蓝夜色 + 金色点光的项目色盘没有跑偏（不要出现明亮白天）
- [ ] **--preview 漂移检查**：与同职业基础图并排对比，气质对不上 → 去掉 `--preview` 纯 `--v 8.1` 重跑该条
- [ ] 16:9、主体不贴边（海报会裁上下边缘做渐隐）
- [ ] 无文字、无水印、手部无畸变
- [ ] 导出 1920 宽 JPG，命名精确匹配表格（小写、下划线）

## 5. 交付

放入 `app/public/stills/` → 本地 `?career=对应职业` 走一遍叙事验证海报 → `git add/commit/push` → `deploy-preview.ps1`
