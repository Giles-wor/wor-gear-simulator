import { writeFile } from 'node:fs/promises'

// 소환율/천장 데이터 best-effort 크롤러.
// 네트워크가 열린 환경(GitHub Action / 로컬)에서 동작.
// Fandom 페이지 구조가 확정되지 않았으므로 보수적으로 파싱하고,
// 신뢰할 데이터를 못 찾으면 generatedBanners 를 null 로 유지해 placeholder 를 보존한다.

const API_BASE = 'https://watcher-of-realms.fandom.com/api.php'
const OUTPUT_FILE = new URL('../summon/data/banners.generated.ts', import.meta.url)

const SOURCE_PAGE = 'Banner'
const SOURCE_URL = 'https://watcher-of-realms.fandom.com/wiki/Banner'

function buildApiUrl(params) {
  const url = new URL(API_BASE)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)))
  url.searchParams.set('format', 'json')
  return url
}

async function fetchJson(params) {
  const response = await fetch(buildApiUrl(params), {
    headers: {
      'User-Agent': 'wor-gear-simulator/0.1 (+https://github.com/Giles-wor/wor-gear-simulator)',
    },
  })
  if (!response.ok) throw new Error(`Request failed (${response.status}) for ${response.url}`)
  return response.json()
}

function stripHtml(value) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchPageHtml(title) {
  try {
    const data = await fetchJson({ action: 'parse', page: title, prop: 'text' })
    return data.parse?.text?.['*'] ?? null
  } catch {
    return null
  }
}

function firstNumber(pattern, text) {
  const match = text.match(pattern)
  return match ? Number(match[1]) : null
}

function readTrack(text, label, fallback) {
  const index = text.toLowerCase().indexOf(label.toLowerCase())
  const block = index >= 0 ? text.slice(index, index + 600) : ''
  const startsAfter = firstNumber(/after\s+(\d+)\s+consecutive\s+pulls/i, block)
  const increasePct = firstNumber(/increases[^.]*?by\s+(\d+(?:\.\d+)?)%/i, block)
  const guaranteedAt = firstNumber(/guaranteed\s+at\s+the\s+(\d+)(?:st|nd|rd|th)\s+summon/i, block)

  return {
    softPityStart: startsAfter != null ? startsAfter + 1 : fallback.softPityStart,
    softPityIncrement: increasePct != null ? increasePct / 100 : fallback.softPityIncrement,
    hardPity: guaranteedAt ?? fallback.hardPity,
  }
}

function buildGenerated(text) {
  const rareTrack = readTrack(text, 'Rare Summoning Pity', {
    softPityStart: 181,
    softPityIncrement: 0.05,
    hardPity: 200,
  })
  const legendaryTrack = readTrack(text, 'Legendary Summoning Pity', {
    softPityStart: 13,
    softPityIncrement: 0.05,
    hardPity: 20,
  })
  const ancientTrack = readTrack(text, 'Ancient Summoning Pity', {
    softPityStart: 186,
    softPityIncrement: 0.08,
    hardPity: 200,
  })

  const specialRateUpMultiplier = firstNumber(
    /first time you obtain a Legendary hero that is not a Rate-Up hero[^.]*?multiplied by\s+(\d+)/i,
    text,
  ) ?? 10
  const ancientRateUpMultiplier = firstNumber(
    /Special Ancient Summoning pools[\s\S]{0,260}?multiplied by\s+(\d+)/i,
    text,
  ) ?? 2
  const limitedGuarantee = firstNumber(/perform\s+(\d+)\s+summons[\s\S]{0,90}?guaranteed/i, text) ?? 200
  const scarletFeastGuarantee = firstNumber(/Count Dracula[^.]*?guaranteed after\s+(\d+)\s+Ancient summons/i, text) ?? 90

  // generated.ts 는 천장 규칙 / featuredMultiplier / stacking / featuredHardGuarantee 만 덮어쓴다.
  // 영주/일반 base rate 와 풀 크기는 위키에 없으므로 banners.ts placeholder 가 그대로 사용됨.
  return {
    normal: {
      ...rareTrack,
      featuredMultiplier: 1,
      notes: `기본 Rare 배너. Banner wiki Rare Summoning Pity 적용 (soft ${rareTrack.softPityStart}, hard ${rareTrack.hardPity}).`,
    },
    limited: {
      ...rareTrack,
      featuredMultiplier: 20,
      rateUpStackingMultiplier: specialRateUpMultiplier,
      featuredHardGuarantee: limitedGuarantee,
      notes: `Limited: Rare pity + ×20 + ×${specialRateUpMultiplier} stacking + ${limitedGuarantee}픽 픽업 확정.`,
    },
    ancient: {
      ...ancientTrack,
      featuredMultiplier: 20,
      rateUpStackingMultiplier: ancientRateUpMultiplier,
      notes: `Special Ancient: Ancient pity + ×20 + ×${ancientRateUpMultiplier} stacking. Scarlet Feast 보장 ${scarletFeastGuarantee}픽 (미모델).`,
    },
    divine: {
      ...legendaryTrack,
      featuredMultiplier: 20,
      rateUpStackingMultiplier: specialRateUpMultiplier,
      notes: `Special Divine: Legendary pity + ×20 + ×${specialRateUpMultiplier} stacking.`,
    },
  }
}

async function main() {
  const html = await fetchPageHtml(SOURCE_PAGE)

  const fetchedAt = new Date().toISOString()

  if (!html) {
    console.warn('Banner 페이지를 찾지 못했습니다. placeholder 유지 (generatedBanners=null).')
    await writeGenerated(null, null)
    return
  }

  const text = stripHtml(html)
  const generated = buildGenerated(text)

  await writeGenerated(generated, {
    url: SOURCE_URL,
    fetchedAt,
  })
  console.log(`소환 천장/배너 규칙 ${Object.keys(generated).join(', ')} 갱신 완료 (${SOURCE_PAGE}).`)
}

async function writeGenerated(generated, source) {
  const module =
    `// scripts/sync-summon.mjs 크롤 결과가 이 파일을 덮어씁니다.\n` +
    `// 크롤 성공 전에는 null 이며, banners.ts 가 placeholder 기본값을 사용합니다.\n` +
    `import type { BannerConfig } from '../lib/gacha'\n\n` +
    `export const generatedBanners: Partial<\n` +
    `  Record<BannerConfig['id'], Partial<BannerConfig>>\n` +
    `> | null = ${JSON.stringify(generated, null, 2)}\n\n` +
    `export const generatedSource: { url: string; fetchedAt: string } | null = ${JSON.stringify(
      source,
      null,
      2,
    )}\n`
  await writeFile(OUTPUT_FILE, module, 'utf8')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
