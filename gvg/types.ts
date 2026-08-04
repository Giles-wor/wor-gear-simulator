// 길드전(GvG) 리더보드 데이터 스키마.
// 공용 코드 1개로 열람·수정합니다. 코드는 암호키 겸 보드 식별자(sha256)로 쓰이며,
// 보드와 편집 로그는 브라우저에서 암호화된 뒤 저장되므로 코드 없이는 DB 를 열어도 내용을 볼 수 없습니다.

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
  /** 마지막 편집자 이름 */
  updatedBy?: string
}

/** AES-GCM 암호문 블록. salt 는 보드 id 로 고정이라 따로 담지 않습니다. */
export type EncBlob = {
  v: 1
  iterations: number
  /** base64 */
  iv: string
  /** base64 */
  ct: string
}

/** 편집 로그 한 줄(복호화된 형태). */
export type EditLog = {
  editor: string
  note?: string | null
  at: string
}

/** 서버 gvg_edit_log 한 줄. 편집자/메모는 암호문, 시각만 평문. */
export type LogRow = {
  blob: EncBlob
  at: string
}
