# 红楼说书舞台

以三维布景和纸片人物播放《红楼梦》故事。当前实现第一次进荣国府故事线的十场：**寒家谋生**、**荣府问路**、**后街寻人**、**旧识相迎**、**廊前递话**、**回屋传信**、**廊下相见**、**正房回话**、**传话引见**与**正房相见**。第一场保持已确认版本，第二场继承实际分支：刘姥姥独自抵府，狗儿只送到村口后返回。十场均由 DeepSeek Flash high 根据运行卡、个人听闻与剧情文字生成，经内容和舞台检查后播放。

页面上方可切换场次；直接访问 `?scene=audience` 观看第十场，`?scene=invite` 观看第九场。第三场承接老仆给出的门路，由刘姥姥向后街孩童确认住处、请人带路。后续人物卡、原文依据和场次职责见[人物考据](docs/upcoming-character-research.md)，第五场递话与候见安排见[第五场说明](docs/fifth-scene.md)，返回住处传信见[第六场说明](docs/sixth-scene.md)，三人初次相见与实际传话见[第七场说明](docs/seventh-scene.md)，正房模型与凤姐首次出场见[第八场说明](docs/eighth-scene.md)，返回传话与引见接续见[第九场说明](docs/ninth-scene.md)，主客当面交谈见[第十场说明](docs/tenth-scene.md)。

本地后端以宽松故事节点组织剧情：先按人物卡和环境卡写完整场次剧本并检查推进，再编排走位、表情和逐人听闻，整场通过审核后播放。动作编排不能重写台词。GitHub Pages 播放已检查的静态结果；旧助手示例通过 `?demo=1` 保留。观众可播放、暂停、拖动进度、跳段、调速和重播，不参与剧情决策。

## 本地运行

安装 Node.js 20 或以上版本后，在此目录运行：

```sh
node server.mjs
```

打开 http://127.0.0.1:4173 。所有模型、人物图片及 Three.js 依赖都放在仓库中，页面不使用 CDN。无需 npm 安装。服务仅监听本机回环地址；在启动终端按 Ctrl+C 停止。

Windows 用户也可运行 `启动舞台.ps1`，用 `停止舞台.ps1` 停止该脚本启动的专用本地进程。它不会停止其他 Node 服务。

剧情连续性、原文性格校订、high 思考与两层记忆见 [连续性与记忆](docs/continuity-and-memory.md)。

## 当前功能

- 实际 GLB 三维场景；按本场名单载入纸片人物，头部与身体分层。
- 国风纯音乐曲库由总控按剧情播放、暂停、续播和停止；十一组角色文字短音随逐字显示发声，提供独立音量及静音。
- 运行卡区分关系归属、开场知识与听闻；原始后期入园描写不混入第一场。详情见 [运行卡与声音](docs/cards-and-audio.md)。
- 已有六种头部表情、正背面、有限朝向，以及轻微点头/摇头表现。
- 演出时间轴驱动人物与纯文本头顶气泡；呈现时间轴加入开场题字和短旁白过场，过场时定格并模糊场景，可直接略过。
- 移动指令使用命名站位，由程序在路线图上求路，不让生成器随意填写坐标或执行代码。
- 任意拖动进度都从初始状态重算，重播不会累积位移。
- “演出指令”面板显示当前段落 JSON、人物/环境/上下文，支持下载与校验后载入同格式演出。
- 对白气泡跟随说话人头顶，只显示台词。姓名使用半透明黑底白字，开口时隐藏、停话后恢复；朝向与轻微暖色光圈提示受话人。对话对象与实际听众仍供后台检查。低语必须靠近、停步、相向后才能开始；个人记录只保留实际听见的内容。
- `cards/environment/` 保留用户新版卡并补齐首次进府所缺的五张场景卡，字段与旁白卡 v3 模板一致。
- 本地“生成当前场景”调用 DeepSeek Flash；生成记录与密钥保留在本机，通过校验才装载新演出。配置与运行说明见 [DeepSeek 接入](docs/deepseek-integration.md)。

故事节点与开放分支见 [节点设计](docs/story-nodes.md)。当前支持前十场及其交接资料，后续节点尚未接成可播放演出。

## 内容来源与当前边界

人物与环境沿用用户提供的立绘、三维模型及修改版人物卡、环境卡。当前生成从农家初始情况开始，不将原著第六回或旧示例剧情作为续写剧本。刘姥姥和板儿卡已从后期贾母上房情境改写到当前家中；狗儿、刘氏、青儿及农家环境卡是本轮补写。来源与改编说明见 `data/cards.json`。服装、画风沿用已确认资产，未用文字卡覆盖立绘。

本轮复用正房布景，接入刘姥姥亲自见凤姐的第十场网页演出，后续仍依据当前实际分支扩展。页面是**文字说书版**，暂不包含配音或口型。当前交付经过真实 API 生成、模型自动审查与修订，以及内容和实际播放检查；这版没有人工对白补丁。旧八段版本因重复和人物失真已被新版本替换；修正过程保留在 `generation`，场次剧本与下一节点交接记录在 `narrative`。站姿立绘不冒充坐姿，点头/摇头是纸片头部的有限运动。路线图避开固定家具，尚非通用人群避碰或物理引擎。

原文：[《红楼梦》第六回](https://zh.wikisource.org/zh-hans/紅樓夢/第006回)。卡片、场景与历史组织参考 [SillyTavern Character Design](https://docs.sillytavern.app/usage/core-concepts/characterdesign/)，本项目不依赖也不冒充 SillyTavern。

## 项目结构

- `data/deepseek-first-scene.json` / `data/deepseek-second-scene.json` / `data/deepseek-third-scene.json` / `data/deepseek-fourth-scene.json` / `data/deepseek-fifth-scene.json` / `data/deepseek-sixth-scene.json` / `data/deepseek-seventh-scene.json` / `data/deepseek-eighth-scene.json` / `data/deepseek-ninth-scene.json` / `data/deepseek-tenth-scene.json`：已检查的十场 Flash 演出；`data/productions.json` 绑定各场模型和运行卡。
- `data/scene-one.json`：保留的旧助手示例。
- `data/cards.json`：实际角色卡、环境卡、关系事实和知识边界；`cards/characters/` 为可读导出。
- `data/audio-library.json`、`src/audio.js`、`src/soundtrack.js`：曲库、角色短音及声音时间轴。
- `data/stage.json`：站位、路线、固定障碍和镜头。
- `src/engine.js`：指令校验、路径计算、确定性时间轴与上下文生成。
- `src/stage.js`：Three.js 渲染、身体/头部、头顶姓名与对话焦点。
- `src/presentation.js`：开场题字、冻结画面的短过场及时间轴映射。
- `src/director.js`：演出数据载入；`backend/`：本地 DeepSeek 调用、个人上下文与检查。
- `docs/director-protocol.md`：总控协议、接 API 的边界与验收方法。
- `skills/honglou-story-director/SKILL.md`：交给其他 AI 的说书与舞台编排技能。
- `assets/`：网页实际使用的五套场景与十位人物。
- `vendor/three/`：固定 Three.js 0.180.0 的离线模块及其 MIT 许可证。

## 检查

```sh
node --test tests/*.test.mjs
```

沉浸式呈现检查使用 `scripts/check_presentation.cjs`，覆盖题字、姓名、气泡、手机、短过场及连续播放。当前 Flash 全程播放检查使用 `scripts/check_flash_playback.cjs`；旧示例回归浏览器验证脚本为 `scripts/browser_check.cjs`、`scripts/full_playback.cjs`。安装 Playwright 并设置 `PLAYWRIGHT_PACKAGE`，或修改脚本中的本机依赖路径后运行；验证脚本在 finally 中关闭其自有浏览器。`qa/` 是本机截图和检查结果，不进入 Git。

项目由用户提供及本地生成的素材组成。仓库公开不代表获得了原著改编之外的商标或全部素材再授权；Three.js 的许可见其随附 LICENSE。其他素材的使用许可由项目所有者决定。
