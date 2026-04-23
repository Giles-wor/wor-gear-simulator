import { writeFile } from 'node:fs/promises'

const API_BASE = 'https://watcher-of-realms.fandom.com/api.php'
const SOURCE = 'Watcher of Realms Wiki'
const SOURCE_LEVEL = 'Lv.60'
const OUTPUT_FILE = new URL('../src/data/heroes.generated.ts', import.meta.url)

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
  const response = await fetch(buildApiUrl(params), {
    headers: {
      'User-Agent': 'wor-gear-simulator/0.1 (+https://github.com/Giles-wor/wor-gear-simulator)'
    }
  })

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${response.url}`)
  }

  return response.json()
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

  return heroFromPage(title, data.parse?.text?.['*'] ?? '')
}

function toTsModule(heroes) {
  return `import type { Hero } from './heroes'\n\nexport const heroes: Omit<Hero, 'awakeningAtkBonus' | 'burstAtkBonusPer100Aspd'>[] = ${JSON.stringify(heroes, null, 2)}\n`
}

async function main() {
  const titles = await fetchHeroTitles()
  const heroes = []

  for (const title of titles) {
    const hero = await fetchHeroPage(title)
    if (hero) {
      heroes.push(hero)
      console.log(`Fetched ${title}`)
    }
  }

  heroes.sort((a, b) => a.name.localeCompare(b.name))
  await writeFile(OUTPUT_FILE, toTsModule(heroes), 'utf8')
  console.log(`Wrote ${heroes.length} heroes to ${OUTPUT_FILE.pathname}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
