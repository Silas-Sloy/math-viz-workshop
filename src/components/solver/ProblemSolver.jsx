import { useEffect, useRef, useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import PlotCanvas from '../plot/PlotCanvas'
import { solveProblem, EXAMPLE_PROBLEMS } from '../../services/solver'

const BLUE = '#185FA5'
const DARK_BLUE = '#0C447C'
const GREEN = '#0F6E56'
const RED = '#A32D2D'
const MUTED = '#8a94a2'
const BORDER = '#e8eaed'
const SANS = '"Segoe UI", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
const MONO = '"SFMono-Regular", Consolas, "Liberation Mono", monospace'

function renderLatex(value, displayMode) {
  if (typeof value !== 'string' || value.trim() === '') {
    return { html: '', failed: false }
  }

  try {
    return {
      html: katex.renderToString(value, {
        throwOnError: false,
        displayMode,
      }),
      failed: false,
    }
  } catch (error) {
    return { html: '', failed: true }
  }
}

function StepCard({ step, index, active, visible, onSelect }) {
  const formula = typeof step.formula === 'string' ? step.formula.trim() : ''
  const renderedFormula = formula ? renderLatex(formula, true) : null

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={active ? 'step' : undefined}
      aria-label={`第 ${index + 1} 步：${step.title || '未命名步骤'}`}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      style={{
        position: 'relative',
        boxSizing: 'border-box',
        background: active ? '#f7fafd' : '#ffffff',
        border: `1px solid ${active ? BLUE : BORDER}`,
        boxShadow: active ? `inset 3px 0 0 ${BLUE}` : 'none',
        borderRadius: 10,
        padding: '14px 16px',
        marginBottom: 12,
        cursor: 'pointer',
        outline: 'none',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
        transitionDelay: `${index * 0.06}s`,
        animationDelay: `${index * 0.06}s`,
        willChange: 'opacity, transform',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            width: 24,
            height: 24,
            flex: '0 0 24px',
            borderRadius: '50%',
            background: BLUE,
            color: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            lineHeight: 1,
            boxShadow: active ? '0 0 0 3px #dce9f6' : 'none',
          }}
        >
          {index + 1}
        </span>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            color: DARK_BLUE,
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 1.45,
          }}
        >
          {step.title || '这一步'}
        </span>
        {step.visual ? (
          <span
            style={{
              flex: '0 0 auto',
              color: BLUE,
              background: '#eef4fb',
              borderRadius: 8,
              padding: '2px 6px',
              fontSize: 10,
              lineHeight: 1.5,
              fontWeight: 600,
            }}
          >
            有图
          </span>
        ) : null}
      </div>

      <div
        style={{
          color: '#4a5568',
          fontSize: 13,
          lineHeight: 1.7,
          wordBreak: 'break-word',
        }}
      >
        {step.explain || '这一步暂时没有更多说明。'}
      </div>

      {formula ? (
        <div
          style={{
            margin: '10px 0',
            overflowX: 'auto',
            overflowY: 'hidden',
            textAlign: 'center',
            color: DARK_BLUE,
            fontSize: 15,
          }}
        >
          {renderedFormula && renderedFormula.html ? (
            <div dangerouslySetInnerHTML={{ __html: renderedFormula.html }} />
          ) : (
            <div
              style={{
                margin: '10px 0',
                color: '#4a5568',
                fontFamily: MONO,
                fontSize: 13,
                lineHeight: 1.7,
                textAlign: 'center',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {formula}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

function Skeleton({ variant = 'canvas' }) {
  if (variant === 'steps') {
    return (
      <div aria-hidden="true">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            style={{
              height: 90,
              marginBottom: 12,
              borderRadius: 10,
              border: `1px solid ${BORDER}`,
              background: '#eef1f4',
              boxSizing: 'border-box',
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes problemSolverBreathe {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
      <div
        aria-busy="true"
        aria-label="AI 正在拆题"
        style={{
          height: 400,
          boxSizing: 'border-box',
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          background: '#fafbfc',
          padding: '36px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 18,
        }}
      >
        {[100, 84, 68].map((width, index) => (
          <div
            key={width}
            style={{
              width: `${width}%`,
              height: 52,
              borderRadius: 9,
              background: '#e8ecf1',
              animation: 'problemSolverBreathe 1.2s ease-in-out infinite',
              animationDelay: `${index * 0.08}s`,
            }}
          />
        ))}
        <div
          style={{
            marginTop: 8,
            color: MUTED,
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          AI 正在拆题…
        </div>
      </div>
    </>
  )
}

function EmptyHint({ title, hint }) {
  return (
    <div
      style={{
        height: 400,
        boxSizing: 'border-box',
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        background: '#fafbfc',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          marginBottom: 14,
          borderRadius: '50%',
          background: '#eef1f4',
          color: MUTED,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          lineHeight: 1,
        }}
      >
        ∿
      </div>
      <div
        style={{
          color: '#4a5568',
          fontSize: 15,
          lineHeight: 1.6,
        }}
      >
        {title}
      </div>
      {hint ? (
        <div
          style={{
            maxWidth: 380,
            marginTop: 6,
            color: MUTED,
            fontSize: 13,
            lineHeight: 1.7,
          }}
        >
          {hint}
        </div>
      ) : null}
    </div>
  )
}

export default function ProblemSolver() {
  const [problem, setProblem] = useState('')
  const [result, setResult] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isWide, setIsWide] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 900
  )
  const [cardsVisible, setCardsVisible] = useState(false)
  const requestIdRef = useRef(0)

  useEffect(() => {
    function handleResize() {
      setIsWide(window.innerWidth >= 900)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (status !== 'done' || !result) {
      setCardsVisible(false)
      return undefined
    }

    setCardsVisible(false)
    const timer = setTimeout(() => {
      setCardsVisible(true)
    }, 30)

    return () => clearTimeout(timer)
  }, [status, result])

  useEffect(() => {
    if (status !== 'done' || !result || !Array.isArray(result.steps)) {
      return undefined
    }
    if (result.steps.length === 0) return undefined

    function handleKeyDown(event) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) {
        return
      }

      const target = event.target
      const tagName = target && target.tagName
      if (
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT' ||
        (target && target.isContentEditable)
      ) {
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setCurrentIndex((previous) => Math.max(0, previous - 1))
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        setCurrentIndex((previous) =>
          Math.min(result.steps.length - 1, previous + 1)
        )
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [status, result])

  async function submit(targetProblem) {
    const text = (typeof targetProblem === 'string' ? targetProblem : problem).trim()
    if (!text) return

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setProblem(text)
    setStatus('loading')
    setErrorMsg('')
    setResult(null)
    setCurrentIndex(0)
    setCardsVisible(false)

    try {
      const nextResult = await solveProblem(text)
      if (requestIdRef.current !== requestId) return
      setResult(nextResult)
      setCurrentIndex(0)
      setStatus('done')
    } catch (error) {
      if (requestIdRef.current !== requestId) return
      setErrorMsg(error && error.message ? error.message : '未知错误，请稍后重试')
      setStatus('error')
    }
  }

  function handleInputKeyDown(event) {
    if (event.nativeEvent && event.nativeEvent.isComposing) return
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      submit()
    }
  }

  function handleAnotherExample() {
    const allExamples = Array.isArray(EXAMPLE_PROBLEMS) ? EXAMPLE_PROBLEMS : []
    if (allExamples.length === 0) return

    const differentExamples = allExamples.filter((item) => item !== problem)
    const pool = differentExamples.length > 0 ? differentExamples : allExamples
    const nextProblem = pool[Math.floor(Math.random() * pool.length)]
    setProblem(nextProblem)
  }

  const steps = result && Array.isArray(result.steps) ? result.steps : []
  const totalSteps = steps.length
  const currentStep = steps[currentIndex] || null
  const isLoading = status === 'loading'
  const isDone = status === 'done' && Boolean(result)
  const answerLatex =
    result && typeof result.answer === 'string' ? result.answer.trim() : ''
  const answerRendered = answerLatex ? renderLatex(answerLatex, false) : null

  return (
    <div
      style={{
        width: '100%',
        boxSizing: 'border-box',
        color: '#1f2937',
        fontFamily: SANS,
      }}
    >
      <header style={{ marginBottom: 18 }}>
        <h2
          style={{
            margin: '0 0 6px',
            color: DARK_BLUE,
            fontSize: 24,
            fontWeight: 700,
            lineHeight: 1.3,
          }}
        >
          输入一道题，看它被拆开
        </h2>
        <p
          style={{
            margin: 0,
            color: '#8a94a2',
            fontSize: 13,
            lineHeight: 1.7,
          }}
        >
          AI 把解题过程拆成几步，每一步配一张能拖能查的图
        </p>
      </header>

      <div>
        <textarea
          rows={3}
          value={problem}
          onChange={(event) => setProblem(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="粘贴或输入一道高数题，例如 ∫₀^π x·sin(x) dx"
          aria-label="数学题目"
          style={{
            display: 'block',
            width: '100%',
            boxSizing: 'border-box',
            padding: 12,
            border: '1px solid #d9dee5',
            borderRadius: 8,
            fontSize: 15,
            lineHeight: 1.6,
            fontFamily: 'inherit',
            color: '#1f2937',
            background: '#ffffff',
            resize: 'vertical',
            outlineColor: BLUE,
          }}
        />

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 10,
            marginTop: 12,
          }}
        >
          <button
            type="button"
            onClick={() => submit()}
            disabled={isLoading || problem.trim() === ''}
            style={{
              padding: '10px 22px',
              border: 'none',
              borderRadius: 8,
              background: isLoading || problem.trim() === '' ? '#c8ced6' : BLUE,
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: isLoading || problem.trim() === '' ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s ease',
            }}
          >
            {isLoading ? 'AI 正在拆题…' : '拆解这道题'}
          </button>
          <button
            type="button"
            onClick={handleAnotherExample}
            style={{
              padding: '10px 18px',
              border: `1px solid ${BLUE}`,
              borderRadius: 8,
              background: '#ffffff',
              color: BLUE,
              fontSize: 14,
              fontWeight: 500,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            换个例子
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 12,
          }}
        >
          {(Array.isArray(EXAMPLE_PROBLEMS) ? EXAMPLE_PROBLEMS : []).map(
            (example, index) => (
              <button
                key={`${example}-${index}`}
                type="button"
                onClick={() => submit(example)}
                style={{
                  padding: '4px 10px',
                  border: 'none',
                  borderRadius: 14,
                  background: '#eef4fb',
                  color: BLUE,
                  fontSize: 12,
                  lineHeight: 1.6,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                {example}
              </button>
            )
          )}
        </div>
      </div>

      {isDone ? (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px 16px',
            marginTop: 18,
            padding: '10px 14px',
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            background: '#f7fafd',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
              flex: '1 1 260px',
              minWidth: 0,
            }}
          >
            <span
              style={{
                flex: '0 0 auto',
                padding: '2px 8px',
                borderRadius: 10,
                background: '#eef4fb',
                color: BLUE,
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1.6,
              }}
            >
              {result.topic || '解题'}
            </span>
            <span
              style={{
                minWidth: 0,
                color: '#333333',
                fontSize: 14,
                lineHeight: 1.6,
                wordBreak: 'break-word',
              }}
            >
              {result.problem || problem}
            </span>
          </div>
          <div
            style={{
              flex: '0 0 auto',
              color: GREEN,
              fontSize: 18,
              fontWeight: 600,
              lineHeight: 1.6,
              whiteSpace: 'nowrap',
            }}
          >
            答案{' '}
            {answerRendered && answerRendered.html ? (
              <span
                style={{ color: GREEN, fontSize: 18 }}
                dangerouslySetInnerHTML={{ __html: answerRendered.html }}
              />
            ) : (
              <span style={{ color: GREEN, fontSize: 18 }}>{answerLatex || '—'}</span>
            )}
          </div>
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          flexDirection: isWide ? 'row' : 'column',
          gap: 24,
          alignItems: 'flex-start',
          width: '100%',
          marginTop: 18,
        }}
      >
        <div
          style={
            isWide
              ? { width: 400, flex: '0 0 400', minWidth: 0 }
              : { width: '100%', flex: '1 1 auto', minWidth: 0 }
          }
        >
          {isLoading ? (
            <Skeleton variant="steps" />
          ) : isDone ? (
            steps.map((step, index) => (
              <StepCard
                key={`${index}-${step.title}`}
                step={step}
                index={index}
                active={index === currentIndex}
                visible={cardsVisible}
                onSelect={() => setCurrentIndex(index)}
              />
            ))
          ) : null}
        </div>

        <section
          aria-label="步骤图像"
          style={{ flex: 1, minWidth: 0, width: '100%' }}
        >
          {status === 'idle' ? (
            <EmptyHint
              title="还没有题目"
              hint="输入一道高数题，拆解后的每一步图像会出现在这里"
            />
          ) : null}

          {isLoading ? <Skeleton /> : null}

          {status === 'error' ? (
            <div
              style={{
                height: 400,
                boxSizing: 'border-box',
                border: '1px solid #f0dada',
                borderRadius: 12,
                background: '#fffafa',
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  color: RED,
                  fontSize: 20,
                  fontWeight: 700,
                  lineHeight: 1.5,
                }}
              >
                出错了
              </div>
              <p
                style={{
                  maxWidth: 520,
                  margin: '8px 0 16px',
                  color: RED,
                  fontSize: 13,
                  lineHeight: 1.7,
                  wordBreak: 'break-word',
                }}
              >
                {errorMsg || '请求失败，请稍后重试'}
              </p>
              <button
                type="button"
                onClick={() => submit()}
                style={{
                  padding: '9px 20px',
                  border: 'none',
                  borderRadius: 8,
                  background: RED,
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                重试
              </button>
            </div>
          ) : null}

          {isDone && currentStep ? (
            <>
              {currentStep.visual ? (
                <div
                  style={{
                    border: `1px solid ${BORDER}`,
                    borderRadius: 12,
                    overflow: 'hidden',
                    background: '#ffffff',
                  }}
                >
                  <PlotCanvas spec={currentStep.visual} height={400} />
                </div>
              ) : (
                <EmptyHint title="这一步是一步推理，没有图像" />
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  marginTop: 14,
                }}
              >
                <div
                  style={{
                    color: '#4a5568',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  第 {currentIndex + 1} / 共 {totalSteps} 步
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentIndex((previous) => Math.max(0, previous - 1))
                    }
                    disabled={currentIndex === 0}
                    style={{
                      padding: '7px 14px',
                      border: `1px solid ${currentIndex === 0 ? '#d9dee5' : BLUE}`,
                      borderRadius: 8,
                      background: currentIndex === 0 ? '#f3f5f7' : '#ffffff',
                      color: currentIndex === 0 ? '#aeb6c1' : BLUE,
                      fontSize: 13,
                      fontFamily: 'inherit',
                      cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    上一步
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentIndex((previous) =>
                        Math.min(totalSteps - 1, previous + 1)
                      )
                    }
                    disabled={currentIndex >= totalSteps - 1}
                    style={{
                      padding: '7px 14px',
                      border: `1px solid ${
                        currentIndex >= totalSteps - 1 ? '#d9dee5' : BLUE
                      }`,
                      borderRadius: 8,
                      background:
                        currentIndex >= totalSteps - 1 ? '#f3f5f7' : '#ffffff',
                      color:
                        currentIndex >= totalSteps - 1 ? '#aeb6c1' : BLUE,
                      fontSize: 13,
                      fontFamily: 'inherit',
                      cursor:
                        currentIndex >= totalSteps - 1
                          ? 'not-allowed'
                          : 'pointer',
                    }}
                  >
                    下一步
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </div>
  )
}
