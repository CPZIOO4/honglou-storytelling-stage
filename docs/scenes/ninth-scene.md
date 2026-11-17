# 第九场 · 传话引见

[打开演出](https://cpzioo4.github.io/honglou-storytelling-stage/?scene=invite)。当前版本 `fc75da40-b6fd-47db-86bd-b306c7001616`，2段、4句，人物为刘姥姥、周瑞妻子、平儿。

## 当前初态

平儿按第八场已确认的安排独自从正房回到倒厅旁院门外，尚未向留候的两人开口。刘姥姥和周瑞妻子仍在第七场结束时的候信位置，没有移动到正房，也未听见第八场交谈。场间只完成平儿返回的路途，不替来客接受邀请，不增加钱米、礼物或别的口信。王熙凤仍在正房，不在本场。

## 场末与知识边界

下一节点为 `make-case`，实际到达该节点的同行者为刘姥姥、平儿。 进正房见奶奶，当面说米粮过冬的事。平儿传明奶奶请见、刘姥姥应允随行后即刻动身；周瑞妻子留在廊下等候。计划、承诺与实际完成的行为以演出和逐人记忆区分。

- 奶奶请刘姥姥进正房，米粮的事当面问。
- 平儿只领刘姥姥一人进正房，周瑞妻子在廊下稍候。
- 刘姥姥应承周瑞妻子，出来后还寻她一道走；周瑞妻子答应在廊下等着。
- 米粮尚未有着落，须进正房当面说。

## 文件与检查

- 演出：`data/stories/invite.json`
- 环境与运行卡：`data/cards/invite.json`
- 站位与模型：`data/stages/invite.json`
- 人物素材清单：`data/characters/waiting.json`
- 来源核验：`node scripts/verify/check-authorship.mjs invite`
- 完整播放：`npm run verify:scene -- invite`

原始 API 回执保留在本机 `.runtime/`；当前验证输出在 `qa/`。旧稿和旧目录在 Git 历史中，不作为另一个可播放版本发布。
