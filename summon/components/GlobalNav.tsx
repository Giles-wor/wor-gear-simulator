/** v0(DPS)/summon/gear 공통 상단 탭 네비. */
type GlobalNavProps = {
  active: 'dps' | 'summon' | 'gear' | 'guide'
}

const BASE = '/wor-gear-simulator/'

const LINKS = [
  { id: 'dps' as const, label: 'DPS 시뮬레이터', href: BASE },
  { id: 'summon' as const, label: '소환 확률 계산기', href: `${BASE}summon/` },
  { id: 'gear' as const, label: '장비 필터', href: `${BASE}gear/` },
  { id: 'guide' as const, label: '공략', href: `${BASE}guide/` },
]

export function GlobalNav({ active }: GlobalNavProps) {
  return (
    <nav className="globalNav" aria-label="앱 탭">
      {LINKS.map((link) => (
        <a
          key={link.id}
          href={link.href}
          className={link.id === active ? 'globalNavLink active' : 'globalNavLink'}
        >
          {link.label}
        </a>
      ))}
    </nav>
  )
}
