import {
  compile,
  tryCompile,
  derivative,
  integrate,
  findRoots,
  findExtrema,
  monotonicIntervals,
  autoRange,
  sampleCurve,
  prettyPi,
} from './src/utils/mathEngine.js'

let pass = 0
let fail = 0
const near = (a, b, tol = 1e-6) => Math.abs(a - b) < tol

function check(name, actual, expected, tol = 1e-6) {
  const ok = typeof expected === 'number' ? near(actual, expected, tol) : actual === expected
  if (ok) {
    pass++
    console.log(`  PASS  ${name}  =>  ${actual}`)
  } else {
    fail++
    console.log(`  FAIL  ${name}  =>  got ${actual}, want ${expected}`)
  }
}

console.log('\n--- 表达式解析 ---')
check('x^2 at 3', compile('x^2')(3), 9)
check('2x at 3（隐式乘法）', compile('2x')(3), 6)
check('x(x+1) at 2（隐式乘法）', compile('x(x+1)')(2), 6)
check('x sin(x) at 2（空格分隔）', compile('x sin(x)')(2), 2 * Math.sin(2))
check('sin(pi/2)', compile('sin(pi/2)')(0), 1)
check('-x^2 at 3（负号优先级）', compile('-x^2')(3), -9)
check('2^3^2（右结合）', compile('2^3^2')(0), 512)
check('e 常量', compile('e')(0), Math.E)
check('ln(e)', compile('ln(e)')(0), 1)
check('全角括号（）', compile('（x+1）^2')(2), 9)
check('乘号 × ', compile('2×3')(0), 6)
check('科学计数法 1e-3', compile('1e-3')(0), 0.001)
check('复合 (x^2+1)/(x-1) at 3', compile('(x^2+1)/(x-1)')(3), 5)

console.log('\n--- 错误处理 ---')
const bad1 = tryCompile('x+')
check('x+ 应报错', bad1.ok, false)
const bad2 = tryCompile('foo(x)')
check('未知函数应报错', bad2.ok, false)
const bad3 = tryCompile('(x+1')
check('括号不配对应报错', bad3.ok, false)
console.log('  错误文案示例：', bad1.error, '/', bad2.error, '/', bad3.error)

console.log('\n--- 数值分析 ---')
check('d/dx x^2 at 1', derivative(compile('x^2'), 1), 2, 1e-4)
check('d/dx sin(x) at 0', derivative(compile('sin(x)'), 0), 1, 1e-4)
check('∫x^2 0→3', integrate(compile('x^2'), 0, 3), 9, 1e-6)
check('∫(x^2+1) 0→3', integrate(compile('x^2+1'), 0, 3), 12, 1e-6)
check('∫sin(x) 0→π', integrate(compile('sin(x)'), 0, Math.PI), 2, 1e-6)

const roots = findRoots(compile('sin(x)'), -10, 10)
console.log('  sin(x) 在 [-10,10] 的零点：', roots.map((r) => r.toFixed(4)).join(', '))
check('零点个数', roots.length, 7)

const ext = findExtrema(compile('x^2-4x+3'), -10, 10)
console.log('  极值点：', JSON.stringify(ext.map((e) => ({ x: +e.x.toFixed(3), y: +e.y.toFixed(3), kind: e.kind }))))
check('极值点个数', ext.length, 1)
check('极小值位置', ext[0]?.x, 2, 1e-3)
check('极小值', ext[0]?.y, -1, 1e-3)

const mono = monotonicIntervals(compile('x^2-4x+3'), -10, 10)
console.log('  单调区间：', JSON.stringify(mono.map((m) => ({ from: +m.from.toFixed(2), to: +m.to.toFixed(2), inc: m.increasing }))))
check('单调区间段数', mono.length, 2)

console.log('\n--- 自适应值域 / 采样 ---')
const r1 = autoRange(compile('sin(x)'), -Math.PI, Math.PI)
console.log('  sin 在 [-π,π] 的 y 范围：', JSON.stringify(r1))
check('sin 上界合理', r1.yMax > 1 && r1.yMax < 1.5, true)

const r2 = autoRange(compile('tan(x)'), -1.5, 1.5)
console.log('  tan 在 [-1.5,1.5] 的 y 范围（应被裁掉极端值）：', JSON.stringify(r2))
check('tan 范围未被撑爆', Math.abs(r2.yMax) < 50, true)

const pts = sampleCurve(compile('1/x'), -2, 2, -10, 10)
const nulls = pts.filter((p) => p.y === null).length
console.log('  1/x 采样点断开数（应为正数，说明间断已标记）：', nulls)
check('1/x 有断开点', nulls > 0, true)

console.log('\n--- 数值格式化 ---')
check('prettyPi(π)', prettyPi(Math.PI), 'π')
check('prettyPi(π/2)', prettyPi(Math.PI / 2), 'π/2')

console.log(`\n结果：${pass} 通过 / ${fail} 失败\n`)
process.exit(fail === 0 ? 0 : 1)
