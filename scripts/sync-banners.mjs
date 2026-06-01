// prospector.gg "Upcoming Hero Banners" 크롤 → banners/data/schedule.generated.ts 갱신.
// WP REST API(content.rendered)를 1순위로, 실패 시 페이지 HTML을 2순위로 파싱한다.
//
// 실제 구조(.pgub-layout-page):
//   <article class="pgub-page-card" data-pgub-status data-pgub-start data-pgub-expire(유닉스초)>
//     <div class="pgub-page-meta"><span>{배너 종류}</span><span>{N-day banner}</span>...</div>
//     <div class="pgub-page-heroes"> <a class="pgub-hero-link" href=".../hero/{slug}/">
//         <span class="pgub-hero-icon pgub-rarity-{등급}" title="{이름}"><img src="{아이콘}"></span></a> ... </div>
//     <div class="pgub-page-names">{이름, 이름, ...}</div>   ← 영웅 목록의 정답(신캐 포함)
//   </article>
// 신캐(상세페이지 없음)는 /hero/ 링크가 없어 slug=undefined 로 둔다.
import { writeFile, unlink } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const REST_URL = 'https://prospector.gg/wp-json/wp/v2/pages/8803'
const PAGE_URL = 'https://prospector.gg/upcoming-hero-banners/'
const OUTPUT_FILE = new URL('../banners/data/schedule.generated.ts', import.meta.url)
const DEBUG_FILE = new URL('../banners/data/_debug_fetch.txt', import.meta.url)
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 wor-gear-simulator'

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

/** 카드 종류: .pgub-page-meta 첫 span */
function parseType(card) {
  const meta = card.match(/<div class="pgub-page-meta">([\s\S]*?)<\/div>/i)
  if (!meta) return ''
  const span = meta[1].match(/<span[^>]*>([\s\S]*?)<\/span>/i)
  return span ? stripTags(span[1]) : ''
}

/** 영웅 이름 목록(정답): .pgub-page-names 콤마 구분 */
function parseNames(card) {
  const m = card.match(/<div class="pgub-page-names">([\s\S]*?)<\/div>/i)
  if (!m) return []
  return stripTags(m[1])
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** 이름(소문자) → {slug?, rarity?, icon?} : hero-icon span(앞에 /hero/ 앵커 있으면 slug) */
function parseHeroDetails(card) {
  const re =
    /(?:<a class="pgub-hero-link"[^>]*href="[^"]*\/hero\/([^/"]+)\/?"[^>]*>\s*)?<span class="pgub-hero-icon([^"]*)"[^>]*?title="([^"]*)"[^>]*>([\s\S]*?)<\/span>/gi
  const map = new Map()
  let m
  while ((m = re.exec(card))) {
    const slug = m[1] ? m[1].toLowerCase() : null
    const cls = m[2] || ''
    const name = decodeHtml(m[3])
    const inner = m[4] || ''
    if (!name) continue
    const rarityM = cls.match(/pgub-rarity-(\w+)/i)
    const imgM = inner.match(/<img[^>]*src="([^"]*)"/i)
    const key = name.toLowerCase()
    if (map.has(key) && !slug) continue // slug 있는 항목 우선
    map.set(key, {
      name,
      ...(slug ? { slug } : {}),
      ...(rarityM ? { rarity: rarityM[1].toLowerCase() } : {}),
      ...(imgM ? { icon: imgM[1] } : {}),
    })
  }
  return map
}

export function parseBanners(html) {
  const banners = []
  const articleRe = /<article([^>]*\bdata-pgub-start\b[^>]*)>([\s\S]*?)<\/article>/gi
  let am
  while ((am = articleRe.exec(html))) {
    const open = am[1]
    const card = am[2]
    const startSec = Number((open.match(/data-pgub-start="(\d+)"/i) || [])[1])
    const expireSec = Number((open.match(/data-pgub-expire="(\d+)"/i) || [])[1])
    if (!startSec || !expireSec) continue
    const status = ((open.match(/data-pgub-status="([^"]*)"/i) || [])[1] || 'upcoming').toLowerCase()

    const durM = card.match(/(\d+)\s*-?\s*day/i)
    const details = parseHeroDetails(card)
    const names = parseNames(card)

    let heroes
    if (names.length) {
      heroes = names.map((n) => details.get(n.toLowerCase()) ?? { name: n })
    } else {
      heroes = [...details.values()]
    }

    banners.push({
      status: ['active', 'next', 'upcoming'].includes(status) ? status : 'upcoming',
      type: parseType(card) || 'Hero Summoning',
      durationDays: durM ? Number(durM[1]) : null,
      startUtc: new Date(startSec * 1000).toISOString(),
      endUtc: new Date(expireSec * 1000).toISOString(),
      heroes,
    })
  }
  return banners
}

async function fetchText(url, accept) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: accept } })
  return { ok: res.ok, status: res.status, text: await res.text() }
}

function debugSlice(label, html) {
  if (!html) return `--- ${label}: (empty) ---\n`
  let idx = -1
  for (const key of ['data-pgub-start', 'pgub-page-card', 'pg-upcoming-banners']) {
    const i = html.indexOf(key)
    if (i >= 0) {
      idx = Math.max(0, i - 100)
      break
    }
  }
  const head = `--- ${label}: len=${html.length}, marker@${idx} ---\n`
  return head + (idx < 0 ? html.slice(0, 2000) : html.slice(idx, idx + 22000)) + '\n'
}

async function main() {
  const debug = [`fetchedAt: ${new Date().toISOString()}`, '']
  let restHtml = ''
  let sourceModified = null
  try {
    const rest = await fetchText(REST_URL, 'application/json')
    debug.push(`REST → HTTP ${rest.status}, bytes=${rest.text.length}`)
    if (rest.ok) {
      const json = JSON.parse(rest.text)
      restHtml = json?.content?.rendered ?? ''
      sourceModified = json?.modified_gmt ? `${json.modified_gmt}Z` : null
    }
  } catch (err) {
    debug.push(`REST 예외: ${err.message}`)
  }

  let pageHtml = ''
  try {
    const page = await fetchText(PAGE_URL, 'text/html')
    debug.push(`PAGE → HTTP ${page.status}, bytes=${page.text.length}`)
    pageHtml = page.text
  } catch (err) {
    debug.push(`PAGE 예외: ${err.message}`)
  }

  const restBanners = parseBanners(restHtml)
  const pageBanners = parseBanners(pageHtml)
  const banners = restBanners.length >= pageBanners.length ? restBanners : pageBanners
  debug.push(`parsed: REST=${restBanners.length}, PAGE=${pageBanners.length}`, '')

  if (!banners.length) {
    debug.push(debugSlice('REST content.rendered', restHtml), debugSlice('PAGE html', pageHtml))
    await writeFile(DEBUG_FILE, debug.join('\n'), 'utf8')
    throw new Error('배너 0건 파싱 — _debug_fetch.txt 확인. 기존 데이터 유지.')
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
  await unlink(DEBUG_FILE).catch(() => {}) // 성공 시 디버그 파일 제거
  const newCount = banners.reduce((n, b) => n + b.heroes.filter((h) => !h.slug).length, 0)
  console.log(`✅ 배너 ${banners.length}건 갱신 (신캐 ${newCount}명) → schedule.generated.ts`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
