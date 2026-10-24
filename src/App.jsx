import EpsilonDelta from './components/visualizer/EpsilonDelta'
import TangentApproach from './components/visualizer/TangentApproach'
import './App.css'

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
