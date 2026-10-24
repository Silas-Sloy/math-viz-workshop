import { useEffect, useMemo, useRef, useState } from 'react'
import { tryCompile, sampleCurve, autoRange, findRoots, findExtrema } from '../../utils/mathEngine'

const DEFAULT_DOMAIN = [-6, 6]
const DEFAULT_HEIGHT = 380
const SAMPLE_COUNT = 600
const MIN_SPAN = 0.2
const MAX_SPAN = 200
const ZOOM = 1.1
const EMPTY = []
const SANS = '"Segoe UI", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
const MONO = '"SFMono-Regular", Consolas, "Liberation Mono", monospace'

const C = {
  bg: '#ffffff',
  errorBg: '#fff5f5',
  grid: '#eef1f4',
  axis: '#c8ced6',
  tick: '#8a94a2',
  curve: '#185FA5',
  fill: 'rgba(24,95,165,0.14)',
  root: '#993C1D',
  min: '#0F6E56',
  max: '#A32D2D',
  asymptote: '#bbb',
  error: '#c0392b',
  empty: '#8a94a2',
  hover: 'rgba(122,133,148,0.78)',
  hoverText: '#475569',
}

function isNum(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function readPair(value) {
  if (!Array.isArray(value) || value.length < 2) return null
  let a = Number(value[0])
  let b = Number(value[1])
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  if (a === b) {
    a -= 1
    b += 1
  }
  return a < b ? [a, b] : [b, a]
}

function normalizeDomain(value) {
  return readPair(value) || [DEFAULT_DOMAIN[0], DEFAULT_DOMAIN[1]]
}

function niceTicks(min, max) {
  const span = max - min
  if (!(span > 0)) return { values: [min], step: 1 }

  const base = 10 ** Math.floor(Math.log10(span / 8))
  let best = null

  for (const factor of [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50]) {
    const step = factor * base
    if (!(step > 0) || !Number.isFinite(step)) continue

    const epsilon = step * 1e-9
    const first = Math.ceil((min - epsilon) / step)
    const last = Math.floor((max + epsilon) / step)
    const values = []

    for (let i = first; i <= last && values.length < 200; i += 1) {
      let value = i * step
      if (Math.abs(value) < epsilon) value = 0
      value = Number(value.toPrecision(12))
      if (value >= min - epsilon && value <= max + epsilon) values.push(value)
    }

    if (values.length === 0) continue

    let displayed = values
    if (values.length > 10) {
      const keep = values.length % 2 === 0 ? 10 : 9
      const start = Math.floor((values.length - keep) / 2)
      displayed = values.slice(start, start + keep)
    }

    const good = displayed.length >= 6 && displayed.length <= 10
    const score =
      (good ? 0 : 100) +
      Math.abs(displayed.length - 8) +
      (values.length - displayed.length) * 0.75

    if (!best || score < best.score) {
      best = { values: displayed, step, score }
    }
  }

  return best || { values: [min, max], step: span }
}

function formatTick(value, step) {
  if (!isNum(value)) return ''
  const abs = Math.abs(value)
  if (abs < Math.max(step * 1e-7, 1e-12)) return '0'
  if (abs >= 1e6 || abs < 1e-4) return value.toExponential(1).replace('e+', 'e')

  const decimals = clamp(-Math.floor(Math.log10(step) + 1e-10), 0, 8)
  let text = value.toFixed(decimals)
  if (text.includes('.')) text = text.replace(/0+$/, '').replace(/\.$/, '')
  return text === '-0' ? '0' : text
}

function formatReadout(value) {
  if (!isNum(value)) return '—'
  const abs = Math.abs(value)
  if (abs >= 1e6 || (abs > 0 && abs < 1e-4)) {
    return value.toExponential(2).replace('e+', 'e')
  }
  const text = value.toFixed(2)
  return text === '-0.00' ? '0.00' : text
}

function ellipsizeText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let shortened = text
  while (shortened && ctx.measureText(`${shortened}…`).width > maxWidth) {
    shortened = shortened.slice(0, -1)
  }
  return shortened ? `${shortened}…` : '…'
}

function wrapText(ctx, text, maxWidth) {
  const lines = []
  for (const paragraph of String(text).split(/\r?\n/)) {
    let line = ''
    for (const character of paragraph) {
      const candidate = line + character
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line)
        line = character
      } else {
        line = candidate
      }
    }
    lines.push(line)
  }
  return lines.length > 0 ? lines : ['']
}

function haloText(ctx, text, x, y, font, color, align = 'left', baseline = 'middle') {
  if (!text) return
  ctx.save()
  ctx.font = font
  ctx.textAlign = align
  ctx.textBaseline = baseline
  ctx.lineJoin = 'round'
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(255,255,255,0.92)'
  ctx.strokeText(text, x, y)
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
  ctx.restore()
}

function buildAutoPoints(extrema, roots, a, b, yMin, yMax) {
  const visibleExtrema = extrema
    .filter(
      (point) =>
        isNum(point.x) &&
        isNum(point.y) &&
        point.x >= a &&
        point.x <= b &&
        point.y >= yMin &&
        point.y <= yMax
    )
    .sort((p, q) => Math.abs(q.y) - Math.abs(p.y))

  const visibleRoots =
    yMin <= 0 && yMax >= 0
      ? roots.filter((x) => isNum(x) && x >= a && x <= b).sort((p, q) => p - q)
      : []

  const primaryRoots =
    visibleRoots.length <= 2
      ? visibleRoots
      : [visibleRoots[0], visibleRoots[visibleRoots.length - 1]]

  const picked = []
  const add = (type, x, y, kind) => {
    if (picked.length >= 4) return
    if (picked.some((point) => Math.abs(point.x - x) < 1e-9)) return
    picked.push({ type, x, y, kind })
  }

  visibleExtrema.slice(0, 2).forEach((point) => {
    add('extremum', point.x, point.y, point.kind)
  })
  primaryRoots.forEach((x) => add('root', x, 0))
  visibleExtrema.slice(2).forEach((point) => {
    add('extremum', point.x, point.y, point.kind)
  })
  visibleRoots.forEach((x) => add('root', x, 0))

  return picked
}

export default function PlotCanvas({ spec, height = DEFAULT_HEIGHT }) {
  const hostRef = useRef(null)
  const canvasRef = useRef(null)
  const geometryRef = useRef(null)
  const dragRef = useRef(null)

  const numericHeight = Number(height)
  const cssHeight =
    Number.isFinite(numericHeight) && numericHeight > 0 ? numericHeight : DEFAULT_HEIGHT

  const domain0 = spec && Array.isArray(spec.domain) ? spec.domain[0] : undefined
  const domain1 = spec && Array.isArray(spec.domain) ? spec.domain[1] : undefined
  const baseDomain = useMemo(
    () => normalizeDomain([domain0, domain1]),
    [domain0, domain1]
  )

  const [width, setWidth] = useState(0)
  const [view, setView] = useState({ a: baseDomain[0], b: baseDomain[1] })
  const [hover, setHover] = useState(null)
  const [dragging, setDragging] = useState(false)

  const expr = spec && typeof spec.expr === 'string' ? spec.expr.trim() : ''
  const range = spec ? spec.range : null
  const marksSource = spec ? spec.marks : undefined
  const asymptoteSource = spec ? spec.asymptote : undefined
  const hasMarks = Boolean(Array.isArray(marksSource) && marksSource.length > 0)
  const marks = useMemo(
    () => (Array.isArray(marksSource) ? marksSource : EMPTY),
    [marksSource]
  )
  const asymptotes = useMemo(
    () =>
      Array.isArray(asymptoteSource)
        ? asymptoteSource.filter((value) => isNum(value))
        : EMPTY,
    [asymptoteSource]
  )
  const fill = Boolean(spec && spec.fill)
  const fillFrom = spec ? spec.fillFrom : undefined
  const note = spec && typeof spec.note === 'string' ? spec.note : ''

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined

    const updateWidth = () => {
      const next = host.getBoundingClientRect().width
      if (next > 0) {
        setWidth((previous) =>
          Math.abs(previous - next) < 0.5 ? previous : next
        )
      }
    }

    updateWidth()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth)
      return () => window.removeEventListener('resize', updateWidth)
    }

    const observer = new ResizeObserver(updateWidth)
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setView({ a: baseDomain[0], b: baseDomain[1] })
    setHover(null)
    setDragging(false)
    dragRef.current = null
  }, [baseDomain])

  useEffect(() => {
    setHover(null)
  }, [width, cssHeight])

  const model = useMemo(() => {
    if (!expr) return { status: 'empty' }

    const compiled = tryCompile(expr)
    if (!compiled || !compiled.ok) {
      return {
        status: 'error',
        error: compiled && compiled.error ? compiled.error : '表达式解析失败',
      }
    }

    const fn = compiled.fn
    const a = view.a
    const b = view.b
    const explicitRange = readPair(range)
    let yMin
    let yMax

    if (explicitRange) {
      yMin = explicitRange[0]
      yMax = explicitRange[1]
    } else {
      try {
        const auto = autoRange(fn, a, b)
        yMin = auto.yMin
        yMax = auto.yMax
      } catch (error) {
        return {
          status: 'error',
          error: error && error.message ? error.message : '无法计算函数值域',
        }
      }
    }

    if (!isNum(yMin) || !isNum(yMax)) {
      yMin = -1
      yMax = 1
    }
    if (yMin > yMax) {
      const swap = yMin
      yMin = yMax
      yMax = swap
    }
    if (!(yMax > yMin)) {
      yMin -= 1
      yMax += 1
    }

    let points
    try {
      points = sampleCurve(fn, a, b, yMin, yMax, SAMPLE_COUNT)
    } catch (error) {
      return {
        status: 'error',
        error: error && error.message ? error.message : '无法采样函数图像',
      }
    }

    let autoPoints = []
    if (!hasMarks) {
      let extrema = []
      let roots = []
      try {
        extrema = findExtrema(fn, a, b)
      } catch (error) {
        extrema = []
      }
      try {
        roots = findRoots(fn, a, b)
      } catch (error) {
        roots = []
      }
      autoPoints = buildAutoPoints(extrema, roots, a, b, yMin, yMax)
    }

    return {
      status: 'ok',
      fn,
      a,
      b,
      yMin,
      yMax,
      points,
      autoPoints,
      xTicks: niceTicks(a, b),
      yTicks: niceTicks(yMin, yMax),
    }
  }, [expr, view.a, view.b, range, hasMarks])

  useEffect(() => {
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas || !host) return

    const cssWidth = width > 0 ? width : host.clientWidth
    if (!(cssWidth > 20) || !(cssHeight > 20)) return

    const dpr = Math.max(1, window.devicePixelRatio || 1)
    const pixelWidth = Math.max(1, Math.round(cssWidth * dpr))
    const pixelHeight = Math.max(1, Math.round(cssHeight * dpr))

    if (canvas.width !== pixelWidth) canvas.width = pixelWidth
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight
    canvas.style.width = `${cssWidth}px`
    canvas.style.height = `${cssHeight}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    geometryRef.current = null
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.scale(dpr, dpr)

    ctx.fillStyle = C.bg
    ctx.fillRect(0, 0, cssWidth, cssHeight)

    if (model.status === 'empty') {
      ctx.fillStyle = C.empty
      ctx.font = `15px ${SANS}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('暂无图像', cssWidth / 2, cssHeight / 2)
      return
    }

    if (model.status === 'error') {
      ctx.fillStyle = C.errorBg
      ctx.fillRect(0, 0, cssWidth, cssHeight)
      ctx.font = `14px ${SANS}`
      ctx.fillStyle = C.error
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const maxWidth = Math.max(80, Math.min(cssWidth - 64, 560))
      const lineHeight = 22
      const maxLines = Math.max(1, Math.floor((cssHeight - 40) / lineHeight))
      const allLines = wrapText(ctx, `表达式有误：${model.error}`, maxWidth)
      const lines = allLines.slice(0, maxLines)
      if (allLines.length > maxLines && lines.length > 0) {
        lines[lines.length - 1] = `${lines[lines.length - 1]}…`
      }
      const startY = cssHeight / 2 - ((lines.length - 1) * lineHeight) / 2
      lines.forEach((line, index) => {
        ctx.fillText(line, cssWidth / 2, startY + index * lineHeight)
      })
      return
    }

    const { a, b, yMin, yMax, points, autoPoints, xTicks, yTicks } = model

    ctx.font = `11px ${SANS}`
    const xLabels = xTicks.values.map((value) => formatTick(value, xTicks.step))
    const yLabels = yTicks.values.map((value) => formatTick(value, yTicks.step))
    const yLabelWidth = yLabels.reduce(
      (widest, label) => Math.max(widest, ctx.measureText(label).width),
      0
    )

    const plotTop = clamp(cssHeight * 0.14, 40, 56)
    const plotBottom = cssHeight - clamp(cssHeight * 0.1, 28, 42)
    const plotRight = cssWidth - clamp(cssWidth * 0.035, 16, 28)
    const plotLeft = clamp(
      yLabelWidth + 18,
      48,
      Math.max(48, cssWidth * 0.32)
    )
    const plotWidth = plotRight - plotLeft
    const plotHeight = plotBottom - plotTop
    if (plotWidth < 30 || plotHeight < 30) return

    geometryRef.current = {
      left: plotLeft,
      right: plotRight,
      top: plotTop,
      bottom: plotBottom,
      width: plotWidth,
      height: plotHeight,
    }

    const xToPixel = (x) => plotLeft + ((x - a) / (b - a)) * plotWidth
    const yToPixel = (y) => plotBottom - ((y - yMin) / (yMax - yMin)) * plotHeight
    const axisX = a <= 0 && b >= 0 ? xToPixel(0) : plotLeft
    const axisY = yMin <= 0 && yMax >= 0 ? yToPixel(0) : plotBottom
    const crisp = (value) => Math.round(value) + 0.5

    ctx.save()
    ctx.strokeStyle = C.grid
    ctx.lineWidth = 1
    ctx.beginPath()
    xTicks.values.forEach((value) => {
      const px = crisp(xToPixel(value))
      ctx.moveTo(px, plotTop)
      ctx.lineTo(px, plotBottom)
    })
    yTicks.values.forEach((value) => {
      const py = crisp(yToPixel(value))
      ctx.moveTo(plotLeft, py)
      ctx.lineTo(plotRight, py)
    })
    ctx.stroke()
    ctx.restore()

    ctx.save()
    ctx.strokeStyle = C.asymptote
    ctx.lineWidth = 1.2
    ctx.setLineDash([4, 4])
    asymptotes.forEach((x) => {
      if (x < a || x > b) return
      const px = xToPixel(x)
      ctx.beginPath()
      ctx.moveTo(px, 0)
      ctx.lineTo(px, cssHeight)
      ctx.stroke()
    })
    ctx.restore()

    if (fill) {
      const from = clamp(isNum(fillFrom) ? fillFrom : a, a, b)
      const baseY = yToPixel(0)
      let segment = []

      const flush = () => {
        if (segment.length === 0) return
        ctx.beginPath()
        ctx.moveTo(segment[0].x, baseY)
        segment.forEach((point) => ctx.lineTo(point.x, point.y))
        ctx.lineTo(segment[segment.length - 1].x, baseY)
        ctx.closePath()
        ctx.fill()
        segment = []
      }

      ctx.save()
      ctx.beginPath()
      ctx.rect(plotLeft, plotTop, plotWidth, plotHeight)
      ctx.clip()
      ctx.fillStyle = C.fill
      points.forEach((point) => {
        if (point.x < from - 1e-12) return
        if (!isNum(point.y)) {
          flush()
          return
        }
        segment.push({ x: xToPixel(point.x), y: yToPixel(point.y) })
      })
      flush()
      ctx.restore()
    }

    ctx.save()
    ctx.strokeStyle = C.axis
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(plotLeft, axisY)
    ctx.lineTo(plotRight, axisY)
    ctx.moveTo(axisX, plotTop)
    ctx.lineTo(axisX, plotBottom)
    ctx.stroke()
    ctx.restore()

    ctx.save()
    ctx.beginPath()
    ctx.rect(plotLeft, plotTop, plotWidth, plotHeight)
    ctx.clip()
    ctx.beginPath()

    let started = false
    points.forEach((point) => {
      if (!isNum(point.y)) {
        started = false
        return
      }
      const px = xToPixel(point.x)
      const py = yToPixel(point.y)
      if (!started) {
        ctx.moveTo(px, py)
        started = true
      } else {
        ctx.lineTo(px, py)
      }
    })

    ctx.strokeStyle = C.curve
    ctx.lineWidth = 2.2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.restore()

    ctx.save()
    ctx.strokeStyle = C.axis
    ctx.lineWidth = 1
    ctx.beginPath()
    xTicks.values.forEach((value) => {
      const px = crisp(xToPixel(value))
      ctx.moveTo(px, axisY - 3)
      ctx.lineTo(px, axisY + 3)
    })
    yTicks.values.forEach((value) => {
      const py = crisp(yToPixel(value))
      ctx.moveTo(axisX - 3, py)
      ctx.lineTo(axisX + 3, py)
    })
    ctx.stroke()
    ctx.restore()

    ctx.save()
    ctx.fillStyle = C.tick
    ctx.font = `11px ${SANS}`
    ctx.textBaseline = 'top'
    xTicks.values.forEach((value, index) => {
      const px = xToPixel(value)
      ctx.textAlign =
        px < plotLeft + 18 ? 'left' : px > plotRight - 18 ? 'right' : 'center'
      ctx.fillText(xLabels[index], px, axisY + 8)
    })
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'right'
    yTicks.values.forEach((value, index) => {
      ctx.fillText(yLabels[index], axisX - 8, yToPixel(value))
    })
    ctx.restore()

    autoPoints.forEach((point) => {
      if (point.type === 'root') {
        const px = xToPixel(point.x)
        const py = yToPixel(0)
        if (py < plotTop || py > plotBottom) return
        ctx.fillStyle = C.root
        ctx.fillRect(Math.round(px) - 2, Math.round(py) - 2, 4, 4)
        return
      }

      const px = xToPixel(point.x)
      const py = yToPixel(point.y)
      if (px < plotLeft || px > plotRight || py < plotTop || py > plotBottom) {
        return
      }

      const color = point.kind === 'min' ? C.min : C.max
      ctx.beginPath()
      ctx.arc(px, py, 4, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()

      const label = point.kind === 'min' ? '极小' : '极大'
      const font = `11px ${SANS}`
      ctx.font = font
      const labelWidth = ctx.measureText(label).width
      let labelX = px + 8
      if (labelX + labelWidth > cssWidth - 8) labelX = px - 8 - labelWidth
      labelX = Math.max(8, labelX)

      let labelY = point.kind === 'max' ? py - 9 : py + 9
      if (labelY < 16) labelY = py + 9
      if (labelY > cssHeight - 10) labelY = py - 9
      haloText(ctx, label, labelX, labelY, font, color)
    })

    if (hasMarks) {
      marks.forEach((mark) => {
        const x = mark ? Number(mark.x) : NaN
        if (!isNum(x) || x < a || x > b) return

        let y = null
        try {
          const value = model.fn(x)
          if (isNum(value)) y = value
        } catch (error) {
          y = null
        }
        if (!isNum(y)) return

        const px = xToPixel(x)
        const py = yToPixel(y)
        if (
          px < plotLeft ||
          px > plotRight ||
          py < plotTop ||
          py > plotBottom
        ) {
          return
        }

        ctx.beginPath()
        ctx.arc(px, py, 5, 0, Math.PI * 2)
        ctx.fillStyle = C.root
        ctx.fill()

        const label = mark && mark.label != null ? String(mark.label) : ''
        if (!label) return

        const font = `12px ${SANS}`
        ctx.font = font
        const labelWidth = ctx.measureText(label).width
        let labelX = px + 9
        if (labelX + labelWidth > cssWidth - 8) labelX = px - 9 - labelWidth
        labelX = Math.max(8, labelX)

        let labelY = py - 10
        if (labelY < 14) labelY = py + 14
        haloText(ctx, label, labelX, labelY, font, C.root)
      })
    }

    ctx.save()
    ctx.font = `13px ${SANS}`
    ctx.fillStyle = C.curve
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(
      ellipsizeText(ctx, `f(x) = ${expr}`, Math.max(40, cssWidth - 32)),
      16,
      21
    )
    ctx.restore()

    if (hover) {
      const hoverX = clamp(hover.px, plotLeft, plotRight)
      let hoverY = null
      try {
        const value = model.fn(hover.x)
        if (isNum(value)) hoverY = value
      } catch (error) {
        hoverY = null
      }

      ctx.save()
      ctx.strokeStyle = C.hover
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(hoverX, plotTop)
      ctx.lineTo(hoverX, plotBottom)
      ctx.stroke()
      ctx.restore()

      const readout = `x = ${formatReadout(hover.x)}   y = ${formatReadout(hoverY)}`
      ctx.font = `13px ${MONO}`
      const textWidth = ctx.measureText(readout).width
      const boxWidth = textWidth + 18
      const boxHeight = 26
      const boxX = Math.max(8, cssWidth - 16 - boxWidth)
      const boxY = 9

      ctx.save()
      ctx.fillStyle = 'rgba(255,255,255,0.94)'
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight)
      ctx.strokeStyle = '#e6eaf0'
      ctx.lineWidth = 1
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight)
      ctx.fillStyle = C.hoverText
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(readout, boxX + 9, boxY + boxHeight / 2 + 0.5)
      ctx.restore()
    }
  }, [
    model,
    width,
    cssHeight,
    hover,
    fill,
    fillFrom,
    marks,
    hasMarks,
    asymptotes,
  ])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const handleWheel = (event) => {
      const geometry = geometryRef.current
      if (!geometry || event.deltaY === 0) return

      event.preventDefault()
      setHover(null)

      const rect = canvas.getBoundingClientRect()
      const mouseX = event.clientX - rect.left
      const ratio = clamp((mouseX - geometry.left) / geometry.width, 0, 1)
      const factor = event.deltaY < 0 ? ZOOM : 1 / ZOOM

      setView((current) => {
        const span = current.b - current.a
        const nextSpan = clamp(span * factor, MIN_SPAN, MAX_SPAN)
        if (Math.abs(nextSpan - span) < 1e-12) return current
        const anchor = current.a + span * ratio
        const nextA = anchor - nextSpan * ratio
        return { a: nextA, b: nextA + nextSpan }
      })
    }

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [])

  function hoverPointForEvent(event) {
    if (model.status !== 'ok') return null
    const geometry = geometryRef.current
    if (!geometry) return null

    const rect = event.currentTarget.getBoundingClientRect()
    const px = event.clientX - rect.left
    const py = event.clientY - rect.top
    if (
      px < geometry.left ||
      px > geometry.right ||
      py < geometry.top ||
      py > geometry.bottom
    ) {
      return null
    }

    const ratio = (px - geometry.left) / geometry.width
    return { px, x: view.a + ratio * (view.b - view.a) }
  }

  function handlePointerDown(event) {
    if (event.button !== 0 || !geometryRef.current) return
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startView: view,
    }
    setDragging(true)
    setHover(null)
    if (event.currentTarget.setPointerCapture) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch (error) {
        // The pointer may already be inactive.
      }
    }
  }

  function handlePointerMove(event) {
    const drag = dragRef.current
    const geometry = geometryRef.current
    if (drag && drag.pointerId === event.pointerId) {
      if (!geometry || geometry.width <= 0) return
      const span = drag.startView.b - drag.startView.a
      const shift = -((event.clientX - drag.startX) / geometry.width) * span
      if (!Number.isFinite(shift)) return
      setView({
        a: drag.startView.a + shift,
        b: drag.startView.b + shift,
      })
      return
    }
    setHover(hoverPointForEvent(event))
  }

  function finishDrag(event) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    setDragging(false)
    if (
      event.currentTarget.hasPointerCapture &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch (error) {
        // Pointer capture is already released.
      }
    }
  }

  function handlePointerLeave() {
    if (!dragRef.current) setHover(null)
  }

  return (
    <div ref={hostRef} style={{ width: '100%', minWidth: 0 }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={expr ? `函数图像 f(x) = ${expr}` : '函数图像'}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onPointerLeave={handlePointerLeave}
        style={{
          display: 'block',
          width: '100%',
          height: `${cssHeight}px`,
          cursor: model.status === 'ok' ? (dragging ? 'grabbing' : 'grab') : 'default',
          touchAction: 'none',
          userSelect: 'none',
          outline: 'none',
        }}
      />
      {note ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            lineHeight: 1.6,
            color: '#8a94a2',
            textAlign: 'center',
          }}
        >
          {note}
        </div>
      ) : null}
    </div>
  )
}
