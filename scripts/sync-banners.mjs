// prospector.gg "Upcoming Hero Banners" 크롤 → banners/data/schedule.generated.ts 갱신.
// WP REST API(content.rendered)를 1순위로, 실패 시 페이지 HTML을 2순위로 파싱한다.
// 각 배너 <article class="pgub-page-card" data-pgub-start/expire(유닉스초)> + /hero/{slug}/ 링크 기반.
import { writeFile } from 'node:fs/promises'

const REST_URL = 'https://prospector.gg/wp-json/wp/v2/pages/8803'
const PAGE_URL = 'https://prospector.gg/upcoming-hero-banners/'
const OUTPUT_FILE = new URL('../banners/data/schedule.generated.ts', import.meta.url)
const UA = 'wor-gear-simulator/0.1 (+https://github.com/Giles-wor/wor-gear-simulator)'

async function fetchText(url, accept) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: accept } })
  if (!res.ok) throw new Error(`Request failed (${res.status}) for ${url}`)
  return res
}

function decodeHtml(s) {
  return s
    .replace(/&#0?39;/g, "'")
    .replace(/&#8217;/g, '’')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8211;/g, '–')
    .trim()
}

const stripTags = (s) => decodeHtml(s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '))

const titleCase = (slug) =>
  slug
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`, 'i'))
  return m ? m[1] : null
}

/** content.rendered(HTML) → 배너 배열 */
function parseBanners(html) {
  const banners = []
  // <article ...pgub-page-card...> ... </article>  (여는 태그 속성 + 내부 캡처)
  const articleRe = /<article([^>]*\bpgub-page-card\b[^>]*)>([\s\S]*?)<\/article>/gi
  let am
  while ((am = articleRe.exec(html))) {
    const open = am[1]
    const inner = am[2]

    const startSec = Number(attr(open, 'data-pgub-start'))
    const expireSec = Number(attr(open, 'data-pgub-expire'))
    if (!startSec || !expireSec) continue

    const status = (attr(open, 'data-pgub-status') || 'upcoming').toLowerCase()

    // 배너 종류: title/heading 류 클래스 텍스트 우선
    let type = ''
    const titleM =
      inner.match(/class="[^"]*(?:title|name|heading)[^"]*"[^>]*>([\s\S]*?)</i) ||
      inner.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)
    if (titleM) type = stripTags(titleM[1])

    // 기간(일)
    const durM = inner.match(/(\d+)\s*-?\s*day/i)
    const durationDays = durM ? Number(durM[1]) : null

    // 영웅: /hero/{slug}/ 링크 단위
    const heroes = []
    const seen = new Set()
    const heroRe = /<a([^>]*href="[^"]*\/hero\/([^/"]+)\/?[^"]*"[^>]*)>([\s\S]*?)<\/a>/gi
    let hm
    while ((hm = heroRe.exec(inner))) {
      const aOpen = hm[1]
      const slug = hm[2].toLowerCase()
      if (seen.has(slug)) continue
      seen.add(slug)
      const aInner = hm[3]
      const imgTag = aInner.match(/<img[^>]*>/i)?.[0] || ''
      const name =
        attr(aOpen, 'aria-label') ||
        attr(aOpen, 'title') ||
        attr(imgTag, 'alt') ||
        stripTags(aInner) ||
        titleCase(slug)
      const rarityM = (aOpen + aInner).match(/pgub-rarity-(\w+)/i)
      const icon = attr(imgTag, 'src') || attr(imgTag, 'data-src') || undefined
      heroes.push({
        name: decodeHtml(name),
        slug,
        ...(rarityM ? { rarity: rarityM[1].toLowerCase() } : {}),
        ...(icon ? { icon } : {}),
      })
    }

    banners.push({
      status: ['active', 'next', 'upcoming'].includes(status) ? status : 'upcoming',
      type: type || 'Hero Summoning',
      durationDays,
      startUtc: new Date(startSec * 1000).toISOString(),
      endUtc: new Date(expireSec * 1000).toISOString(),
      heroes,
    })
  }
  return banners
}

async function load() {
  // 1순위: WP REST API
  try {
    const res = await fetchText(REST_URL, 'application/json')
    const json = await res.json()
    const html = json?.content?.rendered ?? ''
    const banners = parseBanners(html)
    if (banners.length) {
      return { banners, sourceModified: json?.modified_gmt ? `${json.modified_gmt}Z` : null }
    }
    console.warn('REST API에서 배너 0건 — HTML 폴백 시도')
  } catch (err) {
    console.warn(`REST API 실패(${err.message}) — HTML 폴백 시도`)
  }
  // 2순위: 페이지 HTML
  const res = await fetchText(PAGE_URL, 'text/html')
  const html = await res.text()
  const banners = parseBanners(html)
  return { banners, sourceModified: null }
}

async function main() {
  const { banners, sourceModified } = await load()
  if (!banners.length) {
    throw new Error('배너를 한 건도 파싱하지 못했습니다 — 페이지 구조 변경 가능성. 기존 데이터 유지.')
  }
  banners.sort((a, b) => Date.parse(a.startUtc) - Date.parse(b.startUtc))

  const schedule = {
    source: 'prospector.gg',
    sourceUrl: PAGE_URL,
    fetchedAt: new Date().toISOString(),
    sourceModified,
    banners,
  }

  const body = `// ⚠️ 이 파일은 scripts/sync-banners.mjs 크롤 결과로 자동 덮어쓰입니다 (직접 수정 금지).
import type { BannerSchedule } from './types'

export const generatedSchedule: BannerSchedule | null = ${JSON.stringify(schedule, null, 2)}
`
  await writeFile(OUTPUT_FILE, body, 'utf8')
  console.log(`✅ 배너 ${banners.length}건 갱신 → banners/data/schedule.generated.ts`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
