import type { BannerConfig } from '../lib/gacha'
import { generatedBanners, generatedSource } from './banners.generated'

// 인게임 Drop Rates 탭 확정 수치.
// Rare 크리스탈(스피릿): 영주 0.04% × 8명 / 일반 0.46% × ~85명, 180→+5%/회→200픽.
// 고대: 영주 0.72% × 15명 / 일반 1% × ~30명, 185→+8%/회→200픽, 영주 전용 천장.
// 디바인(Legendary): 영주 0.4% × 8명 / 일반 5.6% × ~85명, 12→+5%/회→20픽.
// 픽업: 이벤트 배너는 픽업 영웅 ×20, 비-픽업 5성 뽑을 때마다 모든 픽업 가중치 ×10 (고대는 ×2). 픽업 뽑으면 0 리셋.
const placeholderBanners: Record<BannerConfig['id'], BannerConfig> = {
  normal: {
    id: 'normal',
    name: '일반 스피릿',
    lordGroupRate: 0.0004,
    commonGroupRate: 0.0046,
    lordPoolSize: 8,
    commonPoolSize: 85,
    softPityStart: 181,
    softPityIncrement: 0.05,
    hardPity: 200,
    featuredMultiplier: 1,
    defaultPickups: [{ label: '타겟 영웅', group: 'common' }],
    defaultGoals: [1],
    placeholder: false,
    notes:
      '기본 스피릿 배너 (Invocation of Spirits). 픽업 가중치 없음 → 풀에서 특정 1명만 노릴 때. 스피릿 천장 공유.',
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
    lordPoolSize: 15,
    commonPoolSize: 30,
    softPityStart: 186,
    softPityIncrement: 0.08,
    hardPity: 200,
    pityFocus: 'lord',
    featuredMultiplier: 20,
    rateUpStackingMultiplier: 2,
    defaultPickups: [
      { label: '영주 픽업', group: 'lord' },
      { label: '일반 픽업', group: 'common' },
    ],
    defaultGoals: [1, 0],
    placeholder: false,
    notes:
      '고대 소환: 5성 영주(알 수 없는 자 포함) 전용 천장. 영주 0.72% / 일반 1%, 185회 영주 미획득 후 +8%/회, 200픽 영주 확정. ×20 픽업 + ×2 stacking. 보통 영주+일반 각 1명씩 픽업하는 경우가 많음.',
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
