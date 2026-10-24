import { create } from 'zustand'

// 全局状态：可视化参数 + 对话历史 + 掌握度
// 用 Zustand 让可视化引擎和 AI 对话面板共享同一份状态
// 这样 AI 导师能"看到"用户当前在调什么参数
const useMathStore = create((set, get) => ({
  // 当前激活的模块
  activeModule: 'limit', // 'limit' | 'tangent' | 'riemann'

  // ε-δ 极限可视化状态
  limitState: {
    func: 'x^2',      // 当前函数表达式
    x0: 1,            // 极限点
    epsilon: 0.5,     // ε 值（用户拖拽）
    delta: 0.17,      // δ = ε/3 ≈ 0.17（随 ε 变化，代码里计算）
    limitValue: 1,    // 极限值 L
  },

  // 切线逼近可视化状态
  tangentState: {
    func: 'x^2',
    pointA: 1,        // 定点 x 坐标
    deltaX: 1,        // Δx（用户拖拽，趋向 0）
    slope: 2,         // 当前割线斜率（代码计算）
    tangentSlope: 2,  // 切线斜率（导数值）
  },

  // AI 对话历史
  chatHistory: [],

  // 学习掌握度（用于出题难度自适应）
  mastery: {
    limit: 0,     // 0-100
    tangent: 0,
    riemann: 0,
  },

  // 操作方法
  setLimitState: (partial) =>
    set((s) => ({ limitState: { ...s.limitState, ...partial } })),

  setTangentState: (partial) =>
    set((s) => ({ tangentState: { ...s.tangentState, ...partial } })),

  setActiveModule: (m) => set({ activeModule: m }),

  addChatMessage: (msg) =>
    set((s) => ({ chatHistory: [...s.chatHistory, msg] })),

  updateMastery: (module, score) =>
    set((s) => ({ mastery: { ...s.mastery, [module]: score } })),

  // 获取当前可视化状态（用于注入 AI Prompt）
  getCurrentVisualState: () => {
    const s = get()
    if (s.activeModule === 'limit') return s.limitState
    if (s.activeModule === 'tangent') return s.tangentState
    return null
  },
}))

export default useMathStore
