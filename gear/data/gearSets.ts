// WoR 장비 세트 데이터 — Gear 위키 (https://watcher-of-realms.fandom.com/wiki/Gear) 기준.
// side: 'left' = 무기/방어구, 'right' = 팔찌/목걸이/반지 (3세트 핵심 효과)

export type GearSide = 'left' | 'right'

export type GearSetInfo = {
  id: string
  name: string
  /** 한글 이름 (인게임 표기 best-effort, 필요 시 수정) */
  nameKo?: string
  side: GearSide
  tier: 0 | 1 | 2 | 3
  bonus: string
  source: string
}

export const gearSets: GearSetInfo[] = [
  // ─────────── 좌측: 무기 / 방어구 ───────────
  { id: 'astral_guardian', name: 'Astral Guardian', nameKo: '성혼의 수호', side: 'left', tier: 3, bonus: 'HP +30%, DEF +15%', source: 'Gear Forge' },
  { id: 'lights_grace', name: "Light's Grace", nameKo: '빛의 은혜', side: 'left', tier: 3, bonus: 'Healing Effect +30, Rage Regen +10%', source: 'Gear Forge' },
  { id: 'wicked_vengeance', name: 'Wicked Vengeance', nameKo: '악의 복수', side: 'left', tier: 3, bonus: 'Crit.DMG +40%, ATK +10%', source: 'Gear Forge' },
  { id: 'immortal_warrior', name: 'Immortal Warrior', nameKo: '불굴의 용사', side: 'left', tier: 2, bonus: 'HP +25%, DEF +10%', source: 'GR1 (19-24)' },
  { id: 'warlord', name: 'Warlord', nameKo: '전쟁의 주인', side: 'left', tier: 2, bonus: 'ATK +25%, ATK Spd +30', source: 'GR1 (19-24)' },
  { id: 'salvation', name: 'Salvation', nameKo: '구원', side: 'left', tier: 1, bonus: 'Healing Effect +25', source: 'GR1 (13-24)' },
  { id: 'life_force', name: 'Life Force', nameKo: '생기', side: 'left', tier: 1, bonus: 'HP +25%', source: 'GR1 (13-24)' },
  { id: 'calamity', name: 'Calamity', nameKo: '재앙', side: 'left', tier: 1, bonus: 'ATK +25%', source: 'GR1 (13-24)' },
  { id: 'whirlwind', name: 'Whirlwind', nameKo: '질풍', side: 'left', tier: 1, bonus: 'ATK Spd +75', source: 'GR1 (13-24)' },
  { id: 'annihilating_might', name: 'Annihilating Might', nameKo: '인멸', side: 'left', tier: 1, bonus: 'Crit.DMG +35%', source: 'GR1 (13-24)' },
  { id: 'lifegiver', name: 'Lifegiver', nameKo: '생명 부여', side: 'left', tier: 0, bonus: 'Healing Effect +10', source: 'GR1 (6-12)' },
  { id: 'iron_fortress', name: 'Iron Fortress', nameKo: '강철 요새', side: 'left', tier: 0, bonus: 'DEF +15%', source: 'GR1 (6-12)' },
  { id: 'wrathful_onslaught', name: 'Wrathful Onslaught', nameKo: '분노의 맹공', side: 'left', tier: 0, bonus: 'Rage Regen +15%', source: 'GR1 (6-12)' },
  { id: 'savage_strike', name: 'Savage Strike', nameKo: '야만적 타격', side: 'left', tier: 0, bonus: 'ATK +10%', source: 'GR1 (6-12)' },
  { id: 'deadly_aim', name: 'Deadly Aim', nameKo: '치명적 조준', side: 'left', tier: 0, bonus: 'Crit.Rate +10%', source: 'GR1 (6-12)' },
  { id: 'vitality', name: 'Vitality', nameKo: '활력', side: 'left', tier: 0, bonus: 'HP +1000', source: 'GR1 (1-5)' },
  { id: 'juggernaut', name: 'Juggernaut', nameKo: '저거너트', side: 'left', tier: 0, bonus: 'ATK +200', source: 'GR1 (1-5)' },

  // ─────────── 우측: 팔찌 / 목걸이 / 반지 ───────────
  { id: 'wings_of_grace', name: 'Wings of Grace', nameKo: '성스러운 날개', side: 'right', tier: 3, bonus: 'Healing Effect +30, 최고 ATK 아군 ATK +12%', source: 'Gear Forge' },
  { id: 'cataclysm', name: 'Cataclysm', nameKo: '재앙 드래곤', side: 'right', tier: 3, bonus: '기본 공격 치명타 시 DMG +10% (8초, 5중첩)', source: 'Gear Forge' },
  { id: 'hells_lament', name: "Hell's Lament", nameKo: '지옥 비명', side: 'right', tier: 3, bonus: '궁극기 발동 시 DMG +35%, Crit.DMG +50% (20초)', source: 'Gear Forge' },
  { id: 'tempered_will', name: 'Tempered Will', nameKo: '강철 의지', side: 'right', tier: 3, bonus: 'DMG 감소 +15%, 차단당 DEF +5% (4중첩)', source: 'Gear Forge' },
  { id: 'unshaken_will', name: 'Unshaken Will', nameKo: '불멸의 의지', side: 'right', tier: 3, bonus: '배치 시 HP +20%, 피격 시 5% 회복', source: 'Gear Forge' },
  { id: 'morale', name: 'Morale', nameKo: '전의', side: 'right', tier: 3, bonus: '필드 위 모든 아군 DMG +4% (중첩 X)', source: 'Gear Forge' },
  { id: 'infernal_roar', name: 'Infernal Roar', nameKo: '마수의 포효', side: 'right', tier: 2, bonus: '기본 공격 DMG +40%', source: 'GR3 (19-24)' },
  { id: 'soulbound_arcana', name: 'Soulbound Arcana', nameKo: '영혼의 비밀', side: 'right', tier: 2, bonus: '궁극기 후 DMG +10% 영구 (5중첩)', source: 'GR3 (19-24)' },
  { id: 'ageless_wrath', name: 'Ageless Wrath', nameKo: '원시의 분노', side: 'right', tier: 2, bonus: 'Crit.DMG +30%, 치명타 시 +1% (30중첩)', source: 'GR2 (19-24)' },
  { id: 'undying_savage', name: 'Undying Savage', nameKo: '영원불멸의 무법자', side: 'right', tier: 2, bonus: '보호막/회복 시 Max HP +1%, DMG +4% (10중첩)', source: 'GR2 (19-24)' },
  { id: 'invigoration', name: 'Invigoration', nameKo: '신성한 영혼', side: 'right', tier: 2, bonus: 'Healing Effect +25, 배치 시 ATK +10%', source: 'GR2 (19-24)' },
  { id: 'asclepius', name: 'Asclepius', nameKo: '프리스트', side: 'right', tier: 1, bonus: 'Max HP +10%, Healing Effect +20', source: 'GR3 (14-24)' },
  { id: 'the_insight', name: 'The Insight', nameKo: '통찰', side: 'right', tier: 1, bonus: 'Crit.Rate +15%, 단일 기본공격 추가 피해', source: 'GR3 (14-24)' },
  { id: 'the_wisdom', name: 'The Wisdom', nameKo: '지혜', side: 'right', tier: 1, bonus: '궁극기 후 DMG +35% (10초)', source: 'GR3 (14-24)' },
  { id: 'the_glacier', name: 'The Glacier', nameKo: '북방', side: 'right', tier: 1, bonus: '배치 시 Max HP의 6% 만큼 ATK', source: 'GR2 (14-24)' },
  { id: 'night_terror', name: 'Night Terror', nameKo: '나이트메어', side: 'right', tier: 1, bonus: '치명타 후 DMG +25% (3초)', source: 'GR2 (14-24)' },
  { id: 'fracture', name: 'Fracture', nameKo: '폭발', side: 'right', tier: 1, bonus: 'HP 70% 이상 시 Crit.DMG +45%', source: 'GR2 (14-24)' },
  { id: 'curse', name: 'Curse', nameKo: '저주', side: 'right', tier: 1, bonus: '공격 범위 내 적당 DMG +6% (5중첩)', source: 'GR2 (14-24)' },
  { id: 'the_doom', name: 'The Doom', nameKo: '파멸', side: 'right', tier: 1, bonus: '단일 대상 DMG +18%', source: 'GR3 (10-24)' },
  { id: 'hawk_eye', name: 'Hawk Eye', nameKo: '호크아이', side: 'right', tier: 1, bonus: '기본공격 5회 시 DMG +25% (6초)', source: 'GR3 (10-24)' },
  { id: 'mana_spring', name: 'Mana Spring', nameKo: '마력', side: 'right', tier: 1, bonus: 'Rage Regen (Auto) +3', source: 'GR3 (10-24)' },
  { id: 'the_styx', name: 'The Styx', nameKo: '스틱스', side: 'right', tier: 1, bonus: 'AOE DMG +18%', source: 'GR2 (10-24)' },
  { id: 'fatality', name: 'Fatality', nameKo: '치명', side: 'right', tier: 1, bonus: 'ATK +3%, DEF/M.RES 12% 무시', source: 'GR2 (10-24)' },
  { id: 'guardian', name: 'Guardian', nameKo: '수호', side: 'right', tier: 1, bonus: 'DMG Taken -15%', source: 'GR2 (10-24)' },
  { id: 'occult_shield', name: 'Occult Shield', nameKo: '오컬트 실드', side: 'right', tier: 0, bonus: 'DMG Taken -10%', source: 'GR3 (1-9)' },
  { id: 'twisted_blade', name: 'Twisted Blade', nameKo: '뒤틀린 칼날', side: 'right', tier: 0, bonus: 'DMG +10%', source: 'GR3 (1-9)' },
  { id: 'rapidity', name: 'Rapidity', nameKo: '신속', side: 'right', tier: 0, bonus: 'Cost -1', source: 'GR2 (1-9)' },
  { id: 'the_tempest', name: 'The Tempest', nameKo: '폭풍', side: 'right', tier: 0, bonus: 'Rage Regen (ATK) +2', source: 'GR2 (1-9)' },
]

export const gearSetsBySide: Record<GearSide, GearSetInfo[]> = {
  left: gearSets.filter((s) => s.side === 'left'),
  right: gearSets.filter((s) => s.side === 'right'),
}

export function findGearSet(id: string): GearSetInfo | undefined {
  return gearSets.find((s) => s.id === id)
}

/** 한글 우선 표시명. 한글 없으면 영문. */
export function gearSetDisplayName(id: string): string {
  const s = findGearSet(id)
  if (!s) return id
  return s.nameKo ?? s.name
}
