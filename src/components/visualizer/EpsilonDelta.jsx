import { useRef, useEffect } from 'react'
import useMathStore from '../../stores/useMathStore'

export default function EpsilonDelta() {
  const canvasRef = useRef(null)
  const { epsilon, delta, x0, limitValue } = useMathStore((s) => s.limitState)
  const setLimitState = useMathStore((s) => s.setLimitState)

  const W = 600, H = 400
  const pad = 50
  const xMin = 0, xMax = 2, yMin = -0.5, yMax = 3
  const xToPx = (x) => pad + ((x - xMin) / (xMax - xMin)) * (W - 2 * pad)
  const yToPx = (y) => H - pad - ((y - yMin) / (yMax - yMin)) * (H - 2 * pad)

  const f = (x) => x * x

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)

    ctx.strokeStyle = '#aaa'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pad, yToPx(0))
    ctx.lineTo(W - pad, yToPx(0))
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(xToPx(0), pad)
    ctx.lineTo(xToPx(0), H - pad)
    ctx.stroke()

    ctx.fillStyle = 'rgba(51, 138, 221, 0.18)'
    const bandTop = yToPx(limitValue + epsilon)
    const bandBottom = yToPx(limitValue - epsilon)
    ctx.fillRect(xToPx(xMin), bandTop, xToPx(xMax) - xToPx(xMin), bandBottom - bandTop)

    ctx.fillStyle = 'rgba(29, 158, 117, 0.12)'
    ctx.fillRect(
      xToPx(x0 - delta),
      pad,
      xToPx(x0 + delta) - xToPx(x0 - delta),
      H - 2 * pad
    )

    ctx.strokeStyle = '#185FA5'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    for (let i = 0; i <= 200; i++) {
      const x = xMin + ((xMax - xMin) * i) / 200
      const px = xToPx(x)
      const py = yToPx(f(x))
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()

    ctx.strokeStyle = '#0F6E56'
    ctx.lineWidth = 1.5
    ctx.setLineDash([5, 4])
    ;[x0 - delta, x0 + delta].forEach((x) => {
      ctx.beginPath()
      ctx.moveTo(xToPx(x), pad)
      ctx.lineTo(xToPx(x), H - pad)
      ctx.stroke()
    })
    ctx.setLineDash([])

    ctx.fillStyle = '#993C1D'
    ctx.beginPath()
    ctx.arc(xToPx(x0), yToPx(limitValue), 5, 0, 2 * Math.PI)
    ctx.fill()

    ctx.fillStyle = '#333'
    ctx.font = '13px system-ui'
    ctx.fillText('f(x) = x²', W - pad - 60, pad + 15)
    ctx.fillText(`x₀ = ${x0}, L = ${limitValue}`, pad + 5, pad + 15)
    ctx.fillStyle = '#185FA5'
    ctx.fillText(`ε = ${epsilon.toFixed(2)}`, xToPx(x0) + 8, bandTop - 5)
    ctx.fillStyle = '#0F6E56'
    ctx.fillText(`δ = ${delta.toFixed(3)}`, xToPx(x0 + delta) + 5, H - pad - 8)
  }, [epsilon, delta, x0, limitValue])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8 }}
      />
      <div style={{ width: W, display: 'flex', alignItems: 'center', gap: 12 }}>
        <label style={{ fontFamily: 'system-ui', color: '#333' }}>ε =</label>
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.01}
          value={epsilon}
          onChange={(e) => {
            const eps = parseFloat(e.target.value)
            const d = Math.min(eps / 3, 1)
            setLimitState({ epsilon: eps, delta: d })
          }}
          style={{ flex: 1 }}
        />
        <span style={{ fontFamily: 'monospace', width: 50, color: '#0C447C' }}>
          {epsilon.toFixed(2)}
        </span>
      </div>
      <p style={{ fontFamily: 'system-ui', color: '#666', fontSize: 13, width: W, lineHeight: 1.6 }}>
        数学关系：当 |x−x₀|&lt;δ 时 |f(x)−L|&lt;ε。这里 δ = ε/3
        （因为 |x²−1| = |x−1|·|x+1|，当 |x−1|&lt;δ≤1 时 |x+1|&lt;3，所以 |x²−1|&lt;3δ）。
        拖动 ε 滑块，看蓝色横带和绿色 δ 区间如何同步收缩。
      </p>
    </div>
  )
}
