import type { Blacklist, BlacklistEntry, NameRecord } from './types'

export function emptyList(): Blacklist {
  return { v: 1, entries: [] }
}

/** 검색용 정규화: 소문자, 공백 제거. */
export function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '')
}

/** 고유 ID · 닉네임 기록(옛 닉 포함) · 사유 중 하나라도 검색어를 포함하면 일치. */
export function matches(e: BlacklistEntry, q: string): boolean {
  const n = norm(q)
  if (!n) return true
  return (
    norm(e.uid).includes(n) ||
    e.names.some((r) => norm(r.name).includes(n)) ||
    norm(e.reason).includes(n)
  )
}

/** 같은 고유 ID 의 다른 항목(휴지통 포함). */
export function findByUid(list: Blacklist, uid: string, exceptId?: string): BlacklistEntry | undefined {
  const n = norm(uid)
  return list.entries.find((e) => e.id !== exceptId && norm(e.uid) === n)
}

/** 빈 닉네임 줄을 빼고 확인 날짜 최신순으로. */
export function cleanNames(names: NameRecord[]): NameRecord[] {
  return names
    .map((r) => ({ name: r.name.trim(), seenAt: r.seenAt }))
    .filter((r) => r.name)
    .sort((a, b) => (b.seenAt || '').localeCompare(a.seenAt || ''))
}

/** 목록 정렬: 최근 추가/수정이 위. */
export function sortEntries(entries: BlacklistEntry[]): BlacklistEntry[] {
  return [...entries].sort((a, b) =>
    (b.updatedAt ?? b.addedAt).localeCompare(a.updatedAt ?? a.addedAt),
  )
}
