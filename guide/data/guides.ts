/**
 * 공략 카탈로그 — guide/assets 폴더를 자동 스캔해서 카드 그리드를 구성한다.
 *
 * 폴더 규칙 (이미지를 넣으면 코드 수정 없이 자동 반영):
 *   guide/assets/<카테고리>/<항목명>/01.jpg, 02.jpg ...   → 여러 장 갤러리 카드
 *   guide/assets/<카테고리>/<항목명>.jpg                    → 한 장짜리 카드
 *
 * - <카테고리> 는 아래 CATEGORY_ORDER 의 폴더키와 일치해야 노출된다 (titans / content).
 * - <항목명> 폴더(또는 파일)명이 그대로 카드 제목이 된다. 한글 폴더명 OK.
 * - 한 항목 안의 이미지는 파일명 기준 자연 정렬(01, 02, 10 …)로 넘어간다.
 * - 제목을 폴더명과 다르게 보이고 싶으면 NAME_OVERRIDES 에 추가.
 */

// 모든 이미지 자산을 URL 로 즉시 로드 (해시 처리된 빌드 경로로 치환됨)
const modules = import.meta.glob(
  '../assets/**/*.{png,jpg,jpeg,webp,gif,PNG,JPG,JPEG,WEBP,GIF}',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>

export type GuideItem = {
  /** 항목 폴더/파일명 (정렬·식별용) */
  key: string
  /** 카드에 표시할 제목 */
  name: string
  /** 갤러리 이미지 URL 목록 (파일명 자연 정렬) */
  images: string[]
  /** 공략 제작자/출처 (선택). CREDITS 에서 주입 */
  credit?: string
}

export type GuideCategory = {
  id: string
  label: string
  items: GuideItem[]
}

/** 카테고리 노출 순서 + 폴더키 → 한글 라벨 */
const CATEGORY_ORDER = ['titans', 'content'] as const
const CATEGORY_LABELS: Record<string, string> = {
  titans: '타이탄',
  content: '던전 · 레이드 · 콘텐츠',
}

/** 폴더/파일명을 다른 제목으로 보이고 싶을 때만 등록 (선택) */
const NAME_OVERRIDES: Record<string, string> = {}

/**
 * 항목별 공략 제작자/출처. 항목 키(폴더/파일명)로 등록.
 * 카드와 이미지 팝업에 "출처: ○○" 로 표시된다.
 */
const CREDITS: Record<string, string> = {
  '길드보스 (악몽·심연)': '9enie',
}

const stripExt = (name: string) => name.replace(/\.[^.]+$/, '')

/** 파일명 자연 정렬 (01 < 02 < 10) */
const naturalCompare = (a: string, b: string) =>
  a.localeCompare(b, 'ko', { numeric: true, sensitivity: 'base' })

type ParsedAsset = { category: string; item: string; file: string; url: string }

function parseAssets(): ParsedAsset[] {
  const out: ParsedAsset[] = []
  for (const [path, url] of Object.entries(modules)) {
    // path 예: ../assets/titans/오로라/01.jpg  또는  ../assets/titans/오로라.jpg
    const rel = path.replace(/^\.\.\/assets\//, '')
    const segs = rel.split('/')
    if (segs.length === 2) {
      // <category>/<file>  → 한 장짜리 항목
      out.push({ category: segs[0], item: stripExt(segs[1]), file: segs[1], url })
    } else if (segs.length >= 3) {
      // <category>/<item>/<...>/<file>  → 갤러리 항목
      out.push({ category: segs[0], item: segs[1], file: segs[segs.length - 1], url })
    }
  }
  return out
}

function buildCatalog(): GuideCategory[] {
  const assets = parseAssets()
  return CATEGORY_ORDER.map((catId) => {
    const inCat = assets.filter((a) => a.category === catId)
    const byItem = new Map<string, ParsedAsset[]>()
    for (const a of inCat) {
      const list = byItem.get(a.item) ?? []
      list.push(a)
      byItem.set(a.item, list)
    }
    const items: GuideItem[] = [...byItem.entries()]
      .sort(([a], [b]) => naturalCompare(a, b))
      .map(([key, list]) => ({
        key,
        name: NAME_OVERRIDES[key] ?? key,
        images: list.sort((x, y) => naturalCompare(x.file, y.file)).map((x) => x.url),
        credit: CREDITS[key],
      }))
    return { id: catId, label: CATEGORY_LABELS[catId] ?? catId, items }
  })
}

export const guideCategories: GuideCategory[] = buildCatalog()

export const hasAnyGuide = guideCategories.some((c) => c.items.length > 0)
