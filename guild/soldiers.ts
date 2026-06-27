// 마병(데몬솔져) 레벨 표 설정.
// 열 목록·순서는 여기서 관리. 멤버 행은 진행 현황 표(첫 번째 표)의 캐릭명을 따라감.
// 라이브 데이터(Supabase)에 마병 표가 없어도 로드 시 자동 생성/동기화됨.
import type { GuildCell, GuildContent, GuildTable } from './types'
import { cellOf, titleColIndex } from './components/ResponsiveTable'
import soldierNames from './soldiers.json'

export const SOLDIER_TABLE_TITLE = '마병 레벨'

/** 마병 열(순서대로). 목록은 guild/soldiers.json 에서 관리(크롤 스크립트와 공유). */
export const SOLDIERS: string[] = soldierNames as string[]

/** 마병명 → 파일 슬러그. 크롤 스크립트(sync-soldiers.mjs)와 동일 규칙. */
export function soldierKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// guild/assets/soldiers/*.<ext> 아이콘을 빌드 URL 로 로드(파일 없으면 빈 맵 → 텍스트 폴백).
const iconModules = import.meta.glob('./assets/soldiers/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

/** 마병 아이콘 URL. 없으면 undefined(헤더에 텍스트 표시). */
export function soldierIcon(name: string): string | undefined {
  if (!SOLDIERS.includes(name)) return undefined
  const key = soldierKey(name)
  for (const [path, url] of Object.entries(iconModules)) {
    const file = (path.split('/').pop() ?? '').toLowerCase()
    if (file.startsWith(`${key}.`)) return url
  }
  return undefined
}

/** 콘텐츠에 마병 표를 보장(생성/동기화). 멤버=진행현황 기준, 기존 레벨/수정일은 캐릭명으로 보존. */
export function ensureSoldierTable(content: GuildContent): GuildContent {
  const main = content.tables[0]
  if (!main) return content

  const mainTitleCol = titleColIndex(main.headers)
  const headers = ['캐릭명', ...SOLDIERS]

  const existing = content.tables.find((t) => t.title === SOLDIER_TABLE_TITLE)
  const prevVals = new Map<string, Record<string, GuildCell>>()
  const prevMeta = new Map<string, { updatedAt?: string }>()
  if (existing) {
    const et = titleColIndex(existing.headers)
    existing.rows.forEach((r, i) => {
      const name = cellOf(r[et] ?? '').v
      const vals: Record<string, GuildCell> = {}
      existing.headers.forEach((h, ci) => {
        if (ci !== et) vals[h] = r[ci] ?? ''
      })
      prevVals.set(name, vals)
      const meta = existing.rowMeta?.[i]
      if (meta) prevMeta.set(name, meta)
    })
  }

  const rows: GuildCell[][] = main.rows.map((r) => {
    const name = cellOf(r[mainTitleCol] ?? '').v
    const prev = prevVals.get(name) ?? {}
    return [name, ...SOLDIERS.map((s) => prev[s] ?? '')]
  })
  const rowMeta = main.rows.map((r) => prevMeta.get(cellOf(r[mainTitleCol] ?? '').v) ?? {})

  const soldierTable: GuildTable = {
    title: SOLDIER_TABLE_TITLE,
    note: '마병(데몬솔져) 레벨. 계 = 레벨 자동 합계. 멤버는 진행 현황 표 기준으로 동기화됩니다.',
    headers,
    rows,
    rowMeta,
    sumColumn: true,
  }

  const others = content.tables.filter((t) => t.title !== SOLDIER_TABLE_TITLE)
  return { ...content, tables: [...others, soldierTable] }
}
