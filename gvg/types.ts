// 길드전(GvG) 리더보드 데이터 스키마.
// 읽기는 누구나(평문 저장), 수정은 공용 편집 코드가 있어야 하며, 저장 시 편집자 이름이 로그로 남습니다.

/** 결과 회차(열). 각 회차는 포인트/순위 두 칸으로 표시됩니다. */
export type Round = {
  /** 안정 키(재정렬·삭제에도 값 매핑 유지) */
  id: string
  /** 열 제목 예: '7-2 결과', '8-1 결과', '예상 결과' */
  label: string
  /** 예상(미확정) 회차 여부 — 헤더 색만 다르게 표시 */
  projected?: boolean
}

/** 길드(행). */
export type GuildRow = {
  id: string
  /** 태그 예: [眾神] */
  tag: string
  /** 길드명 예: ◆異域星辰◆ */
  name: string
  /** 노란 강조 행 여부 */
  highlight?: boolean
  /** 회차별 포인트. key = Round.id. 값 없으면 빈칸. */
  points: Record<string, number | null>
  /** 회차별 순위 수동보정. key = Round.id. 값이 있으면 자동계산 대신 이 값을 표시. */
  rankOverride: Record<string, number | null>
}

/** 리더보드 전체. */
export type Board = {
  /** 갱신일(YYYY-MM-DD) */
  updatedAt: string
  /** 표 좌상단 라벨 */
  title: string
  rounds: Round[]
  guilds: GuildRow[]
  /** 마지막 편집자 이름(서버가 저장 시 기록) */
  updatedBy?: string
}

/** 편집 로그 한 줄(서버 gvg_edit_log). */
export type EditLog = {
  editor: string
  note?: string | null
  at: string
}
