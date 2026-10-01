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


// ── 라운드 2 ─────────────────────────────────────────────────────
section('A. wornuts.com — 사이트 구조 / API / 언어')
const wn = await probePage('https://wornuts.com/', { body: 2000, raw: 2500 })
for (const path of ['/api', '/api/heroes', '/api/banners', '/api/v1/heroes', '/heroes', '/banners', '/demon-soldiers', '/ko', '/en', '/robots.txt', '/sitemap.xml']) {
  await probePage(`https://wornuts.com${path}`, { scripts: false, body: 1200 })
}

section('B. 공식 가이드 사이트 — hero 청크의 API 호출부')
const idx = await get(`${OFFICIAL}/worcommunity/assets/index-Dyum3Q5e.js`, '*/*')
for (const key of ['/api/gms/data/app/', '/api/gms/source/', '/api/content/inner/query/', 'language', 'lang']) {
  let from = 0
  for (let n = 0; n < 3; n++) {
    const i = idx.text.indexOf(key, from)
    if (i < 0) break
    console.log(`\n[index ${key} @${i}] ${idx.text.slice(Math.max(0, i - 400), i + 400)}`)
    from = i + key.length
  }
}
const heroChunk = await get(`${OFFICIAL}/worcommunity/assets/hero-DqKyI2DG.js`, '*/*')
console.log(`\nhero chunk ${heroChunk.status} len=${heroChunk.text.length}`)
for (const key of ['api', 'source', 'query', 'lang']) {
  let from = 0
  for (let n = 0; n < 3; n++) {
    const i = heroChunk.text.indexOf(key, from)
    if (i < 0) break
    console.log(`[hero ${key} @${i}] ${heroChunk.text.slice(Math.max(0, i - 250), i + 250)}`)
    from = i + key.length
  }
}

section('C. fandom — Grey Blades 신캐 스탯 기재 여부 (sync-heroes 는 atk/atkinterval 없으면 건너뜀)')
for (const t of ['Garroq', 'Rorkesh', 'Galloway', 'Amelia Ainsworth', 'Oakenvar']) {
  const r = await fandom({ action: 'parse', page: t, prop: 'text' })
  const html = r?.parse?.text?.['*'] ?? ''
  const field = (k) => html.match(new RegExp(`data-source="${k}"[\\s\\S]*?<div class="pi-data-value pi-font">([\\s\\S]*?)</div>`, 'i'))?.[1]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  console.log(`${t}: rarity=${field('rarity')} class=${field('class')} faction=${field('faction')} atk=${field('atk')} atkinterval=${field('atkinterval')} hp=${field('hp')}`)
}
const fs = await fandom({ action: 'parse', page: 'Doomripper', prop: 'wikitext' })
console.log('Doomripper wikitext: ' + String(fs?.parse?.wikitext?.['*'] ?? '').slice(0, 800))

console.log('\n(probe 끝)')
