import { useState } from 'react'
import EpsilonDelta from './components/visualizer/EpsilonDelta'
import TangentApproach from './components/visualizer/TangentApproach'
import PlotCanvas from './components/plot/PlotCanvas'
import ProblemSolver from './components/solver/ProblemSolver'
import './App.css'

const PREVIEW_SPEC = {
  expr: 'x*sin(x)',
  domain: [-6, 6],
  fill: true,
  note: '拖动可平移，滚轮可缩放，鼠标悬停看坐标——半径能看到"极大/极小"和零点已被自动标出',
}

function PlotPreview() {
  return <PlotCanvas spec={PREVIEW_SPEC} height={380} />
}

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

const TABS = [
  { key: 'solver', label: '解题' },
  { key: 'workshop', label: '概念工坊' },
]

function ConceptWorkshop() {
  return (
    <div>
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

function App() {
  const [tab, setTab] = useState('solver')
  const isSolver = tab === 'solver'

  return (
    <div
      style={{
        maxWidth: isSolver ? 1180 : 780,
        margin: '0 auto',
        padding: '32px 24px 64px',
      }}
    >
      <header style={{ marginBottom: 8 }}>
        <h1 style={{ color: '#0C447C', fontSize: 28, fontWeight: 600, letterSpacing: 0.2 }}>
          MathLens · AI 高数解题可视化器
        </h1>
        <p style={{ color: '#666', fontSize: 14, marginTop: 6 }}>
          输入一道题，AI 把它拆成每一步都能看懂的图
        </p>
      </header>

      <nav
        role="tablist"
        aria-label="模式切换"
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 28,
          marginTop: 24,
          paddingBottom: 10,
          borderBottom: '1px solid #e8eaed',
        }}
      >
        {TABS.map(({ key, label }) => {
          const active = tab === key
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(key)}
              style={{
                marginBottom: -10,
                padding: 0,
                border: 'none',
                borderBottom: `2px solid ${active ? '#185FA5' : 'transparent'}`,
                background: 'none',
                color: active ? '#0C447C' : '#8a94a2',
                fontSize: 15,
                fontWeight: active ? 700 : 400,
                lineHeight: 1.4,
                fontFamily: 'inherit',
                cursor: 'pointer',
                transition: 'color .15s ease',
              }}
            >
              {label}
            </button>
          )
        })}
      </nav>

      {isSolver ? <ProblemSolver /> : <ConceptWorkshop />}
    </div>
  )
}

export default App
