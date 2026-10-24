# 极限工坊 · AI 高数私教

> 传智杯第九届 AI 创新应用挑战赛（Vibe Coding）参赛作品
> 把高数抽象概念做成可拖拽的交互可视化，AI 导师根据当前操作状态实时讲解，看完即练。

## 10 分钟极速复现指南（评委照此操作）

### 1. 环境要求
- Node.js ≥ 18（推荐 22）
- 现代浏览器（Chrome / Edge / Firefox）

### 2. 克隆并安装
```bash
git clone https://github.com/Silas-Sloy/math-viz-workshop.git
cd math-viz-workshop
npm install
```

### 3. 配置 API Key
```bash
cp .env.example .env
# 用编辑器打开 .env，把 VITE_DEEPSEEK_API_KEY 改成你的真实 key
# 去 https://platform.deepseek.com 注册获取（新户有免费额度）
```

### 4. 启动
```bash
npm run dev
```
浏览器打开终端显示的地址（通常 http://localhost:5173）

### 5. 验证可复现
- 拖动 ε 滑块，δ 横带应实时收缩
- 在 AI 导师对话框输入问题，应看到流式打字机输出
- 完成一道 AI 出题，应看到批改反馈

## 技术栈
- React 19 + Vite
- Zustand（状态管理）
- KaTeX（数学公式渲染）
- ECharts（学习进度看板）
- Canvas（函数曲线手绘）
- DeepSeek API（AI 导师 / 出题 / 批改）

## 项目结构
```
src/
├── components/
│   ├── visualizer/   # 交互可视化引擎（ε-δ / 切线逼近）
│   ├── chat/         # AI 导师对话面板
│   ├── quiz/         # AI 出题考你
│   └── dashboard/    # 学习进度看板
├── services/
│   └── llm.js        # DeepSeek API 封装（流式输出）
├── stores/
│   └── useMathStore.js  # Zustand 全局状态
└── utils/
docs/
└── prompt-log.md     # AI 编程 Prompt 链（满足可复现性要求）
```

## 开发过程可复现性说明
- Git 提交历史完整保留，每次提交对应一个功能模块落地
- `docs/prompt-log.md` 记录了至少 3 个核心功能与 AI 交互的完整 Prompt 链
- 详见技术文档 PDF 了解意图控制策略与架构设计
