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






// ── 라운드 7: Grey Blades 진영 효과 (fandom) ──────────────────────
section('fandom 검색: Grey Blades / Lord / 진영 악세서리')
for (const q of ['Grey Blades', 'Grey Blades Lord', 'Grey Blades ring', 'faction accessory set']) {
  const r = await fandom({ action: 'query', list: 'search', srsearch: q, srlimit: 20 })
  console.log(`\n[search] ${q}: ${(r.query?.search ?? []).map((x) => x.title).join(' | ') || JSON.stringify(r).slice(0, 300)}`)
}

async function wikitext(title, max = 12000) {
  const r = await fandom({ action: 'parse', page: title, prop: 'wikitext', redirects: 1 })
  const t = r.parse?.wikitext?.['*']
  console.log(`\n### [wikitext] ${title} → ${t ? `len=${t.length}` : JSON.stringify(r).slice(0, 300)}`)
  if (t) console.log(t.slice(0, max))
  return t ?? ''
}

section('fandom 문서: Grey Blades / 진영·영주·악세서리 공용 문서')
for (const t of ['Grey Blades', 'Factions', 'Faction', 'Lord', 'Lords', 'Accessories', 'Faction Accessories', 'Rings']) {
  await wikitext(t, 15000)
}

section('fandom 문서: Grey Blades 영웅 (영주 스킬 확인)')
for (const t of ['Amelia Ainsworth', 'Corven', 'Galloway', 'Garroq', 'Rorkesh', 'Ruen Hollow']) {
  const w = await wikitext(t, 0)
  // 영주/진영 관련 줄만
  const lines = w.split('\n').filter((l) => /lord|faction|grey blade|ring|accessor/i.test(l))
  console.log(lines.slice(0, 60).join('\n'))
}

section('비교용: 기존 진영(Watchguard) 영주 Ingrid 문서의 영주 관련 줄')
{
  const w = await wikitext('Ingrid', 0)
  console.log(w.split('\n').filter((l) => /lord|faction|ring|accessor/i.test(l)).slice(0, 40).join('\n'))
}

// ── 라운드 7: 유출 정보 출처 (텔레그램 @worNuts 공개 미리보기) ─────────
section('Telegram t.me/s/worNuts — 최근 게시물')
{
  const posts = []
  let before = ''
  for (let page = 0; page < 8; page++) {
    const r = await get(`https://t.me/s/worNuts${before ? `?before=${before}` : ''}`)
    console.log(`page ${page}: HTTP ${r.status} len=${r.text.length}`)
    const blocks = r.text.split('tgme_widget_message_wrap').slice(1)
    if (!blocks.length) break
    const got = blocks.map((b) => {
      const id = b.match(/data-post="worNuts\/(\d+)"/)?.[1]
      const date = b.match(/datetime="([^"]+)"/)?.[1]
      const text = strip(b.match(/tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '')
      const photos = [...b.matchAll(/background-image:url\('([^']+)'\)/g)].map((m) => m[1]).filter((u) => !/emoji|userpic/i.test(u))
      return { id: Number(id), date, text, photos }
    })
    posts.push(...got)
    const minId = Math.min(...got.map((p) => p.id).filter(Boolean))
    if (!Number.isFinite(minId)) break
    before = String(minId)
    if (got.some((p) => p.date && p.date < '2026-06-20')) break
  }
  const uniq = [...new Map(posts.map((p) => [p.id, p])).values()].sort((a, b) => b.id - a.id)
  console.log(`게시물 ${uniq.length}개`)
  for (const p of uniq) {
    console.log(`\n--- #${p.id} ${p.date} photos=${p.photos.length}`)
    console.log(p.text.slice(0, 2500))
    if (p.photos.length) console.log(`photos: ${p.photos.slice(0, 10).join('  ')}`)
  }
}

section('wornuts.com 유출/신캐 페이지 후보')
for (const u of ['https://wornuts.com/en/leaks', 'https://wornuts.com/ru/leaks', 'https://wornuts.com/en/heroes', 'https://wornuts.com/en']) {
  await probePage(u, { body: 2500, scripts: false })
}

console.log('\n(probe 끝)')
