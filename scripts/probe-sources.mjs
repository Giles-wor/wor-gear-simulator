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






// ── 라운드 8: Grey Blades 진영 반지(전용 장비) ──────────────────────
async function wikitext(title, max = 12000) {
  const r = await fandom({ action: 'parse', page: title, prop: 'wikitext', redirects: 1 })
  const t = r.parse?.wikitext?.['*']
  console.log(`\n### [wikitext] ${title} → ${t ? `len=${t.length}` : JSON.stringify(r).slice(0, 300)}`)
  if (t) console.log(t.slice(0, max))
  return t ?? ''
}

section('fandom: Exclusive Gear 문서 (Grey Blades 주변 + 기존 진영 형식 비교)')
{
  const w = await wikitext('Exclusive Gear', 0)
  const lines = w.split('\n')
  lines.forEach((l, i) => {
    if (/grey blade/i.test(l)) console.log(`[${i}] ` + lines.slice(Math.max(0, i - 3), i + 12).join('\n'))
  })
  console.log('\n--- Watchguard 주변(형식 비교) ---')
  const wi = lines.findIndex((l) => /watchguard/i.test(l))
  if (wi >= 0) console.log(lines.slice(Math.max(0, wi - 3), wi + 15).join('\n'))
  console.log('\n--- 문서 앞부분 ---\n' + w.slice(0, 3000))
}

section('fandom: Grey Blades 영웅 문서의 faction_excl 필드')
for (const t of ['Amelia Ainsworth', 'Galloway', 'Garroq', 'Rorkesh', 'Corven', 'Ruen Hollow']) {
  const r = await fandom({ action: 'parse', page: t, prop: 'wikitext', redirects: 1 })
  const w = r.parse?.wikitext?.['*'] ?? ''
  console.log(`\n${t}: ` + (w.split('\n').filter((l) => /excl/i.test(l)).join('\n') || '(excl 없음)'))
}

section('fandom 검색: Grey Blades exclusive / Fulcrum ring')
for (const q of ['"Grey Blades" exclusive', 'Grey Blades1', 'Sync DMG ring']) {
  const r = await fandom({ action: 'query', list: 'search', srsearch: q, srlimit: 15, srwhat: 'text' })
  console.log(`[search] ${q}: ${(r.query?.search ?? []).map((x) => `${x.title} — ${strip(x.snippet ?? '').slice(0, 160)}`).join('\n  ') || JSON.stringify(r).slice(0, 300)}`)
}

section('wornuts: 장비(gear) 페이지에서 Grey Blades')
for (const u of ['https://wornuts.com/en/gear', 'https://wornuts.com/en/heroes/amelia-ainsworth', 'https://wornuts.com/en/heroes/galloway']) {
  const r = await get(u)
  console.log(`\n### ${u} → HTTP ${r.status} len=${r.text.length}`)
  const t = strip(r.text)
  const hits = [...t.matchAll(/.{0,300}(?:Grey Blades|Sync DMG|Lord).{0,500}/gi)].map((m) => m[0])
  console.log(hits.slice(0, 12).join('\n...\n') || t.slice(0, 1500))
}

console.log('\n(probe 끝)')
