import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '../src/styles.css'
import './styles.css'

// number 인풋 포커스 시 기존 값 자동 선택
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
