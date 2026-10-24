import { useRef, useEffect, useState } from 'react'

export default function TangentApproach() {
  const canvasRef = useRef(null)
  const [deltaX, setDeltaX] = useState(1)

  const W = 600
  const H = 400
  const pad = 50
  const xMin = 0, xMax = 2, yMin = 0, yMax = 4
  const xToPx = (x) => pad + ((x - xMin) / (xMax - xMin)) * (W - 2 * pad)
  const yToPx = (y) => H - pad - ((y - yMin) / (yMax - yMin)) * (H - 2 * pad)

  const aX = 1
  const aY = 1
  const bX = 1 + deltaX
  const bY = (1 + deltaX) * (1 + deltaX)
  const k = 2 + deltaX

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    ctx.clearRect(0, 0, W, H)

    // 坐标轴（灰色 1px）
    ctx.strokeStyle = '#999'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(xToPx(xMin), yToPx(yMin))
    ctx.lineTo(xToPx(xMax), yToPx(yMin))
    ctx.moveTo(xToPx(xMin), yToPx(yMin))
    ctx.lineTo(xToPx(xMin), yToPx(yMax))
    ctx.stroke()

    // 曲线 f(x) = x²（200 段折线）
    ctx.strokeStyle = '#185FA5'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    const SEG = 200
    for (let i = 0; i <= SEG; i++) {
      const x = xMin + ((xMax - xMin) * i) / SEG
      const y = x * x
      const px = xToPx(x)
      const py = yToPx(Math.min(y, yMax))
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()

    // 红色割线 A-B，两端各延长 0.15 个 x 单位
    const slope = (bY - aY) / (bX - aX)
    const ext = 0.15
    const x1 = aX - ext
    const x2 = bX + ext
    const y1 = aY + slope * (x1 - aX)
    const y2 = aY + slope * (x2 - aX)
    ctx.strokeStyle = '#C0392B'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(xToPx(x1), yToPx(y1))
    ctx.lineTo(xToPx(x2), yToPx(y2))
    ctx.stroke()

    // 绿色虚线：x=1 处真实切线，斜率 2，贯穿整个画布宽度
    ctx.save()
    ctx.setLineDash([5, 4])
    ctx.strokeStyle = '#0F6E56'
    ctx.lineWidth = 2
    ctx.beginPath()
    const tx1 = xMin - 1
    const ty1 = aY + 2 * (tx1 - aX)
    const tx2 = xMax + 1
    const ty2 = aY + 2 * (tx2 - aX)
    ctx.moveTo(xToPx(tx1), yToPx(ty1))
    ctx.lineTo(xToPx(tx2), yToPx(ty2))
    ctx.stroke()
    ctx.restore()

    // A 点
    ctx.fillStyle = '#993C1D'
    ctx.beginPath()
    ctx.arc(xToPx(aX), yToPx(aY), 5, 0, Math.PI * 2)
    ctx.fill()

    // B 点
    ctx.fillStyle = '#C0392B'
    ctx.beginPath()
    ctx.arc(xToPx(bX), yToPx(bY), 5, 0, Math.PI * 2)
    ctx.fill()

    // 文字标注
    ctx.font = '13px system-ui'
    ctx.fillStyle = '#185FA5'
    ctx.fillText('f(x) = x²', xToPx(1.45), yToPx(1.55))

    ctx.fillStyle = '#993C1D'
    ctx.fillText('A(1, 1)', xToPx(aX) - 62, yToPx(aY) + 4)

    ctx.fillStyle = '#C0392B'
    ctx.fillText('B', xToPx(bX) + 10, yToPx(bY) - 8)

    // 左上角实时数值
    ctx.fillStyle = '#333'
    ctx.fillText('割线斜率 k = ' + k.toFixed(3), 12, 22)
    ctx.fillText('切线斜率 = 2.000', 12, 42)

    // 右上角 Δx
    ctx.fillText('Δx = ' + deltaX.toFixed(2), W - 92, 22)
  }, [deltaX])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8 }}
      />
      <input
        type="range"
        min={0.01}
        max={1}
        step={0.01}
        value={deltaX}
        onChange={(e) => setDeltaX(parseFloat(e.target.value))}
        style={{ width: W }}
      />
      <div style={{ width: W, fontSize: 13, color: '#333' }}>Δx = {deltaX.toFixed(2)}</div>
      <div style={{ width: W, fontSize: 13, color: '#666' }}>
        割线斜率 k = 2 + Δx。拖动滑块让 Δx 趋近 0，看红色割线如何转动并最终与绿色切线重合——这就是导数的几何意义。
      </div>
    </div>
  )
}
