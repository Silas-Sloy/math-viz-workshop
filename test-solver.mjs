// solver.js 端到端验收：用真实 API Key 调 DeepSeek，验证提示词能否把题拆成合法步骤
// 用法：node test-solver.mjs
import { readFileSync } from 'node:fs'
import { tryCompile } from './src/utils/mathEngine.js'

const API_URL = 'https://api.deepseek.com/chat/completions'

const SYSTEM_PROMPT = String.raw`你是一位擅长把抽象过程讲具体的高数老师。学生把一道题发给你，你要把它拆成 3 到 6 个"看得见"的步骤。

必须遵守：
1. 每一步只做一件事，title 不超过 12 个字，用大白话，禁止使用"易得""显然""综上所述"这类词。
2. 每一步的 explain 写 40 到 120 个字，必须回答"为什么这一步要这么做"，不能只是把公式再抄一遍。
3. 每一步都要给一个 visual，说明这一步该画什么图。这一步确实画不出图时，visual 给 null。
4. visual.expr 只能是含变量 x 的算式，能用的只有四则运算、幂 ^、括号、以及 sin cos tan asin acos atan exp ln lg sqrt abs pi e。expr 里禁止出现等号、积分号、求和号、lim、中文、逗号。
5. 画面积的时候（积分、概率密度这类）把 fill 设为 true。
6. 最后一步的 title 固定写"得到答案"，answer 字段给出最终结果，能写成 LaTeX 就写成 LaTeX，例如 "\\pi"、"\\frac{\\pi}{2}"、"2"。
7. 只输出 JSON 对象，不要输出任何解释文字，不要输出 markdown 代码块。

输出 JSON 结构（严格遵守，不要增减字段名）：
{
  "problem": "原题文字",
  "topic": "知识点，例如 定积分 · 分部积分",
  "answer": "最终答案",
  "steps": [
    {
      "title": "先看清它长什么样",
      "explain": "讲解文字",
      "formula": "这一步的式子，LaTeX 片段，可空字符串",
      "visual": {
        "type": "plot",
        "expr": "x*sin(x)",
        "domain": [0, 3.1416],
        "fill": true,
        "marks": [{ "x": 1.5708, "label": "最高点" }],
        "note": "曲线在这一段一直为正，所以面积就是积分值"
      }
    }
  ]
}`

const EXAMPLE_PROBLEM = '求 lim(x→0) sin(x)/x'
const EXAMPLE_ANSWER = String.raw`{"problem":"求 lim(x→0) sin(x)/x","topic":"极限 · 重要极限","answer":"1","steps":[{"title":"先画出来看看","explain":"先别急着算。把 sin(x)/x 在 0 附近画出来，会看到它在 0 处没有定义，但左右两边都朝同一个高度靠过去，这个高度就是极限。","formula":"f(x)=\\frac{\\sin x}{x}","visual":{"type":"plot","expr":"sin(x)/x","domain":[-6,6],"fill":false,"marks":[{"x":0,"label":"这里没有定义"}],"note":"曲线在 x=0 处空了一个点，但两边都趋向 1"}},{"title":"用夹逼定理","explain":"因为对任何非零的 x 都有 cos x ≤ sin x / x ≤ 1，而 cos x 在 0 附近趋向 1，两边一夹，中间只能也趋向 1。","formula":"\\cos x \\le \\frac{\\sin x}{x} \\le 1","visual":{"type":"plot","expr":"cos(x)","domain":[-1.5,1.5],"fill":false,"marks":[{"x":0,"label":"上界和下界都收拢到 1"}],"note":"把 cos(x) 和水平线 y=1 一起看，就是两条'夹板'"}},{"title":"得到答案","explain":"上下两条'夹板'在 x 趋向 0 时都收拢到 1，被夹在中间的 sin(x)/x 没有别的选择，只能也趋向 1。","formula":"\\lim_{x\\to 0}\\frac{\\sin x}{x}=1","visual":null}]}`

function readApiKey() {
  const env = readFileSync(new URL('./.env', import.meta.url), 'utf-8')
  const line = env.split(/\r?\n/).find((l) => l.trim().startsWith('VITE_DEEPSEEK_API_KEY='))
  if (!line) throw new Error('未找到 VITE_DEEPSEEK_API_KEY')
  const key = line.split('=').slice(1).join('=').trim()
  if (!key || key.includes('你的key')) throw new Error('API Key 仍是占位符，请先填写')
  return key
}

async function main() {
  const apiKey = readApiKey()
  const problem = process.argv[2] || '∫₀^π x·sin(x) dx'
  console.log('测试题目：', problem)

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `题目：${EXAMPLE_PROBLEM}` },
        { role: 'assistant', content: EXAMPLE_ANSWER },
        { role: 'user', content: `题目：${problem}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 2600,
    }),
  })

  if (response.status === 401) throw new Error('401：API Key 无效')
  if (response.status === 429) throw new Error('429：请求太频繁')
  if (!response.ok) throw new Error(`请求失败，状态码 ${response.status}`)

  const data = await response.json()
  const content = data.choices[0].message.content
  console.log('\n=== AI 原始返回（前 800 字符）===')
  console.log(content.slice(0, 800))
  console.log('=== 原始返回结束 ===\n')

  let parsed
  try {
    parsed = JSON.parse(content)
  } catch (e1) {
    const m = content.match(/\{[\s\S]*\}/)
    try {
      parsed = m ? JSON.parse(m[0]) : null
    } catch (e2) {
      console.error('直接解析失败：', e1.message)
      console.error('正则截取后仍失败：', e2.message)
      parsed = null
    }
  }
  if (!parsed) throw new Error('返回内容无法解析为 JSON')

  console.log('知识点：', parsed.topic || '(空)')
  console.log('答案：', parsed.answer || '(空)')
  console.log('步骤数：', parsed.steps ? parsed.steps.length : 0)

  let visualCount = 0
  let exprFail = 0
  parsed.steps.forEach((s, i) => {
    const flag = s.visual ? `[图] ${s.visual.expr}` : '[无图]'
    console.log(`  步骤${i + 1}. ${s.title}  ${flag}`)
    if (s.visual && s.visual.expr) {
      visualCount += 1
      const r = tryCompile(s.visual.expr)
      if (!r.ok) {
        exprFail += 1
        console.log(`       ⚠️ 表达式编译失败：${s.visual.expr} → ${r.error}`)
      }
    }
  })

  console.log('\n结果：')
  console.log(`  可视化步骤 ${visualCount} 个，其中表达式编译失败 ${exprFail} 个`)
  console.log(exprFail === 0 ? '  ✅ 全部表达式可被引擎执行' : '  ❌ 存在无法绘制的表达式')
}

main().catch((e) => {
  console.error('❌ 测试失败：', e.message)
  process.exit(1)
})
