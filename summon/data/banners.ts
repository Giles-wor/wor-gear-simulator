import type { BannerConfig } from '../lib/gacha'
import { generatedBanners, generatedSource } from './banners.generated'

// 인게임 Drop Rates 탭 확정 수치.
// Rare 크리스탈(스피릿): 영주 0.04% × 8명 / 일반 0.46% × ~85명, 180→+5%/회→200픽.
// 고대: 영주 0.72% × 9명 / 일반 1% × ~30명, 185→+8%/회→200픽, 영주 전용 천장.
//   (2026-06-29 풀 조정: 비주류 영주/알수없는자 7명 제외 — 아라샤·모리건·아자크스·트윈즈 베노마·킹 할츠·톨레도·라야. 영주 15→8, 그룹 0.72%는 유지.)
//   (2026-07 지제벨(영주) 추가 → 영주 풀 8→9. 그룹 0.72% 유지되어 영주 1명당 확률은 하락.)
// 디바인(Legendary): 영주 0.4% × 8명 / 일반 5.6% × ~85명, 12→+5%/회→20픽.
// 픽업: 이벤트 배너는 픽업 영웅 ×20, 비-픽업 5성 뽑을 때마다 모든 픽업 가중치 ×10 (고대는 ×2).
//   이 stacking 보정은 "첫 픽업 획득 전"에만 적용 — 픽업(타겟이든 아니든)을 1장이라도 얻으면 그 기간 동안
//   보정은 종료되고 이후 카피는 기본배수(×20)만 적용된다.
const placeholderBanners: Record<BannerConfig['id'], BannerConfig> = {
  normal: {
    id: 'normal',
    name: '일반 스피릿 (확률UP)',
    lordGroupRate: 0.0004,
    commonGroupRate: 0.0046,
    lordPoolSize: 8,
    commonPoolSize: 85,
    softPityStart: 181,
    softPityIncrement: 0.05,
    hardPity: 200,
    featuredMultiplier: 20,
    rateUpStackingMultiplier: 10,
    defaultPickups: [{ label: '확률UP 영웅', group: 'common' }],
    defaultGoals: [1],
    placeholder: false,
    notes:
      '특정 스피릿 소환 이벤트: 확률 UP 영웅 ×20(동일 등급 대비) + 비-픽업 레전더리 뽑을 때마다 ×10 stacking(첫 픽업 획득 전까지). 180회 미획득 후 +5%/회, 200픽 5성 보장(통합). 픽업 자체 확정은 없음(=한정 선택 소환만 200픽 픽업 확정). 픽업 여러 명이면 행 추가.',
  },
  limited: {
    id: 'limited',
    name: '한정 선택 소환',
    lordGroupRate: 0.0004,
    commonGroupRate: 0.0046,
    lordPoolSize: 8,
    commonPoolSize: 85,
    softPityStart: 181,
    softPityIncrement: 0.05,
    hardPity: 200,
    featuredMultiplier: 20,
    rateUpStackingMultiplier: 10,
    featuredHardGuarantee: 200,
    defaultPickups: [{ label: '한정 영웅', group: 'common' }],
    defaultGoals: [1],
    placeholder: false,
    notes:
      '한정 5성 1명 선택 (콜라보 영웅 미나 제외). 선택 영웅 ×20 + ×10 stacking + 200픽 자체 확정. 스피릿 천장은 다른 스피릿 배너와 공유.',
  },
  ancient: {
    id: 'ancient',
    name: '고대 (Special Ancient)',
    lordGroupRate: 0.0072,
    commonGroupRate: 0.01,
    lordPoolSize: 9,
    commonPoolSize: 30,
    softPityStart: 186,
    softPityIncrement: 0.08,
    hardPity: 200,
    pityFocus: 'lord',
    // 일반 레전더리(영주·알수없는자 제외) 독립 천장: 130회 미획득 후 +5%/회, 150픽 확정.
    commonSoftPityStart: 131,
    commonSoftPityIncrement: 0.05,
    commonHardPity: 150,
    featuredMultiplier: 20,
    rateUpStackingMultiplier: 2,
    defaultPickups: [
      { label: '영주 픽업', group: 'lord' },
      { label: '일반 픽업', group: 'common' },
    ],
    defaultGoals: [1, 0],
    placeholder: false,
    notes:
      '고대 소환: 보장 천장 2개(독립 카운터). ① 영주(알수없는자 포함) 0.72%, 185회 미획득 후 +8%/회, 200픽 확정. ② 일반 레전더리(영주·알수없는자 제외) 1%, 130회 미획득 후 +5%/회, 150픽 확정. ×20 픽업 + ×2 stacking. 보통 영주+일반 각 1명씩 픽업. (2026-06-29 풀 조정: 비주류 영주/알수없는자 7명 제외 → 영주 풀 8명. 그룹 0.72%는 유지되어 영주 1명당 확률은 상승.) (2026-07: 지제벨(영주) 추가 → 영주 풀 9명.)',
  },
  divine: {
    id: 'divine',
    name: '디바인 (Special Divine)',
    lordGroupRate: 0.004,
    commonGroupRate: 0.056,
    lordPoolSize: 8,
    commonPoolSize: 85,
    softPityStart: 13,
    softPityIncrement: 0.05,
    hardPity: 20,
    featuredMultiplier: 20,
    rateUpStackingMultiplier: 10,
    defaultPickups: [
      { label: '픽업 A', group: 'common' },
      { label: '픽업 B', group: 'common' },
    ],
    defaultGoals: [1, 0],
    placeholder: false,
    notes:
      '디바인 소환: Legendary 크리스탈, 영주 0.4% / 일반 5.6%, 12회 미획득 후 +5%/회, 20픽 5성 확정. ×20 픽업 + ×10 stacking. 보통 일반 픽업 2명. 디바인 천장 공유.',
  },
}

function mergeBanner(base: BannerConfig, override?: Partial<BannerConfig>): BannerConfig {
  return override ? { ...base, ...override } : base
}

export const banners: Record<BannerConfig['id'], BannerConfig> = {
  normal: mergeBanner(placeholderBanners.normal, generatedBanners?.normal),
  limited: mergeBanner(placeholderBanners.limited, generatedBanners?.limited),
  ancient: mergeBanner(placeholderBanners.ancient, generatedBanners?.ancient),
  divine: mergeBanner(placeholderBanners.divine, generatedBanners?.divine),
}

export const bannerOrder: BannerConfig['id'][] = ['normal', 'limited', 'ancient', 'divine']

export const summonDataSource = generatedSource
