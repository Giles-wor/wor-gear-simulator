/**
 * 티스토리 재가공 도구 — UI 로직.
 * 변환 규칙은 lib/ 아래에 있다. 이 파일은 입력을 모으고 결과를 그리는 일만 한다.
 */

import { CATEGORIES, LIMITS } from './lib/rules.js'
import { buildConversionPrompt } from './lib/prompt.js'
import { renderTistoryHtml } from './lib/render.js'
import { runQa } from './lib/qa.js'

const STORAGE_KEY = 'tistory-repurpose-draft-v1'

const KEY_FACT_FIELDS = [
  { id: 'address', label: '주소' },
  { id: 'hours', label: '운영시간' },
  { id: 'parking', label: '주차' },
  { id: 'price', label: '가격' },
  { id: 'reservation', label: '예약' },
  { id: 'kids', label: '아이 동반 여부' },
  { id: 'bring', label: '준비물' },
  { id: 'pros', label: '장점' },
  { id: 'cons', label: '단점' },
]

const $ = (sel) => document.querySelector(sel)
const lines = (value) =>
  String(value || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

/* ---------------------------------------------------------------- */
/* 초기 렌더                                                         */
/* ---------------------------------------------------------------- */

function buildCategorySelect() {
  const select = $('#category')
  select.innerHTML = '<option value="">(선택)</option>'
  for (const group of CATEGORIES) {
    const optgroup = document.createElement('optgroup')
    optgroup.label = group.name
    for (const child of group.children) {
      const option = document.createElement('option')
      option.value = `${group.name} > ${child}`
      option.textContent = child
      optgroup.appendChild(option)
    }
    select.appendChild(optgroup)
  }
}

function buildKeyFactInputs() {
  $('#keyFacts').innerHTML = KEY_FACT_FIELDS.map(
    ({ id, label }) => `
      <div>
        <label for="fact-${id}">${label}</label>
        <input type="text" id="fact-${id}" data-fact="${id}" />
      </div>`
  ).join('')
}

/* ---------------------------------------------------------------- */
/* 입력 수집 / 저장                                                   */
/* ---------------------------------------------------------------- */

function collectInput() {
  const keyFacts = {}
  for (const { id } of KEY_FACT_FIELDS) {
    keyFacts[id] = $(`#fact-${id}`).value.trim()
  }

  return {
    naverTitle: $('#naverTitle').value.trim(),
    naverBody: $('#naverBody').value,
    naverUrl: $('#naverUrl').value.trim(),
    subject: $('#subject').value.trim(),
    region: $('#region').value.trim(),
    category: $('#category').value,
    naverImageCount: Number($('#naverImageCount').value) || 0,
    keyFacts,
    images: lines($('#images').value),
    relatedTistoryUrls: lines($('#related').value),
    sponsored: $('#sponsored').checked,
    draft: $('#draft').value,
  }
}

function applyInput(state) {
  if (!state) return
  const set = (sel, value) => {
    const el = $(sel)
    if (el && value != null) el.value = value
  }
  set('#naverTitle', state.naverTitle)
  set('#naverBody', state.naverBody)
  set('#naverUrl', state.naverUrl)
  set('#subject', state.subject)
  set('#region', state.region)
  set('#category', state.category)
  set('#naverImageCount', state.naverImageCount || '')
  set('#images', (state.images || []).join('\n'))
  set('#related', (state.relatedTistoryUrls || []).join('\n'))
  set('#draft', state.draft)
  $('#sponsored').checked = Boolean(state.sponsored)
  for (const { id } of KEY_FACT_FIELDS) {
    set(`#fact-${id}`, state.keyFacts?.[id])
  }
}

let saveTimer = null
function scheduleSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collectInput()))
      $('#saveStatus').textContent = '자동 저장됨'
      setTimeout(() => ($('#saveStatus').textContent = ''), 1500)
    } catch {
      $('#saveStatus').textContent = '저장 실패 (용량 초과)'
    }
  }, 600)
}

function restore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) applyInput(JSON.parse(raw))
  } catch {
    /* 저장된 값이 깨졌으면 무시하고 빈 화면으로 시작한다 */
  }
}

/* ---------------------------------------------------------------- */
/* 클립보드                                                          */
/* ---------------------------------------------------------------- */

async function copyToClipboard(text, statusEl) {
  try {
    await navigator.clipboard.writeText(text)
    statusEl.textContent = '복사했다'
  } catch {
    statusEl.textContent = '복사 실패 — 직접 선택해서 복사하자'
  }
  setTimeout(() => (statusEl.textContent = ''), 2000)
}

/* ---------------------------------------------------------------- */
/* 출력 렌더                                                         */
/* ---------------------------------------------------------------- */

const STATUS_LABEL = { pass: '통과', warn: '확인', fail: '수정', manual: '직접' }

function renderQa(result) {
  const { checks, summary, publishable } = result

  const verdict = $('#verdict')
  verdict.className = `verdict ${publishable ? 'go' : 'stop'}`
  verdict.textContent = publishable
    ? `발행 가능 — 통과 ${summary.pass} / 확인 ${summary.warn} / 직접 확인 ${summary.manual}`
    : `수정 필요 ${summary.fail}건 — 고치고 다시 검수하자`

  $('#qaList').innerHTML = checks
    .map(
      (c) => `
      <div class="qa-item">
        <span class="badge ${c.status}">${STATUS_LABEL[c.status]}</span>
        <div>
          <div class="qa-label">${escape(c.label)}</div>
          <div class="qa-detail">${escape(c.detail)}</div>
        </div>
      </div>`
    )
    .join('')
}

function escape(s) {
  return String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch])
}

function renderAssets(rendered, qa) {
  const meta = rendered.meta || {}
  const titles = [meta.title, ...(Array.isArray(meta.title_alt) ? meta.title_alt : [])].filter(Boolean)

  const list = (items) => (items.length ? `<ul>${items.map((i) => `<li>${escape(i)}</li>`).join('')}</ul>` : '<p class="hint">없음</p>')

  $('#assetsOut').innerHTML = `
    <h3>제목 후보 ${titles.length}개</h3>
    ${list(titles)}

    <h3>메타 설명 (${(meta.meta || '').length}자 / 권장 ${LIMITS.metaMin}~${LIMITS.metaMax})</h3>
    <p>${escape(meta.meta || '(없음)')}</p>

    <h3>태그 ${qa.parsed.tags.length}개</h3>
    ${list(qa.parsed.tags)}

    <h3>카테고리</h3>
    <p>${escape(meta.category || '(미지정)')}</p>

    <h3>대표 이미지</h3>
    <p>${escape(meta.hero_image || '(미지정)')}</p>

    <h3>본문 이미지 순서 ${rendered.imagePlan.length}장</h3>
    ${list(rendered.imagePlan.map((i) => `${i.order}. ${i.src}${i.isHero ? ' (대표)' : ''} — ${i.alt || '대체텍스트 없음'}`))}

    <h3>내부 링크</h3>
    ${list(Array.isArray(meta.internal_links) ? meta.internal_links : [])}

    <h3>광고 위치 ${rendered.adSlots.length}곳</h3>
    ${list(rendered.adSlots.map((s) => `${s.n}. ${s.label}`))}
  `
}

function switchTab(name) {
  for (const btn of document.querySelectorAll('#tabs button')) {
    btn.setAttribute('aria-selected', String(btn.dataset.tab === name))
  }
  for (const panel of document.querySelectorAll('[data-panel]')) {
    panel.classList.toggle('hidden', panel.dataset.panel !== name)
  }
}

/* ---------------------------------------------------------------- */
/* 동작                                                             */
/* ---------------------------------------------------------------- */

function handleBuildPrompt() {
  const input = collectInput()
  if (!input.naverBody.trim()) {
    alert('네이버 본문을 먼저 붙여넣자.')
    return
  }
  $('#promptOut').value = buildConversionPrompt(input)
  $('#promptSection').classList.remove('hidden')
  $('#promptSection').scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function handleConvert() {
  const input = collectInput()
  const draft = input.draft.trim()

  if (!draft) {
    alert('클로드 변환 결과를 붙여넣자.')
    return
  }
  if (/^SKIP:/m.test(draft)) {
    alert('변환 결과가 SKIP이다. 이 글은 티스토리로 옮기지 않는 편이 맞다.')
    return
  }

  const rendered = renderTistoryHtml(draft)
  const qa = runQa({
    draft,
    naverTitle: input.naverTitle,
    naverBody: input.naverBody,
    context: {
      subject: input.subject,
      region: input.region,
      keyFacts: input.keyFacts,
      naverImageCount: input.naverImageCount,
      naverUrl: input.naverUrl,
      sponsored: input.sponsored,
    },
  })

  $('#htmlOut').textContent = rendered.html
  $('#previewOut').innerHTML = rendered.html
  renderQa(qa)
  renderAssets(rendered, qa)

  $('#outSection').classList.remove('hidden')
  switchTab('qa')
  $('#outSection').scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function init() {
  buildCategorySelect()
  buildKeyFactInputs()
  restore()

  $('#btnPrompt').addEventListener('click', handleBuildPrompt)
  $('#btnConvert').addEventListener('click', handleConvert)
  $('#btnCopyPrompt').addEventListener('click', () => copyToClipboard($('#promptOut').value, $('#promptStatus')))
  $('#btnCopyHtml').addEventListener('click', () => copyToClipboard($('#htmlOut').textContent, $('#htmlStatus')))

  $('#btnReset').addEventListener('click', () => {
    if (!confirm('입력한 내용을 모두 지운다. 계속할까?')) return
    localStorage.removeItem(STORAGE_KEY)
    location.reload()
  })

  $('#tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-tab]')
    if (btn) switchTab(btn.dataset.tab)
  })

  document.addEventListener('input', scheduleSave)
  document.addEventListener('change', scheduleSave)
}

init()
