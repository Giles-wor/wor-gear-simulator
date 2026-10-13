// 길드전 방어덱 영웅 프로필 크롤 스크립트.
// guild/defenseHeroes.json 의 영웅 얼굴 이미지를 받아 guild/assets/heroes/<슬러그>.<확장자> 로 저장.
//
// 출처 순서:
//   1) wornuts.com 배너 이력(RSC entries) 의 영웅 portrait (hero_head_card)
//   2) wornuts.com 영웅 상세 페이지의 hero_head_card 이미지
//   3) fandom 위키 영웅 문서 대표 이미지
//
// 사용법(위키/wornuts 접속 가능한 환경에서 — 보통 GitHub Actions 가 자동 실행):
//   npm run sync:hero-icons            ← 프로필 없는 영웅만 받고, 목록에서 빠진 영웅 프로필은 삭제
//   npm run sync:hero-icons -- --force ← 전부 다시 받기
// (앱은 프로필 파일이 없으면 줄임 이름 텍스트로 표시 — 폴백)
// 받은 이미지는 세로 카드라서 ImageMagick(convert)이 있으면 위쪽(얼굴) 기준 128px 정사각형 webp 로 줄여 저장.
//
// 슬러그 규칙은 guild/defenseHeroes.ts 의 heroKey 와 동일.
import { readFile, writeFile, mkdir, readdir, unlink, rename } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { parseWornuts } from './sync-banners.mjs'

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 wor-gear-simulator'
// fandom 이미지 서버(static.wikia)는 브라우저형 UA 를 403 으로 막음 → 마병 크롤과 같은 봇 UA 사용
const BOT_UA = 'wor-gear-simulator/0.1 (+https://github.com/Giles-wor/wor-gear-simulator)'
const WORNUTS_BANNERS = 'https://wornuts.com/en/banners'
const WORNUTS_HERO = 'https://wornuts.com/en/heroes/'
const FANDOM_API = 'https://watcher-of-realms.fandom.com/api.php'
const OUT_DIR = new URL('../guild/assets/heroes/', import.meta.url)
const LIST = new URL('../guild/defenseHeroes.json', import.meta.url)
const HEAD_RE = /https:\/\/cdn\.wornuts\.com\/m\/hero_head_card\/[^"'\s)\\]+/g

const heroKey = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const uaFor = (url) => (/wornuts\.com/.test(url) ? UA : BOT_UA)

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': uaFor(url), Accept: 'text/html,application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} (${url})`)
  return res.text()
}

/** 1) 배너 이력에서 slug/이름 → portrait */
async function bannerPortraits() {
  const map = new Map()
  try {
    const { banners } = parseWornuts(await fetchText(WORNUTS_BANNERS), 0)
    for (const b of banners)
      for (const h of b.heroes) {
        if (!h.icon || !/hero_head_card/.test(h.icon)) continue
        if (h.slug) map.set(h.slug, h.icon)
        if (h.name) map.set(heroKey(h.name), h.icon)
      }
    console.log(`wornuts 배너 이력: 프로필 ${map.size}개`)
  } catch (e) {
    console.warn(`wornuts 배너 이력 실패: ${e.message}`)
  }
  return map
}

/** 2) 영웅 상세 페이지: og:image 가 head card 면 그것, 아니면 첫 head card. 슬러그는 칭호(lady-/count- 등) 뺀 것도 시도. */
async function heroPagePortrait(slug) {
  const tries = [slug, slug.replace(/^(lady|lord|count|knight|captain|admiral|king|dr)-/, '')]
  for (const s of [...new Set(tries)]) {
    try {
      const html = await fetchText(WORNUTS_HERO + s)
      const og = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1]
      if (og && /hero_head_card/.test(og)) return og
      const first = html.match(HEAD_RE)?.[0]
      if (first) return first
    } catch (e) {
      console.warn(`  wornuts 영웅 페이지 ${s}: ${e.message}`)
    }
  }
  return null
}

/** 3) fandom 위키 대표 이미지 */
async function fandomImage(title) {
  const url = new URL(FANDOM_API)
  Object.entries({
    action: 'query',
    prop: 'pageimages',
    piprop: 'thumbnail',
    pithumbsize: 256,
    titles: title,
    format: 'json',
    redirects: 1,
  }).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  const data = JSON.parse(await fetchText(url.href))
  const page = Object.values(data?.query?.pages ?? {})[0]
  return page?.thumbnail?.source ?? null
}

function extOf(url) {
  const m = url.split('?')[0].match(/\.(png|jpe?g|webp|gif)/i)
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'png'
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { 'User-Agent': uaFor(url) } })
  if (!res.ok) throw new Error(`IMG ${res.status} (${url})`)
  await writeFile(dest, Buffer.from(await res.arrayBuffer()))
}

const SIZE = 128
/** 위쪽 기준 정사각형으로 잘라 SIZE px webp 로. convert 가 없거나 실패하면 원본 그대로(파일명 반환). */
async function shrink(src, slug) {
  const out = new URL(`${slug}.webp`, OUT_DIR)
  const tmp = new URL(`${slug}.tmp.webp`, OUT_DIR)
  try {
    await promisify(execFile)('convert', [
      fileURLToPath(src),
      '-resize', `${SIZE}x`,
      '-background', 'none',
      '-gravity', 'north',
      '-extent', `${SIZE}x${SIZE}`,
      '-quality', '85',
      fileURLToPath(tmp),
    ])
    if (src.href !== out.href) await unlink(src)
    await rename(tmp, out)
    return `${slug}.webp`
  } catch (e) {
    await unlink(tmp).catch(() => {})
    console.warn(`  (축소 생략: ${e.message.split('\n')[0]})`)
    return src.pathname.split('/').pop()
  }
}

const FORCE = process.argv.includes('--force')
const heroes = JSON.parse(await readFile(LIST, 'utf8'))
await mkdir(OUT_DIR, { recursive: true })

const IMG_RE = /\.(png|jpe?g|webp|gif)$/i
const files = (await readdir(OUT_DIR)).filter((f) => IMG_RE.test(f))
const slugOf = (file) => file.replace(IMG_RE, '').toLowerCase()
const wanted = new Set(heroes.map((h) => heroKey(h.name)))

// 목록에서 빠진 영웅 프로필 정리
let pruned = 0
for (const file of files) {
  if (!wanted.has(slugOf(file))) {
    await unlink(new URL(file, OUT_DIR))
    console.log(`🗑 목록에 없음 → 삭제: ${file}`)
    pruned++
  }
}

const have = new Set(files.map(slugOf))
const todo = heroes.filter((h) => FORCE || !have.has(heroKey(h.name)))
const fromBanners = todo.length ? await bannerPortraits() : new Map()

let ok = 0
const failed = []
for (const { nick, name } of todo) {
  const slug = heroKey(name)
  let url = fromBanners.get(slug) ?? null
  let src = 'wornuts 배너'
  try {
    if (!url) {
      src = 'wornuts 영웅 페이지'
      url = await heroPagePortrait(slug)
    }
    if (!url) {
      src = 'fandom'
      url = await fandomImage(name)
    }
    if (!url) {
      console.warn(`✗ 이미지 없음: ${nick} (${name})`)
      failed.push(name)
      continue
    }
    for (const f of files.filter((f) => slugOf(f) === slug)) await unlink(new URL(f, OUT_DIR)).catch(() => {})
    const raw = new URL(`${slug}.${extOf(url)}`, OUT_DIR)
    await download(url, raw)
    const file = await shrink(raw, slug)
    console.log(`✓ ${nick} (${name}) → ${file} ← ${src}: ${url}`)
    ok++
  } catch (e) {
    console.warn(`✗ ${nick} (${name}): ${e.message}`)
    failed.push(name)
  }
}
console.log(
  `\n완료: 신규 ${ok} / 기존 유지 ${heroes.length - todo.length} / 삭제 ${pruned} / 실패 ${failed.length} (목록 ${heroes.length}명)`,
)
if (failed.length) console.log(`실패: ${failed.join(', ')} — guild/defenseHeroes.json 의 영문명을 확인하세요.`)
