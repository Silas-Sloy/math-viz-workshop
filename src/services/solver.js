import { tryCompile } from '../utils/mathEngine'

const API_URL = 'https://api.deepseek.com/chat/completions'
const REQUEST_TIMEOUT_MS = 60000
const TOO_FREQUENT_MESSAGE = '请求太频繁，稍等几秒再试'
const INVALID_JSON_MESSAGE = 'AI 返回的内容不是合法 JSON'
const TIMEOUT_MESSAGE = '请求超时（60 秒），请稍后重试'

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

export const EXAMPLE_PROBLEMS = ['∫₀^π x·sin(x) dx', 'lim(x→0) sin(x)/x', '求 f(x)=x³-3x 的极值', '∫₀³ (x²+1) dx']

function asText(value) {
  return typeof value === 'string' ? value : ''
}

function normalizeVisual(rawVisual) {
  if (!rawVisual || typeof rawVisual !== 'object' || Array.isArray(rawVisual)) {
    return null
  }

  if (rawVisual.type !== 'plot') {
    return null
  }

  let compiled
  try {
    compiled = tryCompile(rawVisual.expr)
  } catch (error) {
    compiled = { ok: false }
  }
  if (!compiled || !compiled.ok) {
    return null
  }

  const rawDomain = rawVisual.domain
  const validDomain =
    Array.isArray(rawDomain) &&
    rawDomain.length === 2 &&
    typeof rawDomain[0] === 'number' &&
    Number.isFinite(rawDomain[0]) &&
    typeof rawDomain[1] === 'number' &&
    Number.isFinite(rawDomain[1]) &&
    rawDomain[0] < rawDomain[1]
  const domain = validDomain ? [rawDomain[0], rawDomain[1]] : [-6, 6]

  const rawMarks = Array.isArray(rawVisual.marks) ? rawVisual.marks : []
  const marks = []
  for (let i = 0; i < rawMarks.length; i += 1) {
    const mark = rawMarks[i]
    if (!mark || typeof mark !== 'object' || Array.isArray(mark)) continue
    if (typeof mark.x !== 'number' || !Number.isFinite(mark.x)) continue
    marks.push({
      x: mark.x,
      label: asText(mark.label),
    })
  }

  return {
    type: 'plot',
    expr: rawVisual.expr,
    domain,
    fill: Boolean(rawVisual.fill),
    marks,
    note: asText(rawVisual.note),
  }
}

function normalizeStep(rawStep) {
  const step = rawStep && typeof rawStep === 'object' && !Array.isArray(rawStep) ? rawStep : {}

  return {
    title: asText(step.title),
    explain: asText(step.explain),
    formula: asText(step.formula),
    visual: normalizeVisual(step.visual),
  }
}

function normalizeResult(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const rawSteps = Array.isArray(source.steps) ? source.steps.slice(0, 6) : []
  const steps = rawSteps.map((step) => normalizeStep(step))

  if (steps.length === 0) {
    steps.push({
      title: '得到答案',
      explain: '把前面的推导整理成最终结果，再检查一下符号和范围，就可以得到答案。',
      formula: '',
      visual: null,
    })
  }

  return {
    problem: asText(source.problem),
    topic: asText(source.topic),
    answer: asText(source.answer),
    steps,
  }
}

function repairJson(text) {
  let t = String(text).trim()

  // 去掉 ```json ... ``` 这类 markdown 围栏
  const fence = t.match(/^```[a-zA-Z]*\s*([\s\S]*?)```\s*$/)
  if (fence) t = fence[1].trim()

  // 截取第一个 { 到最后一个 }
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start >= 0 && end > start) t = t.slice(start, end + 1)

  // 给漏加引号的 key 补上双引号（DeepSeek 偶发），不破坏已合法的 JSON
  t = t.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3')
  return t
}

function parseContent(content) {
  if (typeof content !== 'string' || content.trim() === '') {
    throw new Error(INVALID_JSON_MESSAGE)
  }

  const candidates = [content, repairJson(content)]
  for (let i = 0; i < candidates.length; i += 1) {
    try {
      return JSON.parse(candidates[i])
    } catch (error) {
      // 尝试下一个候选项
    }
  }

  throw new Error(INVALID_JSON_MESSAGE)
}

export async function solveProblem(problem, options = {}) {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY
  if (typeof apiKey !== 'string' || apiKey.trim() === '') {
    throw new Error('未配置 API Key，请在 .env 里填 VITE_DEEPSEEK_API_KEY')
  }

  const controller = new AbortController()
  let didTimeout = false
  const timeoutId = setTimeout(() => {
    didTimeout = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

  try {
    let response
    try {
      response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
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
        signal: controller.signal,
      })
    } catch (error) {
      if (didTimeout) {
        throw new Error(TIMEOUT_MESSAGE)
      }
      if (error instanceof TypeError || (error && error.name === 'TypeError')) {
        throw new Error('网络请求失败，请检查网络或 API Key')
      }
      throw new Error('网络请求失败，请检查网络或 API Key')
    }

    if (response.status === 401) {
      throw new Error('API Key 无效')
    }
    if (response.status === 429) {
      throw new Error(TOO_FREQUENT_MESSAGE)
    }
    if (!response.ok) {
      throw new Error(`请求失败（状态码 ${response.status}）`)
    }

    let data
    try {
      data = await response.json()
    } catch (error) {
      if (didTimeout) {
        throw new Error(TIMEOUT_MESSAGE)
      }
      throw new Error('接口返回的数据格式异常')
    }

    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
    return normalizeResult(parseContent(content))
  } finally {
    clearTimeout(timeoutId)
  }
}
