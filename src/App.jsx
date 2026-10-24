import EpsilonDelta from './components/visualizer/EpsilonDelta'
import './App.css'

function App() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ color: '#0C447C', marginBottom: 8 }}>极限工坊 · ε-δ 定义可视化</h1>
      <p style={{ color: '#666', marginTop: 0, fontSize: 14 }}>
        拖动 ε 滑块，观察 δ 如何收缩——ε-δ 定义从抽象符号变成可见的画面。
      </p>
      <EpsilonDelta />
    </div>
  )
}

export default App
