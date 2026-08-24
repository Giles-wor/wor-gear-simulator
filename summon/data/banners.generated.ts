// scripts/sync-summon.mjs 크롤 결과가 이 파일을 덮어씁니다.
// 크롤 성공 전에는 null 이며, banners.ts 가 placeholder 기본값을 사용합니다.
import type { BannerConfig } from '../lib/gacha'

export const generatedBanners: Partial<
  Record<BannerConfig['id'], Partial<BannerConfig>>
> | null = {
  "normal": {
    "softPityStart": 181,
    "softPityIncrement": 0.05,
    "hardPity": 200,
    "featuredMultiplier": 20,
    "rateUpStackingMultiplier": 10,
    "notes": "특정 스피릿 소환 이벤트: 확률UP ×20 + ×10 stacking(첫 픽업 전까지). soft 181, hard 200(통합 5성 보장). 픽업 확정 없음."
  },
  "limited": {
    "softPityStart": 181,
    "softPityIncrement": 0.05,
    "hardPity": 200,
    "featuredMultiplier": 20,
    "rateUpStackingMultiplier": 10,
    "featuredHardGuarantee": 200,
    "notes": "Limited: Rare pity + ×20 + ×10 stacking + 200픽 픽업 확정."
  },
  "ancient": {
    "softPityStart": 186,
    "softPityIncrement": 0.08,
    "hardPity": 200,
    "featuredMultiplier": 20,
    "rateUpStackingMultiplier": 2,
    "notes": "Special Ancient: Ancient pity + ×20 + ×2 stacking. Scarlet Feast 보장 90픽 (미모델)."
  },
  "divine": {
    "softPityStart": 13,
    "softPityIncrement": 0.05,
    "hardPity": 20,
    "featuredMultiplier": 20,
    "rateUpStackingMultiplier": 10,
    "notes": "Special Divine: Legendary pity + ×20 + ×10 stacking."
  }
}

export const generatedSource: { url: string; fetchedAt: string } | null = {
  "url": "https://watcher-of-realms.fandom.com/wiki/Banner",
  "fetchedAt": "2026-08-24T03:56:23.707Z"
}
