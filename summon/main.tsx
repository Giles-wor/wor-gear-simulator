import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '../src/styles.css'
import './styles.css'

// number 인풋에 포커스하면 기존 값(특히 '0')을 자동 선택 → 타이핑 시 바로 대체됨.
document.addEventListener('focusin', (event) => {
  const target = event.target as HTMLInputElement | null
  if (!target || target.tagName !== 'INPUT') return
  if (target.type !== 'number') return
  requestAnimationFrame(() => {
    try {
      target.select()
    } catch {
      /* noop */
    }
  })
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
