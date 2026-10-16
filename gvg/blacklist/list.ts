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

/** 붙여넣기 한 줄을 칸으로 나눈다. 엑셀 복사(탭) → `|` → 공백 2칸 이상 순으로 구분자를 고른다. */
function splitCells(line: string): string[] {
  const cells = line.includes('\t') ? line.split('\t') : line.includes('|') ? line.split('|') : line.split(/\s{2,}/)
  return cells.map((c) => c.trim())
}

/**
 * 엑셀에서 복사한 여러 줄을 항목으로 바꾼다. 칸 순서: 고유 ID · 서버 · 닉네임 · 길드 · 사유(나머지 칸은 사유에 이어 붙임).
 * 서버·길드는 따로 칸이 없어 사유 뒤 괄호에 남긴다. 고유 ID 가 빈 줄은 건너뛴다.
 */
export function parsePasted(
  text: string,
  editor: string,
  date: string,
  makeId: () => string,
): BlacklistEntry[] {
  const out: BlacklistEntry[] = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const [uid = '', server = '', name = '', guild = '', ...rest] = splitCells(line)
    if (!uid) continue
    const note = rest.filter(Boolean).join(' ')
    const extra = [server && `서버 ${server}`, guild && `길드 ${guild}`].filter(Boolean).join(' · ')
    out.push({
      id: makeId(),
      uid,
      names: name ? [{ name, seenAt: date }] : [],
      reason: [note, extra && `(${extra})`].filter(Boolean).join(' ') || '(사유 미기재)',
      addedBy: editor,
      addedAt: date,
    })
  }
  return out
}
