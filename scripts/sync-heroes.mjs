import { readFile, writeFile } from 'node:fs/promises'

const API_BASE = 'https://watcher-of-realms.fandom.com/api.php'
const SOURCE = 'Watcher of Realms Wiki'
const SOURCE_LEVEL = 'Lv.60'
const OUTPUT_FILE = new URL('../src/data/heroes.generated.ts', import.meta.url)
// 위키 문서는 있지만 스탯(atk/atkinterval) 미기재로 건너뛴 영웅 — 상태 점검(check-health)이 읽음
const PENDING_FILE = new URL('../src/data/heroes.pending.generated.json', import.meta.url)

// 위키 부하를 줄이고 일시 오류(503 등)를 넘기기 위한 설정
const REQUEST_DELAY_MS = 500 // 요청 사이 간격
const RETRY_DELAYS_MS = [5_000, 15_000, 45_000] // 실패 시 재시도 대기 (점점 늘림)
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504])
// 이 비율보다 많이 실패하면 위키 장애로 보고 기존 파일을 건드리지 않고 중단
const MAX_FAILED_RATIO = 0.2

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const FIELD_KEYS = [
  'faction',
  'class',
  'damagetype',
  'rarity',
  'herotags',
  'hp',
  'atk',
  'def',
  'mdef',
  'block',
  'cost',
  'deploy',
  'atkinterval',
  'atkspeed',
  'critrate',
  'critdmg',
  'healingeffect',
  'rageregen',
  'rrauto',
  'rrattack',
  'rrattacked',
]

function buildApiUrl(params) {
  const url = new URL(API_BASE)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value))
  })
  url.searchParams.set('format', 'json')
  return url
}

async function fetchJson(params) {
  const url = buildApiUrl(params)

  for (let attempt = 0; ; attempt += 1) {
    let response
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': 'wor-gear-simulator/0.1 (+https://github.com/Giles-wor/wor-gear-simulator)'
        }
      })
    } catch (error) {
      // 네트워크 오류도 일시 오류로 보고 재시도
      if (attempt < RETRY_DELAYS_MS.length) {
        console.warn(`Network error for ${url} (${error.message}) — ${RETRY_DELAYS_MS[attempt] / 1000}s 후 재시도`)
        await sleep(RETRY_DELAYS_MS[attempt])
        continue
      }
      throw error
    }

    if (response.ok) return response.json()

    if (RETRY_STATUSES.has(response.status) && attempt < RETRY_DELAYS_MS.length) {
      const retryAfter = Number(response.headers.get('retry-after'))
      const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : RETRY_DELAYS_MS[attempt]
      console.warn(`Request failed (${response.status}) for ${url} — ${wait / 1000}s 후 재시도`)
      await sleep(wait)
      continue
    }

    throw new Error(`Request failed (${response.status}) for ${response.url}`)
  }
}

/** 직전 크롤 결과 — 이번에 못 읽은 영웅은 이 값을 그대로 유지 */
async function readPrevious() {
  const heroes = new Map()
  const pending = new Map()
  try {
    const src = await readFile(OUTPUT_FILE, 'utf8')
    const json = src.slice(src.indexOf('= [') + 2).trim()
    for (const hero of JSON.parse(json)) heroes.set(hero.id, hero)
  } catch (error) {
    console.warn(`기존 영웅 데이터를 읽지 못함 (${error.message}) — 실패한 영웅은 빠짐`)
  }
  try {
    for (const item of JSON.parse(await readFile(PENDING_FILE, 'utf8'))) pending.set(item.id, item)
  } catch {
    // 없으면 무시
  }
  return { heroes, pending }
}

function decodeHtml(value) {
  return value
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function stripHtml(value) {
  return decodeHtml(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractField(html, key) {
  const pattern = new RegExp(`<div class="pi-item pi-data[\\s\\S]*?data-source="${key}"[\\s\\S]*?<div class="pi-data-value pi-font">([\\s\\S]*?)<\\/div>`, 'i')
  const match = html.match(pattern)
  return match ? match[1].trim() : null
}

function textList(value) {
  if (!value) return []

  return value
    .replace(/<\/a>/gi, '</a>\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .split('\n')
    .map((item) => stripHtml(item))
    .filter(Boolean)
}

function numericValue(value) {
  if (!value) return 0
  const cleaned = stripHtml(value).replace(/,/g, '').replace(/%/g, '')
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

function slugifyTitle(title) {
  return title
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function extractDescription(tags, rarity, heroClass, damageType) {
  if (tags.length > 0) return tags.join(' / ')
  return `${rarity} ${heroClass} / ${damageType}`
}

function heroFromPage(title, html) {
  const values = Object.fromEntries(FIELD_KEYS.map((key) => [key, extractField(html, key)]))
  const factions = textList(values.faction)
  const heroTags = textList(values.herotags)

  if (!values.atk || !values.atkinterval) {
    return null
  }

  return {
    id: slugifyTitle(title),
    name: stripHtml(title),
    wikiTitle: title,
    wikiUrl: `https://watcher-of-realms.fandom.com/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    source: SOURCE,
    sourceLevel: SOURCE_LEVEL,
    rarity: stripHtml(values.rarity ?? ''),
    heroClass: stripHtml(values.class ?? ''),
    damageType: stripHtml(values.damagetype ?? ''),
    factions,
    heroTags,
    description: extractDescription(heroTags, stripHtml(values.rarity ?? ''), stripHtml(values.class ?? ''), stripHtml(values.damagetype ?? '')),
    hp: numericValue(values.hp),
    baseAtk: numericValue(values.atk),
    defense: numericValue(values.def),
    magicRes: numericValue(values.mdef),
    block: numericValue(values.block),
    cost: numericValue(values.cost),
    revivalTime: numericValue(values.deploy),
    baseInterval: numericValue(values.atkinterval),
    attackSpeed: numericValue(values.atkspeed),
    critRate: numericValue(values.critrate),
    critDmg: numericValue(values.critdmg),
    healingEffect: numericValue(values.healingeffect),
    rageRegen: numericValue(values.rageregen),
    rrAuto: numericValue(values.rrauto),
    rrBasicAtk: numericValue(values.rrattack),
    rrAttacked: numericValue(values.rrattacked),
  }
}

async function fetchHeroTitles() {
  const titles = []
  let continueToken = null

  do {
    const data = await fetchJson({
      action: 'query',
      list: 'embeddedin',
      eititle: 'Template:Hero',
      eilimit: '500',
      einamespace: '0',
      ...(continueToken ? { eicontinue: continueToken } : {})
    })

    titles.push(...(data.query?.embeddedin ?? []).map((item) => item.title))
    continueToken = data.continue?.eicontinue ?? null
  } while (continueToken)

  return titles
}

async function fetchHeroPage(title) {
  const data = await fetchJson({
    action: 'parse',
    page: title,
    prop: 'text',
  })

  const html = data.parse?.text?.['*'] ?? ''
  return { hero: heroFromPage(title, html), html }
}

/** 스탯 미기재 영웅의 기본 정보 (출시 직전/직후 신캐) */
function pendingFromPage(title, html) {
  return {
    id: slugifyTitle(title),
    name: stripHtml(title),
    rarity: stripHtml(extractField(html, 'rarity') ?? ''),
    heroClass: stripHtml(extractField(html, 'class') ?? ''),
    factions: textList(extractField(html, 'faction')),
  }
}

function toTsModule(heroes) {
  return `import type { Hero } from './heroes'\n\nexport const heroes: Omit<Hero, 'awakeningAtkBonus' | 'burstAtkBonusPer100Aspd'>[] = ${JSON.stringify(heroes, null, 2)}\n`
}

async function main() {
  const titles = await fetchHeroTitles()
  const previous = await readPrevious()
  const heroes = []
  const pending = []
  const failed = []

  for (const title of titles) {
    await sleep(REQUEST_DELAY_MS)
    let page
    try {
      page = await fetchHeroPage(title)
    } catch (error) {
      // 한 영웅 실패로 전체를 멈추지 않음 — 직전 데이터 유지
      failed.push(title)
      const id = slugifyTitle(title)
      if (previous.heroes.has(id)) heroes.push(previous.heroes.get(id))
      else if (previous.pending.has(id)) pending.push(previous.pending.get(id))
      console.warn(`Failed ${title} (${error.message}) — 직전 데이터 유지`)
      continue
    }

    const { hero, html } = page
    if (hero) {
      heroes.push(hero)
      console.log(`Fetched ${title}`)
    } else if (html) {
      pending.push(pendingFromPage(title, html))
      console.log(`Skipped ${title} (스탯 미기재)`)
    }
  }

  if (failed.length > titles.length * MAX_FAILED_RATIO) {
    throw new Error(`${titles.length}명 중 ${failed.length}명 실패 — 위키 장애로 보고 기존 파일 유지`)
  }
  if (failed.length) console.warn(`실패 ${failed.length}명 (직전 데이터 유지): ${failed.join(', ')}`)

  heroes.sort((a, b) => a.name.localeCompare(b.name))
  pending.sort((a, b) => a.name.localeCompare(b.name))
  await writeFile(OUTPUT_FILE, toTsModule(heroes), 'utf8')
  await writeFile(PENDING_FILE, JSON.stringify(pending, null, 2) + '\n', 'utf8')
  console.log(`Wrote ${heroes.length} heroes to ${OUTPUT_FILE.pathname} (스탯 미기재 ${pending.length}명 → ${PENDING_FILE.pathname})`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
