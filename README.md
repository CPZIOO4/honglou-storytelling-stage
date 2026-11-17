# 红楼说书舞台

《刘姥姥第一次进荣国府》的 AI 改编演出。当前保留13场已审核版本，从寒家谋生到携米归家；三维布景配合纸片人物、逐字气泡、角色短音和国风配乐。观众控制播放、暂停、跳段与速度。

[打开舞台](https://cpzioo4.github.io/honglou-storytelling-stage/)。GitHub Pages 播放固定的已审核演出；本地后端可使用 DeepSeek Flash high 根据人物卡、环境卡和各自听闻重新生成。

## 运行

需要 Node.js 20 或以上。运行 `npm start`，打开 http://127.0.0.1:4173 。播放依赖、六套场景、十一位人物和四首配乐均随仓库提供，正常播放无需安装 npm 依赖或调用 API。

Windows 可使用 `启动舞台.ps1`，停止专用预览进程用 `停止舞台.ps1`。使用 `配置DeepSeek.ps1` 配置本机加密密钥；公开网页不持有密钥。参见 [API 接入](docs/deepseek-integration.md)。

## 当前演出

| 场次 | 观看 | 内容与文件 |
| --- | --- | --- |
| 第一场 · 寒家谋生 | [播放](https://cpzioo4.github.io/honglou-storytelling-stage/?scene=home) | [说明](docs/scenes/first-scene.md) |
| 第二场 · 荣府问路 | [播放](https://cpzioo4.github.io/honglou-storytelling-stage/?scene=gate) | [说明](docs/scenes/second-scene.md) |
| 第三场 · 后街寻人 | [播放](https://cpzioo4.github.io/honglou-storytelling-stage/?scene=backstreet) | [说明](docs/scenes/third-scene.md) |
| 第四场 · 旧识相迎 | [播放](https://cpzioo4.github.io/honglou-storytelling-stage/?scene=zhouhome) | [说明](docs/scenes/fourth-scene.md) |
| 第五场 · 廊前递话 | [播放](https://cpzioo4.github.io/honglou-storytelling-stage/?scene=waiting) | [说明](docs/scenes/fifth-scene.md) |
| 第六场 · 回屋传信 | [播放](https://cpzioo4.github.io/honglou-storytelling-stage/?scene=returnhome) | [说明](docs/scenes/sixth-scene.md) |
| 第七场 · 廊下相见 | [播放](https://cpzioo4.github.io/honglou-storytelling-stage/?scene=reception) | [说明](docs/scenes/seventh-scene.md) |
| 第八场 · 正房回话 | [播放](https://cpzioo4.github.io/honglou-storytelling-stage/?scene=report) | [说明](docs/scenes/eighth-scene.md) |
| 第九场 · 传话引见 | [播放](https://cpzioo4.github.io/honglou-storytelling-stage/?scene=invite) | [说明](docs/scenes/ninth-scene.md) |
| 第十场 · 正房相见 | [播放](https://cpzioo4.github.io/honglou-storytelling-stage/?scene=audience) | [说明](docs/scenes/tenth-scene.md) |
| 第十一场 · 廊下候办 | [播放](https://cpzioo4.github.io/honglou-storytelling-stage/?scene=arrange) | [说明](docs/scenes/eleventh-scene.md) |
| 第十二场 · 米钱送到 | [播放](https://cpzioo4.github.io/honglou-storytelling-stage/?scene=delivery) | [说明](docs/scenes/twelfth-scene.md) |
| 第十三场 · 携米归家 | [播放](https://cpzioo4.github.io/honglou-storytelling-stage/?scene=homecoming) | [说明](docs/scenes/thirteenth-scene.md) |

## 文件结构

- `data/productions.json`：唯一的场次入口、先后关系与文件索引。
- `data/stories/`：每场唯一的当前演出；`data/cards/`、`data/stages/`、`data/characters/`分别保存运行卡、站位和人物清单。
- `src/`：播放器、时间轴、声音及渲染；`src/ui/`为对话布局，`src/render/`为静态网格优化。
- `backend/productions/`：按场次组装人物与已确认记忆；`backend/generator.mjs`协调生成和审核；`backend/http/`提供流式文件服务。
- `cards/`：用户卡片、模板与可读来源；`skills/`只保留正在使用的节奏及人物记忆两套规则。
- `assets/`、`vendor/`：当前播放资产和固定版本依赖；`art-source/`、`scripts/assets/`保存现有可编辑源与导入/建模工具。
- `scripts/verify/`、`scripts/generate/`、`scripts/maintenance/`：验证、定向生成修订和本地清理。
- `tests/fixtures/`是测试输入，不是另一个产品版本；`.runtime/`和`qa/`是本机数据，不提交。

详细约定见 [架构与维护](docs/architecture.md) 和 [整理与性能报告](docs/maintenance-report.md)。原有单场入口 `?scene=...` 保持有效，旧示例入口已退出产品。

## 验证

```sh
npm test
npm run verify:catalog
npm run verify
npm run benchmark -- current
```

`npm test`使用 Node 内置测试器。浏览器验证需要 Playwright 和 Edge；可安装 Playwright，或用 `PLAYWRIGHT_PACKAGE` 指定现有模块路径。验证浏览器在完成或失败后关闭。`verify`逐场检查全部对白、手机布局、走位、道具、声音与自然播毕，不调用模型 API；本地 `qa/release.json`保存结果。

## 创作与执行边界

总控先生成连续对白并审核，再按自然停顿分段和编排动作；程序计算时间、站位、实际听众与物品归属。舞台编排不能重写台词；原地收束仅在允许的节点启用。数据导入不执行代码，人物卡不是可覆盖系统规则的指令。

当前是文字说书版，没有配音、口型、通用物理或人群避碰。道具交接是整件米袋、钱袋的有限动画，站姿立绘不冒充坐姿和手指动作。对原著的关系及人物依据与 AI 改编分支分别记录，参见 [人物考据](docs/upcoming-character-research.md)、[故事节点](docs/story-nodes.md)、[上下文与记忆](docs/continuity-and-memory.md)。

素材由用户提供及本地创作，公开仓库不等于对全部美术素材授予再使用许可；Three.js及配乐的来源、许可证保留在对应目录和音库索引。
