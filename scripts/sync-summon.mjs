import { writeFile } from 'node:fs/promises'

// 소환율/천장 데이터 best-effort 크롤러.
// 네트워크가 열린 환경(GitHub Action / 로컬)에서 동작.
// Fandom 페이지 구조가 확정되지 않았으므로 보수적으로 파싱하고,
// 신뢰할 데이터를 못 찾으면 generatedBanners 를 null 로 유지해 placeholder 를 보존한다.

const API_BASE = 'https://watcher-of-realms.fandom.com/api.php'
const OUTPUT_FILE = new URL('../summon/data/banners.generated.ts', import.meta.url)

// 소환율이 실릴 가능성이 있는 후보 위키 문서들 (실페이지 확인 후 좁힐 것).
const CANDIDATE_PAGES = ['Summon', 'Summoning', 'Recruitment', 'Hero Recruitment', 'Gacha', 'Banner']

const BANNER_KEYWORDS = {
  normal: ['normal', '일반', 'standard'],
  limited: ['limited', '한정', 'featured'],
  ancient: ['ancient', '고대'],
  divine: ['divine', '신성'],
}

function buildApiUrl(params) {
  const url = new URL(API_BASE)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)))
  url.searchParams.set('format', 'json')
  return url
}

async function fetchJson(params) {
  const response = await fetch(buildApiUrl(params), {
    headers: {
      'User-Agent': 'wor-gear-simulator/0.1 (+https://github.com/Giles-wor/wor-gear-simulator)',
    },
  })
  if (!response.ok) throw new Error(`Request failed (${response.status}) for ${response.url}`)
  return response.json()
}

function stripHtml(value) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchPageHtml(title) {
  try {
    const data = await fetchJson({ action: 'parse', page: title, prop: 'text' })
    return data.parse?.text?.['*'] ?? null
  } catch {
    return null
  }
}

// 텍스트 블록에서 'rate'/'확률' 근처 퍼센트와 'pity'/'천장' 근처 숫자를 추출 (휴리스틱).
function extractBanner(text, keywords) {
  const lower = text.toLowerCase()
  const hit = keywords.some((kw) => lower.includes(kw.toLowerCase()))
  if (!hit) return null

  const rateMatch = text.match(/legendary[^%]{0,40}?(\d+(?:\.\d+)?)\s*%/i)
  const pityMatch = text.match(/(?:pity|guarantee|천장)[^0-9]{0,20}(\d{2,3})/i)

  const result = {}
  if (rateMatch) result.legendaryBaseRate = Number(rateMatch[1]) / 100
  if (pityMatch) result.hardPity = Number(pityMatch[1])
  return Object.keys(result).length ? result : null
}

async function main() {
  let html = null
  let sourceTitle = null
  for (const title of CANDIDATE_PAGES) {
    const candidate = await fetchPageHtml(title)
    if (candidate && /pity|천장|legendary|소환율|summon rate/i.test(candidate)) {
      html = candidate
      sourceTitle = title
      break
    }
  }

  const fetchedAt = new Date().toISOString()

  if (!html) {
    console.warn('소환율 페이지를 찾지 못했습니다. placeholder 유지 (generatedBanners=null).')
    await writeGenerated(null, null)
    return
  }

  const text = stripHtml(html)
  const generated = {}
  for (const [id, keywords] of Object.entries(BANNER_KEYWORDS)) {
    const parsed = extractBanner(text, keywords)
    if (parsed) generated[id] = parsed
  }

  if (Object.keys(generated).length === 0) {
    console.warn('rate/pity 파싱 실패. placeholder 유지. (페이지 구조 확인 필요)')
    await writeGenerated(null, {
      url: `https://watcher-of-realms.fandom.com/wiki/${encodeURIComponent(sourceTitle)}`,
      fetchedAt,
    })
    return
  }

  await writeGenerated(generated, {
    url: `https://watcher-of-realms.fandom.com/wiki/${encodeURIComponent(sourceTitle)}`,
    fetchedAt,
  })
  console.log(`소환 데이터 ${Object.keys(generated).join(', ')} 갱신 완료 (${sourceTitle}).`)
}

async function writeGenerated(generated, source) {
  const module =
    `// scripts/sync-summon.mjs 크롤 결과가 이 파일을 덮어씁니다.\n` +
    `// 크롤 성공 전에는 null 이며, banners.ts 가 placeholder 기본값을 사용합니다.\n` +
    `import type { BannerConfig } from '../lib/gacha'\n\n` +
    `export const generatedBanners: Partial<\n` +
    `  Record<BannerConfig['id'], Partial<BannerConfig>>\n` +
    `> | null = ${JSON.stringify(generated, null, 2)}\n\n` +
    `export const generatedSource: { url: string; fetchedAt: string } | null = ${JSON.stringify(
      source,
      null,
      2,
    )}\n`
  await writeFile(OUTPUT_FILE, module, 'utf8')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
