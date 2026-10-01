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




// ── 라운드 4: worwiki.kr (한글 영웅명 출처 후보) ─────────────────────
section('worwiki.kr — 구조 / 한글 영웅명')
const home = await probePage('https://worwiki.kr/', { body: 2500, raw: 3000 })
for (const path of ['/robots.txt', '/sitemap.xml', '/heroes', '/hero', '/heroes/', '/api/heroes', '/wiki/영웅']) {
  await probePage(`https://worwiki.kr${encodeURI(path)}`, { scripts: false, body: 2000 })
}
// 홈에서 내부 링크 수집
const internal = [...new Set([...(home.text || '').matchAll(/href="([^"#]+)"/g)].map((m) => m[1]).filter((h) => h.startsWith('/') || h.includes('worwiki.kr')))]
console.log(`\ninternal links(${internal.length}):\n${internal.slice(0, 80).join('\n')}`)
// 영웅 관련으로 보이는 첫 링크 2개 열기
for (const l of internal.filter((h) => /hero|영웅|character|unit/i.test(decodeURI(h))).slice(0, 3)) {
  const url = new URL(l, 'https://worwiki.kr/').href
  const r = await probePage(url, { scripts: false, body: 2500, raw: 2500 })
  const names = [...(r.text || '').matchAll(/>([가-힣][가-힣 ·'\-]{0,14})</g)].map((m) => m[1]).slice(0, 80)
  console.log(`ko-like texts: ${[...new Set(names)].join(' | ')}`)
}

console.log('\n(probe 끝)')
