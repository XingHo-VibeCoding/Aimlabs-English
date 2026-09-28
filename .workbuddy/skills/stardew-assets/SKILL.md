---
name: stardew-assets
description: 星露谷物语素材库的检索与取用说明。当需要找某个东西（树/房子/动物/食物/家具/石头…）的星露谷风格像素图时使用。素材已解包到本机 D:\哭死\Stardew Valley\Content (unpacked)，本 Skill 说明图集与数据表的对应关系、怎么定位单个图块、以及使用边界（版权）。
---

# stardew-assets — 星露谷素材库使用说明

## 一、素材在哪

- 路径：`D:\哭死\Stardew Valley\Content (unpacked)\`
- 来源：官方游戏文件经 StardewXnbHack 解包（2026-09-28）
- 规模：**1044 张 PNG 图 + 2265 个 JSON 数据表 + 259 张 TMX 地图**

## 二、核心模型：图集 + 数据表（最重要）

星露谷的图不是一张张独立的，而是「**大图集（sprite sheet）+ 数据表**」：

1. 一张 PNG 里按网格排着几十上百个小图块
2. `Data\*.json` 里每条记录有 `Texture`（用哪张图集）和 `SpriteIndex`（第几格）
3. 找图块 = 打开对应图集 → 按 SpriteIndex 数格子 → 抠出来

**数格子规则**：物品/作物类以 16×16 像素为一格，从左到右、从上到下数（作物每帧 16×32，宽一格高两格）。`SpriteIndex = 行号 × 每行格数 + 列号`。图块编号从 0 开始。

**例**：`Data\Objects.json` 里石头（Stone）`SpriteIndex: 2`、`Texture: null`（null = 默认图集 `Maps\springobjects.png`）→ 打开 springobjects.png，第 2 格就是石头。

## 三、WordWorld 常用素材速查

| 要造什么 | 图集在哪 | 数据表 | 备注 |
|---|---|---|---|
| 树（橡/枫/松等 8 种） | `TerrainFeatures\tree1..tree8_季节.png` | — | 一张图从左到右是生长阶段，取最右/最大的成熟树 |
| 蘑菇树/神秘树/棕榈 | `TerrainFeatures\mushroom_tree / mystic_tree / tree_palm*.png` | — | — |
| 石头/杂物/各种物品 | `Maps\springobjects.png` | `Data\Objects.json` | 物品的默认图集（Texture 为 null 时用这张） |
| 作物（防风草/土豆/瓜…） | `TileSheets\crops.png` | `Data\Crops.json` | 纵向是生长阶段，取最后一帧 |
| 果树 | `TileSheets\fruitTrees.png` | `Data\FruitTrees.json` | — |
| 家具（桌椅床…） | `TileSheets\furniture*.png` | `Data\Furniture.json` | 多个变体图集 |
| 建筑（鸡舍/畜棚/农舍…） | `Buildings\*.png`（一建筑一张图） | `Data\Buildings.json` | 整栋建筑是单图，不用抠格子 |
| 动物（鸡/牛/猫/狗…） | `Animals\*.png`（一动物一张） | `Data\FarmAnimals.json` | 图里是行走/进食帧，取一帧即可 |
| NPC 人物 | `Characters\*.png` | `Data\Characters.json` | 行走图集，取正面站立帧 |
| NPC 头像 | `Portraits\*.png` | — | 表情图集 |
| 地面/草/耕地 | `TerrainFeatures\grass / hoeDirt*.png` | — | — |

其余目录：`Maps`（整个小镇地图 tmx + 配套图集）、`Fonts`（字体）、`LooseSprites`（UI 散图）、`Minigames`、`Effects`、`Strings`（各语言文本，中文看 `*.zh-CN.json`）。

## 四、取用流程（给 WordWorld 加一个星露谷素材）

1. 先在对应 `Data\*.json` 里搜英文名，拿到 `Texture` + `SpriteIndex`
2. 打开对应 PNG，按 16px 网格数格子，确认是要的那帧
3. 抠图（保持 16 的倍数裁剪，不缩放、不抗锯齿，保住像素风）
4. 存进项目 `vibe-coding-workspace\assets\`，并在代码里登记

## 五、边界与注意

- **版权**：素材版权归 ConcernedApe（Eric Barone）。本地学习/原型参考可以；**WordWorld 公网发布 v1.0 前必须替换为自绘或授权素材**，否则侵权。这一点在 Day 22-28 发布前要专门处理。
- 季节变体：树/地面等有 `_spring/_summer/_fall/_winter` 后缀，取用时要指定季节。
- 语言变体：带 `.zh-CN/.ja-JP` 等后缀的是文字贴图变体，一般忽略，用无后缀版本。
- 只读使用：不要改动 `Content (unpacked)` 里的原始文件，抠图一律另存到项目目录。
