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






// ── 라운드 7: 한글명 없는 35명 재조사 ──────────────────────────────
const MISSING = ['Amahle', 'Amelia Ainsworth', 'Arlow', 'Aryn', 'Barclay', 'Cuke', 'Duradel', 'Gale', 'Galloway', 'Garroq', 'Ghorza', 'Glen', 'Gnash', 'Gogran', 'Halder', 'Hayden', 'Jonas', 'Josh', 'Lancer', 'Langlyn', 'Lilia', 'Narvi', 'Nunea', 'Ogrul', 'Preter', 'Rhutu', 'Rogers', 'Rorkesh', 'Rum-Nose', 'Ryder', 'Shelor', 'Skreef', 'Skulf', 'Spring', 'Wagrak']
const slugOf = (en) => en.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const ctx = (text, needle, n = 3, w = 250) => {
  const out = []
  let i = -1
  while (out.length < n && (i = text.indexOf(needle, i + 1)) >= 0) out.push(text.slice(Math.max(0, i - w), i + needle.length + w).replace(/\s+/g, ' '))
  return out
}

section('worwiki 상세 페이지 직접 조회 (sitemap 미등재 여부)')
for (const en of MISSING) {
  const slugs = [...new Set([slugOf(en), en.toLowerCase().replace(/[^a-z0-9]+/g, ''), en.toLowerCase().replace(/[^a-z0-9]+/g, '_')])]
  for (const slug of slugs) {
    const r = await get(`https://worwiki.kr/hero/${slug}/`)
    const og = r.text.match(/property="og:title" content="([^"]+)"/)?.[1]
    const ld = r.text.match(/"mainEntity"[\s\S]{0,300}/)?.[0]
    console.log(`${en} /hero/${slug}/ → ${r.status} og=${og ?? '-'} ld=${(ld ?? '-').replace(/\s+/g, ' ').slice(0, 200)}`)
    if (r.status === 200) break
  }
}

section('worwiki 홈 / app.js 에서 영문명 언급')
const home = await get('https://worwiki.kr/')
const appSrc = home.text.match(/<script[^>]*src="([^"]*app\.js[^"]*)"/)?.[1] ?? '/app.js'
const app = await get(new URL(appSrc, 'https://worwiki.kr/').href, '*/*')
console.log(`home ${home.status} len=${home.text.length} / app ${appSrc} ${app.status} len=${app.text.length}`)
for (const en of MISSING) {
  const hits = [...ctx(home.text, en, 1, 200).map((c) => 'home: ' + c), ...ctx(app.text, en, 2, 200).map((c) => 'app: ' + c)]
  console.log(`\n[${en}] ${hits.length ? hits.join('\n   ') : '없음'}`)
}

section('나무위키 / 기타 한글 출처')
for (const url of [
  'https://namu.wiki/w/%EC%9B%8C%EC%B2%98%20%EC%98%A4%EB%B8%8C%20%EB%A0%90%EB%A6%84/%EC%98%81%EC%9B%85',
  'https://namu.wiki/w/%EC%9B%8C%EC%B2%98%20%EC%98%A4%EB%B8%8C%20%EB%A0%90%EB%A6%84',
  `${OFFICIAL}/ko`,
  `${OFFICIAL}/ko/heroes`,
]) {
  const r = await get(url)
  const t = strip(r.text)
  console.log(`\n### ${url} → ${r.status} len=${r.text.length} final=${r.url}`)
  console.log(`title: ${r.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? '-'}`)
  for (const en of ['Amahle', 'Garroq', 'Rorkesh', 'Galloway', 'Lancer', 'Gnash']) {
    const c = ctx(r.text, en, 1, 150)
    if (c.length) console.log(`  ${en}: ${c[0]}`)
  }
  console.log(`text: ${t.slice(0, 600)}`)
}

console.log('\n(probe 끝)')
