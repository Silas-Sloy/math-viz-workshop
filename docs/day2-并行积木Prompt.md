# Day 2 并行积木 Prompt（10/25 用）

> 用 Trae 开 3 个 AI 对话标签页并行做积木②③④。3 个积木相互独立，各自生成各自存，互不干扰。
> **红线**：每个对话结束后，把 Prompt + AI 生成的代码 + 你让它改了什么，复制到 `docs/prompt-log.md` 的"迭代N"下面——这是可复现性 25% 的命根子。

---

## 一、Trae 怎么开多个 AI 对话

1. Trae 右侧 AI 面板（图标是聊天气泡，快捷键 `Ctrl+U` 呼出）
2. 面板顶部点 **`+`** 新建对话，建 3 个
3. 双击对话名重命名：`积木②导数` / `积木③黎曼` / `积木④泰勒`
4. 每个对话独立上下文，互不干扰——这就是"并行"

---

## 二、3 个积木的 Prompt（各自粘贴进对应对话）

### 🟦 积木② 导数切线逼近（粘进"积木②导数"对话）

```
帮我写一个 React 组件 TangentApproach.jsx，放在 src/components/visualizer/ 目录下。
功能：演示导数 = 切线逼近。
1. 用 Canvas 画函数 f(x)=x² 的曲线，x 范围 [0, 2]
2. 曲线上有一个定点 A（x=1, y=1）和一个动点 B（x=1+Δx, y=f(1+Δx)）
3. 一个滑块控制 Δx，范围 0.01 到 1，步长 0.01
4. 画 A、B 两点之间的割线（红色实线）
5. 当 Δx 很小时，割线逼近切线。同时画出 x=1 处的真实切线（斜率=2，绿色虚线）
6. 右上角用 KaTeX 实时显示：割线斜率 = (f(1+Δx)-1)/Δx，并标注"Δx 越小越接近 2"
7. 组件内部用 useState 自管 Δx 状态（不依赖外部 store，保持独立）
8. 样式参考 src/components/visualizer/EpsilonDelta.jsx 的写法，配色用红色割线 + 绿色切线
给我完整可运行的代码。
```

### 🟩 积木③ 定积分黎曼和（粘进"积木③黎曼"对话）

```
帮我写一个 React 组件 RiemannSum.jsx，放在 src/components/visualizer/ 目录下。
功能：演示定积分 = 黎曼和的极限。
1. 用 Canvas 画函数 f(x)=x²+1 在区间 [0, 3] 上的曲线（蓝色）
2. 将区间等分成 n 个矩形，矩形高度取左端点函数值（左黎曼和）
3. 一个滑块控制 n，范围 4 到 200，步长 1
4. 用半透明蓝色填充这些矩形（fill rgba(59,130,246,0.3)）
5. 右上角实时显示：矩形和面积 = Σf(x_i)·Δx，并标注真实积分值=12（∫(x²+1)dx从0到3=[x³/3+x]₀³=9+3=12）
6. 当 n 很大时矩形密密麻麻铺满曲线下面积，视觉冲击要强
7. 组件内部用 useState 自管 n 状态（不依赖外部 store，保持独立）
8. 样式参考 src/components/visualizer/EpsilonDelta.jsx 的写法，浅蓝主题
给我完整可运行的代码。
```

### 🟪 积木④ 泰勒展开（粘进"积木④泰勒"对话）

```
帮我写一个 React 组件 TaylorSeries.jsx，放在 src/components/visualizer/ 目录下。
功能：演示泰勒展开 = 多项式逼近原函数。
1. 用 Canvas 画原函数 f(x)=sin(x) 在区间 [-π, π] 上的曲线（蓝色）
2. 用泰勒展开在 x=0 处逼近：阶数 n 从 1 到 13（只取奇数，因为 sin 是奇函数）
3. 一个滑块控制阶数 n，范围 1 到 13，步长 2
4. 泰勒多项式公式：P_n(x) = x - x³/3! + x⁵/5! - x⁷/7! + ... ± xⁿ/n!
5. 阶数越多，红色多项式曲线越贴合蓝色原函数曲线
6. 右上角实时显示：当前阶数 n，以及多项式表达式
7. 组件内部用 useState 自管 n 状态（不依赖外部 store，保持独立）
8. 样式参考 src/components/visualizer/EpsilonDelta.jsx 的写法，蓝色原函数 + 红色泰勒多项式
给我完整可运行的代码。
```

---

## 三、代码存到哪个文件

| 积木 | 文件路径 |
|---|---|
| ② 导数切线 | `src/components/visualizer/TangentApproach.jsx` |
| ③ 黎曼和 | `src/components/visualizer/RiemannSum.jsx` |
| ④ 泰勒展开 | `src/components/visualizer/TaylorSeries.jsx` |

AI 生成代码后，在 Trae 文件树对应路径新建文件，粘贴代码保存。

---

## 四、改 App.jsx 引入 3 个新积木

打开 `src/App.jsx`，把 import 区和渲染区改成：

```jsx
import EpsilonDelta from './components/visualizer/EpsilonDelta'
import TangentApproach from './components/visualizer/TangentApproach'
import RiemannSum from './components/visualizer/RiemannSum'
import TaylorSeries from './components/visualizer/TaylorSeries'

function App() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <h1>MathLens · 高数可视化工坊</h1>
      <EpsilonDelta />
      <TangentApproach />
      <RiemannSum />
      <TaylorSeries />
    </div>
  )
}

export default App
```

保存后浏览器自动刷新，4 个积木依次排列，各自能拖滑块看动画。

---

## 五、commit 节奏（每个积木做完一个 commit）

在 Trae 终端依次跑（每做完一个就提交，别攒着）：

```bash
# 积木②做完
git add . && git commit -m "feat: 完成导数切线逼近积木"

# 积木③做完
git add . && git commit -m "feat: 完成定积分黎曼和积木"

# 积木④做完
git add . && git commit -m "feat: 完成泰勒展开积木"

# App.jsx 引入3个积木
git add . && git commit -m "feat: App引入4个可视化积木"
```

---

## 六、prompt-log 留痕（可复现性 25% 命根子）

每个积木对话结束后，打开 `docs/prompt-log.md`，在对应"迭代N"下粘贴：

```markdown
## 迭代2：2026-10-25 导数切线逼近
### 我的 Prompt
> （把上面那段 Prompt 原文粘贴）
### AI 关键修改
> （摘录 AI 生成的核心代码段，比如割线斜率计算、滑块联动）
### 我的引导/纠偏
> （你让它改了什么——比如"让割线颜色更红一点""Δx 步长改成 0.01"——评委就看这个体现意图控制）
```

积木③④同理，迭代3、迭代4。

**这步不做 = 可复现性 25% 直接丢一半，千万别省。**

---

## 七、做完后的检查清单

- [ ] 浏览器刷新 localhost:5173，4 个积木都能拖滑块看动画
- [ ] 数学验证：
  - 积木②：Δx 拖到 0.01，割线斜率应接近 2（导数真值）
  - 积木③：n 拖到 200，矩形和面积应接近 12（积分真值）
  - 积木④：n 拖到 13，红色多项式应几乎贴合蓝色 sin 曲线
- [ ] git log 看到 4 个新 commit（feat: 完成...）
- [ ] prompt-log.md 有迭代2/3/4 三段记录

全勾完，Day 2 就成了。Day 3（10/27）开始搭 B 主流程骨架。
