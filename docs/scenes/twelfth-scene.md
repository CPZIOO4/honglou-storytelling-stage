# 第十二场 · 米钱送到

[打开演出](https://cpzioo4.github.io/honglou-storytelling-stage/?scene=delivery)。当前版本 `bf81b5c8-ef20-4561-a462-1fc7434bc232`，2段、6句，人物为刘姥姥、周瑞妻子、平儿。

## 当前初态

这一场以短过场省略已说定的例行办理：平儿入内传下量米取钱的吩咐，待物备妥，携米袋和钱袋回到廊下。没有额外条件、太太口信或插曲，数量不具体化。她在交接位持有两件物品，刘姥姥和周瑞妻子仍在第十一场的候办站位，三人还未开口；刘姥姥尚未接到米钱，家人也未收到。两位留候者只看见平儿携物回来，不自动知道内院过程。

## 场末与知识边界

下一节点为 `household-decision`，实际到达该节点的同行者为刘姥姥。 出街回家，把已收妥的米钱带回给家人。周瑞妻子送到后门、出了街分手后，刘姥姥自行慢慢走回去。计划、承诺与实际完成的行为以演出和逐人记忆区分。

- 周瑞妻子答应送刘姥姥到后门，出了街由刘姥姥自行慢慢走。
- 刘姥姥只领周瑞妻子送到后门，不要求再远送；平儿确认周嫂子送到后门正好。

## 文件与检查

- 演出：`data/stories/delivery.json`
- 环境与运行卡：`data/cards/delivery.json`
- 站位与模型：`data/stages/delivery.json`
- 人物素材清单：`data/characters/waiting.json`
- 来源核验：`node scripts/verify/check-authorship.mjs delivery`
- 完整播放：`npm run verify:scene -- delivery`

原始 API 回执保留在本机 `.runtime/`；当前验证输出在 `qa/`。旧稿和旧目录在 Git 历史中，不作为另一个可播放版本发布。
