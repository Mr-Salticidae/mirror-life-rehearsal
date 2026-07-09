# 补丁 · 七岁年龄感修正（女生第一幕）

> 2026-07-09 · 客户反馈：女生第一幕（node_a_f，七岁巷口）角色年龄偏大，不像七岁。
> 按 aigc-prompt-optimizer skill 规范修订（知识库 07_skill存档），基于
> docs/补丁_干净衣服重出_MJ+Seedance提示词.md 的现行版本迭代，只改年龄相关变量。

## 0. 问题根源与修法

现行 prompt 里年龄信息只有 **"7-year-old" 一个数字**。MJ 对数字年龄不敏感（尤其
`--style raw` + 电影感风格会把人物往"少年感"拉），缺少体型/比例/尺度锚点时容易出成
十几岁。修法三管齐下（与"衣服脏污"补丁同一套正负夹击思路）：

1. **正向锁定体型**：`little girl` + `tiny petite figure, young child body proportions`
   ——用"小女孩"称谓和儿童身体比例描述替代对数字的依赖；
2. **环境尺度参照**：`small in frame, dwarfed by the tall brick walls` + `looking up at`
   ——巷子高墙做参照物、仰头看涂鸦是天然的儿童视线高度暗示；
3. **负向排除**：`--no` 追加 `teenager, adult, mature body, long legs, tall figure`。

另加一处服装尺度暗示：`slightly oversized on her small frame`（童装略大是年龄强暗示，
且不违反"干净衣服"补丁——干净锁定词全部原样保留）。

## 1. 范围（1 图 + 1 视频，文件名不变、直接覆盖）

| 覆盖文件 | 场景 | 说明 |
|---|---|---|
| `node_a_f.jpg` + `node_a_f.mp4` | 女 · 七岁巷口 | 女生第一幕 |

⚠️ node_b_f（作文课）、node_f_f（储蓄罐）与本图共用同一年龄写法。**本轮只重出客户点名
的第一幕**；新图到手后先和 b/f 两幕连看——若年龄观感落差跳戏，把下方"年龄锚三件套"
原样移植到那两条 prompt 再重出（正向体型描述 + 负向排除照搬，环境尺度参照按各自场景
改写：b 幕课桌椅偏大、双脚够不到地，f 幕坐在床沿双腿悬空）。

## 2. 一致性策略（照旧）

- 上传**现在这张 node_a_f.jpg** 作 `--sref` 风格锚（sref 迁移调色/质感，不迁移人物体型，放心用）；
- 气质对不上 → 去掉 `--preview` 用纯 `--v 8.1 --style raw` 重跑对比；
- 女生角色锚不变：黑色齐耳短发 + 小红发卡 + 干净白T恤；背影/侧背影，不露清晰正脸。

## 3. MJ 提示词（整段复制）

### node_a_f —— 女 · 巷口（黄昏暖调）· 年龄感修正版

```
a little 7-year-old Chinese girl with a black bob haircut and a small red hairpin, tiny petite figure with young child body proportions, wearing a clean crisp white cotton t-shirt slightly oversized on her small frame, freshly washed spotless fabric, seen from behind in soft side profile, face not clearly visible, standing small in frame in a narrow Chinese alley at golden hour sunset, dwarfed by the tall brick walls, looking up at a half-finished colorful graffiti mural glowing on an old brick wall, a bicycle rushing past in motion blur at the alley's end, an old TV glowing inside a corner electronics shop, warm dust particles floating in god rays, nostalgic 1990s Chinese neighborhood, single dominant subject, clean silhouette, foreground-midground-background layering, cinematic film still, anamorphic widescreen, teal and orange color grading, 35mm film grain, volumetric light, deep shadows, masterful composition --ar 16:9 --v 8.1 --style raw --preview --no text, watermark, logo, blurry, low quality, stains, dirt, mud, smudges, grime, paint marks, torn fabric, teenager, adult, mature body, long legs, tall figure
```

**改动拆解（skill 规范：每个词说得出作用）**

| 原表达 | 新表达 | 作用 |
|---|---|---|
| `a 7-year-old Chinese girl` | `a little 7-year-old Chinese girl` | "little girl" 是 MJ 强年龄信号，数字只做辅助 |
| （无） | `tiny petite figure with young child body proportions` | 直接锁儿童头身比/体型，堵住"少年化"漂移的主通道 |
| `wearing a clean crisp white cotton t-shirt` | `... slightly oversized on her small frame` | 童装略大=年龄暗示；干净锁定词原样保留 |
| `standing in a narrow Chinese alley` | `standing small in frame ... dwarfed by the tall brick walls` | 环境尺度参照：人物在画面中占比变小，身高感随之下降 |
| `looking at a ... mural` | `looking up at a ... mural` | 仰视角=儿童视线高度，顺带强化"仰望梦想"叙事 |
| （无） | `--no ... teenager, adult, mature body, long legs, tall figure` | 负向兜底，重roll 命中率高一截 |

其余场景、光影、构图意图层、通用后缀全部不动（skill 第 9 条：每轮只改关键变量）。

## 4. Seedance 提示词（图生视频 · 参数照旧）

统一参数不变：图生视频 / 新图作首帧 / 1080p / 5s / 不选运镜模板 / MP4 无音频。
在原运动增量上追加一句体型约束（防 i2v 把人物"长大"）：

```
固定镜头。橱窗电视屏幕的光在人物身上轻微闪烁，光柱中的尘埃缓缓漂浮，人物衣角被微风轻轻带动，其余保持静止。人物保持七岁儿童的娇小体型和头身比例，不得变高变成熟。衣物保持干净整洁，不得出现新的污渍、痕迹或做旧效果。必须全程单镜头，不得转场或切换景别，不得新增任何人物、物体或文字，人物面部和姿态保持稳定，所有运动匀速细微、无起止动作，首尾状态一致，适合无缝循环播放。
```

## 5. 验收清单（出图后逐张核对）

- [ ] **年龄感**：头身比约 5-6 头身、身高明显低于成人、体型无少年化（本补丁唯一目的，第一优先）
- [ ] T恤依旧干净：无污渍/颜料痕/磨损（不能修好年龄修回脏衣服）
- [ ] 与 node_b_f / node_f_f 连看角色不跳戏：发型、红发卡、体型；有落差则按第 1 节移植年龄锚重出那两幕
- [ ] 与全线风格连贯：调色、胶片颗粒、光比一致
- [ ] 不露清晰正脸（项目铁律）
- [ ] 视频按图转视频手册第 4 节审片标准过一遍（无自动运镜/无变形/构图不跑/人物没"长大"）

## 6. 交付管线（照旧）

1. 图：MJ 原图 → 转 1920 宽 JPG（质量 82，单张 ≤400KB）→ 覆盖 `app/public/stills/node_a_f.jpg`
2. 视频：Seedance 导出 → **必转 H.264**（HEVC 手机播不出）：
   ```
   ffmpeg -y -i 输入.mp4 -an -vf "scale='min(1920,iw)':-2,fps=30" -c:v libx264 -crf 24 -preset medium -pix_fmt yuv420p -movflags +faststart 输出.mp4
   ```
   → 覆盖 `app/public/videos/node_a_f.mp4`
   （⚠️ H 盘已被清，原便携 ffmpeg 不在了；新部署在 `C:\tools\ffmpeg\ffmpeg-8.1.2-essentials_build\bin\`）
3. 覆盖入库即生效，无需改代码；建议本地 dev 走一遍女生第一幕确认。

## 7. 交付记录（2026-07-09 晚）

- 新素材已入库：剧照 1920×1075 JPG q82（298KB）、视频 H.264/1080p30/去音轨/faststart（859KB，原片带 AAC 音轨+24fps，已按管线转码）。
- 已本地 dev 实测：女生线第一幕加载 `node_a_f.mp4` 新版，播完定格尾帧，首尾帧一致可循环。
- 验收核对：年龄感明显儿童 ✓ / T恤干净 ✓ / 红发卡+齐耳短发角色锚 ✓ / 侧背影不露正脸 ✓ / 固定镜头无自动运镜 ✓。
- 待办：与 node_b_f、node_f_f 连看年龄观感是否跳戏（见第 1 节移植方案）。
- 环境备案：H 盘（原便携 node/ffmpeg）已被清空。便携 Node 重新部署在仓库 `tools\node-portable\`（.claude/launch.json 的 mirror-dev-portable 已改指过去），ffmpeg 在 `C:\tools\ffmpeg\`。
