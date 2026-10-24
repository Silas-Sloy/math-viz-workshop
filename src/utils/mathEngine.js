// 手写词法分析 + 递归下降语法分析 + 闭包求值树
// 纯 JavaScript，不依赖任何第三方库

const CACHE_LIMIT = 50
const cache = new Map()

const PI_VALUE = Math.PI
const E_VALUE = Math.E

const FUNCS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  exp: Math.exp,
  ln: Math.log,
  lg: Math.log10,
  sqrt: Math.sqrt,
  abs: Math.abs,
}

const isDigit = (c) => c >= '0' && c <= '9'
const isLetter = (c) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
const isSpace = (c) =>
  c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f' || c === '\v' || c === '\u00a0' || c === '\u3000'

// 标识符按已知名称做最长匹配切分：
// "xsin(x)" 会切成 x 和 sin，"sinh" 会整体切成 sinh，不会把 xsin 当成一个名字
const IDENT_NAMES = Object.keys(FUNCS)
  .concat(['pi', 'e', 'x'])
  .sort((p, q) => q.length - p.length)

function matchNameAt(text, index) {
  for (let i = 0; i < IDENT_NAMES.length; i += 1) {
    if (text.startsWith(IDENT_NAMES[i], index)) return IDENT_NAMES[i]
  }
  return ''
}

function splitIdentifiers(text, basePos) {
  const tokens = []
  let offset = 0
  while (offset < text.length) {
    const matched = matchNameAt(text, offset)
    if (matched) {
      tokens.push({ type: 'ident', value: matched, pos: basePos + offset + 1 })
      offset += matched.length
      continue
    }
    let stop = offset + 1
    while (stop < text.length && !matchNameAt(text, stop)) {
      stop += 1
    }
    tokens.push({ type: 'ident', value: text.slice(offset, stop), pos: basePos + offset + 1 })
    offset = stop
  }
  return tokens
}

function tokenize(expr) {
  const tokens = []
  let i = 0

  const pushOp = (value, pos) => tokens.push({ type: 'op', value, pos })

  while (i < expr.length) {
    const ch = expr[i]
    const start = i

    if (isSpace(ch)) {
      i += 1
      continue
    }

    if (isDigit(ch) || (ch === '.' && isDigit(expr[i + 1] || ''))) {
      let j = i
      while (j < expr.length && isDigit(expr[j])) j += 1
      if (expr[j] === '.') {
        j += 1
        while (j < expr.length && isDigit(expr[j])) j += 1
      }
      if (j < expr.length && (expr[j] === 'e' || expr[j] === 'E')) {
        let k = j + 1
        if (expr[k] === '+' || expr[k] === '-') k += 1
        if (k < expr.length && isDigit(expr[k])) {
          while (k < expr.length && isDigit(expr[k])) k += 1
          j = k
        }
      }
      const text = expr.slice(i, j)
      const value = parseFloat(text)
      if (!Number.isFinite(value)) {
        throw new Error(`第 ${start + 1} 个字符附近有无法识别的符号 '${text}'`)
      }
      tokens.push({ type: 'num', value, pos: start + 1 })
      i = j
      continue
    }

    if (isLetter(ch)) {
      let j = i
      while (j < expr.length && isLetter(expr[j])) j += 1
      const parts = splitIdentifiers(expr.slice(i, j).toLowerCase(), start)
      for (let n = 0; n < parts.length; n += 1) {
        tokens.push(parts[n])
      }
      i = j
      continue
    }

    if (ch === 'π') {
      tokens.push({ type: 'ident', value: 'pi', pos: start + 1 })
      i += 1
      continue
    }

    if (ch === '×' || ch === '·') {
      pushOp('*', start + 1)
      i += 1
      continue
    }

    if (ch === '÷') {
      pushOp('/', start + 1)
      i += 1
      continue
    }

    if (ch === '（') {
      tokens.push({ type: 'lparen', value: '(', pos: start + 1 })
      i += 1
      continue
    }

    if (ch === '）') {
      tokens.push({ type: 'rparen', value: ')', pos: start + 1 })
      i += 1
      continue
    }

    if (ch === '−' || ch === '–') {
      pushOp('-', start + 1)
      i += 1
      continue
    }

    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^') {
      pushOp(ch, start + 1)
      i += 1
      continue
    }

    if (ch === '(') {
      tokens.push({ type: 'lparen', value: '(', pos: start + 1 })
      i += 1
      continue
    }

    if (ch === ')') {
      tokens.push({ type: 'rparen', value: ')', pos: start + 1 })
      i += 1
      continue
    }

    throw new Error(`第 ${start + 1} 个字符附近有无法识别的符号 '${ch}'`)
  }

  tokens.push({ type: 'end', value: '', pos: expr.length + 1 })
  return tokens
}

const constNode = (v) => () => v
const addNode = (a, b) => (x) => a(x) + b(x)
const subNode = (a, b) => (x) => a(x) - b(x)
const mulNode = (a, b) => (x) => a(x) * b(x)
const divNode = (a, b) => (x) => a(x) / b(x)
const powNode = (a, b) => (x) => Math.pow(a(x), b(x))
const negNode = (a) => (x) => -a(x)

function parseTokens(tokens) {
  let pos = 0
  const peek = () => tokens[pos]
  const advance = () => tokens[pos++]

  function parseExpression() {
    return parseAddSub()
  }

  function parseAddSub() {
    let node = parseMulDiv()
    for (;;) {
      const t = peek()
      if (t.type === 'op' && (t.value === '+' || t.value === '-')) {
        advance()
        const rhs = parseMulDiv()
        node = t.value === '+' ? addNode(node, rhs) : subNode(node, rhs)
      } else {
        break
      }
    }
    return node
  }

  function parseMulDiv() {
    let node = parseUnary()
    for (;;) {
      const t = peek()
      if (t.type === 'op' && (t.value === '*' || t.value === '/')) {
        advance()
        const rhs = parseUnary()
        node = t.value === '*' ? mulNode(node, rhs) : divNode(node, rhs)
      } else if (t.type === 'num' || t.type === 'ident' || t.type === 'lparen') {
        const rhs = parseUnary()
        node = mulNode(node, rhs)
      } else {
        break
      }
    }
    return node
  }

  function parseUnary() {
    const t = peek()
    if (t.type === 'op' && t.value === '-') {
      advance()
      return negNode(parseUnary())
    }
    if (t.type === 'op' && t.value === '+') {
      advance()
      return parseUnary()
    }
    return parsePower()
  }

  function parsePower() {
    const base = parsePrimary()
    const t = peek()
    if (t.type === 'op' && t.value === '^') {
      advance()
      const exponent = parseUnary()
      return powNode(base, exponent)
    }
    return base
  }

  function parsePrimary() {
    const t = peek()

    if (t.type === 'num') {
      advance()
      return constNode(t.value)
    }

    if (t.type === 'ident') {
      advance()
      const name = t.value

      if (Object.prototype.hasOwnProperty.call(FUNCS, name)) {
        const lp = peek()
        if (lp.type !== 'lparen') {
          throw new Error(`函数 ${name} 后面缺少左括号`)
        }
        advance()
        const arg = parseExpression()
        const rp = peek()
        if (rp.type !== 'rparen') {
          throw new Error('括号不匹配')
        }
        advance()
        const target = FUNCS[name]
        return (x) => target(arg(x))
      }

      if (name === 'x') return (x) => x
      if (name === 'pi') return constNode(PI_VALUE)
      if (name === 'e') return constNode(E_VALUE)

      const nt = peek()
      if (nt.type === 'lparen') {
        throw new Error(`不认识的函数名 ${name}`)
      }
      throw new Error(`不认识的标识符 ${name}`)
    }

    if (t.type === 'lparen') {
      advance()
      const inner = parseExpression()
      const rp = peek()
      if (rp.type !== 'rparen') {
        throw new Error('括号不匹配')
      }
      advance()
      return inner
    }

    if (t.type === 'rparen') {
      throw new Error('括号不匹配')
    }

    throw new Error('表达式不完整，末尾缺少操作数')
  }

  const result = parseExpression()
  const rest = peek()
  if (rest.type !== 'end') {
    if (rest.type === 'rparen') {
      throw new Error('括号不匹配')
    }
    throw new Error(`第 ${rest.pos} 个字符附近有多余的内容`)
  }
  return result
}

export function compile(expr) {
  if (typeof expr !== 'string') {
    throw new Error('表达式必须为字符串')
  }
  const key = expr.trim()
  if (key === '') {
    throw new Error('表达式为空')
  }

  const cached = cache.get(key)
  if (cached) {
    return cached
  }

  const fn = parseTokens(tokenize(expr))

  if (cache.size >= CACHE_LIMIT) {
    cache.clear()
  }
  cache.set(key, fn)
  return fn
}

export function tryCompile(expr) {
  try {
    return { ok: true, fn: compile(expr) }
  } catch (err) {
    const error = err && typeof err.message === 'string' && err.message ? err.message : '表达式解析失败'
    return { ok: false, error }
  }
}

export function derivative(fn, x) {
  const h = Math.max(1e-5, Math.abs(x) * 1e-5)
  return (fn(x + h) - fn(x - h)) / (2 * h)
}

export function integrate(fn, a, b, n = 2000) {
  let steps = Math.floor(n)
  if (!Number.isFinite(steps) || steps < 2) steps = 2
  if (steps % 2 === 1) steps += 1

  const h = (b - a) / steps
  let sum = fn(a) + fn(b)
  for (let i = 1; i < steps; i += 1) {
    const x = a + i * h
    sum += (i % 2 === 0 ? 2 : 4) * fn(x)
  }
  return (h / 3) * sum
}

function bisect(fn, xa, xb) {
  let lo = xa
  let hi = xb
  let flo = fn(lo)
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2
    const fm = fn(mid)
    if (!Number.isFinite(fm)) return mid
    if (fm === 0) return mid
    if ((flo < 0) === (fm < 0)) {
      lo = mid
      flo = fm
    } else {
      hi = mid
    }
  }
  return (lo + hi) / 2
}

export function findRoots(fn, a, b) {
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  if (hi === lo) return []

  const step = 0.01
  const count = Math.max(1, Math.round((hi - lo) / step))
  const roots = []

  let prevX = lo
  let prevY = fn(lo)

  for (let k = 0; k <= count; k += 1) {
    const x = k === count ? hi : lo + k * step
    const y = fn(x)
    if (Number.isFinite(y) && Math.abs(y) < 1e-12) {
      roots.push(x)
    }
    if (k > 0 && Number.isFinite(prevY) && Number.isFinite(y) && prevY * y < 0) {
      roots.push(bisect(fn, prevX, x))
    }
    prevX = x
    prevY = y
  }

  roots.sort((p, q) => p - q)
  const result = []
  for (let i = 0; i < roots.length; i += 1) {
    const value = roots[i]
    if (!Number.isFinite(value)) continue
    if (result.length === 0 || Math.abs(value - result[result.length - 1]) >= 1e-4) {
      result.push(value)
    }
  }
  return result
}

function refineExtremum(fn, x0, kind) {
  let x = x0
  let y = fn(x)
  if (!Number.isFinite(y)) {
    y = kind === 'min' ? Infinity : -Infinity
  }

  let h = 0.01
  for (let i = 0; i < 40; i += 1) {
    const left = x - h
    const right = x + h
    const yl = fn(left)
    const yr = fn(right)

    if (Number.isFinite(yl) && (kind === 'min' ? yl < y : yl > y)) {
      x = left
      y = yl
    }
    if (Number.isFinite(yr) && (kind === 'min' ? yr < y : yr > y)) {
      x = right
      y = yr
    }
    h *= 0.5
  }
  return { x, y }
}

export function findExtrema(fn, a, b) {
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  if (hi === lo) return []

  const step = 0.01
  const count = Math.max(1, Math.round((hi - lo) / step))
  const found = []

  let lastSign = 0
  let lastX = lo

  for (let k = 0; k <= count; k += 1) {
    const x = k === count ? hi : lo + k * step
    const d = derivative(fn, x)

    if (!Number.isFinite(d)) {
      lastSign = 0
      lastX = x
      continue
    }

    const sign = Math.abs(d) < 1e-12 ? 0 : d > 0 ? 1 : -1
    if (sign === 0) {
      continue
    }

    if (lastSign < 0 && sign > 0) {
      found.push({ x: (lastX + x) / 2, kind: 'min' })
    } else if (lastSign > 0 && sign < 0) {
      found.push({ x: (lastX + x) / 2, kind: 'max' })
    }

    lastSign = sign
    lastX = x
  }

  const refined = found.map((item) => {
    const point = refineExtremum(fn, item.x, item.kind)
    return { x: point.x, y: point.y, kind: item.kind }
  })

  refined.sort((p, q) => p.x - q.x)

  const result = []
  for (let i = 0; i < refined.length; i += 1) {
    const item = refined[i]
    if (result.length === 0 || Math.abs(item.x - result[result.length - 1].x) >= 1e-3) {
      result.push(item)
    }
  }
  return result
}

export function monotonicIntervals(fn, a, b) {
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  if (hi === lo) return []

  const cuts = [lo]
  const extrema = findExtrema(fn, lo, hi)
  for (let i = 0; i < extrema.length; i += 1) {
    const x = extrema[i].x
    if (x > lo + 1e-9 && x < hi - 1e-9) {
      cuts.push(x)
    }
  }
  cuts.push(hi)

  const result = []
  for (let i = 1; i < cuts.length; i += 1) {
    const from = cuts[i - 1]
    const to = cuts[i]
    if (to - from < 1e-9) continue

    const mid = (from + to) / 2
    const d = derivative(fn, mid)
    let increasing
    if (Number.isFinite(d) && Math.abs(d) > 1e-12) {
      increasing = d > 0
    } else {
      increasing = fn(to) >= fn(from)
    }
    result.push({ from, to, increasing })
  }
  return result
}

export function autoRange(fn, a, b) {
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  const TIMES = 400
  const values = []

  for (let i = 0; i < TIMES; i += 1) {
    const x = lo + ((hi - lo) * i) / (TIMES - 1)
    const y = fn(x)
    if (Number.isFinite(y)) {
      values.push(y)
    }
  }

  if (values.length === 0) {
    return { yMin: -1, yMax: 1 }
  }

  values.sort((p, q) => p - q)
  const last = values.length - 1
  const quantile = (p) => {
    const idx = p * last
    const i0 = Math.floor(idx)
    const i1 = Math.min(last, i0 + 1)
    const frac = idx - i0
    return values[i0] + (values[i1] - values[i0]) * frac
  }

  let yMin = quantile(0.02)
  let yMax = quantile(0.98)

  const span = yMax - yMin
  if (span > 0) {
    yMin -= span * 0.1
    yMax += span * 0.1
  }

  if (yMin === yMax) {
    yMin -= 1
    yMax += 1
  }

  return { yMin, yMax }
}

export function sampleCurve(fn, a, b, yMin, yMax, n = 600) {
  let count = Math.floor(n)
  if (!Number.isFinite(count) || count < 2) count = 2

  const limit = 20 * Math.max(Math.abs(yMin), Math.abs(yMax))
  const points = []

  for (let i = 0; i < count; i += 1) {
    const x = a + ((b - a) * i) / (count - 1)
    let y = null
    try {
      const value = fn(x)
      if (Number.isFinite(value) && !(limit > 0 && Math.abs(value) > limit)) {
        y = value
      }
    } catch (err) {
      y = null
    }
    points.push({ x, y })
  }
  return points
}

const PI_DENOMS = [1, 2, 3, 4, 6, 12]

export function prettyPi(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    return String(v)
  }
  if (v === 0) return '0'

  const ratio = v / Math.PI
  for (let i = 0; i < PI_DENOMS.length; i += 1) {
    const denom = PI_DENOMS[i]
    const scaled = ratio * denom
    const num = Math.round(scaled)
    if (num !== 0 && Math.abs(scaled - num) < 1e-9) {
      const absNum = Math.abs(num)
      const head = absNum === 1 ? 'π' : `${absNum}π`
      const tail = denom === 1 ? '' : `/${denom}`
      return `${num < 0 ? '-' : ''}${head}${tail}`
    }
  }

  return String(Number(v.toFixed(4)))
}
