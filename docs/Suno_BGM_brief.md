# 《镜像自我·人生预演》BGM · Suno 两阶段 Brief

> 2026-07-07 晚 · 主导 + Claude 协作用
> 落位路径：`app/public/audio/bgm.mp3`（**播放链路已就绪**：丢文件即生效——循环播放、音量 0.35、
> 迷你游戏期间自动闪避到 0.1、静音按钮联动，全部无需改代码）

## 0. 项目信息（已确认）

| 项 | 值 |
|---|---|
| 使用场景 | 展会互动影游全程 BGM：待机墙 → 叙事 → 报告（游戏段自动降音量让位音效） |
| 情绪基调 | 金色暗夜 · 电影感 · 温柔怀旧、底下有希望（对应"擦亮镜面预演一生"的仪式感） |
| 形态 | **纯配乐 instrumental，无人声**（叙事场景有大量字幕阅读，不能抢注意力） |
| 目标时长 | 2:00–3:00，**可无缝循环**（代码 loop 播放，首尾能量需收敛到同一水位） |
| 音色气质参考 | 暗夜爵士厅的钢琴 + 弦乐垫 + 电子氛围粒子；界面视觉是深蓝底 + 金线（#d8b878） |
| 忌 | 强鼓点/强旋律钩子（会和五个游戏的程序化音效打架）、圣诞感铃铛、明亮大调流行 |

## 1. Simple Mode Brief（先跑这个，求 happy accident）

直接粘贴（已压缩进 Simple 描述框的实用字符预算，并勾选 **Instrumental** 开关）：

```
Instrumental. Someone stands before a midnight mirror, rehearsing the
life they never lived. Warm golden melancholy over deep blue darkness,
cinematic and slowly breathing, hope underneath the sadness.
```

**建议测试 2–3 次，审听时重点关注：**
- 有没有意外对味的"贯穿动机"（某件乐器/某个循环织体）——这是要固化进 Custom 的核心资产
- 呼吸感：能不能在它上面读字幕不被打扰
- 有没有意外的段落结构（比如中段忽然抽空只剩钢琴——很适合对应"抉择时刻"）

2–3 次没方向 → 直接进 Custom Mode。

## 2. Custom Mode Brief（Simple 找到方向后固化）

Style 框（逗号标签，节拍与动态写进标签而不是散文；**别忘了 Instrumental 开关**）：

```
cinematic ambient, minimalist neoclassical, emotive solo piano, warm ambient
strings, nocturnal, 65 bpm, sparse arrangement, soft dynamics, quiet intro
and quiet outro, seamless loop, instrumental, no vocals, no drums
```

Title：

```
Mirror Life Rehearsal (Main Theme)
```

Lyrics 框（纯配乐用**段落标签控编曲结构**——方括号内容不会被唱出，
是给编曲的指令；这版结构就是"首尾能量一致可循环"的 A–B–A'）：

```
[Instrumental Intro: sparse solo piano, hushed]
[Theme A: piano over a soft ambient pad, slow and tender]
[Build: warm strings swell in gently, quiet hope rising]
[Theme A reprise: strings recede, piano returns alone]
[Outro: fades to the same hush as the intro]
```

迭代时的固化位（每轮只动一处）：
- 贯穿动机：Simple Mode 发现的那个意外 → 写进 Style 标签（如 `recurring music box motif`）
- 情绪弧线：怀旧 70% + 希望 30%，结尾不解决到大调全亮 → 不满意时在 [Outro] 标签里补
  `unresolved, gentle`
- 高频刺耳（展会现场大忌）→ Style 追加 `warm lo-fi texture, no bright highs`

> 版权过滤注意：不写艺人名/曲名。想要"久石让/Max Richter 那味"，上面 Style 里的
> "minimalist neoclassical, emotive solo piano over ambient strings" 就是它的合规写法。

## 3. 迭代协议（每轮只改一个变量）

1. Simple Mode ×2–3 → 找方向
2. Custom Mode → 锁结构（A-B-A'、无人声、无鼓）
3. 循环接缝轮：若首尾能量差大，style 补 `fades to quiet ending` 或后期裁剪淡接
4. 收口标准：**开头 10s（待机第一印象）/ 中段抬升 / 结尾接回开头** 三处都满意

## 4. 落位与验收

1. 导出 MP3（192kbps 足够，目标 ≤5MB），改名 `bgm.mp3` 放入 `app/public/audio/`
2. 本地 `npm run dev` 打开首页 → 有声即成功（右上角"声音"按钮可静音）
3. 验收清单：
   - [ ] 循环接缝无"咔哒"或能量跳变（听完整两轮）
   - [ ] 叙事场景下不干扰字幕阅读（音量 0.35 下几乎"感觉不到它存在"）
   - [ ] 进迷你游戏自动变轻、结束恢复（代码已做，听感确认即可）
   - [ ] 与待机页金线视觉气质匹配
4. 定稿后 `git add app/public/audio/bgm.mp3 && git commit && git push`，跑 `deploy-preview.ps1` 让同事在内测站听
