# 第七场 · 廊下相见

[打开演出](https://cpzioo4.github.io/honglou-storytelling-stage/?scene=reception)。当前版本 `abe41a2e-56bd-4da3-8370-1a17f2851f8f`，1段、5句，人物为刘姥姥、周瑞妻子、平儿。

## 当前初态

周瑞妻子按第六场已说定的同行安排，带刘姥姥走到倒厅旁院门外；只省略这段路途，两人刚到，尚未与平儿交谈。平儿仍在第五场结束的院门外答话位置，记得周瑞妻子先前转述的来意，但未听到她们回屋后的交谈。刘姥姥已听周嫂子转告可以候信，尚未与平儿本人说过话。平儿尚未向凤姐回禀，没有接见或资助答复。

## 场末与知识边界

下一节点为 `make-case`，实际到达该节点的同行者为平儿。 向奶奶回明刘姥姥只求过冬米粮，请奶奶示下见不见、如何周济。。平儿即刻动身去回话；刘姥姥与周瑞妻子留在倒厅廊下候信，未得奶奶示下前不随入正房。。计划、承诺与实际完成的行为以演出和逐人记忆区分。

- 平儿把刘姥姥“只求过冬的米粮”的话照实回明奶奶。
- 周瑞妻子答应陪刘姥姥在倒厅廊下候信。
- 刘姥姥与周瑞妻子留在廊下候着，平儿独自去回话。
- 奶奶是否接见、是否周济尚无答复，平儿只应承照实回，未许钱米。

## 文件与检查

- 演出：`data/stories/reception.json`
- 环境与运行卡：`data/cards/reception.json`
- 站位与模型：`data/stages/reception.json`
- 人物素材清单：`data/characters/waiting.json`
- 来源核验：`node scripts/verify/check-authorship.mjs reception`
- 完整播放：`npm run verify:scene -- reception`

原始 API 回执保留在本机 `.runtime/`；当前验证输出在 `qa/`。旧稿和旧目录在 Git 历史中，不作为另一个可播放版本发布。
