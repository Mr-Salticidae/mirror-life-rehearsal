# 扫码域名切换 · reportBase → tiaozhuxiansheng.com/mlr/

> 背景：github.io 在大陆移动网络常不可达，观众扫码大概率打不开。
> 前置：above-the-web 仓库的 deploy 工作流已加 /mlr/ 镜像步骤并推送生效
> （CI 会把 mirror-life-rehearsal-preview 仓库整站镜像到 tiaozhuxiansheng.com/mlr/）。

## 展台机操作（免重构建，1 分钟）

编辑展台部署包 `app/config.json`，改一个字段：

```json
"reportBase": "https://tiaozhuxiansheng.com/mlr/"
```

展台页面刷新一次生效（无需重启服务）。

## 验收（用手机流量，不连展馆 WiFi）

1. 展台跑一局到报告页，手机扫屏幕上的二维码
2. 确认打开的是 `tiaozhuxiansheng.com/mlr/r.html#...` 且报告完整渲染（含结局剧照）
3. 若打不开：先直接访问 `https://tiaozhuxiansheng.com/mlr/r.html`（应显示"链接无效"提示页，说明站点在线）

## 回滚

`reportBase` 改回 `https://mr-salticidae.github.io/mirror-life-rehearsal-preview/`，刷新即可。
两个站点同源同产物，观众已保存海报上的旧二维码不受影响（github.io 站继续在线）。
