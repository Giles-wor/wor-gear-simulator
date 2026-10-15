// 운영진 전용 블랙리스트 데이터 스키마.
// 리더보드 공용 코드와 별개인 운영진 코드로 암호화되어 저장됩니다. 인게임 고유 ID·닉네임·사유 외의
// 개인정보는 담지 않습니다.

/** 확인된 닉네임 한 건. */
export type NameRecord = {
  name: string
  /** 이 닉네임을 확인한 날짜(YYYY-MM-DD) */
  seenAt: string
}

/** 블랙리스트 항목. 삭제는 deletedAt 이 채워진 상태(휴지통)이며 복구할 수 있습니다. */
export type BlacklistEntry = {
  id: string
  /** 인게임 고유 ID */
  uid: string
  /** 닉네임 기록(최신이 앞) */
  names: NameRecord[]
  /** 사유(사실 위주) */
  reason: string
  addedBy: string
  /** 추가일(YYYY-MM-DD) */
  addedAt: string
  updatedBy?: string
  updatedAt?: string
  deletedBy?: string
  deletedAt?: string
}

export type Blacklist = {
  v: 1
  entries: BlacklistEntry[]
}

export type BlacklistAction = 'add' | 'edit' | 'delete' | 'restore' | 'rekey'

/** 편집 로그 한 줄(복호화된 형태). */
export type BlacklistLog = {
  editor: string
  action: BlacklistAction
  uid?: string
  at: string
}
