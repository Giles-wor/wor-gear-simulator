// 진행 현황 표 스키마 마이그레이션.
// 옛 헤더(전투력 최고/최저)를 길전 투력1/2/3 으로 변환. 라이브(Supabase) 데이터가 옛 헤더여도
// 로드 시 자동 변환되고, 첫 저장 후 새 헤더로 영속된다. 이미 변환된 표는 그대로 통과.
import type { GuildCell, GuildTable } from './types'

export const MAIN_HEADERS = [
  '구분',
  '캐릭명',
  '길전 투력1',
  '길전 투력2',
  '길전 투력3',
  '드래곤(악몽4)',
  '드래곤(심연1)',
  '타이탄(종말2)',
  '타이탄(초월1)',
  '던전1',
  '던전2',
  '던전3',
  '던전A',
  '지하성1',
  '지하성2',
  '지하성3',
]

// 새 열 ← 옛 열 값 이전(데이터 보존). 길전 투력3 은 신규(빈 값).
const RENAME: Record<string, string> = {
  '길전 투력1': '전투력 최고',
  '길전 투력2': '전투력 최저',
}

export function migrateMainTable(t: GuildTable): GuildTable {
  if (t.headers.includes('길전 투력1')) return t // 이미 변환됨
  if (!t.headers.includes('전투력 최고')) return t // 진행 현황 표가 아님

  const rows: GuildCell[][] = t.rows.map((r) => {
    const byName: Record<string, GuildCell> = {}
    t.headers.forEach((h, ci) => {
      byName[h] = r[ci] ?? ''
    })
    return MAIN_HEADERS.map((h) => byName[RENAME[h] ?? h] ?? '')
  })

  return { ...t, headers: MAIN_HEADERS, rows }
}
