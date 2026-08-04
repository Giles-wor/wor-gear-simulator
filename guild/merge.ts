// 동시 편집(여러 길드원이 같은 코드로 거의 동시에 저장) 시 데이터 손실 방지용 병합.
// 저장 직전 받은 최신 원격(latest) 을 바탕으로, 편집자가 실제로 건드린 멤버(행)만
// base(편집 시작 시점) 대비 edited 의 변경분을 덮어쓴다.
// → 그 사이 다른 사람이 바꾼 멤버는 그대로 유지되어, 전체 덮어쓰기로 인한 손실을 막는다.
import { cellOf, titleColIndex } from './components/ResponsiveTable'
import type { GuildCell, GuildContent, GuildTable, RowMeta } from './types'

/**
 * 두 메타 중 갱신일이 더 최근인 쪽을 채택(YYYY-MM-DD 라 문자열 비교로 충분).
 * 편집기는 '어느 표든' 값이 바뀐 멤버를 모든 표에서 오늘 날짜로 찍는데, 병합이 표별로
 * 값 변경만 보고 원격의 옛 날짜를 되돌리면 그 갱신이 사라진다. 그걸 막는다.
 */
function newerMeta(latest?: RowMeta, edited?: RowMeta): RowMeta {
  return (edited?.updatedAt ?? '') > (latest?.updatedAt ?? '') ? (edited ?? {}) : (latest ?? {})
}

/** 한 표를 멤버(행) 단위로 병합. 멤버 식별 키 = 캐릭명 열 값. */
export function mergeTableByMember(latest: GuildTable, base: GuildTable, edited: GuildTable): GuildTable {
  const tc = titleColIndex(edited.headers)
  const nameOf = (row: GuildCell[]) => cellOf(row[tc] ?? '').v

  const baseByName = new Map<string, GuildCell[]>()
  base.rows.forEach((r) => baseByName.set(nameOf(r), r))

  const editedByName = new Map<string, GuildCell[]>()
  const editedMeta = new Map<string, RowMeta | undefined>()
  edited.rows.forEach((r, i) => {
    const n = nameOf(r)
    editedByName.set(n, r)
    editedMeta.set(n, edited.rowMeta?.[i])
  })

  // 편집자가 추가/수정한 멤버, 삭제한 멤버
  const changed = new Set<string>()
  editedByName.forEach((r, n) => {
    const b = baseByName.get(n)
    if (!b || JSON.stringify(b) !== JSON.stringify(r)) changed.add(n)
  })
  const deleted = new Set<string>()
  baseByName.forEach((_r, n) => {
    if (!editedByName.has(n)) deleted.add(n)
  })

  const rows: GuildCell[][] = []
  const rowMeta: RowMeta[] = []
  const placed = new Set<string>()

  // 1) 최신 원격 순서 유지: 삭제된 멤버 제외, 편집자가 바꾼 멤버는 편집본으로 교체,
  //    안 건드린 멤버는 최신 원격 그대로(= 남이 바꾼 값 보존)
  latest.rows.forEach((r, i) => {
    const n = nameOf(r)
    if (deleted.has(n)) return
    placed.add(n)
    rows.push(changed.has(n) ? (editedByName.get(n) ?? r) : r)
    // 값은 표별 변경 여부대로, 갱신일은 둘 중 더 최근 것으로(다른 표에서만 바뀐 멤버 보존).
    rowMeta.push(newerMeta(latest.rowMeta?.[i], editedMeta.get(n)))
  })
  // 2) 편집자가 새로 추가한(최신 원격에 없던) 멤버를 뒤에 붙임
  editedByName.forEach((r, n) => {
    if (placed.has(n) || !changed.has(n)) return
    rows.push(r)
    rowMeta.push(editedMeta.get(n) ?? {})
  })

  return { ...latest, headers: edited.headers, sumColumn: edited.sumColumn, rows, rowMeta }
}

/** 멤버 단위가 아닌 필드(공지/이미지/링크)는 편집자가 바꿨으면 편집본, 아니면 최신 원격 유지. */
export function mergeField<T>(latest: T, base: T, edited: T): T {
  return JSON.stringify(edited) !== JSON.stringify(base) ? edited : latest
}

/** 저장 직전 받은 최신 원격(latest)에 편집자의 변경분만 병합한 콘텐츠를 반환. */
export function mergeMemberChanges(latest: GuildContent, base: GuildContent, edited: GuildContent): GuildContent {
  const byTitle = (c: GuildContent) => new Map(c.tables.map((t) => [t.title ?? '', t]))
  const latestT = byTitle(latest)
  const baseT = byTitle(base)

  const tables = edited.tables.map((et) => {
    const lt = latestT.get(et.title ?? '')
    if (!lt) return et // 원격에 없던 표 → 편집본 그대로
    const bt = baseT.get(et.title ?? '') ?? { ...et, rows: [], rowMeta: [] }
    return mergeTableByMember(lt, bt, et)
  })
  // 원격에만 있던 표(편집본엔 없는)는 보존
  latest.tables.forEach((lt) => {
    if (!edited.tables.some((et) => (et.title ?? '') === (lt.title ?? ''))) tables.push(lt)
  })

  return {
    updatedAt: edited.updatedAt,
    notice: mergeField(latest.notice, base.notice, edited.notice),
    images: mergeField(latest.images, base.images, edited.images),
    links: mergeField(latest.links, base.links, edited.links),
    tables,
  }
}
