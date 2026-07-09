# 方案 A 止血补丁 · 哨兵线下线（备而不用）

> 触发条件：真机验证 pointer lock 失败（D-02），或现场为触摸屏一体机。
> 未触发请勿应用。封版 v1.0 (acd9b06) 保持不动。

## 改了什么（2 个文件，共 3 处）

| 文件 | 改动 |
|---|---|
| `app/src/story.ts` | 新增 `DISABLED_CAREERS = ['soldier']`；`dominantEnding()` 路由跳过下线职业（E1"走进去"永不产出哨兵）；兜底初值 `soldier`→`painter` |
| `app/src/components/StoryScene.tsx` | E2"换一扇门"的五扇门过滤掉下线职业（只渲染四扇门） |

**不动的入口**：`?career=soldier` 调试直跳保留（现场排障仍可手动进哨兵线验证）。
**已知外观残留**：报告前的流程图（FlowChart）右侧仍画五个结局框，哨兵框永远是暗态装饰，不可达、无交互——不影响观众流程，为降风险不改。

## 应用步骤（约 3 分钟）

一键（推荐，自动处理 Node 环境——系统无 Node 时用 `tools/node-portable` 便携版，
缺失会自动跑 `hotfix/准备构建环境.ps1` 下载）：

```powershell
cd <仓库根目录>
.\hotfix\一键应用方案A.ps1      # 应用补丁 + 构建，已全流程实测通过
```

手动等价步骤：

```powershell
git apply hotfix/方案A_哨兵线下线.patch
cd app; npm run build          # tsc 类型检查 + vite 构建，已预验证通过
```

构建后二选一：`.\deploy-kiosk\打包展台.ps1` 重新打包，或手动把 `app/dist/*` 覆盖到展台机 `app/`。

展台机上覆盖 `app/`（保留现场已改的 `config.json`！先备份再覆盖），刷新页面生效。

## 应用后验收（2 分钟）

1. 完整走一遍叙事，E1"走进去" → 确认结局只会是 画家/赛车手/音乐人/宇航员
2. E2"换一扇门" → 确认只有四扇门，无"哨兵的门"
3. 全选"守"倾向选项（A3/B3/C2/H3）再 E1 → 确认落到画家（并列兜底），不落哨兵

## 回滚

```powershell
git apply -R hotfix/方案A_哨兵线下线.patch
```
然后重新构建打包即可。
