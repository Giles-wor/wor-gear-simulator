// 진행 현황 표 자동 강조(주황) 컷.
// 헤더 이름 → 최소 컷. 셀의 숫자 값이 컷보다 "낮으면" 미달로 보고 자동 주황 표시.
// (콤마 등은 무시하고 숫자만 비교. 빈 칸은 표시 안 함.)
//
// 컷이 정해지면 아래에 채우세요. 예:
//   '전투력 최저': 110000,
//   '드래곤(심연1)': 60000,
export const THRESHOLDS: Record<string, number> = {
  '드래곤(악몽4)': 50000,
  '드래곤(심연1)': 10000,
  '타이탄(종말2)': 130000,
  '타이탄(초월1)': 160000,
  던전1: 24,
  던전2: 24,
  던전3: 24,
  던전A: 30,
  지하성1: 13,
  지하성2: 13,
  지하성3: 13,
}

/** 문자열 셀에서 숫자만 파싱. 숫자가 없으면 null. */
export function parseNum(value: string): number | null {
  if (!value || !value.trim()) return null
  const n = Number(value.replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

/** 해당 열에 컷이 있고, 값이 컷보다 낮으면 true(미달 → 강조). */
export function belowCut(header: string, value: string): boolean {
  const cut = THRESHOLDS[header]
  if (cut == null) return false
  const n = parseNum(value)
  return n !== null && n < cut
}
