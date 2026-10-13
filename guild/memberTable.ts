// 멤버별 부속 표(마병 레벨, 방어덱 각성 등) 공통 동기화.
// 멤버 행은 진행 현황 표(첫 번째 표)의 캐릭명을 따라가고, 기존 값/수정일은 캐릭명으로 보존.
// 라이브 데이터(Supabase)에 표가 없어도 로드 시 자동 생성/동기화됨.
import type { GuildCell, GuildContent, GuildTable } from './types'
import { cellOf, titleColIndex } from './components/ResponsiveTable'

export type MemberTableSpec = {
  title: string
  /** 캐릭명 뒤에 올 열(순서대로) */
  columns: string[]
  note: string
  sumColumn?: boolean
}

/** 콘텐츠에 부속 표를 보장(생성/동기화)하고 맨 뒤에 배치. */
export function ensureMemberTable(content: GuildContent, spec: MemberTableSpec): GuildContent {
  const main = content.tables[0]
  if (!main) return content

  const mainTitleCol = titleColIndex(main.headers)
  const headers = ['캐릭명', ...spec.columns]

  const existing = content.tables.find((t) => t.title === spec.title)
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
    return [name, ...spec.columns.map((c) => prev[c] ?? '')]
  })
  const rowMeta = main.rows.map((r) => prevMeta.get(cellOf(r[mainTitleCol] ?? '').v) ?? {})

  const table: GuildTable = {
    title: spec.title,
    note: spec.note,
    headers,
    rows,
    rowMeta,
    ...(spec.sumColumn ? { sumColumn: true } : {}),
  }

  const others = content.tables.filter((t) => t.title !== spec.title)
  return { ...content, tables: [...others, table] }
}

/** 부속 표에서 멤버별 값 맵(열 → 값) 추출. */
export function memberValues(table?: GuildTable): Map<string, Record<string, string>> {
  const map = new Map<string, Record<string, string>>()
  if (!table) return map
  const tc = titleColIndex(table.headers)
  table.rows.forEach((r) => {
    const name = cellOf(r[tc] ?? '').v
    const vals: Record<string, string> = {}
    table.headers.forEach((h, ci) => {
      if (ci !== tc) vals[h] = cellOf(r[ci] ?? '').v
    })
    map.set(name, vals)
  })
  return map
}
