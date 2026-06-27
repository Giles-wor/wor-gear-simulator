// 마병(데몬솔져) 레벨 표 설정.
// 열 목록·순서는 여기서 관리. 멤버 행은 진행 현황 표(첫 번째 표)의 캐릭명을 따라감.
// 라이브 데이터(Supabase)에 마병 표가 없어도 로드 시 자동 생성/동기화됨.
import type { GuildCell, GuildContent, GuildTable } from './types'
import { cellOf, titleColIndex } from './components/ResponsiveTable'

export const SOLDIER_TABLE_TITLE = '마병 레벨'

/** 마병 열(순서대로). 추후 아이콘은 이 키에 매핑 예정. */
export const SOLDIERS: string[] = [
  'Slaughter',
  'Glacius (Demon Soldier)',
  'Countess Mariath',
  'Maw (Demon Soldier)',
  'Grotesque Fiend',
  'Frost Guardian',
  'Book Keeper',
  'Frost Canid',
  'Lightning Guard',
  'Fallen Templar',
  'Imperial Pharaoh Guard',
  'Ghoul Hound',
  'Garnet Guard',
  'Axe Slaughterer',
]

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
