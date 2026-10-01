// 영웅 영문 → 한글 매핑.
// 1순위: 아래 수동 매핑 (ref_fig/ 스크린샷 인게임 소환 풀 OCR 등) — 추가/수정은 여기서.
// 2순위: heroNamesKo.generated.json — worwiki.kr(나만겜 한국 영웅 위키) 공개 영웅 페이지 크롤 (scripts/sync-names-ko.mjs, 주간 자동)
// 매핑 없는 영웅은 영문 그대로 표시.
import generated from './heroNamesKo.generated.json'

/** sync-heroes.mjs 의 id 규칙과 동일 (영문명 → id) */
const heroIdOf = (en: string) =>
  en
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

/** worwiki 크롤 결과: id → 한글명 */
export const crawledHeroNameKo: Record<string, string> = Object.fromEntries(
  Object.values(generated.pages as Record<string, { ko: string; en: string }>).map((p) => [heroIdOf(p.en), p.ko]),
)

export const manualHeroNameKo: Record<string, string> = {
  // ─────── Rare 영주 그룹 (스피릿 0.04%) — screenshot 2 ───────
  aracha: '아라샤',
  morrigan: '모리건',
  venoma: '베노마',
  ajax: '아자크스',
  laya: '라야',
  twinfiend: '트윈즈',
  king_harz: '킹 할츠',
  // 톨레도 ← 미매칭

  // ─────── Rare 일반 그룹 (스피릿 0.46%) — screenshots 0/1/2 ───────
  ares: '아레스',
  artemis: '아르테미스',
  calypso: '칼립소',
  calista: '카리스타',
  nocturne: '녹턴',
  khamet: '카메트',
  valeriya: '발레리야',
  brokkir: '브로켈',
  regulus: '레굴라스',
  nyx: '닉스',
  shamir: '샤미르',
  wrath: '증오',
  cerberus: '세브로스',
  magmus: '마그누스',
  laseer: '레이저',
  orim: '오림',
  anai: '아나이',
  ferssi: '페르시',
  trusk: '트룩스',
  edith: '에디스',
  serephina: '세레피나',
  lucius: '루시우스',
  arrogance: '오만',
  salazar: '살라잘',
  elowyn: '엘로윈',
  vierna: '베르나',
  hex: '헥스',
  constance: '콘스탄스',
  magda: '마그다',
  helga: '헬가',
  xaris: '자리스',
  twyla: '트윌라',
  beatrix: '베아트릭스',
  krodor: '크로돌',
  lord_phineas: '악마 군주 피니아스',
  lyra: '라이라',
  aeris: '아에리스',
  yuri: '유리',
  beelzebub: '바알세불',
  malvira: '말비라',
  fenris: '펜리스',
  talin: '타린',
  malrik: '말리크',
  numera: '누메라',
  nerissa: '네리사',
  myca: '마이카',
  selene: '셀레네',
  maw: '마우',
  draelyn: '드레린',
  ne_zha: '나타',
  velisse: '벨리스',
  astrael: '아스트레이',
  aedrin: '에드린',
  ruen_hollow: '루은-호로',
  rosalia: '로살리아',
  knight_arlott: '알로트',
  guan_yu: '관우',
  violetta_vane: '비올레타 베인',
  graves_greybeard: "'해골 그림자' 회색 수염",
  dane: '어둠의 총사 데인',
  solaris_skyre: '솔라리스',
  janus_grismore: '제누스',

  // ─────── Ancient 영주 그룹 (0.72%) — screenshot 10 ───────
  ghan: '가안',
  demi: '데미',
  solcadens: '솔카덴스',
  praetus: '플레트스',
  valderon: '와엘드론',
  ymiret: '이미레잇',
  ingrid: '잉그리드',
  nastya: '나스티야',
  ezareth: '에사레스',
  oren: '오렌',
  // 에르드 / 키로스 / 이보엘 / 레고 / 레이븐 홀드 ← 미매칭

  // ─────── Ancient 일반 그룹 (1%) — screenshots 8/9 ───────
  lugaru: '루가르',
  dassomi: '다스미',
  kaede: '카에드',
  durza: '두르가',
  sargak: '사가스',
  gisele: '지젤',
  thallen: '탈렌',
  pelagios: '펠라기우스',
  eunomia: '유노미야',
  uredin: '우레딘',
  lu_bu: '여포',
  erlang_shen: '이랑신',
  sun_wukong: '오공',
  kane: '케인',
  raizan: '레이칸',
  khadgrim: '카드그림',
  pierre: '피에르',
  sergei: '세르게이',
  gretchen: '그레첸',
  guldrak: '굴드락',

  // ─────── prospector 배너 추가분 ───────
  theowin: '디오웬',
  dalyn: '달린',
  elddr: '에르드',
  ardea: '알다이야',
  estrid: '이스트리드',
  midan: '미덴',
  iovar: '이보엘',
  voroth: '워로스',
  nazeem: '나짐',
  olague: '오라그',

  // ─────── 2026-07 신규 영웅 ───────
  cainan: '카이난',
  aurelius_gale: '아우렐리우스',
  jezebelle: '지제벨',
  leikan: '레이칸', // 위 raizan(prospector 슬러그)과 동일 영웅의 fandom id

  // ─────── worwiki 영문 표기가 fandom 과 달라 자동 매칭 안 되는 영웅 ───────
  akira: '아키라', // worwiki: AkiraStar

  // ─────── worwiki 미등재 — 영문 발음 음역 (추정, 인게임 표기 확인되면 교체) ───────
  // 회색 칼날 신규
  amelia_ainsworth: '아멜리아 에인즈워스',
  galloway: '갤로웨이',
  garroq: '가로크',
  rorkesh: '로르케쉬',
  // Rare
  amahle: '아말레',
  aryn: '아린',
  barclay: '바클레이',
  cuke: '큐크',
  duradel: '두라델',
  ghorza: '고르자',
  glen: '글렌',
  gnash: '내쉬',
  gogran: '고그란',
  narvi: '나르비',
  nunea: '누네아',
  ogrul: '오그룰',
  rhutu: '루투',
  shelor: '셸로',
  skulf: '스컬프',
  spring: '스프링',
  // Uncommon
  arlow: '알로우',
  halder: '할더',
  hayden: '헤이든',
  jonas: '조나스',
  langlyn: '랭린',
  preter: '프레터',
  rogers: '로저스',
  rum_nose: '럼노즈',
  ryder: '라이더',
  skreef: '스크리프',
  wagrak: '와그락',
  // Common
  gale: '게일',
  josh: '조쉬',
  lancer: '랜서',
  lilia: '릴리아',
}

/** 최종 매핑: 크롤 결과 위에 수동 매핑을 덮어씀 */
export const heroNameKo: Record<string, string> = { ...crawledHeroNameKo, ...manualHeroNameKo }

/** Hero id → 한글 이름. 매핑 없으면 undefined. */
export function getHeroNameKo(heroId: string): string | undefined {
  return heroNameKo[heroId]
}
