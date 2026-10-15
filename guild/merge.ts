// 동시 편집(여러 길드원이 같은 코드로 거의 동시에 저장) 시 데이터 손실 방지용 병합.
// 저장 직전 받은 최신 원격(latest) 을 바탕으로, 편집자가 실제로 건드린 칸만
// base(편집 시작 시점) 대비 edited 의 변경분을 덮어쓴다(3-way 병합).
// → 그 사이 다른 사람이 바꾼 칸은 같은 멤버라도 그대로 유지되어, 덮어쓰기로 인한 손실을 막는다.
// 같은 칸을 둘 다 다르게 바꿨으면 충돌로 모아 돌려주고, prefer 로 어느 쪽을 쓸지 정한다.
import { cellOf, titleColIndex } from './components/ResponsiveTable'
import type { GuildCell, GuildContent, GuildTable, RowMeta } from './types'

/** 같은 칸(또는 공지 등 필드)을 나와 다른 길드원이 서로 다르게 바꾼 경우. */
export type MergeConflict = {
  /** 표 제목 / '공지' / '이미지' / '링크' */
  where: string
  /** 멤버 이름(표 칸일 때) */
  member?: string
  /** 열 이름(표 칸일 때) */
  column?: string
  /** 내가 넣은 값(표시용) */
  mine: string
  /** 다른 길드원이 먼저 저장한 값(표시용) */
  theirs: string
}

/** 충돌 시 어느 쪽 값을 쓸지. mine=내 값, theirs=먼저 저장된 값. */
export type ConflictPreference = 'mine' | 'theirs'

export type MergeResult = { content: GuildContent; conflicts: MergeConflict[] }

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/**
 * 두 메타 중 갱신일이 더 최근인 쪽을 채택(YYYY-MM-DD 라 문자열 비교로 충분).
 * 편집기는 '어느 표든' 값이 바뀐 멤버를 모든 표에서 오늘 날짜로 찍는데, 병합이 표별로
 * 값 변경만 보고 원격의 옛 날짜를 되돌리면 그 갱신이 사라진다. 그걸 막는다.
 */
function newerMeta(latest?: RowMeta, edited?: RowMeta): RowMeta {
  return (edited?.updatedAt ?? '') > (latest?.updatedAt ?? '') ? (edited ?? {}) : (latest ?? {})
}

/**
 * 한 멤버의 행을 칸 단위로 병합. 열은 헤더 이름으로 맞춘다(결과는 edited 헤더 순서).
 * 내가 바꾼 칸 → 내 값, 안 바꾼 칸 → 최신 원격 값. 둘 다 다르게 바꾼 칸은 충돌.
 */
function mergeRowByCell(
  latest: { headers: string[]; row: GuildCell[] },
  base: { headers: string[]; row: GuildCell[] },
  edited: { headers: string[]; row: GuildCell[] },
  onConflict: (column: string, mine: GuildCell, theirs: GuildCell) => void,
  prefer: ConflictPreference,
): GuildCell[] {
  const at = (src: { headers: string[]; row: GuildCell[] }, h: string): GuildCell => {
    const i = src.headers.indexOf(h)
    return i < 0 ? '' : (src.row[i] ?? '')
  }
  return edited.headers.map((h, ci) => {
    const e = edited.row[ci] ?? ''
    const b = at(base, h)
    const l = at(latest, h)
    if (same(e, b)) return l // 내가 안 건드린 칸 → 최신 원격(남이 바꾼 값 보존)
    if (same(l, b) || same(l, e)) return e // 남은 안 건드렸거나 같은 값으로 바꿈
    onConflict(h, e, l)
    return prefer === 'mine' ? e : l
  })
}

/** 한 표를 멤버(행)·칸 단위로 병합. 멤버 식별 키 = 캐릭명 열 값. */
export function mergeTableByMember(
  latest: GuildTable,
  base: GuildTable,
  edited: GuildTable,
  conflicts: MergeConflict[] = [],
  prefer: ConflictPreference = 'mine',
): GuildTable {
  const tc = titleColIndex(edited.headers)
  const nameOf = (row: GuildCell[]) => cellOf(row[tc] ?? '').v
  const nameIn = (t: GuildTable) => (row: GuildCell[]) => cellOf(row[titleColIndex(t.headers)] ?? '').v

  const baseByName = new Map<string, GuildCell[]>()
  base.rows.forEach((r) => baseByName.set(nameIn(base)(r), r))

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

  const where = edited.title ?? '표'
  const mergeMember = (n: string, latestRow: GuildCell[]): GuildCell[] => {
    const e = editedByName.get(n)
    const b = baseByName.get(n)
    if (!e) return latestRow
    if (!b) return e // 내가 새로 추가한 멤버(같은 이름이 원격에도 생김) → 내 행
    return mergeRowByCell(
      { headers: latest.headers, row: latestRow },
      { headers: base.headers, row: b },
      { headers: edited.headers, row: e },
      (column, mine, theirs) =>
        conflicts.push({ where, member: n, column, mine: cellOf(mine).v, theirs: cellOf(theirs).v }),
      prefer,
    )
  }

  // 1) 최신 원격 순서 유지: 삭제된 멤버 제외, 편집자가 바꾼 멤버는 칸 단위로 병합,
  //    안 건드린 멤버는 최신 원격 그대로(= 남이 바꾼 값 보존)
  latest.rows.forEach((r, i) => {
    const n = nameIn(latest)(r)
    if (deleted.has(n)) return
    placed.add(n)
    rows.push(changed.has(n) ? mergeMember(n, r) : r)
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

/**
 * 멤버 단위가 아닌 필드(공지/이미지/링크)는 편집자가 바꿨으면 편집본, 아니면 최신 원격 유지.
 * 둘 다 다르게 바꿨으면 충돌.
 */
export function mergeField<T>(
  latest: T,
  base: T,
  edited: T,
  onConflict?: () => void,
  prefer: ConflictPreference = 'mine',
): T {
  if (same(edited, base)) return latest
  if (same(latest, base) || same(latest, edited)) return edited
  onConflict?.()
  return prefer === 'mine' ? edited : latest
}

/** 충돌 표시용 요약(긴 공지·이미지 데이터를 그대로 보여주지 않도록). */
function brief(kind: '공지' | '이미지' | '링크', v: unknown): string {
  if (kind === '공지') {
    const t = String(v ?? '').replace(/\s+/g, ' ').trim()
    return t.length > 40 ? `${t.slice(0, 40)}…` : t
  }
  return `${Array.isArray(v) ? v.length : 0}개`
}

/**
 * 저장 직전 받은 최신 원격(latest)에 편집자의 변경분만 병합한 콘텐츠와 충돌 목록을 반환.
 * prefer: 같은 칸을 둘 다 바꿨을 때 어느 값을 쓸지(기본 내 값).
 */
export function mergeMemberChanges(
  latest: GuildContent,
  base: GuildContent,
  edited: GuildContent,
  prefer: ConflictPreference = 'mine',
): MergeResult {
  const conflicts: MergeConflict[] = []
  const byTitle = (c: GuildContent) => new Map(c.tables.map((t) => [t.title ?? '', t]))
  const latestT = byTitle(latest)
  const baseT = byTitle(base)

  const tables = edited.tables.map((et) => {
    const lt = latestT.get(et.title ?? '')
    if (!lt) return et // 원격에 없던 표 → 편집본 그대로
    const bt = baseT.get(et.title ?? '') ?? { ...et, rows: [], rowMeta: [] }
    return mergeTableByMember(lt, bt, et, conflicts, prefer)
  })
  // 원격에만 있던 표(편집본엔 없는)는 보존
  latest.tables.forEach((lt) => {
    if (!edited.tables.some((et) => (et.title ?? '') === (lt.title ?? ''))) tables.push(lt)
  })

  const field = <K extends 'notice' | 'images' | 'links'>(key: K, kind: '공지' | '이미지' | '링크') =>
    mergeField(
      latest[key],
      base[key],
      edited[key],
      () => conflicts.push({ where: kind, mine: brief(kind, edited[key]), theirs: brief(kind, latest[key]) }),
      prefer,
    )

  return {
    content: {
      updatedAt: edited.updatedAt,
      notice: field('notice', '공지'),
      images: field('images', '이미지'),
      links: field('links', '링크'),
      tables,
    },
    conflicts,
  }
}
