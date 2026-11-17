# 第三场 · 后街寻人

[打开演出](https://cpzioo4.github.io/honglou-storytelling-stage/?scene=backstreet)。当前版本 `47fc271c-bb65-4e4e-83a1-b1586b3679e3`，1段、6句，人物为刘姥姥、引路孩童。

## 当前初态

刘姥姥听过老仆指点，已沿府墙从角门绕到后街后门外。其目的是沿府墙绕到后街后门，寻太太陪房周瑞家，找周瑞媳妇替自己递话，再求太太周济些过冬米粮。。现在刚到街口，摊担靠墙，一个孩子在门前空地。来客还没向孩子说话，未获其带路承诺，也未见到周瑞妻子。原在门上的人未随行，家中人仍不在此场。

## 场末与知识边界

下一节点为 `intermediary`，实际到达该节点的同行者为刘姥姥。 从后门进去左手第二家找周瑞媳妇，寻她递句话。。孩子答应带路后，刘姥姥即随其从后门进去，到左手第二家周瑞家门口。。计划、承诺与实际完成的行为以演出和逐人记忆区分。

- 刘姥姥问明太太陪房周瑞家在后门进去靠左手第二家，并打算去寻周瑞媳妇递话。
- 引路孩童答应领刘姥姥从后门进去，到左手第二家周瑞家门口。
- 刘姥姥向孩童说明自己不是周瑞家亲戚，只是寻周嫂子递句话。

## 文件与检查

- 演出：`data/stories/backstreet.json`
- 环境与运行卡：`data/cards/backstreet.json`
- 站位与模型：`data/stages/backstreet.json`
- 人物素材清单：`data/characters/backstreet.json`
- 来源核验：`node scripts/verify/check-authorship.mjs backstreet`
- 完整播放：`npm run verify:scene -- backstreet`

原始 API 回执保留在本机 `.runtime/`；当前验证输出在 `qa/`。旧稿和旧目录在 Git 历史中，不作为另一个可播放版本发布。
