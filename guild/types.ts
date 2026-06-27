// 길드원 전용 페이지 콘텐츠 스키마.
// 실제 내용은 암호화되어 guild/data/content.encrypted.json 에 저장됩니다.
// 평문 원본(guild/content.source.json)은 .gitignore 처리되어 리포에 올라가지 않습니다.

/** 표의 한 칸. 문자열이거나, 강조(주황) 표시가 필요하면 객체로. */
export type GuildCell = string | { v: string; hi?: boolean }

/** 행(길드원)별 메타데이터. rows 와 같은 인덱스로 정렬. */
export type RowMeta = {
  /** 이 행이 마지막으로 수정된 날짜 (YYYY-MM-DD) */
  updatedAt?: string
}

/** 진행 현황 등 표 형태 데이터. */
export type GuildTable = {
  title?: string
  /** 표 상단/하단 안내 문구 */
  note?: string
  headers: string[]
  rows: GuildCell[][]
  /** 행별 최종 수정일 (rows 와 같은 순서). 저장 시 변경된 행만 갱신. */
  rowMeta?: RowMeta[]
  /** 캐릭명 뒤에 '계'(행 합계) 열을 자동 표시. */
  sumColumn?: boolean
}

export type GuildLink = { label: string; url: string; desc?: string }

/** 이미지. src 는 base64 data URL — 암호화 블록 안에 통째로 들어가므로 코드 없이는 볼 수 없습니다. */
export type GuildImage = { caption?: string; src: string }

export type GuildContent = {
  /** 갱신일 (YYYY-MM-DD) */
  updatedAt: string
  /** 공지 / 자유 텍스트 (줄바꿈 \n 지원) */
  notice: string
  /** 진행 현황 등 표 */
  tables: GuildTable[]
  /** 이미지 (스크린샷 등) */
  images: GuildImage[]
  /** 링크 모음 */
  links: GuildLink[]
}

/** 암호화 블록 포맷 (encrypt-guild.mjs 출력 = 이 모양). */
export type EncryptedBlob = {
  v: number
  iterations: number
  salt: string
  iv: string
  ct: string
}
