// scripts/sync-summon.mjs 크롤 결과가 이 파일을 덮어씁니다.
// 크롤 성공 전에는 null 이며, banners.ts 가 placeholder 기본값을 사용합니다.
import type { BannerConfig } from '../lib/gacha'

export const generatedBanners: Partial<
  Record<BannerConfig['id'], Partial<BannerConfig>>
> | null = null

export const generatedSource: { url: string; fetchedAt: string } | null = null
