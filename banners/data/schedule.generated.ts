// ⚠️ 이 파일은 scripts/sync-banners.mjs 크롤 결과로 자동 덮어쓰입니다 (직접 수정 금지).
// 최초 배포용 시드 데이터 — GitHub Actions(sync:banners)가 prospector.gg 에서 최신본으로 갱신합니다.
import type { BannerSchedule } from './types'

export const generatedSchedule: BannerSchedule | null = {
  source: 'prospector.gg',
  sourceUrl: 'https://prospector.gg/upcoming-hero-banners/',
  fetchedAt: null,
  sourceModified: '2026-05-12T02:28:28Z',
  banners: [
    {
      status: 'active',
      type: 'Invocation of Spirits and Divine Summoning',
      durationDays: 4,
      startUtc: '2026-05-29T07:00:00Z',
      endUtc: '2026-06-02T07:00:00Z',
      heroes: [
        { name: 'Lord Phineas', slug: 'lord-phineas' },
        { name: 'Ruen Hollow', slug: 'ruen-hollow' },
        { name: 'Theowin', slug: 'theowin' },
        { name: 'Dalyn', slug: 'dalyn' },
      ],
    },
    {
      status: 'active',
      type: 'Ancient Summoning',
      durationDays: 3,
      startUtc: '2026-05-30T07:00:00Z',
      endUtc: '2026-06-02T07:00:00Z',
      heroes: [
        { name: 'Elddr', slug: 'elddr' },
        { name: 'Ardea', slug: 'ardea' },
      ],
    },
    {
      status: 'next',
      type: 'Invocation of Spirits and Divine Summoning',
      durationDays: 4,
      startUtc: '2026-06-05T07:00:00Z',
      endUtc: '2026-06-09T07:00:00Z',
      heroes: [
        { name: 'Draelyn', slug: 'draelyn' },
        { name: 'Velisse', slug: 'velisse' },
        { name: 'Estrid', slug: 'estrid' },
        { name: 'Midan', slug: 'midan' },
      ],
    },
    {
      status: 'next',
      type: 'Ancient Summoning',
      durationDays: 3,
      startUtc: '2026-06-13T07:00:00Z',
      endUtc: '2026-06-16T07:00:00Z',
      heroes: [{ name: 'Iovar', slug: 'iovar' }],
    },
    {
      status: 'upcoming',
      type: 'Invocation of Spirits and Divine Summoning',
      durationDays: 4,
      startUtc: '2026-06-26T07:00:00Z',
      endUtc: '2026-06-30T07:00:00Z',
      heroes: [
        { name: 'Knight Arlott', slug: 'knight-arlott' },
        { name: 'Beelzebub', slug: 'beelzebub' },
        { name: 'Voroth', slug: 'voroth' },
        { name: 'Nazeem', slug: 'nazeem' },
        { name: 'Olague', slug: 'olague' },
      ],
    },
  ],
}
