// 한글 영웅명 크롤 — worwiki.kr (나만겜 워처 오브 렐름 한국 영웅 위키) → src/data/heroNamesKo.generated.json
//
// worwiki 는 데이터 파일(heroes.json) 직접 열람을 막아 두었으므로(403) 그 경로는 쓰지 않고,
// sitemap.xml 에 공개된 영웅 상세 페이지(/hero/{slug}/, robots 허용)의 JSON-LD
// mainEntity { name: 한국명, alternateName: 영문명 } 만 읽는다.
// 부하를 줄이려고: ① 수동 한글명(heroNamesKo.ts)이 이미 있는 영웅은 건너뛰고
//                  ② 한 번 읽은 페이지는 캐시해 다음 실행부터는 새 영웅 페이지만 요청
//                  ③ 요청 간 간격을 둔다.
//
//   node scripts/sync-names-ko.mjs            ← 새 페이지만
//   node scripts/sync-names-ko.mjs --refresh  ← 캐시 무시하고 대상 페이지 다시 읽기
import { readFile, writeFile } from 'node:fs/promises'

const SITE = 'https://worwiki.kr'
const OUT = new URL('../src/data/heroNamesKo.generated.json', import.meta.url)
const MANUAL = new URL('../src/data/heroNamesKo.ts', import.meta.url)
const UA = 'wor-gear-simulator/0.1 (+https://github.com/Giles-wor/wor-gear-simulator)'
const DELAY_MS = 800
const MAX_PER_RUN = 300

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** sync-heroes.mjs 의 slugifyTitle 과 같은 규칙 (영문명 → 영웅 id) */
export function heroIdOf(en) {
  return en
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' } })
  return { ok: res.ok, status: res.status, text: await res.text() }
}

/** 상세 페이지 → { ko, en } (JSON-LD 우선, 없으면 og:title "한국명(English) ...") */
export function parseHeroPage(html) {
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const ld = JSON.parse(m[1])
      const e = ld?.mainEntity
      if (e?.name && e?.alternateName) return { ko: String(e.name).trim(), en: String(e.alternateName).trim() }
    } catch {}
  }
  const og = html.match(/property="og:title" content="([^"(]+)\(([^)]+)\)/)
  if (og) return { ko: og[1].trim(), en: og[2].trim() }
  return null
}

async function main() {
  const refresh = process.argv.includes('--refresh')
  let cache = { source: SITE, fetchedAt: null, pages: {} }
  try {
    cache = JSON.parse(await readFile(OUT, 'utf8'))
  } catch {}

  const manualSrc = await readFile(MANUAL, 'utf8')
  const manualKeys = new Set([...manualSrc.matchAll(/^\s*'?([a-z0-9_]+)'?\s*:\s*['"]/gm)].map((m) => m[1]))

  const sm = await fetchText(`${SITE}/sitemap.xml`)
  if (!sm.ok) throw new Error(`sitemap ${sm.status}`)
  const slugs = [...sm.text.matchAll(/<loc>https:\/\/worwiki\.kr\/hero\/([^/<]+)\/?<\/loc>/g)].map((m) => decodeURIComponent(m[1]))
  console.log(`sitemap 영웅 페이지 ${slugs.length}개`)

  const todo = slugs.filter((slug) => {
    if (!refresh && cache.pages[slug]) return false
    // slug 가 영문 id 와 같고 수동 한글명이 있으면 굳이 읽지 않는다 (slug 가 한국식 표기면 읽어야 영문명을 앎)
    return !manualKeys.has(heroIdOf(slug))
  })
  console.log(`읽을 페이지 ${todo.length}개 (캐시 ${Object.keys(cache.pages).length}개, 최대 ${MAX_PER_RUN})`)

  let ok = 0
  const failed = []
  for (const slug of todo.slice(0, MAX_PER_RUN)) {
    await sleep(DELAY_MS)
    try {
      const r = await fetchText(`${SITE}/hero/${encodeURIComponent(slug)}/`)
      const pair = r.ok ? parseHeroPage(r.text) : null
      if (!pair) {
        failed.push(`${slug}(${r.status})`)
        continue
      }
      cache.pages[slug] = pair
      ok++
    } catch (e) {
      failed.push(`${slug}(${e.message})`)
    }
  }

  // 사이트맵에서 사라진 페이지는 캐시에서도 정리
  const live = new Set(slugs)
  for (const slug of Object.keys(cache.pages)) if (!live.has(slug)) delete cache.pages[slug]

  cache.source = SITE
  cache.fetchedAt = new Date().toISOString()
  cache.pages = Object.fromEntries(Object.entries(cache.pages).sort(([a], [b]) => a.localeCompare(b)))
  await writeFile(OUT, JSON.stringify(cache, null, 2) + '\n', 'utf8')
  console.log(`✅ 새로 읽음 ${ok} / 실패 ${failed.length} → 캐시 ${Object.keys(cache.pages).length}개`)
  if (failed.length) console.log(`실패: ${failed.join(', ')}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
