# MathLens · AI 高数解题可视化器

> 传智杯第九届 AI 创新应用挑战赛（Vibe Coding）参赛作品
> 输入一道高数题，AI 把它拆成几步，每一步配一张能拖、能查、能看的图——把抽象讲成具体的画面。

## 解决的问题

问 AI 一道高数题，得到的是**一整段文字**；问老师，得到的是**一次口头讲解**。两种方式都留不下可回看的过程，学生卡在第几步也说不清。

MathLens 把解题过程拆成步骤卡片，每一步同时给出「一句话解释 + 一张对应图像」。看不懂第 3 步，就点第 3 步，图跟着变。

## 10 分钟极速复现指南（评委照此操作）

### 1. 环境要求
- Node.js ≥ 18（推荐 22）
- 现代浏览器（Chrome / Edge / Firefox）

### 2. 克隆并安装
```bash
git clone https://github.com/Silas-Sloy/math-viz-workshop.git
cd math-viz-workshop
npm install
```

### 3. 启动（两种方式任选）
```bash
npm run dev
```
- **Windows 用户**：也可以直接双击项目根目录的 `dev.cmd`（自动定位 Node 并启动）
- 浏览器打开终端显示的地址，通常 http://localhost:5173

### 4. 无需 API Key 即可验证的部分
以下功能纯前端计算，不依赖网络：

| 验证项 | 操作 | 预期结果 |
|---|---|---|
| 数学引擎自检 | 终端执行 `node test-math.mjs` | `结果：31 通过 / 0 失败` |
| ε-δ 极限 | 拖动 ε 滑块 | 蓝色横带与绿色 δ 区间同步收缩 |
| 导数几何意义 | 拖动 Δx 滑块至最左 | 割线斜率显示 `k = 2.010`，红线与绿虚线重合 |
| 通用绘图器 | 滚动到「③ 任意函数绘图」 | 曲线 `x·sin(x)` 自动标出极大/极小与零点；鼠标悬停有读数；滚轮缩放、拖拽平移 |

### 5. 需要 API Key 的部分
```bash
cp .env.example .env
# 打开 .env，把 VITE_DEEPSEEK_API_KEY 换成真实 key
# https://platform.deepseek.com 注册获取（新户有免费额度）
```
填入 key 后即可使用「输入题目 → AI 拆步骤」主流程。

## 架构：AI 只描述，不执行

```
用户输入题目
   ↓
DeepSeek 返回结构化 JSON（只描述「画什么」）
   ↓ 校验 + 白名单分派
渲染器执行绘图（固定代码，被审查过）
```

AI 输出的是声明式的 `{ "type": "plot", "expr": "x*sin(x)", "domain": [0, 3.14] }`，**不是可执行代码**。因此：
- 不会因 AI 输出异常而白屏（格式不对直接拦截并降级提示）
- 不存在执行任意代码的风险
- 同一道题、同一份 JSON，得到同一张图，可复现

## 技术栈
- React 19 + Vite
- Canvas 2D（手绘函数图像，不依赖图表库）
- 自研数学引擎（词法分析 + 递归下降语法分析，**不使用 eval**）
- 数值分析：中心差分求导、辛普森积分、扫描 + 二分求零点、分位截断抗极端值
- DeepSeek API（题目拆解）
- Zustand（全局状态）

## 项目结构
```
src/
├── components/
│   ├── plot/         # 通用绘图器 PlotCanvas（主力渲染器）
│   └── visualizer/   # 概念工坊：ε-δ 极限、导数切线逼近
├── services/
│   └── llm.js        # DeepSeek API 封装
├── stores/
│   └── useMathStore.js
└── utils/
    └── mathEngine.js # 数学引擎（解析 + 数值分析，10 个导出函数）
docs/
├── prompts/          # 5 条主线 Prompt（纯文本，可直接复制）
├── prompt-log.md     # AI 编程 Prompt 链与我的判断依据
└── deepseek-主线执行包.md
test-math.mjs         # 数学引擎 31 条验收断言
dev.cmd               # Windows 一键启动脚本
```

## 开发过程可复现性说明
- Git 提交历史细粒度保留，每次提交对应一个可独立验证的改动
- `docs/prompt-log.md` 记录每个核心功能与 AI 交互的完整 Prompt、我提前埋入的约束、以及验收依据
- `docs/prompts/` 保存可直接复制的原始 Prompt，评委可自行粘贴给任意大模型验证
- `test-math.mjs` 提供客观验收线，不依赖主观判断「代码写得好不好」
