// 마병(데몬솔져) 아이콘 크롤 스크립트.
// fandom MediaWiki API 로 각 마병 페이지의 대표 이미지를 받아 guild/assets/soldiers/<슬러그>.<확장자> 로 저장.
//
// 사용법(위키 접속 가능한 환경에서 — 보통 GitHub Actions 가 자동 실행):
//   npm run sync:soldiers            ← 아이콘 없는 마병만 받고, 목록에서 빠진 마병 아이콘은 삭제
//   npm run sync:soldiers -- --force ← 전부 다시 받기
// (앱은 아이콘 파일이 없으면 자동으로 텍스트 헤더로 표시 — 폴백)
//
// 목록은 guild/soldiers.json 에서 읽음(앱과 공유). 슬러그 규칙은 guild/soldiers.ts 의 soldierKey 와 동일.
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises'

const API = 'https://watcher-of-realms.fandom.com/api.php'
const UA = 'wor-gear-simulator/0.1 (+https://github.com/Giles-wor/wor-gear-simulator)'
const OUT_DIR = new URL('../guild/assets/soldiers/', import.meta.url)
const LIST = new URL('../guild/soldiers.json', import.meta.url)

function soldierKey(name) {
  return name
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function api(params) {
  const url = new URL(API)
  Object.entries({ ...params, format: 'json', redirects: 1 }).forEach(([k, v]) =>
    url.searchParams.set(k, String(v)),
  )
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`API ${res.status} (${url})`)
  return res.json()
}

async function imageUrl(title) {
  const data = await api({
    action: 'query',
    prop: 'pageimages',
    piprop: 'original|thumbnail',
    pithumbsize: 256,
    titles: title,
  })
  const pages = data?.query?.pages ?? {}
  const page = Object.values(pages)[0]
  return page?.original?.source || page?.thumbnail?.source || null
}

function extOf(url) {
  const m = url.split('?')[0].match(/\.(png|jpe?g|webp|gif)/i)
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'png'
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`IMG ${res.status} (${url})`)
  await writeFile(dest, Buffer.from(await res.arrayBuffer()))
}

const FORCE = process.argv.includes('--force')
const names = JSON.parse(await readFile(LIST, 'utf8'))
await mkdir(OUT_DIR, { recursive: true })

const IMG_RE = /\.(png|jpe?g|webp|gif)$/i
const files = (await readdir(OUT_DIR)).filter((f) => IMG_RE.test(f))
const slugOf = (file) => file.replace(IMG_RE, '').toLowerCase()
const wanted = new Set(names.map(soldierKey))

// 목록에서 빠진 마병 아이콘 정리
let pruned = 0
for (const file of files) {
  if (!wanted.has(slugOf(file))) {
    await unlink(new URL(file, OUT_DIR))
    console.log(`🗑 목록에 없음 → 삭제: ${file}`)
    pruned++
  }
}

const have = new Set(files.map(slugOf))
let ok = 0
let skipped = 0
const failed = []
for (const name of names) {
  if (!FORCE && have.has(soldierKey(name))) {
    skipped++
    continue
  }
  try {
    const url = await imageUrl(name)
    if (!url) {
      console.warn(`✗ 이미지 없음: ${name}`)
      failed.push(name)
      continue
    }
    const file = `${soldierKey(name)}.${extOf(url)}`
    await download(url, new URL(file, OUT_DIR))
    console.log(`✓ ${name} → ${file}`)
    ok++
  } catch (e) {
    console.warn(`✗ ${name}: ${e.message}`)
    failed.push(name)
  }
}
console.log(`\n완료: 신규 ${ok} / 기존 유지 ${skipped} / 삭제 ${pruned} / 실패 ${failed.length} (목록 ${names.length}종)`)
if (failed.length) {
  console.log(`실패: ${failed.join(', ')}`)
  console.log('위키 페이지명이 다르거나 대표 이미지가 없는 경우입니다. guild/soldiers.json 의 이름을 위키 문서명과 맞춰보세요.')
}
