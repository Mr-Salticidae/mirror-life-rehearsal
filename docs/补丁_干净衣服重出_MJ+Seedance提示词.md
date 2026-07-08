# 补丁 · 衣服干净版重出（女生前三幕 + 男生第一幕）

> 2026-07-08 · 客户反馈：女生前三幕与男生第一幕的白T恤有明显脏污/颜料痕，观感不好，重出。
> 按 aigc-prompt-optimizer skill 规范重写（知识库 07_skill存档），与既有素材管线完全一致。

## 0. 问题根源与修法（先读懂再动手）

原版 assets/PROMPTS.md 的 node_a 写了 **"worn white t-shirt"**——"worn"（旧的）被 MJ
理解成磨损脏污，女生三张沿用同底子后全部带脏。本补丁三管齐下：

1. **正向锁定**：`clean crisp white cotton t-shirt, freshly washed, spotless fabric`
2. **负向排除**：`--no` 追加 `stains, dirt, mud, smudges, grime, paint marks, torn fabric`
3. **删除 "worn"**，年代感交给场景与调色承担，不再压在衣服上

## 1. 范围（4 图 + 4 视频，文件名不变、直接覆盖）

| 覆盖文件 | 场景 | 说明 |
|---|---|---|
| `node_a_f.jpg` + `node_a_f.mp4` | 女 · 七岁巷口 | 女生第一幕 |
| `node_b_f.jpg` + `node_b_f.mp4` | 女 · 七岁作文课 | 女生第二幕 |
| `node_f_f.jpg` + `node_f_f.mp4` | 女 · 七岁储蓄罐 | 女生第三幕 |
| `node_a.jpg` + `node_a.mp4` | 中性（男相）· 七岁巷口 | 男生第一幕用的就是中性版 |

## 2. 一致性策略（与海报变体包 v2 同一套打法）

- 把**现在这张对应旧图**上传 MJ 作 `--sref` 风格锚（sref 迁移的是调色/质感氛围，不会迁移污渍）；
- 4 张尽量**同一 session** 集中生成（`--preview` = V8.2 预览版，跨 session 有漂移）；
- 某张与旧图气质对不上 → 去掉 `--preview` 用纯 `--v 8.1 --style raw` 重跑对比，一致性优先；
- 若个别 roll 仍带脏（sref 偶发把污渍当质感带回来）→ 该张去掉 `--sref` 只留文字 prompt 重roll；
- 女生角色锚（三张统一，防跳戏）：黑色齐耳短发 + 小红发卡 + 干净白T恤；背影/侧背影，不露清晰正脸。

**通用后缀（每条已带，勿改）**：

```
cinematic film still, anamorphic widescreen, teal and orange color grading, 35mm film grain, volumetric light, deep shadows, masterful composition --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality, stains, dirt, mud, smudges, grime, paint marks, torn fabric
```

## 3. MJ 提示词（4 条，整段复制）

### ① node_a_f —— 女 · 巷口（黄昏暖调）

```
a 7-year-old Chinese girl with a black bob haircut and a small red hairpin, wearing a clean crisp white cotton t-shirt, freshly washed spotless fabric, seen from behind in soft side profile, face not clearly visible, standing in a narrow Chinese alley at golden hour sunset, looking at a half-finished colorful graffiti mural glowing on an old brick wall, a bicycle rushing past in motion blur at the alley's end, an old TV glowing inside a corner electronics shop, warm dust particles floating in god rays, nostalgic 1990s Chinese neighborhood, single dominant subject, clean silhouette, foreground-midground-background layering, cinematic film still, anamorphic widescreen, teal and orange color grading, 35mm film grain, volumetric light, deep shadows, masterful composition --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality, stains, dirt, mud, smudges, grime, paint marks, torn fabric
```

### ② node_b_f —— 女 · 作文课（青绿教室）

```
a 7-year-old Chinese girl with a black bob haircut and a small red hairpin, wearing a clean crisp white cotton t-shirt, spotless fabric, seen from behind sitting at an old wooden school desk, blank grid composition paper glowing under afternoon light from tall windows, chalkboard with the essay title "我的梦想" written in chalk, dust in light beams, green-grey vintage Chinese classroom, teacher's blurred figure approaching in the background, subject off-center, uncluttered background, shallow depth of field, cinematic film still, anamorphic widescreen, teal and orange color grading, 35mm film grain, volumetric light, deep shadows, masterful composition --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality, stains, dirt, mud, smudges, grime, paint marks, torn fabric
```

### ③ node_f_f —— 女 · 储蓄罐（暖调卧室）

```
a 7-year-old Chinese girl with a black bob haircut and a small red hairpin, wearing a clean crisp white cotton t-shirt, freshly washed spotless fabric, seen from behind sitting on a bed counting coins poured from a ceramic piggy bank onto the blanket, warm bedside lamp glow, coins catching golden light, small shadow on the wall, cozy 1990s Chinese bedroom, intimate and hopeful atmosphere, single warm light source, uncluttered background, shallow depth of field, cinematic film still, anamorphic widescreen, teal and orange color grading, 35mm film grain, volumetric light, deep shadows, masterful composition --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality, stains, dirt, mud, smudges, grime, paint marks, torn fabric
```

### ④ node_a —— 中性（男相）· 巷口（黄昏暖调）

```
a 7-year-old child with short black hair, wearing a clean crisp white cotton t-shirt, freshly washed spotless fabric, seen from behind, standing in a narrow Chinese alley at golden hour sunset, looking at a half-finished colorful graffiti mural glowing on an old brick wall, a bicycle rushing past in motion blur at the alley's end, an old TV glowing inside a corner electronics shop, warm dust particles floating in god rays, nostalgic 1990s Chinese neighborhood, single dominant subject, clean silhouette, foreground-midground-background layering, cinematic film still, anamorphic widescreen, teal and orange color grading, 35mm film grain, volumetric light, deep shadows, masterful composition --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality, stains, dirt, mud, smudges, grime, paint marks, torn fabric
```

**改动拆解（skill 规范：每个词说得出作用）**

| 原表达 | 新表达 | 作用 |
|---|---|---|
| `worn white t-shirt` | `clean crisp white cotton t-shirt, freshly washed, spotless fabric` | 根除脏污来源；cotton/crisp 给面料质感，不靠"旧"出年代感 |
| （无） | `--no ... stains, dirt, mud, smudges, grime, paint marks, torn fabric` | 负向兜底，重roll 命中率高一截 |
| （无） | `single dominant subject / uncluttered background` 等构图层 | v1.5 skill 要求的构图意图层，主体干净不被背景抢 |
| （无） | 女生角色锚（bob + red hairpin） | 三张跨图一致，与已交付的女生四~八幕不跳戏 |

## 4. Seedance 提示词（4 条，图生视频 · 参数与图转视频手册完全一致）

统一参数不变：图生视频 / 新图作首帧 / 1080p / 5s / 不选运镜模板 / MP4 无音频。
（运动增量与原手册同款，仅追加一句衣物约束防 i2v 自己"做旧"。）

| 输出文件名 | Prompt（整段复制） |
|---|---|
| `node_a_f.mp4`、`node_a.mp4` | 固定镜头。橱窗电视屏幕的光在人物身上轻微闪烁，光柱中的尘埃缓缓漂浮，人物衣角被微风轻轻带动，其余保持静止。衣物保持干净整洁，不得出现新的污渍、痕迹或做旧效果。必须全程单镜头，不得转场或切换景别，不得新增任何人物、物体或文字，人物面部和姿态保持稳定，所有运动匀速细微、无起止动作，首尾状态一致，适合无缝循环播放。 |
| `node_b_f.mp4` | 固定镜头。窗外光斑在课桌上极缓慢游移，光束里的粉尘颗粒漂浮，人物发丝被气流轻轻拂动，桌上纸页边缘微微颤动，其余保持静止。衣物保持干净整洁，不得出现新的污渍、痕迹或做旧效果。必须全程单镜头，不得转场或切换景别，不得新增任何人物、物体或文字，人物面部和姿态保持稳定，所有运动匀速细微、无起止动作，首尾状态一致，适合无缝循环播放。 |
| `node_f_f.mp4` | 固定镜头。灯光光晕如呼吸般轻微明暗起伏，硬币表面反光偶尔闪动，窗帘影子极缓慢摇曳，其余保持静止。衣物保持干净整洁，不得出现新的污渍、痕迹或做旧效果。必须全程单镜头，不得转场或切换景别，不得新增任何人物、物体或文字，人物面部和姿态保持稳定，所有运动匀速细微、无起止动作，首尾状态一致，适合无缝循环播放。 |

## 5. 验收清单（出图后逐张核对）

- [ ] **T恤干净**：无污渍/颜料痕/磨损破洞（本补丁的唯一目的，第一优先）
- [ ] 与未重出的场景（女生第四幕起）风格连贯：调色、胶片颗粒、光比一致
- [ ] 女生三张之间角色一致：发型、红发卡、体型不跳戏
- [ ] 不露清晰正脸（项目铁律）
- [ ] 视频按图转视频手册第 4 节审片标准过一遍（无自动运镜/无变形/构图不跑）

## 6. 交付管线（照旧，两点提醒）

1. 图：MJ 原图 → **转 1920 宽 JPG（质量 82，单张 ≤400KB）** → 按文件名覆盖 `app/public/stills/`
2. 视频：**⚠️ Seedance 导出常为 HEVC/H.265，手机播不出，必须转 H.264 再入库**（上批 12/13 条都中招）：
   ```
   ffmpeg -y -i 输入.mp4 -an -vf "scale='min(1920,iw)':-2,fps=30" -c:v libx264 -crf 24 -preset medium -pix_fmt yuv420p -movflags +faststart 输出.mp4
   ```
   （展台机 ffmpeg 在 `H:\临时\tools\ffmpeg\ffmpeg.exe`；中文路径报错就先挪纯英文目录）
3. 覆盖入库即生效，无需改代码；建议本地跑 dev 走一遍女生前三幕 + 男生第一幕确认。
