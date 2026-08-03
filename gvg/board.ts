import type { Board, GuildRow } from './types'

/** 새 안정 id. Date/Math.random 미사용(빌드 환경 제약)이라 접두사+카운터. */
let _seq = 0
export function newId(prefix: string): string {
  _seq += 1
  return `${prefix}${Date.now?.() ?? ''}_${_seq}`
}

/**
 * 한 회차(열)의 자동 순위. 포인트 내림차순, 동점은 배열 순서(안정)로 처리.
 * 포인트가 비어있는(null) 길드는 순위 없음.
 * @returns guildId -> rank(1부터)
 */
export function autoRanks(guilds: GuildRow[], roundId: string): Map<string, number> {
  const scored = guilds
    .map((g, idx) => ({ id: g.id, idx, pt: g.points[roundId] }))
    .filter((r) => typeof r.pt === 'number') as { id: string; idx: number; pt: number }[]
  scored.sort((a, b) => (b.pt - a.pt) || (a.idx - b.idx))
  const out = new Map<string, number>()
  scored.forEach((r, i) => out.set(r.id, i + 1))
  return out
}

/** 표시할 순위: 수동보정 값이 있으면 그것, 없으면 자동 순위. */
export function displayRank(
  guild: GuildRow,
  roundId: string,
  auto: Map<string, number>,
): number | null {
  const ov = guild.rankOverride?.[roundId]
  if (typeof ov === 'number') return ov
  return auto.get(guild.id) ?? null
}

/** 회차 하나 기준으로 길드 행을 순위(자동) 오름차순 정렬한 새 배열. */
export function sortByRound(board: Board, roundId: string): GuildRow[] {
  const auto = autoRanks(board.guilds, roundId)
  return [...board.guilds].sort((a, b) => {
    const ra = a.rankOverride?.[roundId] ?? auto.get(a.id) ?? Number.POSITIVE_INFINITY
    const rb = b.rankOverride?.[roundId] ?? auto.get(b.id) ?? Number.POSITIVE_INFINITY
    return ra - rb
  })
}

export function emptyGuild(): GuildRow {
  return { id: newId('g'), tag: '', name: '', points: {}, rankOverride: {} }
}

/** 깊은 복제(구조가 단순 JSON 이라 안전). */
export function cloneBoard(b: Board): Board {
  return JSON.parse(JSON.stringify(b))
}
