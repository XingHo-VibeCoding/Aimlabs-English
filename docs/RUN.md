# WordWorld 运行说明（RUN.md）

> 本文档是 Week 1 · Day 7 的交付物：回答「怎么把项目跑起来」。
> 对应 PRD 成功标准 S5（README 写清如何启动）的先行版本；正式 README 在 Day 27–28 收尾时补。

---

## 一、这是什么

WordWorld 是一个 3D 网页沙盒建造游戏：输入英文 → 生成对应颜色/大小的物体 → 摆进自己的世界。
本期（Day 7）完成的是 **MVP 骨架**：开始页 + 3D 场景 + 词典生成闭环（基础模式）。

## 二、跑起来需要什么

| 项 | 要求 |
|---|---|
| Node.js | v18 及以上（本项目用 v22.22.2） |
| 浏览器 | 桌面版 Chrome / Edge（3D 场景用 WebGL，主流浏览器都支持，集显也能跑） |
| 网络 | 首次安装依赖需联网；安装后运行、生成均**不联网**（数据不出本机） |

> ⚠️ 本机（联想拯救者）的 Node 是 WorkBuddy 自带的便携版，**系统级未安装**。在 WorkBuddy 之外的 CMD/PowerShell 里敲 `node` / `npm` 会失败；请在 WorkBuddy 里跑下面命令。

## 三、启动步骤

```bash
# 1. 进入项目目录
cd "C:/Users/XIAODUYIHAO/Desktop/Vibe Coding/vibe-coding-workspace"

# 2. 安装依赖（首次运行才需要，之后跳过）
npm install

# 3. 启动开发服务器
npm run dev
```

看到 `Local: http://localhost:5173/` 后，用浏览器打开这个地址即可。

## 四、怎么玩（新手 30 秒）

1. 开始页点「开始建造 · Start Building」进入 3D 场景。
2. **转视角**：按住鼠标左键拖动旋转，滚轮拉近拉远。
3. **造东西**：右上角输入英文（如 `a red tree`），回车或点「生成」。
4. 认得的词——颜色：red / blue / green / pink / yellow…；大小：big / tiny / giant…；东西：tree / house / cat / dog / ball / rock / cube。
5. 点顶栏「帮助 · Help」可随时翻看完整操作指导。

## 五、本期能做什么 / 不能做什么

| 能做（Day 7 已完成） | 还不能做（后续天数） |
|---|---|
| 开始页、3D 场景、转视角 | 拖拽移动/旋转/缩放物体（Day 8+） |
| 输入英文生成变体（词典基础模式） | 本地 AI 模型听懂任意英文（Week 2） |
| 帮助指导 | 保存/导出/导入存档（Week 2–3） |

## 六、常见问题

- **页面打不开**：确认 `npm run dev` 还在跑，地址是 `localhost:5173`。
- **输入中文提示"请用英文"**：这是刻意的，产品核心就是「必须用英文造东西」。
- **输入认不出的词**：提示「基础模式」，试试帮助里的词清单。

---

## 七、如何添加新内容（扩展点速查）

代码按「加新内容 = 加条目，不是改逻辑」设计，后续天数照着这张表加：

| 想加什么 | 改哪里 | 怎么做 |
|---|---|---|
| 新的**颜色词** | `src/ai/dictionary.js` → `COLORS` | 加一行 `teal: 0x009688` |
| 新的**大小词** | `src/ai/dictionary.js` → `SIZES` | 加一行 `medium: 1.0` |
| 新的**可生成物体** | 两处 | ① `src/scenes/WorldScene.jsx` 写一个 `makeXxx()` 造物函数 ② 同文件的 `BUILDERS` 注册表加一行 ③ `src/ai/dictionary.js` 的 `TYPES` 加一行 |
| 新的**页面/视图** | `src/App.jsx` | 新增组件，在 `App` 的视图切换里加分支 |
| 新的**界面文案** | 各组件 | 保持「中文 + 英文」双语（Day 6 规则） |
