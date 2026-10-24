# MathLens · DeepSeek 主线执行包

> 这份文档是我（规划方）定好的东西，你（执行方）只需要做 **4 次复制粘贴**。
> 代码全部由 DeepSeek 生成，我负责：产品定义、技术契约、提示词、验收标准、排错话术。
> 打开方式：Trae 左侧文件树 → `docs` → `deepseek-主线执行包.md`

---

## 0. 方案定稿（不再讨论，直接执行）

### 作品一句话

> **输入任意一道高数题，AI 把它拆成几步，每一步配一张能交互的图——讲到哪一步，图画到哪一步。**

### 你亲口说的痛点，就是产品定位

> "因为我每次问 AI 都是文字，问老师也是口头的，想要讲解没有现成的。"

这句话翻译成技术语言：

| 现在的处境 | MathLens 给什么 |
|---|---|
| AI 的回答是一大段文字 | 每个步骤配一张图，图跟着步骤走 |
| 老师讲课是一次性的、口头 | 可以反复点、拖动、放大看 |
| 教材的图是死的、通用的 | 图按**你这道题**现算出来 |
| 看不懂就卡住了，没人告诉你在哪卡 | 拆成 4-6 步，卡在第 2 步就只看第 2 步 |

### 技术形态（这是整个方案的骨架）

```
用户输入一道题  →  solver.js 调 DeepSeek（JSON 模式）  →  返回结构化步骤
                                                          ↓
                                         每一步带一个「声明式」visual
                                                          ↓
                         PlotCanvas 用 mathEngine 解析表达式 → 采样 → 画图
```

**关键设计（写进技术文档直接加分）：AI 只输出 JSON 描述"画什么"，绝不输出可执行代码。**

- 不会崩：格式不对就校验拦掉，降级成纯文字步骤，不白屏
- 可控：`visual.type` 是白名单，永远不会执行任意代码
- 可复现：同一道题 → 同样的 JSON → 同样的画面

### 评分对照（官方 5 维，满分 100）

| 维度 | 权重 | 这个方案为什么拿得到 |
|---|---|---|
| 过程可复现性 | 25% | 4 次 DeepSeek 对话全部有分享链接，Prompt 链天然完整；Git 一天多次提交 |
| 解题有效性 | 25% | 痛点是你自己遇到的，目标用户就是你自己，演示时不用编故事 |
| 方法创新性 | 20% | AI 输出声明式可视化 spec + 前端数值引擎渲染，不是套壳聊天 |
| 工程质量 | 15% | 表达式解析器不用 eval、数值分析算法、JSON schema 校验、降级兜底 |
| 用户体验 | 15% | 步骤时间线 + 图画联动 + 悬停读数 + 步骤淡入动画 |

### 最终形态（10/31 交付版）

两个 Tab：

- **【解题】**（默认）输入题目 → AI 拆步 → 左边步骤卡，右边图
- **【概念工坊】** 已有的 ε-δ、导数切线两个积木（资产复用，不浪费）

---

## 1. 你要生成的文件（按顺序，不能乱）

| 顺序 | 文件 | 干什么 | 验收方式 |
|---|---|---|---|
| P1 | `src/utils/mathEngine.js` | 表达式解析 + 求值 + 数值分析 | 跑 `node test-math.mjs`，**0 失败** |
| P2 | `src/components/plot/PlotCanvas.jsx` | 通用绘图器（吃 spec 出图） | 页面能画出 `sin(x)/x` 并自动标极值 |
| P3 | `src/services/solver.js` | 调 DeepSeek 把题目拆成步骤 | 浏览器控制台打印出合法 JSON |
| P4 | `src/components/solver/ProblemSolver.jsx` | 主界面：输入框 + 步骤 + 图 | 输入题目 → 出步骤 → 点步骤图变化 |
| P5 | `src/App.jsx`（改，不是新建） | 双 Tab 接线 | 能切「解题 / 概念工坊」 |

**P1 必须先做**。P2、P3、P4 都依赖它，顺序错了会连环报错。

---

## 2. 每次粘贴前必看：三条对话纪律

1. **一次只粘一条 Prompt**，等它输出完再粘下一条。别把两条拼在一起发。
2. **输出被截断**（结尾断在半句）→ 回它：
   ```
   代码被截断了，请从最后一行之后继续输出剩余部分，不要重复前面的内容
   ```
3. **代码报错** → 回它：
   ```
   运行报错：
   <把控制台红色报错原文整段粘进来>

   请只输出修正后的完整文件，不要解释，不要省略，不要只给改动片段。
   ```

**每次对话结束，点 DeepSeek 页面上的「分享」→ 复制链接 → 存进 `docs/prompt-log.md`。**
这就是"可复现性 25%"最硬的证据，比任何说明文字都管用。

---

## 3. Prompt ① — 数学引擎

- 存到：`src/utils/mathEngine.js`（**覆盖现有那一份**）
- 现状说明：项目里已有一版半成品，跑测试时第 3 条就崩了（`x(x+1)` 被误判成函数调用）。下面是重写规格，已经把这个坑写进"已知陷阱"。
- 做完立刻验证：项目根目录跑 `node test-math.mjs`

```
你是资深 JavaScript 工程师，擅长写表达式解析器和数值计算。请严格按下面规格实现，不要自由发挥。

【项目环境 / 硬性约束】
- 纯 JavaScript ES Module，不要 TypeScript 语法，不要类型注解
- 禁止使用 eval、new Function、with
- 禁止引入任何第三方包，只能用 Math 和语言内置能力
- 单文件，export 指定的函数，不要 default export
- 不要写 TODO、不要省略实现、不要写"此处略"

【文件路径】src/utils/mathEngine.js

【必须 export 的函数（签名一字不改）】
compile(expr) -> (x) => number
tryCompile(expr) -> { ok: true, fn } | { ok: false, error: '中文错误说明' }
derivative(fn, x) -> number
integrate(fn, a, b, n = 2000) -> number
findRoots(fn, a, b) -> number[]
findExtrema(fn, a, b) -> { x, y, kind: 'min' | 'max' }[]
monotonicIntervals(fn, a, b) -> { from, to, increasing }[]
autoRange(fn, a, b) -> { yMin, yMax }
sampleCurve(fn, a, b, yMin, yMax, n = 600) -> { x, y }[]    // y 为 null 表示断开
prettyPi(v) -> string

【支持的表达式语法】
- 数字：3、3.5、.5、1e-3
- 变量：x（唯一变量，大小写不敏感）
- 常量：pi、π、e
- 运算符：+ - * / ^，另外全角 × 等同 *，÷ 等同 /
- 括号：英文 ( ) 和中文全角（ ）都要支持
- 函数：sin cos tan asin acos atan sinh cosh tanh exp ln lg sqrt abs
  （lg 是 10 为底对数，ln 是自然对数，exp 是 e^x）
- 隐式乘法：2x、2 x、x(x+1)、(x+1)(x-1)、x sin(x)、2π、3(x+2)
- 空白字符全部忽略

【运算符优先级与结合性，必须完全一致】
- 优先级从低到高：加减  <  乘除  <  一元负号  <  幂
- 幂是右结合
必须满足：
  x=3 时  -x^2   = -9        （即 -(x^2)，不是 (-x)^2）
  x=0 时  2^3^2  = 512       （即 2^(3^2)）
  x=3 时  2x^2   = 18

【实现方式】手写词法分析 + 递归下降语法分析，生成闭包求值树。
不要用正则整体替换的方式硬凑。

【各函数算法要求】
- compile：内部用 Map 缓存已编译结果，key 是表达式字符串，最多缓存 50 条，超过就清空
- tryCompile：捕获 compile 抛出的错误，返回 { ok:false, error }，error 是中文
- derivative：中心差分 h = max(1e-5, |x| * 1e-5)，返回 (f(x+h) - f(x-h)) / (2h)
- integrate：复合辛普森法，n 若为奇数则加 1
- findRoots：从 a 到 b 以 0.01 步长扫描，遇到值恰好为 0（|f| < 1e-12）或相邻两点符号变化，就在该小区间二分 60 次；跳过 null/NaN/Infinity；结果按升序去重，相邻距离小于 1e-4 的合并
- findExtrema：以 0.01 步长扫描 derivative，导数由负变正记 'min'，由正变负记 'max'；再在极值点附近用三点比较微调；返回按 x 升序
- monotonicIntervals：用 findExtrema 的切点把 [a,b] 分段，每段取中点算导数符号判断 increasing
- autoRange：采样 400 点，丢掉 null/NaN/Infinity，先按 2% 和 98% 分位截断（防止 tan 这类函数把值域撑爆），再上下各留 10% 余量；若 yMin === yMax 则返回 { yMin: yMin - 1, yMax: yMax + 1 }
- sampleCurve：在 [a,b] 上等距取 n 个点；若结果为 NaN/Infinity/非数，或 |y| 超过 max(|yMin|,|yMax|) 的 20 倍，y 置为 null（表示此处断开，不连线）
- prettyPi：识别 π 的有理倍数（误差 1e-9 内），分母支持 1,2,3,4,6,12，分子整数；整数倍输出 'π'、'2π'、'-3π'；分数输出 'π/2'、'3π/4'、'-π/6'；识别不出时返回保留 4 位小数并去掉尾部 0 的字符串

【错误处理】
compile 抛出的错误必须是中文，形如：
  "表达式为空"
  "第 4 个字符附近有无法识别的符号 '#'"
  "括号不匹配"
  "不认识的函数名 foo"
  "表达式不完整，末尾缺少操作数"

【验收标准 — 我会逐条跑，全部必须通过】
compile('x^2')(3)            === 9
compile('2x')(3)             === 6
compile('x(x+1)')(2)         === 6
compile('x sin(x)')(2)       === 2 * Math.sin(2)
compile('sin(pi/2)')(0)      === 1
compile('-x^2')(3)           === -9
compile('2^3^2')(0)          === 512
compile('e')(0)              === Math.E
compile('ln(e)')(0)          === 1
compile('（x+1）^2')(2)       === 9
compile('2×3')(0)            === 6
compile('1e-3')(0)           === 0.001
compile('(x^2+1)/(x-1)')(3)  === 5
compile('abs(-3)')(0)        === 3
compile('lg(1000)')(0)       === 3
tryCompile('x+').ok          === false
tryCompile('foo(x)').ok      === false
tryCompile('(x+1').ok        === false
derivative(compile('x^2'), 1)                   ≈ 2      （误差 < 1e-4）
derivative(compile('sin(x)'), 0)                ≈ 1      （误差 < 1e-4）
integrate(compile('x^2'), 0, 3)                 ≈ 9      （误差 < 1e-6）
integrate(compile('sin(x)'), 0, Math.PI)        ≈ 2      （误差 < 1e-6）
findRoots(compile('sin(x)'), -10, 10).length    === 7
findExtrema(compile('x^2-4x+3'), -10, 10)       长度 1，x≈2，y≈-1，kind='min'
monotonicIntervals(compile('x^2-4x+3'), -10, 10) 长度 2
autoRange(compile('tan(x)'), -1.5, 1.5).yMax     < 50
sampleCurve(compile('1/x'), -2, 2, -10, 10)     至少有一个点的 y 为 null
prettyPi(Math.PI)        === 'π'
prettyPi(Math.PI / 2)    === 'π/2'
prettyPi(3 * Math.PI / 4) === '3π/4'
prettyPi(2 * Math.PI)    === '2π'

【已知陷阱（上一版就栽在这里，必须避开）】
隐式乘法最容易写错的一点：遇到标识符后面紧跟左括号时，不能一律当成函数调用。
例如 x(x+1)，如果先把 x 当函数名再去查函数表，就会报"未知函数：x"。
正确做法是先判断这个名字是否在函数表里：
  - 在函数表里（sin/cos/ln...）→ 按函数调用解析
  - 不在函数表里（x、pi、e）→ 当作变量或常量返回，把它后面的括号交给隐式乘法处理
同理，x sin(x) 要解析成 x 乘 sin(x)，不要把 "xsin" 当成一个名字。

【输出格式】
只输出一个 js 代码块，包含完整文件内容。
代码块外面不要任何解释文字，不要给多个版本，不要写使用示例。
```

**做完立刻做这两件事：**
1. Trae 终端跑 `node test-math.mjs`，看到 `结果：31 通过 / 0 失败` 才算过
2. `git add . && git commit -m "feat: 数学引擎（表达式解析+数值分析）"`

---

## 4. Prompt ② — 通用绘图器

- 存到：`src/components/plot/PlotCanvas.jsx`
- 依赖：Prompt ① 已经生成好 `src/utils/mathEngine.js`

```
你是资深 React 前端工程师，擅长 Canvas 数据可视化。严格按下面规格写一个通用函数绘图组件。

【项目环境 / 硬性约束】
- React 19 + Vite，函数组件 + Hooks
- 只能用浏览器原生 Canvas 2D API
- 严禁使用 TypeScript、Tailwind、CSS Module、echarts、d3、recharts、framer-motion、katex
- 只能 import 'react' 和下面指定的本地模块
- 所有样式用内联 style 对象
- 不要写 TODO，不要占位，代码必须能直接跑

【文件路径】src/components/plot/PlotCanvas.jsx

【依赖的本地模块】src/utils/mathEngine.js，已存在，提供：
  tryCompile(expr) -> { ok, fn } | { ok, error }
  sampleCurve(fn, a, b, yMin, yMax, n) -> [{ x, y }]   y 为 null 表示断开
  autoRange(fn, a, b) -> { yMin, yMax }
  findRoots(fn, a, b) -> number[]
  findExtrema(fn, a, b) -> [{ x, y, kind }]
用相对路径引入：import { tryCompile, sampleCurve, autoRange, findRoots, findExtrema } from '../../utils/mathEngine'

【组件接口】
export default function PlotCanvas({ spec, height = 380 })

spec 的形状（全部字段都可能缺省）：
{
  expr: 'sin(x)/x',          // 必填，表达式字符串
  domain: [-6, 6],           // x 范围，缺省 [-6, 6]
  range: null,               // y 范围，null 表示用 autoRange 自动算
  fill: false,               // true 表示填充曲线与 x 轴之间的面积
  fillFrom: 0,               // 填充起点（配合 fill），缺省用 domain[0]
  marks: [{ x: 1.57, label: '最高点' }],   // 额外标注点，可缺省
  asymptote: [1.2],          // 竖直渐近线 x 位置，可缺省
  note: '一句话说明这张图在看什么'        // 图下方小字，可缺省
}

【渲染要求】
1. 高清屏适配：canvas.width = 显示宽度 * devicePixelRatio，然后用 ctx.scale 缩放，保证线条不糊
2. 宽度自适应父容器：用 ref + ResizeObserver 监听容器宽度变化并重绘
3. 坐标系：画网格（浅灰 #eef1f4，1px）、x 轴和 y 轴（#c8ced6，1.5px）
4. 刻度：根据 domain 自动选 6~10 个"好看"的刻度值（1/2/5×10^n 系列），标在轴旁边（11px，颜色 #8a94a2）
5. 曲线：#185FA5，线宽 2.2，lineJoin round；遇到 y 为 null 的点要断开（moveTo 重新开始），不能跨越间断点连线
6. 填充面积：曲线与 x 轴之间的区域用 rgba(24,95,165,0.14) 填充；若 fill 为 true 且有 fillFrom，只填 fillFrom 到 domain[1] 的部分
7. 自动特征标注（只在 spec.marks 为空时才自动加，避免打架）：
   - findExtrema 找到的极值点画小圆点（半径 4，极小 #0F6E56，极大 #A32D2D），旁边标 '极小' 或 '极大'
   - findRoots 找到的零点在 x 轴上画小方块（4x4，#993C1D）
   - 最多自动标 4 个点，多了会拥挤就只标值最大的
8. spec.marks 里的点：画实心圆（半径 5，#993C1D），旁边文字显示 label（12px）
9. spec.asymptote：竖直虚线（#bbb，虚线 [4,4]），贯穿画布
10. 悬停读数：鼠标在 canvas 上移动时，画一条竖直虚线跟随鼠标，并在右上角显示 "x = 1.23   y = 0.94"（用 13px 等宽字体）；鼠标离开就清掉
11. 滚轮缩放：以鼠标位置为中心缩放 domain（缩放系数 1.1，最小跨度 0.2，最大跨度 200），缩放后重绘；按住鼠标拖动可以平移 domain
12. 左上角显示当前表达式字符串（13px，#185FA5，格式 "f(x) = sin(x)/x"）
13. 图下方的 note 用 12px、#8a94a2 显示，居中

【状态处理】
- 表达式编译失败：不要抛错，在画布中央显示红色文字 "表达式有误：<error>"，画布背景浅红 #fff5f5
- 没有 expr：显示灰字"暂无图像"
- 所有绘图都在 useEffect 里做，依赖数组要包含所有会影响画面的变量

【性能】
- sampleCurve 采样点数用 600
- ResizeObserver 要在组件卸载时断开（cleanup）
- 重绘时先 clearRect

【输出格式】
只输出一个 jsx 代码块，包含完整文件。不要解释，不要多个版本，不要省略。
```

**验收**：先不急着接页面，等 Prompt ④ 做完一起看效果。

---

## 5. Prompt ③ — 解题服务（调 DeepSeek 拆解题目）

- 存到：`src/services/solver.js`
- 依赖：`.env` 里的 `VITE_DEEPSEEK_API_KEY`（你已配好）

```
你是资深前端工程师，负责封装一个大模型 API 调用，把数学题拆成可视化步骤。严格按规格实现。

【项目环境 / 硬性约束】
- 纯 JavaScript ES Module，不要 TypeScript
- 只有浏览器环境，用原生 fetch，禁止 axios 或任何第三方包
- Vite 环境，API Key 从 import.meta.env.VITE_DEEPSEEK_API_KEY 读取
- 只能 import 相对路径的本地模块：'../utils/mathEngine'
- 不要写 TODO，不要省略

【文件路径】src/services/solver.js

【接口】
export async function solveProblem(problem, options = {}) -> 解题结果对象
失败时 throw new Error('中文错误说明')

【DeepSeek 接口信息】
- URL：https://api.deepseek.com/chat/completions
- 方法 POST
- Header：Content-Type: application/json，Authorization: Bearer <apiKey>
- body：{
    model: 'deepseek-chat',
    messages: [...],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 2600
  }
- 返回结构：data.choices[0].message.content 是一段 JSON 字符串
- 用 AbortController 做 60 秒超时，超时给中文提示

【system prompt 必须逐字使用下面这段】
---
你是一位擅长把抽象过程讲具体的高数老师。学生把一道题发给你，你要把它拆成 3 到 6 个"看得见"的步骤。

必须遵守：
1. 每一步只做一件事，title 不超过 12 个字，用大白话，禁止使用"易得""显然""综上所述"这类词。
2. 每一步的 explain 写 40 到 120 个字，必须回答"为什么这一步要这么做"，不能只是把公式再抄一遍。
3. 每一步都要给一个 visual，说明这一步该画什么图。这一步确实画不出图时，visual 给 null。
4. visual.expr 只能是含变量 x 的算式，能用的只有四则运算、幂 ^、括号、以及 sin cos tan asin acos atan exp ln lg sqrt abs pi e。expr 里禁止出现等号、积分号、求和号、lim、中文、逗号。
5. 画面积的时候（积分、概率密度这类）把 fill 设为 true。
6. 最后一步的 title 固定写"得到答案"，answer 字段给出最终结果，能写成 LaTeX 就写成 LaTeX，例如 "\\pi"、"\\frac{\\pi}{2}"、"2"。
7. 只输出 JSON 对象，不要输出任何解释文字，不要输出 markdown 代码块。

输出 JSON 结构（严格遵守，不要增减字段名）：
{
  "problem": "原题文字",
  "topic": "知识点，例如 定积分 · 分部积分",
  "answer": "最终答案",
  "steps": [
    {
      "title": "先看清它长什么样",
      "explain": "讲解文字",
      "formula": "这一步的式子，LaTeX 片段，可空字符串",
      "visual": {
        "type": "plot",
        "expr": "x*sin(x)",
        "domain": [0, 3.1416],
        "fill": true,
        "marks": [{ "x": 1.5708, "label": "最高点" }],
        "note": "曲线在这一段一直为正，所以面积就是积分值"
      }
    }
  ]
}
---

【user prompt】直接把学生原题放进去，前面加一句"题目："。

【few-shot 示例（必须原样放进 system 消息之后的示例对话里，用 assistant 角色给答案）】
示例题目：求 lim(x→0) sin(x)/x
示例答案：
{"problem":"求 lim(x→0) sin(x)/x","topic":"极限 · 重要极限","answer":"1","steps":[{"title":"先画出来看看","explain":"先别急着算。把 sin(x)/x 在 0 附近画出来，会看到它在 0 处没有定义，但左右两边都朝同一个高度靠过去，这个高度就是极限。","formula":"f(x)=\\frac{\\sin x}{x}","visual":{"type":"plot","expr":"sin(x)/x","domain":[-6,6],"fill":false,"marks":[{"x":0,"label":"这里没有定义"}],"note":"曲线在 x=0 处空了一个点，但两边都趋向 1"}},{"title":"用夹逼定理","explain":"因为对任何非零的 x 都有 cos x ≤ sin x / x ≤ 1，而 cos x 在 0 附近趋向 1，两边一夹，中间只能也趋向 1。","formula":"\\cos x \\le \\frac{\\sin x}{x} \\le 1","visual":{"type":"plot","expr":"cos(x)","domain":[-1.5,1.5],"fill":false,"marks":[{"x":0,"label":"上界和下界都收拢到 1"}],"note":"把 cos(x) 和水平线 y=1 一起看，就是两条'夹板'"}},{"title":"得到答案","explain":"上下两条'夹板'在 x 趋向 0 时都收拢到 1，被夹在中间的 sin(x)/x 没有别的选择，只能也趋向 1。","formula":"\\lim_{x\\to 0}\\frac{\\sin x}{x}=1","visual":null}]}

【实现细节要求】
1. 调用前检查 apiKey 是否存在，没有就 throw new Error('未配置 API Key，请在 .env 里填 VITE_DEEPSEEK_API_KEY')
2. 从返回的 content 里取 JSON：先直接 JSON.parse，失败则用正则从第一个 { 到最后一个 } 截出来再 parse，仍失败就 throw new Error('AI 返回的内容不是合法 JSON')
3. 校验并清洗结果，写一个内部函数 normalizeResult(raw)：
   - 缺 problem/topic/answer/steps 就补空字符串或空数组
   - steps 必须是数组，最多取 6 步，至少 1 步
   - 每步保证有 title（字符串）、explain（字符串）、formula（字符串，缺省 ''）、visual
   - visual 不为 null 时：type 只允许 'plot'，其它一律置 null；expr 用 tryCompile 试编译，编不过就把 visual 置 null（不能因为 AI 给了坏表达式就崩）；domain 必须是两个数字且 from < to，否则用 [-6, 6]；fill 强制转成布尔；marks 必须是数组，每项要有数字 x，label 缺省 ''
   - 返回清洗后的对象
4. 网络错误要区分：TypeError（fetch 失败）→ '网络请求失败，请检查网络或 API Key'；response.status 401 → 'API Key 无效'；429 → '请求太频繁，稍等几秒再试'；其它非 2xx → `请求失败（状态码 ${status}）`
5. 读取 API Key 时用 import.meta.env.VITE_DEEPSEEK_API_KEY，注意 Vite 只有 VITE_ 前缀才会注入
6. 导出常量 EXAMPLE_PROBLEMS = ['∫₀^π x·sin(x) dx', 'lim(x→0) sin(x)/x', '求 f(x)=x³-3x 的极值', '∫₀³ (x²+1) dx']

【输出格式】
只输出一个 js 代码块，包含完整文件。不要解释，不要省略。
```

---

## 6. Prompt ④ — 主界面（产品的脸）

- 存到：`src/components/solver/ProblemSolver.jsx`
- 依赖：Prompt ② 的 `PlotCanvas`、Prompt ③ 的 `solver.js`

```
你是资深 React 前端工程师，做一个"输入数学题 → AI 拆成步骤 → 每步配图"的解题界面。严格按规格实现。

【项目环境 / 硬性约束】
- React 19 + Vite，函数组件 + Hooks，纯 JavaScript，不要 TypeScript
- 只允许 import 'react'、'katex'、'katex/dist/katex.min.css' 和下面指定的本地模块
- 严禁 Tailwind、CSS Module、echarts、framer-motion、react-katex
- 样式全部内联 style 对象，不要新建 CSS 文件
- 不要写 TODO，不要省略，代码必须能直接跑

【文件路径】src/components/solver/ProblemSolver.jsx

【依赖的本地模块】
import PlotCanvas from '../plot/PlotCanvas'
import { solveProblem, EXAMPLE_PROBLEMS } from '../../services/solver'

【布局（宽屏左右分栏，窄屏上下堆叠）】
外层 div：display flex，gap 24，alignItems flex-start，宽度 100%
- 左栏：宽 400，flex '0 0 400'，放步骤卡列表
- 右栏：flex 1，放图（minWidth 0 防止溢出）
窄屏（用 window.innerWidth < 900 判断，监听 resize）改成 flexDirection column，左栏宽度改 '100%'

【顶部区域】
- 标题 h2："输入一道题，看它被拆开"
- 副标题 p（13px，#8a94a2）："AI 把解题过程拆成几步，每一步配一张能拖能查的图"
- 输入区：textarea（3 行高，宽度 100%，padding 12，圆角 8，边框 1px #d9dee5，字号 15）
  占位文字："粘贴或输入一道高数题，例如 ∫₀^π x·sin(x) dx"
  Ctrl+Enter 或 Cmd+Enter 触发提交
- 按钮行：
  - 主按钮"拆解这道题"（背景 #185FA5，白字，圆角 8，padding 10 22，disabled 时变灰 #c8ced6）
  - 次按钮"换个例子"（描边按钮），点击从 EXAMPLE_PROBLEMS 随机填一个
- 示例标签行：EXAMPLE_PROBLEMS 每一项做一个小 chip（12px，浅蓝底 #eef4fb，圆角 14，padding 4 10，cursor pointer），点击填入输入框并立即提交

【状态机】
idle：还没提交，右栏显示空状态
loading：已提交请求中，按钮显示"AI 正在拆题…"并禁用，右栏显示骨架屏
done：成功，显示步骤和图
error：失败，右栏显示红色错误卡 + "重试"按钮

【左栏步骤卡列表（核心）】
- 每个步骤一张卡：白底，圆角 10，边框 1px #e8eaed，padding 14 16，marginBottom 12
- 卡片内容：序号圆点（24px 圆，#185FA5 底白字，当前步高亮）+ title（15px，#0C447C，600）+ explain（13px，#4a5568，行高 1.7）
- 有 formula 时，在 explain 下面用 KaTeX 渲染成块级公式（居中，margin 10 0）
  用法：import katex from 'katex'
  const html = katex.renderToString(formula, { throwOnError: false, displayMode: true })
  然后 <div dangerouslySetInnerHTML={{ __html: html }} />
  注意：renderToString 必须包 try/catch，出错就退化成纯文本显示
- 当前选中的卡：边框变 #185FA5，左侧加 3px 蓝色竖条，背景 #f7fafd
- 点击任意卡切换当前步
- 有 visual 的步骤，卡片右上角显示一个小标签"有图"（10px，#185FA5）
- 步骤淡入动画：每张卡用 CSS transition + 根据 index 给 animationDelay（0.06s * index），初始 opacity 0 + translateY(8px) → 显示后 opacity 1 + translateY(0)。用 useEffect + setTimeout 触发，不要用第三方动画库

【右栏图像区】
- 显示当前步的 visual：<PlotCanvas spec={currentStep.visual} height={400} />
- 当前步 visual 为 null 时，显示占位卡："这一步是一步推理，没有图像"，灰字居中，高度 400，浅灰底 #fafbfc
- 图像下方显示"第 N / 共 M 步"和左右切换按钮（"上一步""下一步"），到边界时按钮禁用
- 键盘左右方向键可以切换步骤（useEffect 里监听 keydown，卸载时移除监听）

【顶部结果卡（done 状态时显示在标题下方）】
- 一行显示 topic（蓝色小标签）+ problem（14px，#333）
- 右侧显示"答案"：用 KaTeX 行内渲染 answer（displayMode: false），字号 18，颜色 #0F6E56，前面加"答案 "

【loading 骨架屏】
- 右栏：一个 400 高的容器，里面 3 条灰色圆角矩形条，用 CSS animation 做呼吸（opacity 0.4 ↔ 1，1.2s 循环），配文"AI 正在拆题…"
- 左栏：3 张高度 90 的灰色骨架卡

【error 状态】
- 右栏居中显示：❌ 图标位（用文字"出错了"）、错误信息（13px，#A32D2D）、"重试"按钮
- 错误信息来自 catch 到的 error.message

【代码组织】
- 一个 default 导出的 ProblemSolver
- 内部再定义 3 个小函数组件：StepCard、Skeleton、EmptyHint
- 状态用 useState：problem（输入框内容）、result、currentIndex、status、errorMsg
- 不要用 zustand 或任何全局状态，全部组件内自管

【输出格式】
只输出一个 jsx 代码块，包含完整文件。不要解释，不要多个版本，不要省略。
```

---

## 7. Prompt ⑤ — 双 Tab 接线（改 App.jsx）

```
你是资深 React 前端工程师。我需要改造一个已有的 App.jsx，加两个 Tab。请输出改造后的完整文件。

【现有 src/App.jsx 的完整内容】
import EpsilonDelta from './components/visualizer/EpsilonDelta'
import TangentApproach from './components/visualizer/TangentApproach'
import './App.css'

const sections = [
  {
    key: 'limit',
    chapter: '第 1 章 极限',
    title: '① 极限的 ε-δ 定义',
    desc: '拖动 ε 滑块，观察 δ 如何随之收缩',
    Comp: EpsilonDelta,
  },
  {
    key: 'tangent',
    chapter: '第 2 章 导数',
    title: '② 导数的几何意义',
    desc: '让 Δx 趋近 0，看割线转动成切线',
    Comp: TangentApproach,
  },
]

function App() {
  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 24px 64px' }}>
      <header style={{ marginBottom: 8 }}>
        <h1 style={{ color: '#0C447C', fontSize: 28, fontWeight: 600, letterSpacing: 0.2 }}>
          MathLens · 高数可视化工坊
        </h1>
        <p style={{ color: '#666', fontSize: 14, marginTop: 6 }}>
          高数最难懂的概念，变成可以拖着玩的动态画面。
        </p>
      </header>
      {sections.map(({ key, chapter, title, desc, Comp }, i) => (
        <section key={key} style={{ marginTop: i === 0 ? 32 : 48, paddingTop: 28, borderTop: '1px solid #e8eaed' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
            <h2 style={{ color: '#0C447C', fontSize: 19, fontWeight: 600 }}>{title}</h2>
            <span style={{ color: '#9aa4b2', fontSize: 12 }}>{chapter}</span>
          </div>
          <p style={{ color: '#8a94a2', fontSize: 13, marginBottom: 16 }}>{desc}</p>
          <Comp />
        </section>
      ))}
    </div>
  )
}

export default App

【改造要求】
1. 顶部 header 保留，标题改成 "MathLens · AI 高数解题可视化器"，副标题改成 "输入一道题，AI 把它拆成每一步都能看懂的图"
2. header 下方加一行 Tab 切换，两个 Tab：
   - "解题" → 渲染 <ProblemSolver />
   - "概念工坊" → 渲染原来那套 sections 列表
3. Tab 样式：文字按钮，选中态底部 2px #185FA5 实线 + 文字 #0C447C + 字号 15 加粗；未选中 #8a94a2，字号 15；间隔 28px；整行底部 1px #e8eaed 分隔；padding-bottom 10
4. 默认选中"解题"
5. 外层容器：解题模式 maxWidth 1180，概念工坊模式 maxWidth 780（因为要左右分栏，需要更宽）
6. import ProblemSolver from './components/solver/ProblemSolver'
7. 不加任何第三方依赖，不加路由，纯 useState 切换

【输出格式】
只输出一个 jsx 代码块，包含完整文件（不要只给改动片段），不要解释。
```

---

## 8. 验收流程（每做完一步对照看）

| 阶段 | 你要看到的现象 | 不对怎么办 |
|---|---|---|
| P1 完成 | 终端 `结果：31 通过 / 0 失败` | 把 FAIL 那几行原文发给 DeepSeek，说"这几条没过，只重写对应函数" |
| P2 完成 | 暂时看不到效果（还没接页面） | — |
| P3 完成 | 暂时看不到效果 | — |
| P4 完成 | 页面有输入框，但点了可能报错 | 看浏览器 F12 控制台红色报错，复制给 DeepSeek |
| P5 完成 | **输入 `∫₀^π x·sin(x) dx` → 出 4 张步骤卡 → 点第 2 张，右边图变化** | 见下 |

**里程碑判断标准**：当你能在输入框输入 `∫₀^π x·sin(x) dx`，按下"拆解这道题"，看到左边滑出 4 张步骤卡、右边画出一条 `x*sin(x)` 的曲线、点不同卡片图会变 —— **这个作品就从"教具"变成了"产品"**。这一步是 10/31 前必须达到的。

---

## 9. 时间表（今天 10/24 → 10/31）

| 日期 | 任务 | 产出 |
|---|---|---|
| 10/24 今晚 | P1 + P2 | 引擎测试全绿；绘图器代码就位 |
| 10/25 | P3 + P4 + P5 | 主流程跑通，能输入题目出步骤 |
| 10/26 | 调提示词质量 + 打磨 UI + 补第 3 个积木（黎曼和，可选） | 演示效果稳定 |
| 10/27 | 录演示视频（5-8 分钟，含 ≥2 分钟 AI 协同复现） | 视频文件 |
| 10/28 | 写技术文档 PDF（≤30 页） | 文档 |
| 10/29 | 补 README、prompt-log、代码整理、最后一次 push | 仓库完整 |
| 10/30 | 缓冲日（补漏、重录不满意片段） | — |
| 10/31 | 提交预指导作品 | 交上去 |

---

## 10. 演示视频剧本（10/27 照着录，60 秒的记忆点）

| 时间 | 画面 | 你要说的话 |
|---|---|---|
| 0:00-0:15 | 镜头：提问 AI 得一大段文字 / 教材上的静态图 | "每次问 AI，它给我一屏公式；老师讲一遍就过去了。" |
| 0:15-0:30 | 打开 MathLens，输入 `∫₀^π x·sin(x) dx`，回车 | "我想知道这题到底在干什么。" |
| 0:30-0:50 | 4 张步骤卡滑出，点第 2 张，右边图变成 x·sin(x) 曲线 | "第一步不是算，是先看它长什么样。" |
| 0:50-1:10 | 鼠标悬停读数、滚轮放大、点第 3 张看图变化 | "每一步都有对应的图，卡在哪一步就看哪一步。" |
| 1:10-1:30 | 最后一张显示答案 π | "答案不是它给的，是我看懂的。" |
| 1:30-2:00 | 切到概念工坊，拖 ε 滑块、Δx 滑块 | "背后是有数值引擎的，不是画好的图片。" |

**然后录 ≥2 分钟的 AI 协同复现**：打开 DeepSeek 对话历史，展示 Prompt → 生成 → 你发现问题 → 你改 Prompt → 代码变好 的完整过程。这一段是"可复现性 25%"的直接得分点，**千万别省**。

---

## 11. 三条不能破的纪律

1. **每生成一个文件就 commit 一次**（`git add . && git commit -m "feat: xxx"`），一天至少 4 次。评委翻 Git 历史判断"是不是一次性堆出来的"。
2. **每次 DeepSeek 对话都点分享、存链接**到 `docs/prompt-log.md`。这是"你的 Prompt 链"的原始证据。
3. **不要在 10/31 前动"多 Agent 并行"、"流式 JSON"、"AI 现场生成代码"这三件事**。它们是第二阶段的事。第一阶段唯一的任务是：**主流程跑通、能演、能讲**。

---

## 12. prompt-log 记录模板（每做完一个 Prompt 填一格）

```markdown
### 迭代 N：<文件名>

**我的 Prompt（摘要）**：<一句话说清我要什么>

**DeepSeek 生成的初版问题**：
- <比如：expr 里出现了 "∫" 符号，导致编译失败>
- <比如：忘记处理 domain 缺省，画面一片空白>

**我怎么改的 Prompt / 怎么让它修的**：
<把追加的那句话原样贴上来>

**AI 修改后结果**：<一句话>

**对话分享链接**：<DeepSeek 分享链接>

**我的判断依据**：<为什么我认为这样是对的，比如"我验证了 Δx=0.01 时斜率显示 2.010，与解析解 2+Δx 一致">
```
