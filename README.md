# 红楼说书舞台

以三维布景和纸片人物播放《红楼梦》故事。当前只实现**第一次进荣国府这条故事线的第一场：狗儿家中商量生计**，当前默认演出由 DeepSeek Flash 实际生成，共 8 段、3 分 12 秒，讲述一家商量生计与出门准备，是否动身留到天亮再定。

本地后端根据人物卡、环境卡、当前舞台状态和人物各自听过的对白逐段调用模型，检查整场后再播放。GitHub Pages 播放已检查的静态结果；旧助手示例通过 `?demo=1` 保留。观众可播放、暂停、拖动进度、跳段、调速和重播，不参与剧情决策。

## 本地运行

安装 Node.js 20 或以上版本后，在此目录运行：

```sh
node server.mjs
```

打开 http://127.0.0.1:4173 。所有模型、人物图片及 Three.js 依赖都放在仓库中，页面不使用 CDN。无需 npm 安装。服务仅监听本机回环地址；在启动终端按 Ctrl+C 停止。

Windows 用户也可运行 `启动舞台.ps1`，用 `停止舞台.ps1` 停止该脚本启动的专用本地进程。它不会停止其他 Node 服务。

## 当前功能

- 实际 GLB 三维场景；五个纸片人物，头部与身体分层。
- 已有六种头部表情、正背面、有限朝向，以及轻微点头/摇头表现。
- 单一时间轴同时驱动上方旁白、下方对白、人物位置、表情、镜头和昼夜光线。
- 移动指令使用命名站位，由程序在路线图上求路，不让生成器随意填写坐标或执行代码。
- 任意拖动进度都从初始状态重算，重播不会累积位移。
- “演出指令”面板显示当前段落 JSON、人物/环境/上下文，支持下载与校验后载入同格式演出。
- 对白气泡跟随说话人头顶，显示对话对象与实际听众。低语必须靠近、停步、相向后才能开始；个人记录只保留实际听见的内容。
- `cards/environment/` 保留用户新版卡并补齐首次进府所缺的五张场景卡，字段与旁白卡 v3 模板一致。
- 本地“生成第一场”调用 DeepSeek Flash；生成记录与密钥保留在本机，通过校验才装载新演出。配置与运行说明见 [DeepSeek 接入](docs/deepseek-integration.md)。

## 内容来源与当前边界

人物与环境沿用用户提供的立绘、三维模型及修改版人物卡、环境卡。当前生成从农家初始情况开始，不将原著第六回或旧示例剧情作为续写剧本。刘姥姥和板儿卡已从后期贾母上房情境改写到当前家中；狗儿、刘氏、青儿及农家环境卡是本轮补写。来源与改编说明见 `data/cards.json`。服装、画风沿用已确认资产，未用文字卡覆盖立绘。

本轮按用户最新要求，只完成第一场的网页剧情；第二、三场已有独立模型，后续场景与剧情待基于第一场继续扩展。页面是**文字说书版**，暂不包含配音或口型。当前交付经过真实 API 生成、模型文字修订和人工逐句复核；复核修正了五处旁白及相关摘要，保留模型修订后的对白和动作，过程记录在演出 JSON 的 `generation` 字段。站姿立绘不冒充坐姿，点头/摇头是纸片头部的有限运动。路线图避开固定家具，尚非通用人群避碰或物理引擎。

原文：[《红楼梦》第六回](https://zh.wikisource.org/zh-hans/紅樓夢/第006回)。卡片、场景与历史组织参考 [SillyTavern Character Design](https://docs.sillytavern.app/usage/core-concepts/characterdesign/)，本项目不依赖也不冒充 SillyTavern。

## 项目结构

- `data/deepseek-first-scene.json`：当前已检查的 Flash 演出；`data/catalog.json` 选择默认版本。
- `data/scene-one.json`：保留的旧助手示例。
- `data/cards.json`：角色卡、环境卡和世界信息。
- `data/stage.json`：站位、路线、固定障碍和镜头。
- `src/engine.js`：指令校验、路径计算、确定性时间轴与上下文生成。
- `src/stage.js`：Three.js 渲染、身体/头部和镜头。
- `src/director.js`：演出数据载入；`backend/`：本地 DeepSeek 调用、个人上下文与检查。
- `docs/director-protocol.md`：总控协议、接 API 的边界与验收方法。
- `skills/honglou-story-director/SKILL.md`：交给其他 AI 的说书与舞台编排技能。
- `assets/`：网页实际使用的场景与五个人物。
- `vendor/three/`：固定 Three.js 0.180.0 的离线模块及其 MIT 许可证。

## 检查

```sh
node --test tests/*.test.mjs
```

当前 Flash 全程播放检查使用 `scripts/check_flash_playback.cjs`；旧示例回归浏览器验证脚本为 `scripts/browser_check.cjs`、`scripts/full_playback.cjs`。安装 Playwright 并设置 `PLAYWRIGHT_PACKAGE`，或修改脚本中的本机依赖路径后运行；验证脚本在 finally 中关闭其自有浏览器。`qa/` 是本机截图和检查结果，不进入 Git。

项目由用户提供及本地生成的素材组成。仓库公开不代表获得了原著改编之外的商标或全部素材再授权；Three.js 的许可见其随附 LICENSE。其他素材的使用许可由项目所有者决定。
