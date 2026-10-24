import useMathStore from '../stores/useMathStore'

const API_URL = 'https://api.deepseek.com/chat/completions'

// 把当前可视化状态拼成 Prompt 上下文
// 这是"状态驱动 Prompt 注入"的核心——AI 知道用户在看什么
function buildContextPrompt(userMessage) {
  const state = useMathStore.getState().getCurrentVisualState()
  const module = useMathStore.getState().activeModule

  const moduleNames = {
    limit: '极限 ε-δ 定义',
    tangent: '导数与切线逼近',
    riemann: '定积分黎曼和',
  }

  const context = state
    ? `学习者当前正在学习「${moduleNames[module]}」可视化模块，当前操作状态：${JSON.stringify(state)}。请基于这个状态回答问题，让讲解绑定到用户当前看到的画面。`
    : ''

  return `${context}\n\n学习者提问：${userMessage}`
}

// 流式调用 DeepSeek
// 返回一个 async generator，逐字 yield AI 回复
export async function* streamChat(userMessage, onMessage) {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY
  if (!apiKey) {
    yield '（未配置 API Key，请在 .env 文件填入 VITE_DEEPSEEK_API_KEY）'
    return
  }

  const prompt = buildContextPrompt(userMessage)

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一位耐心的高数私教。学习者正在用交互可视化工具学高数。你要结合学习者当前的操作状态，用通俗语言讲解概念，多用比喻，少用术语。回复要短，每次不超过 200 字。',
        },
        { role: 'user', content: prompt },
      ],
      stream: true,
    }),
  })

  if (!response.ok) {
    yield `（请求失败：${response.status}。请检查 API Key 和网络。）`
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') return
      try {
        const json = JSON.parse(data)
        const delta = json.choices?.[0]?.delta?.content
        if (delta) {
          if (onMessage) onMessage(delta)
          yield delta
        }
      } catch (e) {
        // 忽略解析错误的行
      }
    }
  }
}

// 非流式调用（出题、批改用）
export async function chatOnce(messages) {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY
  if (!apiKey) return '（未配置 API Key）'

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      stream: false,
    }),
  })

  if (!response.ok) return `（请求失败：${response.status}）`
  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

// AI 出题：根据当前模块 + 掌握度出题
export async function generateQuiz(module, mastery) {
  const difficulty = mastery < 40 ? '简单' : mastery < 70 ? '中等' : '进阶'
  const moduleNames = {
    limit: '极限的 ε-δ 定义',
    tangent: '导数与切线',
    riemann: '定积分',
  }
  const messages = [
    {
      role: 'system',
      content: '你出高数题。只出一道选择题，给4个选项，标明正确答案。难度按学习者掌握度调整。题目要短。',
    },
    {
      role: 'user',
      content: `出题模块：${moduleNames[module]}。难度：${difficulty}。请返回 JSON 格式：{"question":"题目","options":["A","B","C","D"],"answer":"正确选项字母","explain":"解析"}`,
    },
  ]
  const result = await chatOnce(messages)
  try {
    return JSON.parse(result)
  } catch {
    return { question: result, options: [], answer: '', explain: '' }
  }
}

// AI 批改
export async function gradeAnswer(quiz, userAnswer) {
  const messages = [
    {
      role: 'system',
      content: '你批改高数题。判断对错，指出误区，讲解正确思路。回复要短。',
    },
    {
      role: 'user',
      content: `题目：${quiz.question}\n正确答案：${quiz.answer}\n学习者答案：${userAnswer}\n请批改并讲解。`,
    },
  ]
  return await chatOnce(messages)
}
