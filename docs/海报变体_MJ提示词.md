# 结局海报变体图 · MJ 提示词包

> 2026-07-07 晚 · 主导 + Claude 协作用
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
必要时叠加项目统一底色词：`deep blue night, warm golden accent light, cinematic film still`。

通用后缀（每条 prompt 已带）：
`cinematic film still, deep blue night palette with warm golden accents, 35mm, shallow depth of field --ar 16:9 --v 6.1`

## 2. 提示词总表（20 条，直接复制）

### 哨兵 end_soldier_*（基础场景：风雪边境哨位）

| 文件名 | Prompt |
|---|---|
| `end_soldier_create.jpg` | A young sentry at a snowy border post at night, sketching constellations in a small notebook between watches, rifle resting beside, dreamy warm light from his flashlight, cinematic film still, deep blue night palette with warm golden accents, 35mm, shallow depth of field --ar 16:9 --v 6.1 |
| `end_soldier_swift.jpg` | A young sentry sprinting through blowing snow along the border fence at night, dynamic diagonal composition, snow streaking with motion, breath visible, urgent warm searchlight behind, cinematic film still, deep blue night palette with warm golden accents, 35mm, shallow depth of field --ar 16:9 --v 6.1 |
| `end_soldier_rhythm.jpg` | A young sentry on night watch tapping a quiet beat on his rifle strap, snowflakes drifting in rhythm past the watchtower lamp, faint smile, cinematic film still, deep blue night palette with warm golden accents, 35mm, shallow depth of field --ar 16:9 --v 6.1 |
| `end_soldier_far.jpg` | A young sentry at a snowy border post gazing far beyond the fence at the starry horizon, vast negative space of night sky, tiny warm human figure against immense cold distance, cinematic film still, deep blue night palette with warm golden accents, 35mm, shallow depth of field --ar 16:9 --v 6.1 |

### 画家 end_painter_*（基础场景：黎明城市墙前）

| 文件名 | Prompt |
|---|---|
| `end_painter_guard.jpg` | A street painter at dawn finishing a huge mural that shelters small painted figures under painted wings, spray cans at his feet, protective tender mood, first golden light on the wall, cinematic film still, deep blue night palette with warm golden accents, 35mm, shallow depth of field --ar 16:9 --v 6.1 |
| `end_painter_swift.jpg` | A street painter racing the sunrise, arm sweeping a bold arc of paint across a city wall, paint droplets frozen mid-air, energetic diagonal composition, cinematic film still, deep blue night palette with warm golden accents, 35mm, shallow depth of field --ar 16:9 --v 6.1 |
| `end_painter_rhythm.jpg` | A street painter dancing while spraying a wall at dawn, headphones on, paint strokes flowing like sound waves across the mural, joyful motion, cinematic film still, deep blue night palette with warm golden accents, 35mm, shallow depth of field --ar 16:9 --v 6.1 |
| `end_painter_far.jpg` | A street painter stepping far back from a finished mural at dawn, small figure looking up at an enormous wall painting of a distant horizon, contemplative scale contrast, cinematic film still, deep blue night palette with warm golden accents, 35mm, shallow depth of field --ar 16:9 --v 6.1 |

### 赛车手 end_racer_*（基础场景：雨夜环线）

| 文件名 | Prompt |
|---|---|
| `end_racer_guard.jpg` | A night racer stopped on a rainy ring road, standing in headlight beams guiding another stalled driver to safety, rain glittering gold in the beams, quiet heroic mood, cinematic film still, deep blue night palette with warm golden accents, 35mm, shallow depth of field --ar 16:9 --v 6.1 |
| `end_racer_create.jpg` | A night racer in a garage at 3am, hood open, inventing an impossible hand-built engine glowing warm gold, blueprints and neon sketches around, cinematic film still, deep blue night palette with warm golden accents, 35mm, shallow depth of field --ar 16:9 --v 6.1 |
| `end_racer_rhythm.jpg` | A night racer drumming fingers on the steering wheel at a red light in the rain, wipers keeping the beat, city lights pulsing like a metronome, cinematic film still, deep blue night palette with warm golden accents, 35mm, shallow depth of field --ar 16:9 --v 6.1 |
| `end_racer_far.jpg` | A night racer parked at the highest curve of the ring road, looking out over the entire glittering city and the road vanishing into the horizon, vast night vista, cinematic film still, deep blue night palette with warm golden accents, 35mm, shallow depth of field --ar 16:9 --v 6.1 |

### 音乐人 end_musician_*（基础场景：地下 livehouse 舞台）

| 文件名 | Prompt |
|---|---|
| `end_musician_guard.jpg` | An underground musician on a small livehouse stage, stepping off stage mid-song to hand the microphone to a crying stranger in the crowd, warm spotlight enveloping both, tender guardian mood, cinematic film still, deep blue night palette with warm golden accents, 35mm, shallow depth of field --ar 16:9 --v 6.1 |
| `end_musician_create.jpg` | An underground musician on stage playing a strange hand-modified guitar, impossible dreamlike instruments around, golden stage light like liquid imagination, cinematic film still, deep blue night palette with warm golden accents, 35mm, shallow depth of field --ar 16:9 --v 6.1 |
| `end_musician_swift.jpg` | An underground musician mid-jump on a livehouse stage, hair and cables flying, strobe catching the exact peak of motion, raw kinetic energy, cinematic film still, deep blue night palette with warm golden accents, 35mm, shallow depth of field --ar 16:9 --v 6.1 |
| `end_musician_far.jpg` | An underground musician alone after the show, sitting on the stage edge looking up through a skylight at the stars, guitar on lap, small warm figure in big dark room, cinematic film still, deep blue night palette with warm golden accents, 35mm, shallow depth of field --ar 16:9 --v 6.1 |

### 宇航员 end_astronaut_*（基础场景：空间站/舱外星空）

| 文件名 | Prompt |
|---|---|
| `end_astronaut_guard.jpg` | An astronaut during a spacewalk keeping one steady hand on a fellow astronaut's tether, protective calm posture, Earth glowing warm below, guardian in the void, cinematic film still, deep blue night palette with warm golden accents, 35mm, shallow depth of field --ar 16:9 --v 6.1 |
| `end_astronaut_create.jpg` | An astronaut inside a space station cupola sketching the Earth with floating pencils and drifting pages of drawings around, playful zero-gravity creativity, warm cabin light, cinematic film still, deep blue night palette with warm golden accents, 35mm, shallow depth of field --ar 16:9 --v 6.1 |
| `end_astronaut_swift.jpg` | An astronaut riding the station's robotic arm as it swings fast over the Earth's sunrise line, dynamic diagonal composition, golden dawn flare on the visor, cinematic film still, deep blue night palette with warm golden accents, 35mm, shallow depth of field --ar 16:9 --v 6.1 |
| `end_astronaut_rhythm.jpg` | An astronaut floating in a space station corridor tapping a beat on the hull, tools and droplets floating in rhythmic orbit around them, faint music-like light pulses, cinematic film still, deep blue night palette with warm golden accents, 35mm, shallow depth of field --ar 16:9 --v 6.1 |

## 3. 审图标准（每张过一遍）

- [ ] 与基础结局图同一人物气质（发型/年龄/体型不跳戏；必要时用 --cref/--oref 锁人）
- [ ] 深蓝夜色 + 金色点光的项目色盘没有跑偏（不要出现明亮白天）
- [ ] 16:9、主体不贴边（海报会裁上下边缘做渐隐）
- [ ] 无文字、无水印、手部无畸变
- [ ] 导出 1920 宽 JPG，命名精确匹配表格（小写、下划线）

## 4. 交付

放入 `app/public/stills/` → 本地 `?career=对应职业` 走一遍叙事验证海报 → `git add/commit/push` → `deploy-preview.ps1`
