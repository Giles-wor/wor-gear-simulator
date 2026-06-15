// scripts/sync-summon.mjs 크롤 결과가 이 파일을 덮어씁니다.
// 천장 규칙 / featuredMultiplier / stacking / featuredHardGuarantee 만 덮어쓰며,
// 영주/일반 base rate 와 풀 크기는 banners.ts placeholder 가 그대로 사용됩니다 (위키에 없음).
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
    "pityFocus": "lord",
    "featuredMultiplier": 20,
    "rateUpStackingMultiplier": 2,
    "notes": "고대 소환 (인게임 확인): 5성 영주 전용 천장, 185회 미획득 후 +8%, 200픽 영주 확정."
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
  "fetchedAt": "2026-05-20T01:35:59.246Z"
}
