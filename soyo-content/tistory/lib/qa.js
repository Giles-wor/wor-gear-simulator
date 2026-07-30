/**
 * 품질 검수 — 기획서 13장 체크리스트를 실행 가능한 검사로 옮긴 모듈.
 *
 * 브라우저(index.html)와 Node(qa-cli.mjs)에서 같은 코드를 쓴다.
 * 판정은 pass / warn / fail / manual 네 가지다.
 *  - fail   : 이 상태로 발행하면 안 된다
 *  - warn   : 확인하고 넘어갈 수 있다
 *  - manual : 코드가 판단할 수 없어 사람이 봐야 한다
 */

import {
  LEGACY_PERSONAS,
  LIMITS,
  SPONSOR_DISCLOSURE_HINTS,
  UNKNOWN_MARKERS,
  VOLATILE_KEYWORDS,
  recommendedImageCount,
} from './rules.js'

/* ------------------------------------------------------------------ */
/* 유사도                                                              */
/* ------------------------------------------------------------------ */

/** 공백/기호를 털어낸 글자 단위 bigram 집합. 한국어에서 충분히 잘 동작한다. */
function charBigrams(text) {
  const clean = String(text || '').replace(/[\s\p{P}\p{S}]/gu, '')
  const grams = new Set()
  for (let i = 0; i < clean.length - 1; i += 1) grams.add(clean.slice(i, i + 2))
  return grams
}

/** Dice 계수(0~1). 1에 가까울수록 같은 문장이다. */
export function similarity(a, b) {
  const A = charBigrams(a)
  const B = charBigrams(b)
  if (A.size === 0 || B.size === 0) return 0
  let shared = 0
  for (const gram of A) if (B.has(gram)) shared += 1
  return (2 * shared) / (A.size + B.size)
}

/* ------------------------------------------------------------------ */
/* 초안 파싱                                                            */
/* ------------------------------------------------------------------ */

/**
 * 최소 프론트매터 파서.
 * `key: value` 와 `key:` + `  - item` 두 형태만 지원한다. YAML 의존성을 두지 않는다.
 */
function parseFrontmatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  if (!match) return { data: {}, body: raw }

  const data = {}
  let currentListKey = null

  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue

    const listItem = /^\s*-\s+(.*)$/.exec(line)
    if (listItem && currentListKey) {
      data[currentListKey].push(listItem[1].trim())
      continue
    }

    const pair = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line)
    if (!pair) continue

    const [, key, value] = pair
    if (value === '') {
      currentListKey = key
      data[key] = []
    } else {
      currentListKey = null
      data[key] = value.trim()
    }
  }

  return { data, body: raw.slice(match[0].length) }
}

function toBool(value) {
  if (typeof value === 'boolean') return value
  return /^(true|yes|y|1|예|o)$/i.test(String(value || '').trim())
}

/**
 * 티스토리 초안 마크다운을 구조로 쪼갠다.
 * 반환: { data, body, sections, paragraphs, images, faq, headings, tags, titleAlts }
 */
export function parseDraft(raw) {
  const { data, body } = parseFrontmatter(String(raw || ''))

  const headings = []
  const sections = []
  let current = { heading: null, level: 0, lines: [] }

  for (const line of body.split(/\r?\n/)) {
    const h = /^(#{2,4})\s+(.*)$/.exec(line)
    if (h) {
      sections.push(current)
      const level = h[1].length
      const title = h[2].trim()
      headings.push({ level, title })
      current = { heading: title, level, lines: [] }
    } else {
      current.lines.push(line)
    }
  }
  sections.push(current)

  const withText = sections.map((s) => ({ ...s, text: s.lines.join('\n').trim() }))

  // 이미지: 표준 마크다운 문법만 센다.
  const images = []
  const imageRe = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g
  let m
  while ((m = imageRe.exec(body)) !== null) {
    images.push({ alt: m[1], src: m[2], caption: m[3] || '' })
  }

  // FAQ: `## FAQ` 아래의 `### Q. ...` 항목
  const faq = []
  const faqIndex = withText.findIndex((s) => s.heading && /^FAQ\b/i.test(s.heading))
  if (faqIndex >= 0) {
    for (let i = faqIndex + 1; i < withText.length; i += 1) {
      const s = withText[i]
      if (s.level <= withText[faqIndex].level) break
      if (/^Q[.:]?\s*/i.test(s.heading || '')) {
        faq.push({ q: s.heading.replace(/^Q[.:]?\s*/i, '').trim(), a: s.text })
      }
    }
  }

  // 첫 본문 문단: 프론트매터 뒤 첫 텍스트 문단(이미지/소제목 제외)
  const paragraphs = body
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter((p) => p && !/^#{1,4}\s/.test(p) && !/^!\[/.test(p) && !/^[-*>|]/.test(p))

  const tags = String(data.tags || '')
    .split(/[,\n]/)
    .map((t) => t.trim().replace(/^#/, ''))
    .filter(Boolean)

  return {
    data,
    body,
    sections: withText,
    headings,
    images,
    faq,
    paragraphs,
    tags,
    titleAlts: Array.isArray(data.title_alt) ? data.title_alt : [],
    sponsored: toBool(data.sponsored),
  }
}

/* ------------------------------------------------------------------ */
/* 수치 대조 (사실 임의 생성 방지 보조)                                   */
/* ------------------------------------------------------------------ */

const FACTUAL_UNITS = ['원', '시', '분', '시간', '층', '인', '명', '개', '평', '분거리', 'km', 'm', 'kg', 'g', 'ml', 'L', '%']
const UNIT_ALTERNATION = FACTUAL_UNITS.slice()
  .sort((a, b) => b.length - a.length)
  .map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|')

/** 단위가 붙은 숫자만 뽑는다. 단위 없는 맨숫자는 노이즈가 커서 제외한다. */
function extractFactualNumbers(text) {
  const re = new RegExp(`(\\d[\\d,]*(?:\\.\\d+)?)\\s*(${UNIT_ALTERNATION})`, 'g')
  const out = []
  let m
  while ((m = re.exec(String(text || ''))) !== null) {
    out.push({ raw: `${m[1]}${m[2]}`, digits: m[1].replace(/,/g, ''), unit: m[2] })
  }
  return out
}

/**
 * 티스토리 본문의 수치가 네이버 원문/핵심정보에 근거가 있는지 대조한다.
 * `1만원` 같은 표기 차이 때문에 오탐이 날 수 있어 warn 등급으로만 쓴다.
 */
function findUnsourcedNumbers(convertedBody, sourceHaystack) {
  const haystack = String(sourceHaystack || '').replace(/,/g, '')
  const seen = new Set()
  const unsourced = []
  for (const n of extractFactualNumbers(convertedBody)) {
    if (seen.has(n.raw)) continue
    seen.add(n.raw)
    if (!haystack.includes(n.digits)) unsourced.push(n.raw)
  }
  return unsourced
}

/* ------------------------------------------------------------------ */
/* 시점 표시                                                            */
/* ------------------------------------------------------------------ */

const DATE_MARKER_RE = /(\d{4}\s*년\s*\d{1,2}\s*월\s*(기준|현재))|방문\s*당시\s*기준|방문일\s*기준|작성\s*당시\s*기준|기준일/

function hasDateMarker(text) {
  return DATE_MARKER_RE.test(text) || UNKNOWN_MARKERS.some((mk) => String(text).includes(mk))
}

/* ------------------------------------------------------------------ */
/* 본 검사                                                             */
/* ------------------------------------------------------------------ */

const ok = (id, label, detail) => ({ id, label, status: 'pass', detail })
const warn = (id, label, detail) => ({ id, label, status: 'warn', detail })
const fail = (id, label, detail) => ({ id, label, status: 'fail', detail })
const manual = (id, label, detail) => ({ id, label, status: 'manual', detail })

/**
 * @param {object} input
 * @param {string} input.draft          티스토리 초안 마크다운(프론트매터 포함)
 * @param {string} input.naverTitle     네이버 원문 제목
 * @param {string} input.naverBody      네이버 원문 본문
 * @param {object} [input.context]      { subject, region, keyFacts, naverImageCount, naverUrl, sponsored }
 */
export function runQa({ draft, naverTitle = '', naverBody = '', context = {} }) {
  const parsed = parseDraft(draft)
  const { data, body, headings, images, faq, paragraphs, tags } = parsed
  const checks = []

  const title = String(data.title || '').trim()
  const subject = String(context.subject || '').trim()
  const region = String(context.region || '').trim()
  const sponsored = parsed.sponsored || toBool(context.sponsored)
  const naverUrl = String(data.naver_url || context.naverUrl || '').trim()

  /* 1. 제목이 네이버와 같지 않은가 */
  if (!title) {
    checks.push(fail('title-present', '티스토리 제목', '프론트매터에 title이 없다'))
  } else if (naverTitle && title === naverTitle.trim()) {
    checks.push(fail('title-differs', '제목 완전 변경', '네이버 제목과 완전히 동일하다'))
  } else if (naverTitle) {
    const s = similarity(title, naverTitle)
    checks.push(
      s > LIMITS.titleSimilarityMax
        ? warn('title-differs', '제목 완전 변경', `네이버 제목과 유사도 ${(s * 100).toFixed(0)}% — 더 바꾸는 편이 좋다`)
        : ok('title-differs', '제목 완전 변경', `네이버 제목과 유사도 ${(s * 100).toFixed(0)}%`)
    )
  } else {
    checks.push(manual('title-differs', '제목 완전 변경', '네이버 제목을 입력하지 않아 대조하지 못했다'))
  }

  /* 2. 제목 후보 3개 */
  const totalTitles = (title ? 1 : 0) + parsed.titleAlts.length
  checks.push(
    totalTitles >= LIMITS.titleCandidates
      ? ok('title-candidates', '제목 후보 3개', `${totalTitles}개 제시`)
      : warn('title-candidates', '제목 후보 3개', `${totalTitles}개뿐 — title_alt를 채우자`)
  )

  /* 3. 첫 문단이 원문과 과도하게 유사하지 않은가 */
  const firstPara = paragraphs[0] || ''
  const naverFirstPara =
    String(naverBody || '')
      .split(/\r?\n\s*\r?\n/)
      .map((p) => p.trim())
      .filter(Boolean)[0] || ''

  if (!firstPara) {
    checks.push(fail('intro-rewritten', '도입부 새로 작성', '본문 첫 문단을 찾을 수 없다'))
  } else if (!naverFirstPara) {
    checks.push(manual('intro-rewritten', '도입부 새로 작성', '네이버 본문이 없어 대조하지 못했다'))
  } else {
    const s = similarity(firstPara, naverFirstPara)
    checks.push(
      s > LIMITS.introSimilarityMax
        ? fail('intro-rewritten', '도입부 새로 작성', `네이버 첫 문단과 유사도 ${(s * 100).toFixed(0)}% — 새로 써야 한다`)
        : ok('intro-rewritten', '도입부 새로 작성', `네이버 첫 문단과 유사도 ${(s * 100).toFixed(0)}%`)
    )
  }

  /* 4. 핵심 키워드가 제목과 첫 문단에 있는가 */
  if (!subject) {
    checks.push(manual('keyword-placement', '핵심 키워드 배치', '장소명/제품명을 입력하지 않아 확인하지 못했다'))
  } else {
    const missing = []
    if (!title.includes(subject)) missing.push('제목에 장소명/제품명 없음')
    if (firstPara && !firstPara.includes(subject)) missing.push('첫 문단에 장소명/제품명 없음')
    if (region && !title.includes(region)) missing.push(`제목에 지역(${region}) 없음`)
    checks.push(
      missing.length === 0
        ? ok('keyword-placement', '핵심 키워드 배치', '제목과 첫 문단에 검색어가 들어갔다')
        : warn('keyword-placement', '핵심 키워드 배치', missing.join(' / '))
    )
  }

  /* 5. 메타 설명 길이 */
  const meta = String(data.meta || '').trim()
  if (!meta) {
    checks.push(fail('meta-length', '메타 설명', '메타 설명이 없다'))
  } else if (meta.length < LIMITS.metaMin || meta.length > LIMITS.metaMax) {
    checks.push(warn('meta-length', '메타 설명', `${meta.length}자 — 권장 ${LIMITS.metaMin}~${LIMITS.metaMax}자`))
  } else {
    checks.push(ok('meta-length', '메타 설명', `${meta.length}자`))
  }

  /* 6. 소제목이 적절히 들어갔는가 */
  checks.push(
    headings.length >= LIMITS.headingMin
      ? ok('headings', '소제목 구성', `소제목 ${headings.length}개`)
      : warn('headings', '소제목 구성', `소제목 ${headings.length}개 — ${LIMITS.headingMin}개 이상 권장`)
  )

  /* 7. 태그 개수 */
  if (tags.length < LIMITS.tagMin || tags.length > LIMITS.tagMax) {
    checks.push(warn('tags', '태그 개수', `${tags.length}개 — 권장 ${LIMITS.tagMin}~${LIMITS.tagMax}개`))
  } else {
    checks.push(ok('tags', '태그 개수', `${tags.length}개`))
  }

  /* 8. 이미지가 과도하게 많지 않은가 */
  const naverImageCount = Number(context.naverImageCount) || 0
  const rec = recommendedImageCount(naverImageCount)
  if (images.length === 0) {
    checks.push(warn('image-count', '이미지 수 축소', '본문 이미지가 없다'))
  } else if (images.length > LIMITS.imageSoftMax) {
    checks.push(fail('image-count', '이미지 수 축소', `${images.length}장 — 상한 ${LIMITS.imageSoftMax}장 초과`))
  } else if (naverImageCount && images.length >= naverImageCount) {
    checks.push(fail('image-count', '이미지 수 축소', `${images.length}장 — 네이버(${naverImageCount}장)보다 줄지 않았다`))
  } else if (images.length > rec.max) {
    checks.push(warn('image-count', '이미지 수 축소', `${images.length}장 — 권장 ${rec.min}~${rec.max}장`))
  } else {
    checks.push(ok('image-count', '이미지 수 축소', `${images.length}장 (권장 ${rec.min}~${rec.max}장)`))
  }

  /* 9. 대표 이미지 */
  checks.push(
    data.hero_image
      ? ok('hero-image', '대표 이미지', String(data.hero_image))
      : warn('hero-image', '대표 이미지', 'hero_image가 지정되지 않았다')
  )

  /* 10. FAQ가 억지로 만들어지지 않았는가 */
  if (faq.length === 0) {
    checks.push(ok('faq', 'FAQ', 'FAQ 없음 — 정보가 부족하면 생략이 맞다'))
  } else if (faq.length > LIMITS.faqMax) {
    checks.push(warn('faq', 'FAQ', `${faq.length}개 — ${LIMITS.faqMax}개 이하로 줄이자`))
  } else {
    const hollow = faq.filter((f) => !f.a || f.a.length < 15 || UNKNOWN_MARKERS.some((mk) => f.a.trim() === mk))
    checks.push(
      hollow.length
        ? warn('faq', 'FAQ', `답변이 빈약한 항목 ${hollow.length}개: ${hollow.map((f) => f.q).join(', ')}`)
        : ok('faq', 'FAQ', `${faq.length}개, 답변 모두 채워짐`)
    )
  }

  /* 11. 변동 정보에 시점이 표시됐는가 */
  const volatileSections = parsed.sections.filter(
    (s) => s.heading && VOLATILE_KEYWORDS.some((k) => s.heading.includes(k))
  )
  if (volatileSections.length === 0) {
    checks.push(ok('volatile-date', '변동 정보 시점 표시', '가격·운영시간 섹션이 없다'))
  } else {
    const naked = volatileSections.filter((s) => !hasDateMarker(s.text) && !hasDateMarker(body.slice(0, 400)))
    checks.push(
      naked.length
        ? fail(
            'volatile-date',
            '변동 정보 시점 표시',
            `시점 표시 없는 섹션: ${naked.map((s) => s.heading).join(', ')} — "2026년 7월 기준" 같은 문구가 필요하다`
          )
        : ok('volatile-date', '변동 정보 시점 표시', `${volatileSections.length}개 섹션 모두 시점 표시됨`)
    )
  }

  /* 12. 사실을 임의로 만들지 않았는가 (수치 대조) */
  const haystack = [naverBody, JSON.stringify(context.keyFacts || {})].join('\n')
  const unsourced = findUnsourcedNumbers(body, haystack)
  if (!naverBody) {
    checks.push(manual('no-fabrication', '수치 근거 대조', '네이버 본문이 없어 대조하지 못했다'))
  } else if (unsourced.length) {
    checks.push(
      warn(
        'no-fabrication',
        '수치 근거 대조',
        `원문에서 못 찾은 수치: ${unsourced.join(', ')} — 근거를 확인하자 (만원 단위 등 표기 차이면 무시)`
      )
    )
  } else {
    checks.push(ok('no-fabrication', '수치 근거 대조', '본문 수치가 모두 원문에서 확인된다'))
  }

  /* 13. 제3의 캐릭터가 생기지 않았는가 */
  const personaHits = LEGACY_PERSONAS.filter((p) => body.includes(p) || title.includes(p))
  checks.push(
    personaHits.length
      ? fail('single-brand', '브랜드 단일화', `과거 닉네임이 남아 있다: ${personaHits.join(', ')}`)
      : ok('single-brand', '브랜드 단일화', '과거 닉네임 흔적 없음')
  )

  /* 14. 네이버 원문 링크 */
  if (!naverUrl) {
    checks.push(warn('naver-link', '네이버 원문 링크', 'naver_url이 없다'))
  } else {
    checks.push(
      body.includes(naverUrl)
        ? ok('naver-link', '네이버 원문 링크', '본문에 포함됨')
        : warn('naver-link', '네이버 원문 링크', '본문에 링크가 없다 — 필요한 글이면 넣자')
    )
  }

  /* 15. 협찬 표시 */
  if (sponsored) {
    const disclosed = SPONSOR_DISCLOSURE_HINTS.some((h) => body.includes(h))
    checks.push(
      disclosed
        ? ok('sponsor-disclosure', '협찬 표시', '표시 문구가 있다')
        : fail('sponsor-disclosure', '협찬 표시', '협찬 글인데 표시 문구가 없다')
    )
  } else {
    checks.push(ok('sponsor-disclosure', '협찬 표시', '협찬 글 아님'))
  }

  /* 사람이 봐야 하는 항목 */
  checks.push(
    manual('manual-facts', '사실관계 최종 확인', '없는 사실이 새로 생기지 않았는지 원문과 나란히 읽어보자'),
    manual('manual-publish', '발행 전 검수', '최종 발행은 자동화하지 않는다. 직접 확인하고 발행한다')
  )

  const summary = { pass: 0, warn: 0, fail: 0, manual: 0 }
  for (const c of checks) summary[c.status] += 1

  return { checks, summary, parsed, publishable: summary.fail === 0 }
}
