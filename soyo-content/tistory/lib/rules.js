/**
 * 티스토리 재가공 규칙 — 단일 진실 원본(single source of truth).
 *
 * 프롬프트 생성(prompt.js), HTML 렌더링(render.js), 품질 검수(qa.js)가
 * 모두 이 파일을 참조한다. 규칙이 바뀌면 여기만 고친다.
 */

/** 브랜드는 하나로 유지한다. 제3의 캐릭터를 만들지 않는다. */
export const BRAND = {
  operator: '김소요',
  handle: '소비요정 김소요',
  tagline: '직접 써보고, 가보고, 먹어본 경험을 정보 중심으로 정리합니다',
  subTagline: '소비요정 김소요의 검색형 소비 기록',
  blogUrl: 'https://thesimplethings.tistory.com',
}

/**
 * 과거 티스토리에 혼재된 닉네임/필명.
 * 재가공 결과물에 이 표현이 남아 있으면 브랜드가 쪼개진다는 신호다.
 */
export const LEGACY_PERSONAS = [
  '커피와비틀즈',
  '밑줄긋는여자',
  '이러쿵저러쿵',
  '살림의여왕',
  '웰컴쩰리',
  'reo COSME',
  '기억의밥상',
  'been일기',
]

/** 우선 재가공 대상: 검색 수명이 긴 글. */
export const INCLUDE_TOPICS = [
  '맛집 후기',
  '여행지 및 관광지',
  '아이와 가볼 만한 곳',
  '키즈카페 및 체험시설',
  '호텔과 숙소',
  '이케아·코스트코 등 쇼핑 후기',
  '제품 실사용 후기',
  '육아용품',
  '생활용품',
  '주차·가격·운영시간·준비물 정보가 있는 글',
  '오래 검색될 가능성이 있는 정보성 글',
]

/** 제외 대상: 옮겨도 검색 자산이 안 되는 글. */
export const EXCLUDE_TOPICS = [
  '단순 일상 기록',
  '짧은 감상문',
  '브랜드 내부 이야기',
  '개인적인 고민',
  '시의성이 매우 짧은 게시물',
  '정보 가치가 거의 없는 사진 위주 글',
  '협찬 조건 때문에 타 플랫폼 재게시가 어려운 글',
]

/**
 * 티스토리 본문 기본 구조.
 * `optional: true`인 섹션은 해당 정보가 없으면 억지로 만들지 않고 생략한다.
 */
export const BODY_SECTIONS = [
  { id: 'intro', title: '도입부', optional: false },
  { id: 'summary', title: '핵심 정보 요약', optional: false },
  { id: 'review', title: '직접 방문하거나 사용한 후기', optional: false },
  { id: 'price', title: '가격 또는 메뉴', optional: true, volatile: true },
  { id: 'parking', title: '주차와 접근성', optional: true },
  { id: 'kids', title: '아이 동반 여부', optional: true },
  { id: 'pros', title: '좋았던 점', optional: false },
  { id: 'cons', title: '아쉬웠던 점', optional: false },
  { id: 'audience', title: '추천 대상', optional: true },
  { id: 'faq', title: 'FAQ', optional: true },
  { id: 'closing', title: '최종 정리', optional: false },
]

/**
 * 광고 위치. 광고 코드는 삽입하지 않고, 자연스러운 위치만 주석으로 표시한다.
 * `after`는 해당 섹션 id 뒤에 마커를 넣는다는 뜻이다.
 */
export const AD_SLOTS = [
  { n: 1, after: 'summary', label: '핵심 정보 요약 이후' },
  { n: 2, after: 'MIDPOINT', label: '본문 중간' },
  { n: 3, after: 'BEFORE_FAQ', label: 'FAQ 이전' },
]

/** 정보가 없을 때 임의로 만들지 않고 쓰는 표시 문구. */
export const UNKNOWN_MARKERS = [
  '확인 필요',
  '방문 당시 기준',
  '공식 채널에서 최신 정보 확인 권장',
]

/** 변동 정보(가격·운영시간 등)에는 반드시 시점이 붙어야 한다. */
export const VOLATILE_KEYWORDS = ['가격', '메뉴', '운영시간', '영업시간', '요금', '입장료', '주차비']

/** 협찬 글일 때 본문에 반드시 남아야 하는 표시 문구 후보. */
export const SPONSOR_DISCLOSURE_HINTS = ['협찬', '제공받', '체험단', '광고', '유료 광고', '소정의']

/** 정량 기준. QA가 이 숫자로 판정한다. */
export const LIMITS = {
  /** 메타 설명 길이(자) */
  metaMin: 120,
  metaMax: 160,
  /** 태그 개수 */
  tagMin: 5,
  tagMax: 10,
  /** 제목 후보 개수 */
  titleCandidates: 3,
  /** 티스토리 본문 이미지 수 — 네이버보다 확실히 줄인다 */
  imageMin: 4,
  imageSoftMax: 15,
  imageRecommendedMax: 12,
  /** 소제목 최소 개수 */
  headingMin: 4,
  /** FAQ 항목 수 — 없으면 생략, 억지로 늘리지 않는다 */
  faqMin: 2,
  faqMax: 6,
  /** 첫 문단이 네이버 원문과 이만큼 이상 겹치면 중복으로 본다 (0~1) */
  introSimilarityMax: 0.45,
  /** 제목 유사도 상한 */
  titleSimilarityMax: 0.6,
  /** 글당 목표 추가 작업 시간(분) */
  minutesPerPostTarget: 10,
}

/**
 * 네이버 이미지 수 → 티스토리 권장 이미지 수.
 * 네이버 20~30장이면 티스토리는 8~15장 수준으로 줄인다.
 */
export function recommendedImageCount(naverImageCount) {
  if (!Number.isFinite(naverImageCount) || naverImageCount <= 0) {
    return { min: LIMITS.imageMin, max: LIMITS.imageRecommendedMax }
  }
  const min = Math.max(LIMITS.imageMin, Math.round(naverImageCount * 0.35))
  const max = Math.min(LIMITS.imageSoftMax, Math.max(min + 2, Math.round(naverImageCount * 0.5)))
  return { min, max }
}

/** 중복 콘텐츠 방지 규칙 — 프롬프트와 검수에서 함께 쓴다. */
export const DEDUP_RULES = [
  '제목을 완전히 바꾼다',
  '도입부를 새로 쓴다',
  '문단 순서를 바꾼다',
  '네이버의 개인적인 에피소드는 일부 축약한다',
  '정보성 문단을 추가한다',
  '소제목을 새로 쓴다',
  '이미지 수를 줄인다',
  '결론을 새로 쓴다',
  'FAQ를 추가한다',
  '검색자가 궁금해할 정보를 전면 배치한다',
]

/** 말투: 유지할 것 / 줄일 것. */
export const VOICE = {
  keep: [
    '직접 경험한 사람의 시선',
    '솔직한 장점과 단점',
    '소비자로서의 판단',
    '과장하지 않는 태도',
    '김소요 특유의 현실적인 결론',
  ],
  reduce: [
    '지나치게 많은 감탄사',
    '긴 일상 에피소드',
    '사진 한 장마다 붙는 짧은 문장',
    '네이버식 말줄임과 반복',
    '검색 정보와 무관한 사담',
  ],
}

/** 새 카테고리 초안. 너무 세분화하지 않는다. */
export const CATEGORIES = [
  { name: '굳이 가봄', children: ['여행', '아이와 가볼 곳', '숙소'] },
  { name: '맛집카페', children: ['맛집', '카페'] },
  { name: '굳이 사봄', children: ['생활용품', '육아용품', '쇼핑', '이케아·코스트코'] },
  { name: '정보정리', children: ['이용방법', '주차·예약', '비교·팁'] },
  { name: '예전 기록', children: ['기존 티스토리 글 보관'] },
]
