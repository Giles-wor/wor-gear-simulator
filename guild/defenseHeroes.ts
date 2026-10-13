// 길드전 방어덱 영웅 각성 표 설정.
// 영웅 목록·순서는 guild/defenseHeroes.json 에서 관리(크롤 스크립트와 공유).
//   nick = 화면에 보이는 줄임 이름, name = 영문 영웅명(표 열 키 · 아이콘 파일명 기준).
// 값: '' = 미보유(X), '0' = 노각성, '1'~'5' = 각성 단계.
import type { GuildContent } from './types'
import { ensureMemberTable } from './memberTable'
import heroList from './defenseHeroes.json'

export const DEFENSE_TABLE_TITLE = '길드전 방어덱 각성'

export type DefenseHero = { nick: string; name: string }
export const DEFENSE_HEROES: DefenseHero[] = heroList as DefenseHero[]
const byName = new Map(DEFENSE_HEROES.map((h) => [h.name, h]))

/** 입력 가능한 각성 값('' = X). */
export const AWAKEN_OPTIONS = ['', '0', '1', '2', '3', '4', '5']

/** 셀 값 → 표시 문자열. 빈 칸/그 외 값은 X. */
export function awakenLabel(v: string): string {
  const t = v.trim()
  return /^[0-5]$/.test(t) ? t : 'X'
}

/** 영웅명 → 파일 슬러그. 크롤 스크립트(sync-hero-icons.mjs)와 동일 규칙. */
export function heroKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// guild/assets/heroes/*.<ext> 프로필을 빌드 URL 로 로드(파일 없으면 줄임 이름 텍스트로 폴백).
const iconModules = import.meta.glob('./assets/heroes/*.{png,jpg,jpeg,webp,gif,PNG,JPG,JPEG,WEBP,GIF}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

/** 방어덱 영웅 프로필 URL. 목록에 없거나 파일이 없으면 undefined. */
export function defenseHeroIcon(name: string): string | undefined {
  if (!byName.has(name)) return undefined
  const key = heroKey(name)
  for (const [path, url] of Object.entries(iconModules)) {
    const file = (path.split('/').pop() ?? '').toLowerCase()
    if (file.startsWith(`${key}.`)) return url
  }
  return undefined
}

/** 영문 영웅명 → 줄임 이름(목록에 없으면 그대로). */
export function defenseHeroNick(name: string): string {
  return byName.get(name)?.nick ?? name
}

/** 콘텐츠에 방어덱 각성 표를 보장(생성/동기화). */
export function ensureDefenseTable(content: GuildContent): GuildContent {
  return ensureMemberTable(content, {
    title: DEFENSE_TABLE_TITLE,
    columns: DEFENSE_HEROES.map((h) => h.name),
    note: '길드전 방어덱 영웅 각성. X = 미보유, 0 = 노각성, 1~5 = 각성. 멤버는 진행 현황 표 기준으로 동기화됩니다.',
  })
}
