// WoR 장비 옵션(속성) 목록 — 주옵션(메인) / 부옵션(서브) 필터용.
// 인게임 장비 필터는 주옵션·부옵션을 각각 복수 선택, 부옵션은 N개 매칭 조건을 건다.
// 주의: 한 장비에서 메인 스탯과 동일한 속성은 서브로 다시 나오지 않음.

export type GearStat = {
  id: string
  /** 한글 라벨 */
  label: string
  /** 영문 라벨 */
  labelEn: string
  /** % 계열인지 (시각 구분용) */
  percent?: boolean
  /** 평탄(flat) 수치인지 — 중후반 비선호 */
  flat?: boolean
}

// 주옵션 (Primary / Main) 후보
export const mainStats: GearStat[] = [
  { id: 'atk_pct', label: '공격력 %', labelEn: 'ATK %', percent: true },
  { id: 'hp_pct', label: 'HP %', labelEn: 'HP %', percent: true },
  { id: 'def_pct', label: '방어력 %', labelEn: 'DEF %', percent: true },
  { id: 'crit_rate', label: '치명타 확률', labelEn: 'Crit Rate', percent: true },
  { id: 'crit_dmg', label: '치명타 피해', labelEn: 'Crit DMG', percent: true },
  { id: 'atk_spd', label: '공격 속도', labelEn: 'Attack Speed' },
  { id: 'healing', label: '치유 효과', labelEn: 'Healing Effect' },
  { id: 'rage_regen', label: '분노 재생 %', labelEn: 'Rage Regen %', percent: true },
  { id: 'atk_flat', label: '공격력 (고정)', labelEn: 'ATK (flat)', flat: true },
  { id: 'hp_flat', label: 'HP (고정)', labelEn: 'HP (flat)', flat: true },
  { id: 'def_flat', label: '방어력 (고정)', labelEn: 'DEF (flat)', flat: true },
]

// 부옵션 (Secondary / Sub) 후보 — 주옵션과 동일 풀
export const subStats: GearStat[] = [
  { id: 'atk_pct', label: '공격력 %', labelEn: 'ATK %', percent: true },
  { id: 'hp_pct', label: 'HP %', labelEn: 'HP %', percent: true },
  { id: 'def_pct', label: '방어력 %', labelEn: 'DEF %', percent: true },
  { id: 'crit_rate', label: '치명타 확률', labelEn: 'Crit Rate', percent: true },
  { id: 'crit_dmg', label: '치명타 피해', labelEn: 'Crit DMG', percent: true },
  { id: 'atk_spd', label: '공격 속도', labelEn: 'Attack Speed' },
  { id: 'rage_regen', label: '분노 재생 %', labelEn: 'Rage Regen %', percent: true },
  { id: 'healing', label: '치유 효과', labelEn: 'Healing Effect' },
  { id: 'atk_flat', label: '공격력 (고정)', labelEn: 'ATK (flat)', flat: true },
  { id: 'hp_flat', label: 'HP (고정)', labelEn: 'HP (flat)', flat: true },
  { id: 'def_flat', label: '방어력 (고정)', labelEn: 'DEF (flat)', flat: true },
]

export function statLabel(stats: GearStat[], id: string): string {
  return stats.find((s) => s.id === id)?.label ?? id
}
