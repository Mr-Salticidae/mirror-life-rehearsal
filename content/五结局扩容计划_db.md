# 五结局扩容计划报告 —— 5 结局 / 5 迷你游戏 / GPTI 式人生报告卡

> 2026-07-06 · 状态：**文档定稿 v2（自审修订版）**
> 承接：迭代一「内核扩容」（叙事 8 节点 + 回响 + 称号池 + 评级演出，均已验收）
> 本轮决策：保留**赛车手 / 画家**；**军人 → 哨兵**（同守护/射击原型，仅更名）；新增**音乐人 / 宇航员**；**无名者彻底移除**
> 终点目标：5 条等深人生线 × 5 种独立玩法 × 5 张可分享的 GPTI 式人格报告卡
> **边界：本文件为设计计划。所有代码 / 美术改动均标注「待实现」，本轮只产出本文档，不碰任何其他文件。**
> 配套：[DESIGN.md](DESIGN.md)（玩法）/ [assets/PROMPTS.md](assets/PROMPTS.md)（出图）/ [app/src/story.ts](app/src/story.ts)（剧本数据）/ [app/src/lib/ai.ts](app/src/lib/ai.ts)（报告生成）

> **速查（TL;DR）**
> - 5 结局 = 哨兵 GNTR / 画家 CNSR / 赛车手 CFSV / 音乐人 CNTV / 宇航员 CFSR
> - 5 游戏 = FPS 射击 / 喷涂涂鸦 / 驾驶竞速 / 节奏打击 / 轨道对接
> - 报告卡 = GPTI 式 4 轴人格卡（雷达下线，由 4 轴进度条取代）
> - 路由 = 5 维（守 / 创 / 疾 / 韵 / 远）**归一化占比**判定（解决喂养点失衡）
> - **本轮只改 剧情.md**；总工时 16~22h

## 一、现状盘点（迭代一后基线）

| 维度 | 现量 | 本轮变化 |
|---|---|---|
| 结局 | 4（军人 / 画家 / 赛车手 + 隐藏无名者） | **→ 5**（哨兵 / 画家 / 赛车手 / 音乐人 / 宇航员）；**无名者移除** |
| 路由维度 | 3（勇 / 彩 / 驰） | **→ 5**（守 / 创 / 疾 / 韵 / 远），每维对应一个结局 |
| 迷你游戏 | 3（FPS 射击 / 喷涂涂鸦 / 驾驶竞速） | **→ 5**（+ 节奏打击 / 轨道对接） |
| 报告 | 称号 + 三段叙事 + 雷达 + 分享卡 | **重做为 GPTI 式人格卡**（4 轴两端 % + 4 字类型代码 + 称号 + 主视觉剧照 + 分享二维码）；**雷达下线** |
| 称号池 | 12+1（含无名者） | 15（5 职业 × S/A/B），无名者档下线 |

**结论：终点段从「3 职业 + 1 隐藏」升级为「5 条等深人生线」，每条都有独立玩法、独立视觉、独立可分享的人格卡——展会重玩动机与拍照传播率同步上升。**

## 二、评估原则

1. **5 条线 = 5 种不同游戏动词**：射击 / 喷涂 / 驾驶 / 节奏 / 对接，围观者一眼可辨，互不重复。
2. **单轮 ≤ 6 分钟红线不变**：新增线不新增叙事节点，只把现有 8 节点的维度标签从 3 扩到 5。
3. **军人 → 哨兵是文案级更名**：剧照 id（`career_soldier` 等）与 FPS 机制零 churn，只改显示名。
4. **报告卡最大化复用**：称号池当昵称、5 维 stat 推导 4 轴 %，离线模板即可生成，不依赖 AI 端点。
5. **5 维喂养点必须均衡可达**：瘦维度（韵 / 远）用「归一化占比」而非原始分判定，确保 5 个结局都能被正常触发，不会退化成 2~3 个。

## 三、迭代范围

### P0 —— 5 结局架构（必做）

1. **结局 4 → 5**：哨兵 / 画家 / 赛车手 / 音乐人 / 宇航员；移除无名者（附录 F）。
2. **路由 3 → 5 维 + 归一化**：守 / 创 / 疾 / 韵 / 远；E 节点按**归一化占比**取最高 → 对应结局（附录 E）。
3. **迷你游戏 +2**：音乐人《躁动》（节奏打击）、宇航员《失重》（轨道对接）（附录 B）。
4. **报告卡重构为 GPTI 式 ×5**：版式按用户给定的人格卡图，雷达由 4 轴进度条取代（附录 C/D）。
5. **分支图**：5 结局框，移除原无名者灰锁框。

### P1 —— 深度（有余力做）

6. 每游戏加「再试一次」刷分入口（不重走叙事）+ 二段高潮演出（FPS 平民混入 / 涂鸦城市亮灯 / 赛车终点慢镜 / 节奏全连爆发 / 对接最后修正）。
7. 报告卡「镜子没给你的人生」对照位（按维度第 2/3 高列 2~3 条，占图中的「代表作」栏）。
8. 本地 LLM 流式逐字输出 + 分享海报精修（附录 C 规格）。

### P2 —— 锦上添花

9. 结局剧照按 遗憾 / 换门 出色调变体（与美术迭代合流）。
10. 报告卡加「人生时间线」小图：8 节点选择缩成横向人生轴。

### 明确不做（本轮）

- ❌ 第 6 个结局 / 无名者回归（用户已定 5 个）
- ❌ 第 6 个迷你游戏
- ❌ AI 实时改写剧情
- ❌ 全量美术资产替换（属美术迭代，另立计划）

## 四、工时预算（估 16~22h）

| 块 | 内容 | 估时 |
|---|---|---|
| 结局 / 路由 | 哨兵更名 + 无名者移除 + 5 维重打标 + 归一化判定 + E 改写 | 3h |
| 新游戏 ×2 | 《躁动》节奏打击 + 《失重》轨道对接（各 5~6h，含 S/A/B） | 10~12h |
| 报告卡重构 | GPTI 式 ×5 + 4 轴 % 推导 + 分享海报 | 4h |
| 机动 | P1 演出 / 回归 / 调分 | 2h |

## 五、验收标准

1. 5 结局**各可被正常触发**（归一化后每维都能成为最高，端到端各跑出一次）。
2. 5 个迷你游戏各自可玩、出 S/A/B、走 `finishGame(score, detail, rank) → report`。
3. 5 张报告卡版式与用户给的 GPTI 图一致：4 轴两端 % + 4 字类型代码 + 称号 + 剧照 + 二维码。
4. **4 轴公式可复现 5 个本命代码**（附录 D 已逐一代入验证）。
5. 无名者零残留：`isDrifter` / `DRIFTER` 节点 / 分支图灰锁 / `DRIFTER_T` 模板 全部下线。
6. 单轮 ≤ 6 分钟，构建零报错。
7. 哨兵更名：`career_soldier` 剧照 id 不变，仅 `CAREER_INFO.name` 显示名改。

## 六、风险

| 风险 | 对策 |
|---|---|
| 5 维喂养点失衡（创/疾 多、韵/远 少）→ 瘦维度不可达 | 路由用**归一化占比**（每维分 ÷ 该维最大可达分），与喂养点数量解耦（附录 E） |
| 5 维路由让原「三值全平 → 无名者」逻辑失效 | 直接移除该判定；归一化并列时按固定优先级 **守 > 创 > 疾 > 韵 > 远** 择一 |
| 节奏 / 对接游戏工时超标 | 先做可玩骨架（MVP，能计分能进 report），二段演出留 P1 |
| 报告卡 4 轴 % 无现成数据 | 由 5 维 stat 推导（附录 D 公式），离线模板即可算，不依赖 AI |
| 哨兵更名遗漏角落 | 全仓搜 `军人` 替显示名；`CAREER_INFO` key `soldier` 与剧照 id 保留不动 |
| 4 选项节点布局挤压 | 只在**非限时**节点（F / C / H）扩到 4 选项；限时节点 B / G / D 不扩（附录 E） |

## 七、预告（美术，另立）

MJ 新剧照 4 张（`career_musician` / `end_musician` / `career_astronaut` / `end_astronaut`，附录 G）+ 既有 12 张；结局色调变体；Suno BGM 双轨（叙事 / 游戏）；章节标题卡动效；报告卡立绘（背影/剪影）。

---

## 附录 A · 5 结局总表

| 职业（维度） | 类型代码 | 称号池 S / A / B | 游戏名 · 类型 | 剧照 id（保留/新增） | slogan |
|---|---|---|---|---|---|
| 哨兵（守） | **GNTR** | 风雪守夜人 / 边线哨兵 / 迷彩新兵 | 守夜 · FPS 射击 | `career_soldier` / `end_soldier`（保留） | 你守过的夜，成了别人的白天。 |
| 画家（创） | **CNSR** | 执色者 / 街巷画师 / 喷罐学徒 | 一面墙 · 喷涂涂鸦 | `career_painter` / `end_painter`（保留） | 你留下的颜色，比你的名字活得更久。 |
| 赛车手（疾） | **CFSV** | 夜环线之王 / 雨夜车手 / 弯道新人 | 夜环线 · 驾驶竞速 | `career_racer` / `end_racer`（保留） | 你追过的风，最后成了你身后的路。 |
| 音乐人（韵） | **CNTV** | 躁动节拍 / 地下回声 / 卧室排练 | 躁动 · 节奏打击 | `career_musician` / `end_musician`（新增） | 你踩下的每一拍，都有人跟着晃。 |
| 宇航员（远） | **CFSR** | 仰望者 / 失重旅人 / 观星学徒 | 失重 · 轨道对接 | `career_astronaut` / `end_astronaut`（新增） | 你看过的远方，后来成了别人的方向。 |

**调色板（报告卡 / 前奏强调色，深 / 中 / 亮）**：
哨兵 `#0a1420 / #1d3a52 / #7fb4d8` · 画家 `#1a1026 / #43245e / #c99df0` · 赛车手 `#03060f / #12233f / #4f8fe8`（以上现有）
音乐人 `#1a0f24 / #4b1f5e / #c98bff` · 宇航员 `#040814 / #10244a / #7fb4e8`（新增）

> **哨兵 = 群(T) 的定调**：「群」按人格倾向「为他人守护」定（呼应 B3「我要保护别人」），边境孤哨是场景设定而非人格倾向——故 GNTR 取 T 不取 S。

## 附录 B · 2 个新迷你游戏规格

### B.1 音乐人《躁动》—— 节奏打击
- **机制**：下落式音符（4 轨道），WebAudio 合成鼓点音轨；D F J K 键或屏幕点击在判定线接拍。
- **计分**：命中 +1，连击倍率（×2 / ×4 / ×8 三档），miss 断连；60~90s 一首约 80~120 个音符。
- **评级**（`rankOf` 新增 `rhythm` 档，按命中率）：S ≥ 90% 且最大连击 ≥ 60；A ≥ 70%；其余 B。
- **围观卖点**：音游秒懂，鼓点震屏，连击数字跳——最强的「看得见的爽」。
- **接入**：沿用 `finishGame(score, detail, rank)`；`score` 传命中率整数，`gameDetail` 写「命中率 88% · 最大连击 72」。

### B.2 宇航员《失重》—— 轨道对接
- **机制**：Three.js 太空场景，玩家控飞船推力微调（← → 加减速、空格点火制动），与空间站对接窗口缓慢对齐；过冲 / 欠冲都算偏离，需连续修正。
- **计分**：对接窗口停留时长 + 燃料剩余 + 修正次数；偏离阈值内持续 3 秒 = 对接成功。
- **评级**（`rankOf` 新增 `dock` 档）：S = 一次成型对接且燃料 ≥ 60%；A = 成功对接；B = 超时强制进报告。
- **音效**（WebAudio 合成，复用 [lib/audio.ts](app/src/lib/audio.ts) `sfx`）：推进点火低频轰鸣、对接窗口临近时 `sfx.tick` / `sfx.heartbeat`、对接成功一声音叉。
- **围观卖点**：失重漂浮感独特，慢节奏紧张，与另外 4 个快游戏形成反差。
- **接入**：`gameDetail` 写「对接距离 12m · 燃料 58%」。

## 附录 C · GPTI 式报告卡规格（按用户提供的图）

**整体**：竖版单栏，区块间留白；深灰蓝渐变底 `#1A1A2E → #16213E`；圆角 8px 卡片；无衬线字体；黄 `#F6AD55` 主按钮、红 `#E53E3E` / 绿 `#38A169` 进度条。每结局叠自身 palette 强调色（附录 A）。

**从上到下 6 个区块**：

1. **品牌栏**：左 = 黄底「镜像自我·人生预演」标识；中 = 「人生报告」标签；右 = 「重新预演」按钮。
2. **主视觉区**（左 1/3 + 右 2/3）：
   - 左：类型标签（如 `TYPE CFSV`）+ **大称号**（如「夜环线之王」）+ slogan 段 + 标签（「RANK S」「本轮成绩」）。
   - 右：结局剧照（背影 / 剪影 / 镜中轮廓）。
3. **人格分析区**（左 2/3 + 右 1/3）：
   - 左：「人格分析」+ 三段叙事之一（来自 [lib/ai.ts](app/src/lib/ai.ts) `paragraphs`）。
   - 右：「**镜子没给你的人生**」对照——按维度第 2 / 3 高列 **2~3 条**「你也差点走了的路」（每条 = 职业名 + 一句 finalWord），占图中的「代表作」栏。
4. **维度偏好区**（2×2 四张卡）：每卡 = 轴标题 + 两端名称 + 横向百分比进度条（绿左 / 红右）+ 倾向标签。
   - 四轴：**核心驱动（守↔创）/ 目光所向（远↔近）/ 与世界的距离（群↔独）/ 生命节奏（疾↔缓）**。
   - **雷达下线**：现有 `EndingReport` 的 4 维雷达由本区 4 轴进度条取代。
5. **分享区**（左 2/3 + 右 1/3）：左 = 分享文案 + 按钮（复制文案 / 下载海报 / 系统分享）；右 = 二维码 + 小卡（剧照缩略 + 称号）。
6. **底部**：免责声明（「本报告为人生预演的趣味人格描述，不代表真实人格 / 职业能力判断」）+ 「重新预演 / 回首页」。

**分享海报规格**（P1，竖版 1080×1440）：顶部 = 类型代码 + 大称号；中部 = 结局剧照全幅 + slogan 叠字；下部 = 4 轴 % 微缩进度条（横排）+ 二维码 + 「镜像自我·人生预演」落款。

**数据流**：经 `generateReport`（AI 端点 → 失败走 `templateReport`）；`Report` 字段扩展 `{ typeCode, title, slogan, axes: [{l, lpct, r, rpct, lean}], altCareers: [{name, word}] }`（待实现）。

## 附录 D · 类型代码与 4 轴定义

**4 轴（每轴两极字母）**：
- 核心驱动：**守 G**（Guard） ↔ **创 C**（Create）
- 目光所向：**远 F**（Far） ↔ **近 N**（Near）
- 与世界的距离：**群 T**（Team） ↔ **独 S**（Solo）
- 生命节奏：**疾 V**（Velocity） ↔ **缓 R**（Rest）

**4 轴 % 推导公式**（由 5 维 stat 加和、归一化为百分比；过半侧字母进类型代码）：

```
守↔创 :  守        ‖  创 + 疾 + 韵 + 远
远↔近 :  疾 + 远   ‖  守 + 创 + 韵
群↔独 :  守 + 韵   ‖  创 + 疾 + 远
疾↔缓 :  疾 + 韵   ‖  守 + 创 + 远
```

> 设计原则：5 个 stat 各自在 4 轴上的归属，由它对应结局的**本命代码**反推得出（「疾」归远侧与创侧、「韵」归创侧与疾侧），保证「玩家主喂某一维 → 公式正好推出该结局的本命代码」。

**验证**（设该维 = 1、其余 = 0，代入公式取过半侧）：

| 结局 | 主喂维 | 守↔创 | 远↔近 | 群↔独 | 疾↔缓 | 推得 | 本命 | ✓ |
|---|---|---|---|---|---|---|---|---|
| 哨兵 | 守 | G | N | T | R | GNTR | GNTR | ✓ |
| 画家 | 创 | C | N | S | R | CNSR | CNSR | ✓ |
| 赛车手 | 疾 | C | F | S | V | CFSV | CFSV | ✓ |
| 音乐人 | 韵 | C | N | T | V | CNTV | CNTV | ✓ |
| 宇航员 | 远 | C | F | S | R | CFSR | CFSR | ✓ |

**示例（赛车手，疾最高、创次高，实际分布）**：
守 18 / 创 82 · 远 71 / 近 29 · 群 22 / 独 78 · 疾 88 / 缓 12 → **CFSV** ✓

## 附录 E · 5 维路由与节点重打标

**维度更名**：勇→**守**、彩→**创**、驰→**疾**，新增 **韵 / 远**。

**现有选择喂养点（重打标后）**——台词与结构不变，仅 `effect` 维度标签改名：

| 维度 | 喂养点（节点·选项） | 备注 |
|---|---|---|
| 守（→哨兵） | A3 阅兵 / B3 保护别人 / **C2 军校** / H3 靴子 | 原「勇」直接更名（4 个喂养点） |
| 创（→画家） | A1 涂鸦 / B1 画满 / F1 颜料 / C1 美术 / H1 画具 | 原「彩」直接更名（5 个） |
| 疾（→赛车手） | A2 自行车 / B2 最快的车 / F2 四驱车 / C3 卡丁车 / H2 赛道日 | 原「驰」直接更名（5 个） |
| 韵（→音乐人） | **F+ 一盘老磁带 / H+ 一把二手吉他**（各 +2，新选项） | 非限时节点扩选项；不进 B/G/D |
| 远（→宇航员） | **F3 望远镜（由「守」改喂「远」，+2）/ C+ 航空招飞简章（+2）** | F3 自然契合「仰望」 |

**节点扩项（仅非限时节点，限时节点 B/G/D 不动）**：
- F 储蓄罐：3 → 4 选项（F1 创 / F2 疾 / F3 远 / F+ 韵）——成为第一章的「四向愿望」节点。
- C 天台：3 → 4 选项（C1 创 / C2 守 / C3 疾 / C+ 远）。
- H 出租屋：3 → 4 选项（H1 创 / H2 疾 / H3 守 / H+ 韵）。

**路由判定（归一化占比 —— 解决喂养点失衡）**：
```
norm(维) = stat[维] / maxReachable[维]      // maxReachable = 该维全树可累加的最大分
ending   = argmax(norm)                       // 取归一化占比最高者
tiebreak :  并列时按固定优先级  守 > 创 > 疾 > 韵 > 远
```
> 关键：用**占比**而非**原始分**——瘦维度（韵 / 远 喂养点少）只要玩家专注选它，就能 100% 占比胜出，不会被多喂养点的创 / 疾永远压制。`maxReachable` 在构建期按选择树静态算出，离线模板即可执行。

**沿用机制**：「坚持」类（G1 / D1）的 `boostDominant` 逻辑保留——给当前归一化最高维再加值。犹豫（超时）保留为报告文案 flag，不再触发无名者。

## 附录 F · 无名者移除清单（待实现：下线）

| 位置 | 现状 | 处理 |
|---|---|---|
| [story.ts](app/src/story.ts) `isDrifter()` | 犹豫≥2 或三值全平 → drifter | 删除函数与调用 |
| [store.ts](app/src/store.ts) | `recordTimeout` 累计犹豫、`Ending \| 'drifter'` 类型 | 犹豫保留为报告 flag；`Ending` 收窄为 5 职业 |
| [StoryScene.tsx](app/src/components/StoryScene.tsx) E 节点 | `isDrifter` 判定分支 | 直接按归一化 `dominantCareer` |
| [FlowChart.tsx](app/src/components/FlowChart.tsx) | 常驻灰锁「？？？🔒」框 | 移除，5 结局框等价 |
| [lib/ai.ts](app/src/lib/ai.ts) `DRIFTER_T` / `pathSummary` drifter 分支 | 无名者专属模板 | 删除 |
| [lib/titles.ts](app/src/lib/titles.ts) | `ending === 'drifter'` 早返回 | 删除分支，池收为 5 职业 × S/A/B |

## 附录 G · 新剧照 prompt（给 [assets/PROMPTS.md](assets/PROMPTS.md) 用，本轮不改 PROMPTS.md）

> 沿用全局风格锚：`cinematic film still, anamorphic widescreen, teal and orange color grading, 35mm film grain, volumetric light, deep shadows, masterful composition, protagonist always seen from behind or in silhouette, face never visible --ar 16:9 --preview`

### career_musician —— 音乐人前奏（地下 livehouse）
```
a young musician seen from behind holding an electric guitar, standing on a
small dim stage in an underground livehouse, single warm spotlight cutting
through haze and fog, amplifier glow, tangled cables, sparse silhouetted
crowd in the dark, first chord about to strike, electric purple and amber
palette, anticipation and raw energy
```

### end_musician —— 音乐人结局（散场后的舞台）
```
an empty small stage after a gig seen from behind the musician's silhouette,
a single dropped guitar pick catching warm light, confetti and setlist on
the floor, crowd's glow sticks fading in the dark hall, sweat mist in
stage light, triumphant exhaustion, warm amber over electric purple
```

### career_astronaut —— 宇航员前奏（发射前夜 / 舷窗）
```
a young astronaut seen from behind in a flightsuit floating weightless inside
a dim station module, face pressed near a small porthole window showing a vast
starfield and the blue curve of earth, harness tethers drifting, instrument
panels glowing soft blue-green, profound silence and awe, deep space blue
with one warm interior lamp
```

### end_astronaut —— 宇航员结局（对接成功 / 望向地球）
```
a spacecraft cockpit seen from behind the astronaut, two vessels docked in
perfect alignment above a glowing earth at the terminator line, golden
sunrise spilling over the planet's edge, soft docking lights, reflection of
stars on the window glass, serene and sacred, warm gold over deep space blue
```

## 附录 H · 新结局补全数据（给 [story.ts](app/src/story.ts) `CAREER_INFO` 用，待实现）

```ts
musician: {
  name: '音乐人', title: '躁动', game: 'rhythm',
  gameHint: 'D F J K 或点击 · 在判定线接拍 · 连击越高分越多',
  introStill: 'career_musician', endStill: 'end_musician',
  introLines: [
    '二十六岁，你的歌还没几个人听过。',
    '但今晚，地下那间小 livehouse 把灯交给了你。',
    '第一个和弦响起来的时候，手是抖的。',
  ],
  palette: ['#1a0f24', '#4b1f5e', '#c98bff'],
},
astronaut: {
  name: '宇航员', title: '失重', game: 'dock',
  gameHint: '← → 微调速度 · 空格制动 · 把飞船送进对接窗口',
  introStill: 'career_astronaut', endStill: 'end_astronaut',
  introLines: [
    '二十六岁，你终于飞过了七岁时用望远镜看过的地方。',
    '舱外是整整一柜台的星星，舱内只有你的呼吸。',
    '前方是空间站的对接窗口——慢一点，稳一点。',
  ],
  palette: ['#040814', '#10244a', '#7fb4e8'],
}
```

**[lib/titles.ts](app/src/lib/titles.ts) `rankOf` 扩展**（新增两档阈值，待调）：
```ts
rhythm: { S: 90, A: 70 },   // score 传命中率整数
dock:   { S: 85, A: 60 },   // score 传对接综合分（窗口停留+燃料+修正）
```

---

*本文件为五结局扩容设计计划（v2 自审修订版），复用 ITERATION-01.md 体例。
叙事正典（世界观 / 主角 / 8 节点剧本）已沉淀于 [story.ts](app/src/story.ts) + [DESIGN.md](DESIGN.md) + [assets/PROMPTS.md](assets/PROMPTS.md)。
附录 A–H 任一项均可独立摘出，在下一轮迭代中落地，本轮不执行任何代码 / 美术改动。*
