// 크롤 후보 출처 조사용 — 각 URL 의 응답 상태·제목·본문 일부·API 흔적을 로그로 출력한다.
// GitHub Actions(probe-sources.yml)에서 실행 → 로그를 보고 어떤 출처를 자동화할지 결정.
//   node scripts/probe-sources.mjs
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 wor-gear-simulator'
const FANDOM = 'https://watcher-of-realms.fandom.com/api.php'
const OFFICIAL = 'https://watcherofrealms.mproject.skystone.games'

const strip = (s) =>
  s
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

async function get(url, accept = 'text/html,application/json;q=0.9,*/*;q=0.8', extra = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: accept, 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8', ...extra },
      redirect: 'follow',
    })
    const text = await res.text()
    return { status: res.status, url: res.url, type: res.headers.get('content-type') || '', text }
  } catch (e) {
    return { status: 0, url, type: '', text: '', error: e.message }
  }
}

function section(title) {
  console.log(`\n${'='.repeat(100)}\n## ${title}\n${'='.repeat(100)}`)
}

/** 일반 페이지: 상태/제목/본문 앞부분/스크립트/API 흔적 */
async function probePage(url, { body = 1500, scripts = true, raw = 0 } = {}) {
  const r = await get(url)
  console.log(`\n### ${url}\n→ HTTP ${r.status} ${r.type} len=${r.text.length} final=${r.url}${r.error ? ' ERR ' + r.error : ''}`)
  if (!r.text) return r
  const title = r.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim()
  if (title) console.log(`title: ${title}`)
  if (r.type.includes('json')) {
    console.log(`json: ${r.text.slice(0, body * 2)}`)
    return r
  }
  console.log(`text: ${strip(r.text).slice(0, body)}`)
  if (raw) console.log(`raw: ${r.text.slice(0, raw)}`)
  const apis = [...new Set([...r.text.matchAll(/["'`]((?:https?:)?\/\/[^"'`\s]*(?:api|json|graphql)[^"'`\s]*|\/[a-z0-9_\-/]*(?:api|json)[a-z0-9_\-/.?=&]*)["'`]/gi)].map((m) => m[1]))]
  if (apis.length) console.log(`api-like: ${apis.slice(0, 40).join('  ')}`)
  if (scripts) {
    const srcs = [...r.text.matchAll(/<script[^>]+src="([^"]+)"/gi)].map((m) => new URL(m[1], r.url).href)
    console.log(`scripts(${srcs.length}): ${srcs.slice(0, 15).join('  ')}`)
    // 앱 번들에서 API 경로 추출 (SPA 대비)
    for (const s of srcs.filter((x) => !/googletag|analytics|gtag|facebook|cloudflare/i.test(x)).slice(0, 6)) {
      const js = await get(s, '*/*')
      const found = [...new Set([...js.text.matchAll(/["'`](\/[a-zA-Z0-9_\-/]*(?:api|Api|hero|Hero|banner|news|lang|locale)[a-zA-Z0-9_\-/.]*)["'`]/g)].map((m) => m[1]))]
      const hosts = [...new Set([...js.text.matchAll(/https?:\/\/[a-z0-9.\-]+\.[a-z]{2,}(?:\/[a-zA-Z0-9_\-/.]*)?/g)].map((m) => m[0]))]
      console.log(`  · ${s} (${js.status}, ${js.text.length}b)\n    paths: ${found.slice(0, 60).join(' ')}\n    hosts: ${hosts.filter((h) => !/w3\.org|reactjs|github|mozilla/.test(h)).slice(0, 30).join(' ')}`)
    }
  }
  return r
}

async function fandom(params) {
  const u = new URL(FANDOM)
  Object.entries({ ...params, format: 'json' }).forEach(([k, v]) => u.searchParams.set(k, String(v)))
  const r = await get(u.href, 'application/json')
  try {
    return JSON.parse(r.text)
  } catch {
    return { _status: r.status, _text: r.text.slice(0, 300) }
  }
}

// ── 1. 공식 가이드 사이트 (한국어 데이터 여부) ──────────────────────────
section('1. 공식 가이드 사이트 (skystone) — 한국어/영웅 데이터 API?')
await probePage(`${OFFICIAL}/worcommunity/heroes/heroDetail?id=3503775`, { raw: 3000 })
await probePage(`${OFFICIAL}/worcommunity/heroes`, { scripts: false })
await probePage(`${OFFICIAL}/worcommunity/`, { scripts: false })
await probePage(`${OFFICIAL}/`, { scripts: false })
for (const lang of ['ko', 'kr', 'ko-KR']) {
  await probePage(`${OFFICIAL}/worcommunity/heroes/heroDetail?id=3503775&lang=${lang}`, { scripts: false, body: 600 })
}

// ── 2. 배너 출처 후보 ───────────────────────────────────────────────
section('2. 배너 — prospector 현재 구조 / 대체 출처')
const pg = await get('https://prospector.gg/wp-json/wp/v2/pages/8803', 'application/json')
console.log(`prospector REST → ${pg.status} len=${pg.text.length}`)
try {
  const j = JSON.parse(pg.text)
  const html = j?.content?.rendered ?? ''
  console.log(`modified_gmt=${j.modified_gmt} rendered len=${html.length}`)
  const i = html.indexOf('data-pgub-start')
  console.log(`first card raw: ${html.slice(Math.max(0, i - 200), i + 2500)}`)
} catch {
  console.log(pg.text.slice(0, 500))
}
await probePage('https://prospector.gg/upcoming-hero-banners/', { scripts: false, body: 2500 })
await probePage('https://prospector.gg/category/wor-updates/', { scripts: false, body: 1500 })
await probePage('https://www.watcherofrealms.com/', { body: 1000 })
const banners = await fandom({ action: 'query', list: 'search', srsearch: 'banner summon event 2026', srlimit: 15 })
console.log('\nfandom search(banner): ' + JSON.stringify(banners?.query?.search?.map((s) => s.title) ?? banners))
const bannerPage = await fandom({ action: 'parse', page: 'Banner', prop: 'sections|wikitext' })
console.log('fandom Banner sections: ' + JSON.stringify(bannerPage?.parse?.sections?.map((s) => s.line) ?? bannerPage))
console.log('fandom Banner wikitext head: ' + String(bannerPage?.parse?.wikitext?.['*'] ?? '').slice(0, 3000))

// ── 3. fandom 신규 문서 (신캐·신규 마병·신규 보스 반영 속도) ─────────────
section('3. fandom — 최근 생성 문서 / 신규 콘텐츠 존재 여부')
const created = await fandom({ action: 'query', list: 'logevents', letype: 'create', lenamespace: 0, lelimit: 80 })
console.log(
  (created?.query?.logevents ?? []).map((e) => `${e.timestamp.slice(0, 10)} ${e.title}`).join('\n') || JSON.stringify(created),
)
const titles = ['Rorkesh', 'Galloway', 'Garroq', 'Amelia Ainsworth', 'Grey Blades', 'Doomripper', 'Blasting Corpse', 'Fallen Covenant', 'Demon Soldier', 'Corven', 'Ruen Hollow']
const exist = await fandom({ action: 'query', titles: titles.join('|'), redirects: 1, prop: 'pageimages|info' })
for (const p of Object.values(exist?.query?.pages ?? {})) {
  console.log(`${p.missing !== undefined ? '✗ 없음' : '✓ 있음'}  ${p.title}${p.touched ? ' touched=' + p.touched : ''}${p.thumbnail ? ' img' : ''}`)
}
const gb = await fandom({ action: 'parse', page: 'Grey Blades', prop: 'wikitext' })
console.log('Grey Blades wikitext: ' + String(gb?.parse?.wikitext?.['*'] ?? JSON.stringify(gb)).slice(0, 2500))
const ds = await fandom({ action: 'parse', page: 'Demon Soldier', prop: 'wikitext' })
console.log('Demon Soldier wikitext: ' + String(ds?.parse?.wikitext?.['*'] ?? JSON.stringify(ds)).slice(0, 2500))

// ── 4. 한글명 출처 후보 ────────────────────────────────────────────
section('4. 한글명 후보')
await probePage('https://namu.wiki/w/%EC%9B%8C%EC%B2%98%20%EC%98%A4%EB%B8%8C%20%EB%A0%90%EB%A6%84/%EC%98%81%EC%9B%85', { scripts: false, body: 1500 })
await probePage('https://apps.apple.com/kr/app/id6470362045', { scripts: false, body: 1200 })

// ── 5. 유출 출처 ──────────────────────────────────────────────────
section('5. 유출 — 텔레그램 공개 채널 미리보기')
const tg = await get('https://t.me/s/worNuts')
console.log(`t.me/s/worNuts → ${tg.status} len=${tg.text.length}`)
const posts = [...tg.text.matchAll(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => strip(m[1]))
const dates = [...tg.text.matchAll(/<time[^>]*datetime="([^"]+)"/g)].map((m) => m[1])
console.log(`posts=${posts.length}, dates=${dates.slice(-5).join(', ')}`)
posts.slice(-6).forEach((p, i) => console.log(`  [${i}] ${p.slice(0, 400)}`))

console.log('\n(probe 끝)')
