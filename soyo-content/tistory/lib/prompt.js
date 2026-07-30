/**
 * 구조화된 입력 → 티스토리 재가공 프롬프트.
 *
 * 프롬프트는 rules.js에서 규칙을 읽어 만든다. 규칙을 바꾸면 프롬프트도 같이 바뀐다.
 * 만들어진 프롬프트는 클로드에 그대로 붙여넣으면 되고, 결과물은 qa.js가 검수한다.
 */

import {
  BRAND,
  BODY_SECTIONS,
  DEDUP_RULES,
  EXCLUDE_TOPICS,
  INCLUDE_TOPICS,
  LIMITS,
  UNKNOWN_MARKERS,
  VOICE,
  recommendedImageCount,
} from './rules.js'

const KEY_FACT_LABELS = {
  address: '주소',
  hours: '운영시간',
  parking: '주차',
  price: '가격',
  reservation: '예약',
  kids: '아이 동반 여부',
  bring: '준비물',
  pros: '장점',
  cons: '단점',
}

const bullets = (items) => items.map((s) => `- ${s}`).join('\n')

function renderKeyFacts(keyFacts = {}) {
  const rows = Object.entries(KEY_FACT_LABELS)
    .map(([key, label]) => {
      const value = String(keyFacts[key] ?? '').trim()
      return `- ${label}: ${value || '(미입력 — 원문에 없으면 "확인 필요"로 두고 만들어내지 말 것)'}`
    })
    .join('\n')
  return rows
}

function renderBodyTemplate() {
  return BODY_SECTIONS.map((s) => {
    const notes = []
    if (s.optional) notes.push('정보 없으면 섹션 자체를 생략')
    if (s.volatile) notes.push('반드시 "YYYY년 M월 기준" 같은 시점 표시')
    return `- ${s.title}${notes.length ? ` — ${notes.join(', ')}` : ''}`
  }).join('\n')
}

/**
 * @param {object} input
 * @param {string} input.naverTitle
 * @param {string} input.naverBody
 * @param {string} input.subject   장소명 또는 제품명
 * @param {string} [input.region]
 * @param {string} [input.category]
 * @param {object} [input.keyFacts]
 * @param {string[]} [input.images]              사용 가능한 이미지 파일명 목록
 * @param {number} [input.naverImageCount]       네이버에서 쓴 이미지 수
 * @param {string} [input.naverUrl]
 * @param {string[]} [input.relatedTistoryUrls]  내부 링크 후보용 기존 티스토리 글
 * @param {boolean} [input.sponsored]
 * @returns {string}
 */
export function buildConversionPrompt(input) {
  const {
    naverTitle = '',
    naverBody = '',
    subject = '',
    region = '',
    category = '',
    keyFacts = {},
    images = [],
    naverImageCount = 0,
    naverUrl = '',
    relatedTistoryUrls = [],
    sponsored = false,
  } = input

  const imageCount = naverImageCount || images.length
  const rec = recommendedImageCount(imageCount)

  return `당신은 ${BRAND.handle}의 콘텐츠 편집자다.
아래 네이버 블로그 원고를 티스토리용 "검색형 정보 글"로 재가공한다.

# 대전제

- 네이버는 브랜드를 키우고, 티스토리는 검색 자산을 쌓는다.
- 티스토리 운영자도 동일하게 ${BRAND.operator}다. 제3의 캐릭터를 만들지 않는다.
- 추가 취재·추가 방문·새로운 사실 창작을 하지 않는다. 원문에 있는 사실만 재배치한다.
- 원문에 없는 정보는 다음 문구로 표시한다: ${UNKNOWN_MARKERS.map((m) => `"${m}"`).join(', ')}

# 이 글이 재가공 대상인지 먼저 판단

우선 대상:
${bullets(INCLUDE_TOPICS)}

제외 대상:
${bullets(EXCLUDE_TOPICS)}

제외 대상에 해당하면 변환하지 말고, 첫 줄에 \`SKIP: <이유>\`만 출력하고 끝낸다.
${sponsored ? '\n이 글은 협찬/체험단 글이다. 타 플랫폼 재게시가 계약상 가능한지 확인됐다는 전제로만 진행하고, 본문에 협찬 표시 문구를 반드시 남긴다.\n' : ''}
# 중복 콘텐츠 방지 (필수)

${bullets(DEDUP_RULES)}

단, 사실관계와 실제 경험은 그대로 유지한다. 없는 사실을 만들지 않는다.

# 말투

유지할 것:
${bullets(VOICE.keep)}

줄일 것:
${bullets(VOICE.reduce)}

# 입력

- 네이버 제목: ${naverTitle || '(없음)'}
- 장소명/제품명: ${subject || '(없음)'}
- 지역: ${region || '(없음)'}
- 카테고리: ${category || '(없음)'}
- 발행된 네이버 글 URL: ${naverUrl || '(없음)'}
- 네이버 이미지 수: ${imageCount || '(모름)'}

핵심 정보:
${renderKeyFacts(keyFacts)}

사용 가능한 이미지:
${images.length ? bullets(images) : '- (없음)'}

내부 링크 후보로 검토할 기존 티스토리 글:
${relatedTistoryUrls.length ? bullets(relatedTistoryUrls) : '- (없음)'}

네이버 본문:
"""
${naverBody}
"""

# 출력 형식

아래 형식 그대로, 다른 설명 없이 출력한다. 프론트매터의 키 이름을 바꾸지 않는다.

\`\`\`markdown
---
title: (검색어 중심 제목 1안)
title_alt:
  - (2안)
  - (3안)
meta: (${LIMITS.metaMin}~${LIMITS.metaMax}자 메타 설명)
tags: (${LIMITS.tagMin}~${LIMITS.tagMax}개, 콤마로 구분)
category: (새 카테고리 체계에 맞춰 지정)
hero_image: (대표 이미지 파일명)
naver_url: ${naverUrl || '(없음)'}
sponsored: ${sponsored ? 'true' : 'false'}
internal_links:
  - (연관 기존 티스토리 글 URL과 앵커 텍스트, 없으면 이 줄 삭제)
---

(본문)
\`\`\`

## 제목 규칙

- 네이버 제목과 완전히 다른 문장이어야 한다.
- 제목에 장소명/제품명과 지역, 검색자가 실제로 칠 단어를 넣는다.
- 예: "대전 용호낙지 메뉴 가격 주차 낙곱새 후기"

## 본문 구조

소제목(\`##\`)으로 아래 순서를 따른다. 해당 정보가 없는 항목은 억지로 만들지 않고 생략한다.

${renderBodyTemplate()}

## 본문 세부 규칙

- 첫 문단은 네이버 도입부를 재사용하지 않고 새로 쓴다. 검색자가 알고 싶은 결론을 먼저 준다.
- "핵심 정보 요약"은 마크다운 표로 만든다. (항목 | 내용)
- 가격·운영시간처럼 변하는 정보에는 시점을 붙인다. 예: "2026년 7월 방문 당시 기준"
- 이미지는 \`![대체텍스트](파일명)\` 형태로 본문 흐름에 맞춰 배치한다.
- 이미지는 ${rec.min}~${rec.max}장만 쓴다. 네이버(${imageCount || '?'}장)보다 반드시 적어야 한다.
- FAQ는 \`### Q. 질문\` + 답변 문단 형태로 쓴다. 원문에서 답할 수 있는 질문만 ${LIMITS.faqMin}~${LIMITS.faqMax}개. 답할 수 없으면 FAQ 섹션을 아예 넣지 않는다.
- 소제목은 ${LIMITS.headingMin}개 이상.
- 광고 코드는 넣지 않는다. 광고 위치는 도구가 자동으로 표시한다.
- 내부 링크는 위 후보 목록에 실제로 있는 URL만 쓴다. 없으면 넣지 않는다.
${naverUrl ? `- 본문 끝에 네이버 원문 링크(${naverUrl})를 한 번 넣는다.\n` : ''}
이제 변환 결과만 출력한다.`
}

/** 도구 없이 폴더/CLI로 쓸 때를 위한 입력 템플릿. */
export const INPUT_TEMPLATE = `---
naver_title:
subject:
region:
category:
naver_url:
naver_image_count:
sponsored: false
address:
hours:
parking:
price:
reservation:
kids:
bring:
pros:
cons:
images:
  -
related:
  -
---

(여기에 네이버 본문을 붙여넣는다)
`
