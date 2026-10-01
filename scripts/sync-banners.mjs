// 배너 일정 크롤 → banners/data/schedule.generated.ts 갱신.
//   1순위: wornuts.com/en/banners — Next.js RSC 페이로드의 "entries" 배열(과거~예정 전체, 예정은 수 주 앞까지)
//   2순위: prospector.gg "Upcoming Hero Banners" (2026-08 이후 갱신 중단 → 폴백으로만 유지)
//
//   node scripts/sync-banners.mjs            ← 파일 갱신
//   node scripts/sync-banners.mjs --dry-run  ← 파싱 결과만 출력
//
// wornuts entries 항목: { date:'2026-10-08', days:5, kind:'x20', kindName:'x20', pools:['spirits'],
//   name:"Sage's Invocation", note:'limited'|null, heroes:[{slug,name,portrait,quality(5=전설,4=영웅)}] }
//
// prospector 실제 구조(.pgub-layout-page):
//   <article class="pgub-page-card" data-pgub-status data-pgub-start data-pgub-expire(유닉스초)>
//     <div class="pgub-page-meta"><span>{배너 종류}</span><span>{N-day banner}</span>...</div>
//     <div class="pgub-page-heroes"> <a class="pgub-hero-link" href=".../hero/{slug}/">
//         <span class="pgub-hero-icon pgub-rarity-{등급}" title="{이름}"><img src="{아이콘}"></span></a> ... </div>
//     <div class="pgub-page-names">{이름, 이름, ...}</div>   ← 영웅 목록의 정답(신캐 포함)
//   </article>
// 신캐(상세페이지 없음)는 /hero/ 링크가 없어 slug=undefined 로 둔다.
import { writeFile, unlink } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const WORNUTS_URL = 'https://wornuts.com/en/banners'
const WORNUTS_HERO_URL = 'https://wornuts.com/en/heroes/'
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

// ─────────────────────────── wornuts.com ───────────────────────────
// 날짜만 주므로 시작 시각은 기존 prospector 데이터와 같은 일일 리셋 07:00 UTC 로 둔다.
const RESET_HOUR_UTC = 7
const POOL_NAMES = { spirits: 'Invocation of Spirits', divine: 'Divine Summoning', ancient: 'Ancient Summoning' }
const QUALITY_RARITY = { 5: 'legendary', 4: 'epic', 3: 'rare', 2: 'uncommon', 1: 'common' }

/** self.__next_f.push([1,"..."]) 조각을 이어 붙인 RSC 페이로드 */
function rscPayload(html) {
  return [...html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)]
    .map((m) => {
      try {
        return JSON.parse(`"${m[1]}"`)
      } catch {
        return ''
      }
    })
    .join('')
}

/** text[start] 의 '[' 부터 짝이 맞는 ']' 까지 (문자열 내부 괄호 무시) */
function sliceBalanced(text, start) {
  let depth = 0
  let inStr = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (inStr) {
      if (c === '\\') i++
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === '[' || c === '{') depth++
    else if (c === ']' || c === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

export function parseWornuts(html, now = Date.now()) {
  const payload = rscPayload(html)
  const at = payload.indexOf('"entries":[')
  if (at < 0) return { banners: [], builtToday: null }
  const raw = sliceBalanced(payload, at + '"entries":'.length)
  const entries = raw ? JSON.parse(raw) : []
  const builtToday = payload.match(/"builtToday":"([\d-]+)"/)?.[1] ?? null

  const banners = []
  for (const e of entries) {
    if (!e?.date || !e?.days) continue
    const start = Date.parse(`${e.date}T${String(RESET_HOUR_UTC).padStart(2, '0')}:00:00Z`)
    if (!Number.isFinite(start)) continue
    const end = start + e.days * 86400000
    if (end < now - 3 * 86400000) continue // 지난 배너는 최근 3일까지만 보관
    const limited = e.note === 'limited'
    const pools = (e.pools ?? []).map((p) => POOL_NAMES[p] ?? p)
    banners.push({
      status: start <= now && now < end ? 'active' : 'upcoming',
      type: `${limited ? 'Limited · ' : ''}${pools.join(' · ') || 'Hero Summoning'}`,
      durationDays: e.days,
      startUtc: new Date(start).toISOString(),
      endUtc: new Date(end).toISOString(),
      heroes: (e.heroes ?? []).map((h) => ({
        name: h.name,
        ...(h.slug ? { slug: h.slug } : {}),
        ...(QUALITY_RARITY[h.quality] ? { rarity: QUALITY_RARITY[h.quality] } : {}),
        ...(h.portrait ? { icon: h.portrait } : {}),
      })),
      ...(e.name && e.name !== 'Special' ? { title: e.name } : {}),
      ...(e.kindName ? { kind: e.kindName } : {}),
      ...(limited ? { limited: true } : {}),
    })
  }
  return { banners, builtToday }
}

async function fetchWornuts(debug) {
  const page = await fetchText(WORNUTS_URL, 'text/html')
  debug.push(`WORNUTS → HTTP ${page.status}, bytes=${page.text.length}`)
  if (!page.ok) return null
  const { banners, builtToday } = parseWornuts(page.text)
  debug.push(`parsed: WORNUTS=${banners.length} (builtToday=${builtToday})`)
  // 진행/예정 배너가 있고 그중 하나라도 영웅이 있어야 정상으로 본다
  const now = Date.now()
  const live = banners.filter((b) => Date.parse(b.endUtc) > now)
  if (!live.length || live.every((b) => !b.heroes.length)) return null
  return {
    source: 'wornuts.com',
    sourceUrl: WORNUTS_URL,
    heroPageUrl: WORNUTS_HERO_URL,
    fetchedAt: new Date().toISOString(),
    sourceModified: builtToday ? `${builtToday}T00:00:00Z` : null,
    banners,
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// prospector.gg 는 Cloudflare 봇차단이 걸려 있어 자동 요청이 429/403 으로 막히곤 한다.
// 브라우저에 가까운 헤더를 붙이고, 재시도 가치가 있는 상태(429/403/5xx)만 소수 백오프 재시도한다.
// (주간 스케줄 1회 실행 안에서만 재시도 — 소스를 자주 두드리지 않는다.)
const BROWSER_HEADERS = {
  'User-Agent': UA,
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://prospector.gg/',
  'Cache-Control': 'no-cache',
  'sec-ch-ua': '"Chromium";v="124", "Not:A-Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Linux"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
}
const RETRYABLE = new Set([429, 403, 500, 502, 503, 504])

async function fetchText(url, accept, attempts = 3) {
  let last = { ok: false, status: 0, text: '' }
  for (let i = 0; i < attempts; i += 1) {
    if (i > 0) {
      // 서버가 Retry-After 를 주면 존중(최대 60s), 없으면 지수 백오프(2s·4s·8s…, 최대 30s).
      const ra = Number(last.retryAfter)
      const wait =
        Number.isFinite(ra) && ra > 0 ? Math.min(ra * 1000, 60000) : Math.min(2000 * 2 ** (i - 1), 30000)
      await sleep(wait)
    }
    try {
      const res = await fetch(url, { headers: { ...BROWSER_HEADERS, Accept: accept } })
      const text = await res.text()
      last = { ok: res.ok, status: res.status, text, retryAfter: res.headers.get('retry-after') }
      if (res.ok || !RETRYABLE.has(res.status)) return last
    } catch (err) {
      last = { ok: false, status: 0, text: '', retryAfter: null }
    }
  }
  return last
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

async function fetchProspector(debug) {
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

  // 카드는 있는데 영웅이 전부 비면(출처 미갱신/구조 변경) 빈 일정을 '정상'으로 덮어쓰지 않는다.
  if (!banners.length || banners.every((b) => !b.heroes.length)) {
    debug.push(debugSlice('REST content.rendered', restHtml), debugSlice('PAGE html', pageHtml))
    return null
  }
  banners.sort((a, b) => Date.parse(a.startUtc) - Date.parse(b.startUtc))
  return {
    source: 'prospector.gg',
    sourceUrl: PAGE_URL,
    heroPageUrl: 'https://prospector.gg/hero/',
    fetchedAt: new Date().toISOString(),
    sourceModified,
    banners,
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const debug = [`fetchedAt: ${new Date().toISOString()}`, '']

  let schedule = null
  try {
    schedule = await fetchWornuts(debug)
  } catch (err) {
    debug.push(`WORNUTS 예외: ${err.message}`)
  }
  if (!schedule) schedule = await fetchProspector(debug)

  if (!schedule) {
    if (!dryRun) await writeFile(DEBUG_FILE, debug.join('\n'), 'utf8')
    console.error(debug.slice(0, 12).join('\n'))
    // 빈 일정으로 덮어쓰지 않음 → fetchedAt 이 묵어 상태 점검(check-health)이 크롤 실패로 잡는다.
    throw new Error('모든 출처에서 유효한 배너(영웅 포함)를 얻지 못함 — 기존 데이터 유지.')
  }
  schedule.banners.sort((a, b) => Date.parse(a.startUtc) - Date.parse(b.startUtc))

  if (dryRun) {
    console.log(debug.join('\n'))
    for (const b of schedule.banners) {
      console.log(`${b.startUtc.slice(0, 10)} +${b.durationDays}d [${b.type}]${b.title ? ' ' + b.title : ''}${b.kind ? ' (' + b.kind + ')' : ''}: ${b.heroes.map((h) => h.name).join(', ') || '—'}`)
    }
    console.log(`\n✅ (dry-run) ${schedule.source} 배너 ${schedule.banners.length}건`)
    return
  }

  const body = `// ⚠️ 이 파일은 scripts/sync-banners.mjs 크롤 결과로 자동 덮어쓰입니다 (직접 수정 금지).
import type { BannerSchedule } from './types'

export const generatedSchedule: BannerSchedule | null = ${JSON.stringify(schedule, null, 2)}
`
  await writeFile(OUTPUT_FILE, body, 'utf8')
  await unlink(DEBUG_FILE).catch(() => {}) // 성공 시 디버그 파일 제거
  const heroCount = schedule.banners.reduce((n, b) => n + b.heroes.length, 0)
  console.log(`✅ ${schedule.source} 배너 ${schedule.banners.length}건 (영웅 ${heroCount}명) → schedule.generated.ts`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
