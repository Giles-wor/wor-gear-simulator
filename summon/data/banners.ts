import type { BannerConfig } from '../lib/gacha'
import { generatedBanners, generatedSource } from './banners.generated'

// ⚠️ 아래 수치는 전부 추정 placeholder 입니다.
// 실제 WoR 소환율/천장/픽업 규칙은 GitHub Action 크롤(scripts/sync-summon.mjs)
// 또는 유저 확인으로 교체해야 합니다. placeholder: true 인 동안 UI 가 경고를 표시합니다.
const placeholderBanners: Record<BannerConfig['id'], BannerConfig> = {
  normal: {
    id: 'normal',
    name: '일반',
    legendaryBaseRate: 0.02,
    softPityStart: undefined,
    softPityIncrement: undefined,
    hardPity: 100,
    targetModel: 'poolMember',
    legendaryPoolSize: 30,
    gemsPerPull: 300,
    placeholder: true,
    notes: '일반 풀에서 특정 전설 1명 확보 기준 (풀 크기 추정).',
  },
  limited: {
    id: 'limited',
    name: '한정',
    legendaryBaseRate: 0.02,
    softPityStart: 75,
    softPityIncrement: 0.05,
    hardPity: 90,
    targetModel: 'featured',
    featuredShare: 0.5,
    guaranteedAfterLoss: true,
    gemsPerPull: 300,
    placeholder: true,
    notes: '픽업 50/50 + 실패 시 다음 전설 픽업 확정형 (추정).',
  },
  ancient: {
    id: 'ancient',
    name: '고대',
    legendaryBaseRate: 0.015,
    softPityStart: 70,
    softPityIncrement: 0.04,
    hardPity: 80,
    targetModel: 'featured',
    featuredShare: 0.5,
    guaranteedAfterLoss: true,
    gemsPerPull: 300,
    placeholder: true,
    notes: '고대 배너 추정값. 크롤로 교체 필요.',
  },
  divine: {
    id: 'divine',
    name: '신성',
    legendaryBaseRate: 0.01,
    softPityStart: 70,
    softPityIncrement: 0.04,
    hardPity: 80,
    targetModel: 'featured',
    featuredShare: 0.5,
    guaranteedAfterLoss: true,
    gemsPerPull: 300,
    placeholder: true,
    notes: '신성 배너 추정값. 크롤로 교체 필요.',
  },
}

function mergeBanner(base: BannerConfig, override?: Partial<BannerConfig>): BannerConfig {
  if (!override) return base
  return { ...base, ...override, placeholder: override.placeholder ?? false }
}

export const banners: Record<BannerConfig['id'], BannerConfig> = {
  normal: mergeBanner(placeholderBanners.normal, generatedBanners?.normal),
  limited: mergeBanner(placeholderBanners.limited, generatedBanners?.limited),
  ancient: mergeBanner(placeholderBanners.ancient, generatedBanners?.ancient),
  divine: mergeBanner(placeholderBanners.divine, generatedBanners?.divine),
}

export const bannerOrder: BannerConfig['id'][] = ['normal', 'limited', 'ancient', 'divine']

export const summonDataSource = generatedSource
