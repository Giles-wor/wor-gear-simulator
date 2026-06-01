// prospector.gg "Upcoming Hero Banners" 크롤 → banners/data/schedule.generated.ts 갱신.
// WP REST API(content.rendered)를 1순위로, 실패 시 페이지 HTML을 2순위로 파싱한다.
// 각 배너 <article class="pgub-page-card" data-pgub-start/expire(유닉스초)> + /hero/{slug}/ 링크 기반.
// 진단용: 파싱 실패/성공과 무관하게 banners/data/_debug_fetch.txt 에 원본 조각을 남긴다.
import { writeFile } from 'node:fs/promises'

const REST_URL = 'https://prospector.gg/wp-json/wp/v2/pages/8803'
const PAGE_URL = 'https://prospector.gg/upcoming-hero-banners/'
const OUTPUT_FILE = new URL('../banners/data/schedule.generated.ts', import.meta.url)
const DEBUG_FILE = new URL('../banners/data/_debug_fetch.txt', import.meta.url)
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 wor-gear-simulator'

async function fetchText(url, accept) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: accept } })
  const text = await res.text()
  return { ok: res.ok, status: res.status, text }
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

/** HTML(content.rendered 또는 페이지) → 배너 배열 */
function parseBanners(html) {
  const banners = []
  // data-pgub-start 를 가진 <article ...> 단위로 분리 (class 명에 의존하지 않도록 완화)
  const articleRe = /<article([^>]*\bdata-pgub-start\b[^>]*)>([\s\S]*?)<\/article>/gi
  let am
  while ((am = articleRe.exec(html))) {
    const open = am[1]
    const inner = am[2]

    const startSec = Number(attr(open, 'data-pgub-start'))
    const expireSec = Number(attr(open, 'data-pgub-expire'))
    if (!startSec || !expireSec) continue

    const status = (attr(open, 'data-pgub-status') || 'upcoming').toLowerCase()

    let type = ''
    const titleM =
      inner.match(/class="[^"]*(?:title|name|heading)[^"]*"[^>]*>([\s\S]*?)</i) ||
      inner.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)
    if (titleM) type = stripTags(titleM[1])

    const durM = inner.match(/(\d+)\s*-?\s*day/i)
    const durationDays = durM ? Number(durM[1]) : null

    // 영웅: pgub-hero 류 컨테이너(앵커/스팬) 단위 — 링크 없는 신캐도 포함
    const heroes = []
    const seen = new Set()
    const heroRe =
      /<(a|span|div)([^>]*\bpgub-(?:hero|rarity-\w+)\b[^>]*)>([\s\S]*?)<\/\1>/gi
    let hm
    while ((hm = heroRe.exec(inner))) {
      const tagAttrs = hm[2]
      const tagInner = hm[3]
      const href = attr(tagAttrs, 'href') || ''
      const slugM = href.match(/\/hero\/([^/"]+)\/?/i)
      const slug = slugM ? slugM[1].toLowerCase() : null
      const imgTag = tagInner.match(/<img[^>]*>/i)?.[0] || ''
      const name =
        attr(tagAttrs, 'aria-label') ||
        attr(tagAttrs, 'title') ||
        attr(imgTag, 'alt') ||
        stripTags(tagInner) ||
        (slug ? titleCase(slug) : '')
      if (!name) continue
      const dedupKey = (slug || name).toLowerCase()
      if (seen.has(dedupKey)) continue
      seen.add(dedupKey)
      const rarityM = (tagAttrs + tagInner).match(/pgub-rarity-(\w+)/i)
      const icon = attr(imgTag, 'src') || attr(imgTag, 'data-src') || undefined
      heroes.push({
        name: decodeHtml(name),
        ...(slug ? { slug } : {}),
        ...(rarityM ? { rarity: rarityM[1].toLowerCase() } : {}),
        ...(icon ? { icon } : {}),
      })
    }

    // 폴백: 클래스 매칭이 비면 /hero/{slug}/ 링크로 보강
    const linkRe = /<a([^>]*href="[^"]*\/hero\/([^/"]+)\/?[^"]*"[^>]*)>([\s\S]*?)<\/a>/gi
    let lm
    while ((lm = linkRe.exec(inner))) {
      const slug = lm[2].toLowerCase()
      if (seen.has(slug)) continue
      seen.add(slug)
      const aInner = lm[3]
      const imgTag = aInner.match(/<img[^>]*>/i)?.[0] || ''
      const name =
        attr(lm[1], 'aria-label') || attr(lm[1], 'title') || attr(imgTag, 'alt') ||
        stripTags(aInner) || titleCase(slug)
      const rarityM = (lm[1] + aInner).match(/pgub-rarity-(\w+)/i)
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

/** 디버그용: html 에서 배너 섹션 근처 조각을 추출 */
function debugSlice(label, html) {
  if (!html) return `--- ${label}: (empty) ---\n`
  const idx = (() => {
    for (const key of ['pg-upcoming-banners', 'data-pgub-start', 'pgub-page-card', 'pgub-hero']) {
      const i = html.indexOf(key)
      if (i >= 0) return Math.max(0, i - 200)
    }
    return -1
  })()
  const head = `--- ${label}: len=${html.length}, marker@${idx} ---\n`
  if (idx < 0) return head + html.slice(0, 2000) + '\n'
  return head + html.slice(idx, idx + 24000) + '\n'
}

async function main() {
  const debug = [`fetchedAt: ${new Date().toISOString()}`, `UA: ${UA}`, '']

  // 1) REST
  let rest = { ok: false, status: 0, text: '' }
  let restHtml = ''
  let sourceModified = null
  try {
    rest = await fetchText(REST_URL, 'application/json')
    debug.push(`REST ${REST_URL} → HTTP ${rest.status}, bytes=${rest.text.length}`)
    if (rest.ok) {
      const json = JSON.parse(rest.text)
      restHtml = json?.content?.rendered ?? ''
      sourceModified = json?.modified_gmt ? `${json.modified_gmt}Z` : null
    }
  } catch (err) {
    debug.push(`REST 예외: ${err.message}`)
  }

  // 2) 페이지 HTML
  let page = { ok: false, status: 0, text: '' }
  try {
    page = await fetchText(PAGE_URL, 'text/html')
    debug.push(`PAGE ${PAGE_URL} → HTTP ${page.status}, bytes=${page.text.length}`)
  } catch (err) {
    debug.push(`PAGE 예외: ${err.message}`)
  }

  const restBanners = parseBanners(restHtml)
  const pageBanners = parseBanners(page.text)
  debug.push(`parsed: REST=${restBanners.length}건, PAGE=${pageBanners.length}건`, '')
  debug.push(debugSlice('REST content.rendered', restHtml))
  debug.push(debugSlice('PAGE html', page.text))

  // 디버그 파일은 항상 남긴다 (PR 로 확인용)
  await writeFile(DEBUG_FILE, debug.join('\n'), 'utf8')

  const banners = restBanners.length >= pageBanners.length ? restBanners : pageBanners
  if (!banners.length) {
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
  console.log(`✅ 배너 ${banners.length}건 갱신 → banners/data/schedule.generated.ts`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
