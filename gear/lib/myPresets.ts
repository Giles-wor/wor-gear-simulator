// 사용자 개인 프리셋 — 브라우저 localStorage 에 저장.
// 역할 프리셋을 내 취향대로 편집한 뒤 이름 붙여 보관/불러오기.
import { newRuleId, type FilterRule } from './filter'

export type SavedPreset = {
  id: string
  name: string
  rules: FilterRule[]
  /** 저장 당시 변환 모드 (불러올 때 함께 복원) */
  conversion: boolean
  savedAt: number
}

const STORAGE_KEY = 'wor-gear-my-presets-v1'

export function loadMyPresets(): SavedPreset[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // 최소 형태 검증
    return parsed.filter(
      (p): p is SavedPreset =>
        p && typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.rules),
    )
  } catch {
    return []
  }
}

export function persistMyPresets(list: SavedPreset[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // 용량 초과 등은 조용히 무시 (기능 자체는 부가)
  }
}

export function newPresetId(): string {
  return `preset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

/** 불러올 때 규칙 id 를 새로 발급 (편집 중 key 충돌 방지). */
export function cloneRulesForLoad(rules: FilterRule[]): FilterRule[] {
  return rules.map((r) => ({ ...r, id: newRuleId() }))
}
