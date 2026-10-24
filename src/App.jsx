import EpsilonDelta from './components/visualizer/EpsilonDelta'
import TangentApproach from './components/visualizer/TangentApproach'
import PlotCanvas from './components/plot/PlotCanvas'
import './App.css'

// 引擎自检用的临时预览：证明"任意表达式都能画"，P4 主界面接入后会被替换
const PREVIEW_SPEC = {
  expr: 'x*sin(x)',
  domain: [-6, 6],
  fill: true,
  note: '拖动可平移，滚轮可缩放，鼠标悬停看坐标——半径能看到"极大/极小"和零点已被自动标出',
}

function PlotPreview() {
  return <PlotCanvas spec={PREVIEW_SPEC} height={380} />
}

// 模块清单：后续新增积木只需往这里加一行，布局自动生效
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
  {
    key: 'plot',
    chapter: '引擎自检',
    title: '③ 任意函数绘图',
    desc: '输入任意表达式就能画，自动标注极值点与零点',
    Comp: PlotPreview,
  },
]

function App() {
  return (
    <div
      style={{
        maxWidth: 780,
        margin: '0 auto',
        padding: '32px 24px 64px',
      }}
    >
      <header style={{ marginBottom: 8 }}>
        <h1 style={{ color: '#0C447C', fontSize: 28, fontWeight: 600, letterSpacing: 0.2 }}>
          MathLens · 高数可视化工坊
        </h1>
        <p style={{ color: '#666', fontSize: 14, marginTop: 6 }}>
          高数最难懂的概念，变成可以拖着玩的动态画面。
        </p>
      </header>

      {sections.map(({ key, chapter, title, desc, Comp }, i) => (
        <section
          key={key}
          style={{
            marginTop: i === 0 ? 32 : 48,
            paddingTop: 28,
            borderTop: '1px solid #e8eaed',
          }}
        >
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
