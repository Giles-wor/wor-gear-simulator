// 마병(데몬솔져) 아이콘 크롤 스크립트.
// fandom MediaWiki API 로 각 마병 페이지의 대표 이미지를 받아 guild/assets/soldiers/<슬러그>.<확장자> 로 저장.
//
// 사용법(위키 접속 가능한 로컬에서):
//   npm run sync:soldiers
// 그 다음 guild/assets/soldiers/ 의 이미지를 커밋하면 표 헤더가 아이콘으로 바뀝니다.
// (앱은 아이콘 파일이 없으면 자동으로 텍스트 헤더로 표시 — 폴백)
//
// 목록은 guild/soldiers.json 에서 읽음(앱과 공유). 슬러그 규칙은 guild/soldiers.ts 의 soldierKey 와 동일.
import { readFile, writeFile, mkdir } from 'node:fs/promises'

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

const names = JSON.parse(await readFile(LIST, 'utf8'))
await mkdir(OUT_DIR, { recursive: true })

let ok = 0
for (const name of names) {
  try {
    const url = await imageUrl(name)
    if (!url) {
      console.warn(`✗ 이미지 없음: ${name}`)
      continue
    }
    const file = `${soldierKey(name)}.${extOf(url)}`
    await download(url, new URL(file, OUT_DIR))
    console.log(`✓ ${name} → ${file}`)
    ok++
  } catch (e) {
    console.warn(`✗ ${name}: ${e.message}`)
  }
}
console.log(`\n완료: ${ok}/${names.length}개 저장 → guild/assets/soldiers/`)
if (ok < names.length) {
  console.log('일부 실패는 위키 페이지명이 다르거나 대표 이미지가 없는 경우입니다. guild/soldiers.json 의 이름을 위키 문서명과 맞춰보세요.')
}
