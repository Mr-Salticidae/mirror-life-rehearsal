# 《镜像自我·人生预演》MJ 剧照清单

出图后命名为 `{id}.jpg` 放进 `app/public/stills/`，刷新即生效（缺图自动回退程序化占位图，不会崩）。

## 全局风格锚（每条 prompt 共用尾缀）

```
cinematic film still, anamorphic widescreen, teal and orange color grading,
35mm film grain, volumetric light, deep shadows, masterful composition,
protagonist always seen from behind or in silhouette, face never visible
--ar 16:9 --preview
```

> `--preview` = MJ v8.2 预览版，写实质感更强（已入知识库）。
> 主角设定锚（跨图一致）：黑色短发；七岁=白色旧T恤；十七岁=蓝白校服外套；
> 二十五岁/职业线=按各 prompt 具体描述。全部背影/剪影，**绝不露正脸**。

## 叙事节点（5 张）

### node_a —— 七岁·巷口（黄昏暖调）
```
a 7-year-old child in a worn white t-shirt seen from behind, standing in a narrow
Chinese alley at golden hour sunset, looking at a half-finished colorful graffiti
mural glowing on an old brick wall, a bicycle rushing past in motion blur at the
alley's end, an old TV glowing inside a corner electronics shop, warm dust
particles floating in god rays, nostalgic 1990s Chinese neighborhood
```

### node_b —— 七岁·作文课（青绿教室）
```
a 7-year-old child seen from behind sitting at an old wooden school desk,
blank grid composition paper glowing under afternoon light from tall windows,
chalkboard with the essay title "我的梦想" written in chalk, dust in light beams,
green-grey vintage Chinese classroom, shallow depth of field, teacher's blurred
figure approaching in the background
```

### node_c —— 十七岁·天台（黄昏逆光）
```
two Chinese high school students seen from behind sitting on a school rooftop
edge at dusk, city skyline dissolving in orange haze, one holding a cola can,
school uniform jackets, folded paper leaflet in hand catching the last sunlight,
wind lifting hair, wistful coming-of-age atmosphere, backlit rim light
```

### node_d —— 十七岁·深夜（门缝冷暖对比）
```
a dark bedroom at night, a teenager's silhouette seen from behind facing a
closed door, a thin blade of warm light leaking through the door gap cutting
across the floorboards, cold blue moonlight from window on one side, tense
quiet atmosphere, extreme contrast, minimalist composition
```

### node_e —— 二十五岁·镜前（核心视觉·镜中发光轮廓）
```
a young adult seen from behind standing before a tall antique mirror in a dark
room, the mirror surface rippling like liquid glass emitting soft golden light,
the reflection showing only a glowing blurred silhouette of the same person,
light particles drifting out of the mirror frame, mysterious and sacred
atmosphere, symmetrical composition
```

## 职业线（6 张）

### career_soldier —— 军人前奏（风雪哨所）
```
a soldier in winter combat gear seen from behind standing guard at a remote
border outpost watchtower in heavy snowfall at night, searchlight beam cutting
through blizzard, distant frozen mountain ridge, breath vapor, rifle slung,
epic lonely composition, cold blue palette with one warm lamp
```

### end_soldier —— 军人结局（黎明升旗/勋章特写任选）
```
dawn breaking over a snow-covered military outpost, a soldier seen from behind
saluting the sunrise, golden light flooding over snow, flag shadow long on the
ground, hopeful and solemn, warm gold over cold blue
```

### career_painter —— 画家前奏（凌晨墙前）
```
a young artist seen from behind holding a spray paint can, facing a huge blank
concrete wall in an empty city street at 4am, street lamp pool of warm light,
paint cans scattered at feet, long shadow, mist, anticipation before creation,
muted purple night palette
```

### end_painter —— 画家结局（晨光中的完成画作）
```
morning light hitting a giant finished colorful mural on a city wall, the artist
seen from behind small in frame looking up at it, early commuters passing by
turning heads, steam from a breakfast stall, the wall glowing like stained glass
```

### career_racer —— 赛车手前奏（雨夜车库/起点）
```
a racing driver seen from behind in racing suit walking toward a modified sports
car under rain at night, wet asphalt reflecting neon city lights, steam rising,
headlights cutting through rain veil, cinematic low angle, electric blue and
amber reflections
```

### end_racer —— 赛车手结局（冲线）
```
a race car crossing the finish line on a rain-soaked night circuit, long exposure
light trails, spray of water kicked up glowing in stadium lights, checkered flag
motion blur, triumphant energy, deep blue night with golden flare
```

## 游戏内资产（1 张）

### wall —— 涂鸦游戏底图（干净墙面，留白给玩家画）
```
a large empty concrete brick wall at night lit by a single warm street lamp from
above, subtle texture and stains, dark city alley ambience, frontal flat
perspective filling the frame, no graffiti, no people, moody but inviting canvas
--ar 16:9 --preview
```

## 可选增强

- `attract.jpg`：待机页背景（目前纯 CSS 渐变已可用）——镜子悬浮在黑暗中微光。
- BGM：Suno 出一首 2-3 分钟氛围环境乐（暗流涌动、钢琴+弦乐+电子底），
  命名 `bgm.mp3` 放 `app/public/audio/`，无此文件则静默（音效为程序合成不受影响）。
