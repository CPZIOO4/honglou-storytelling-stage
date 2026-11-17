# 第六场 · 回屋传信

[打开演出](https://cpzioo4.github.io/honglou-storytelling-stage/?scene=returnhome)。当前版本 `6d2fbe37-46fe-4ecc-b086-70606201dd64`，1段、5句，人物为刘姥姥、周瑞妻子。

## 当前初态

承接第五场，周瑞妻子已独自从倒厅返回自己住处门边，尚未向刘姥姥说话。刘姥姥仍在第四场结束时的位置（屋内桌旁空地的来客站位，没有坐下动作）等消息；她不知道平儿刚才的具体答复。场间仅完成周瑞妻子返回的路途，未替刘姥姥答应同行，未发生凤姐接见、平儿回禀或资助。

## 场末与知识边界

下一节点为 `audience-window`，实际到达该节点的同行者为周瑞妻子、刘姥姥。 到倒厅廊下候着，等平儿得空回奶奶，听奶奶示下是否接见、如何周济。。当即动身；周瑞妻子先行，刘姥姥因脚慢随后跟着，同去倒厅廊下候信。。计划、承诺与实际完成的行为以演出和逐人记忆区分。

- 平儿许周瑞妻子领刘姥姥到倒厅廊下候着；平儿得空回奶奶，见不见、怎么周济还得听奶奶示下。
- 奶奶是否接见、如何周济尚未定，刘姥姥也自知做不得主。
- 有人问起时，刘姥姥照平儿姑娘的话说是周嫂子带来等回话的，旁的由周瑞妻子答。
- 刘姥姥应承随周瑞妻子同去，因脚底下慢，请她前头略等；周瑞妻子答应先行，刘姥姥跟着。

## 文件与检查

- 演出：`data/stories/returnhome.json`
- 环境与运行卡：`data/cards/returnhome.json`
- 站位与模型：`data/stages/returnhome.json`
- 人物素材清单：`data/characters/zhouhome.json`
- 来源核验：`node scripts/verify/check-authorship.mjs returnhome`
- 完整播放：`npm run verify:scene -- returnhome`

原始 API 回执保留在本机 `.runtime/`；当前验证输出在 `qa/`。旧稿和旧目录在 Git 历史中，不作为另一个可播放版本发布。
