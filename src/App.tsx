import { useMemo, useState } from 'react'
import { heroes, heroDisplayName } from './data/heroes'
import { leftSets, rightSets } from './data/gearSets'
import { calculateBuild, findSetById, type BuildInput } from './lib/calc'
import { getBestStatRecommendation } from './lib/recommend'
import { HeroHeader } from './components/HeroHeader'
import { GlobalNav } from './components/GlobalNav'
import { CompareBuildForm } from './components/CompareBuildForm'
import { BuildResultCard } from './components/BuildResultCard'
import { ComparisonSummary } from './components/ComparisonSummary'
import { QuickCompareTable } from './components/QuickCompareTable'
import { DamageTimelineChart } from './components/DamageTimelineChart'
import { getFactionAccessoryOptions } from './data/factionAccessories'
import { getLordOptionsForFactions } from './data/lordEffects'

function formatDamageBonusParts(parts: { label: string; value: number }[], total: number) {
  const expression = parts.length > 0
    ? parts.map((part) => `${part.label}(${Math.round(part.value * 100)}%)`).join(' + ')
    : '추가 피해 증가 없음(0%)'

  return `(${expression}) = ${Math.round(total * 100)}%`
}

function formatLordBreakdownValue(item: { value?: number; text?: string }) {
  if (item.text) return item.text
  if (item.value != null) return `+${Math.round(item.value * 100)}%`
  return ''
}

const defaultBuild: BuildInput = {
  totalAtk: 12000,
  critRate: 100,
  critDmg: 250,
  attackSpeed: 120,
  awakeningLevel: 2,
  pantheonAspdOn: true,
  factionAccessoryId: 'none',
  lordEffectId: 'none',
  leftSetId: 'warlord',
  rightSetId: 'infernal_roar',
  setUptime: 1
}

export default function App() {
  const [selectedHeroId, setSelectedHeroId] = useState(heroes[0].id)
  const [appliedHeroId, setAppliedHeroId] = useState(heroes[0].id)
  const [buildA, setBuildA] = useState<BuildInput>(defaultBuild)
  const [buildB, setBuildB] = useState<BuildInput>({ ...defaultBuild, critDmg: 300, attackSpeed: 80, rightSetId: 'cataclysm', setUptime: 0.75 })

  const hero = heroes.find((item) => item.id === appliedHeroId) ?? heroes[0]
  const accessoryOptions = useMemo(() => getFactionAccessoryOptions(hero.factions), [hero.factions])
  const lordOptions = useMemo(() => getLordOptionsForFactions(hero.factions), [hero.factions])

  const leftA = useMemo(() => findSetById(buildA.leftSetId, leftSets), [buildA.leftSetId])
  const rightA = useMemo(() => findSetById(buildA.rightSetId, rightSets), [buildA.rightSetId])
  const leftB = useMemo(() => findSetById(buildB.leftSetId, leftSets), [buildB.leftSetId])
  const rightB = useMemo(() => findSetById(buildB.rightSetId, rightSets), [buildB.rightSetId])

  const resultA = useMemo(() => calculateBuild(hero, leftA, rightA, buildA), [hero, leftA, rightA, buildA])
  const resultB = useMemo(() => calculateBuild(hero, leftB, rightB, buildB), [hero, leftB, rightB, buildB])

  const recA = useMemo(() => getBestStatRecommendation(hero, leftA, rightA, buildA), [hero, leftA, rightA, buildA])
  const recB = useMemo(() => getBestStatRecommendation(hero, leftB, rightB, buildB), [hero, leftB, rightB, buildB])
  const rightSetRankings = useMemo(
    () => rightSets.map((set) => {
      const result = calculateBuild(hero, leftA, set, { ...buildA, rightSetId: set.id, setUptime: 1 })
      return { set, result }
    }).sort((a, b) => b.result.itemMaxCumulative30s - a.result.itemMaxCumulative30s),
    [hero, leftA, buildA],
  )

  return (
    <div className="app">
      <GlobalNav active="dps" />
      <HeroHeader
        hero={hero}
        heroOptions={heroes}
        selectedHeroId={selectedHeroId}
        appliedHeroId={appliedHeroId}
        onHeroChange={setSelectedHeroId}
        onHeroApply={() => setAppliedHeroId(selectedHeroId)}
      />

      <CompareBuildForm
        hero={hero}
        buildA={buildA}
        buildB={buildB}
        accessoryOptions={accessoryOptions}
        lordOptions={lordOptions}
        onChangeA={setBuildA}
        onChangeB={setBuildB}
      />

      <section className="card summaryCard">
        <div className="sectionHeading compactHeading">
          <div>
            <h2 className="compactHeroName">{heroDisplayName(hero)}</h2>
            <p className="muted compactHeroMeta">{hero.heroClass} · {hero.damageType} · {hero.rarity}</p>
          </div>
        </div>
        <div className="summaryGrid compactSummaryGrid">
          <div><span>기본 간격</span><strong>{hero.baseInterval.toFixed(1)}초</strong></div>
          <div><span>2각 ATK 보너스</span><strong>+{hero.awakeningAtkBonus || '-'}</strong></div>
          <div><span>출처</span><strong>{hero.sourceLevel}</strong></div>
        </div>
        <p className="muted detailNote">
          기본 스탯 출처: {hero.source} / {hero.sourceLevel} 기준
        </p>
      </section>

      <ComparisonSummary resultA={resultA} resultB={resultB} />
      <section className="card recommendationPanel">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">영웅별 사전 시뮬레이션</p>
            <h2>{heroDisplayName(hero)} 추천 우측 3세트</h2>
          </div>
          <strong className="deltaBadge positive">{rightSetRankings[0]?.set.name ?? '-'}</strong>
        </div>
        <div className="setRankingGrid">
          {rightSetRankings.slice(0, 4).map((row, index) => (
            <div key={row.set.id}>
              <span>#{index + 1} {row.set.name}</span>
              <strong>{row.result.itemMaxCumulative30s.toLocaleString()}</strong>
            </div>
          ))}
        </div>
        <p className="muted helperText">세팅 A의 스탯과 좌측 2세트를 기준으로 우측 3세트만 바꿔 30초 누적 데미지를 비교합니다.</p>
      </section>
      <QuickCompareTable resultA={resultA} resultB={resultB} />
      <DamageTimelineChart resultA={resultA} resultB={resultB} />

      <section className="resultsGrid">
        <BuildResultCard title="세팅 A 결과" result={resultA} compareAgainst={resultB} recommendation={recA} />
        <BuildResultCard title="세팅 B 결과" result={resultB} compareAgainst={resultA} recommendation={recB} />
      </section>

      <section className="card formulaPanel">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">계산식</p>
            <h2>데미지 계산 구조</h2>
          </div>
        </div>
        <div className="formulaGrid">
          {[
            { label: '세팅 A', result: resultA },
            { label: '세팅 B', result: resultB },
          ].map(({ label, result }) => (
            <div className="formulaCard" key={label}>
              <h3>{label}</h3>
              <div className="formulaLine">
                <span>기본 피해</span>
                <strong>max({result.finalAtk.toLocaleString()} - {result.formula.defense.toLocaleString()}, 공격력 5%) = {result.formula.rawDamage.toLocaleString()}</strong>
              </div>
              <div className="formulaLine">
                <span>치명 보정</span>
                <strong>1 + 치확 x (치피 - 1) = x{result.formula.critMultiplier}</strong>
              </div>
              <div className="formulaLine">
                <span>피해 증가</span>
                <strong>{Math.round(result.formula.itemDamageBonus * 100)}%</strong>
                <small className="formulaBreakdown">
                  {formatDamageBonusParts(result.formula.itemDamageBonusParts, result.formula.itemDamageBonus)}
                </small>
              </div>
              <div className="formulaExpression">
                1타 최대값 = 기본 피해 x 치명 보정 x (1 + 피해 증가)
              </div>
              <div className="formulaExpression">
                30초 누적 = 공격 간격 {result.interval.toFixed(2)}초 기준 타임라인 누적
              </div>

              {result.awakeningLevel > 0 && result.awakeningTiersApplied.length > 0 ? (
                <div className="lordBreakdown">
                  <div className="lordBreakdownHeader">
                    <strong>각성 효과 상세 — {result.awakeningLevel}각</strong>
                    <span className="lordBreakdownTotal">
                      합산:
                      {result.awakeningTotal.atkBonus > 0 ? ` 공격력 +${result.awakeningTotal.atkBonus}` : ''}
                      {result.awakeningTotal.atkPctBonus > 0 ? ` / 공격력 +${Math.round(result.awakeningTotal.atkPctBonus * 100)}%` : ''}
                      {result.awakeningTotal.damageBonus > 0 ? ` / 피해 +${Math.round(result.awakeningTotal.damageBonus * 100)}%` : ''}
                      {result.awakeningTotal.basicDamageBonus > 0 ? ` / 기본 공격 +${Math.round(result.awakeningTotal.basicDamageBonus * 100)}%` : ''}
                      {result.awakeningTotal.critRateBonus > 0 ? ` / 치확 +${result.awakeningTotal.critRateBonus}` : ''}
                      {result.awakeningTotal.critDmgBonus > 0 ? ` / 치피 +${result.awakeningTotal.critDmgBonus}` : ''}
                      {result.awakeningTotal.attackSpeedBonus > 0 ? ` / 공속 +${result.awakeningTotal.attackSpeedBonus}` : ''}
                      {result.awakeningTotal.penetrationBonus > 0 ? ` / 관통 +${Math.round(result.awakeningTotal.penetrationBonus * 100)}%` : ''}
                      {result.awakeningTotal.derivedPenetrationApplied > 0
                        ? ` / 관통(파생) +${Math.round(result.awakeningTotal.derivedPenetrationApplied * 100)}% [치피의 ${Math.round(result.awakeningTotal.penetrationFromCritDmgRatio * 100)}%]`
                        : ''}
                      {result.awakeningTotal.atkBonus === 0 && result.awakeningTotal.atkPctBonus === 0 &&
                        result.awakeningTotal.damageBonus === 0 && result.awakeningTotal.basicDamageBonus === 0 &&
                        result.awakeningTotal.critRateBonus === 0 && result.awakeningTotal.critDmgBonus === 0 &&
                        result.awakeningTotal.attackSpeedBonus === 0 && result.awakeningTotal.penetrationBonus === 0 &&
                        result.awakeningTotal.derivedPenetrationApplied === 0
                        ? ' 정량 효과 없음 (note 만)' : ''}
                    </span>
                  </div>
                  <ul className="lordBreakdownList">
                    {result.awakeningTiersApplied.map((tier) => {
                      const parts: string[] = []
                      if (tier.atkBonus) parts.push(`공격력 +${tier.atkBonus}`)
                      if (tier.atkPctBonus) parts.push(`공격력 +${Math.round(tier.atkPctBonus * 100)}%`)
                      if (tier.damageBonus) parts.push(`피해 +${Math.round(tier.damageBonus * 100)}%`)
                      if (tier.basicDamageBonus) parts.push(`기본 공격 +${Math.round(tier.basicDamageBonus * 100)}%`)
                      if (tier.critRateBonus) parts.push(`치확 +${tier.critRateBonus}`)
                      if (tier.critDmgBonus) parts.push(`치피 +${tier.critDmgBonus}`)
                      if (tier.attackSpeedBonus) parts.push(`공속 +${tier.attackSpeedBonus}`)
                      if (tier.penetrationBonus) parts.push(`관통 +${Math.round(tier.penetrationBonus * 100)}%`)
                      if (tier.penetrationFromCritDmgRatio) {
                        const applied = tier.penetrationFromCritDmgRatio * (result.finalCritDmg / 100)
                        parts.push(
                          `관통(파생) +${Math.round(applied * 100)}% [치피 ${result.finalCritDmg} × ${Math.round(tier.penetrationFromCritDmgRatio * 100)}%]`,
                        )
                      }
                      const value = parts.join(' / ')
                      return (
                        <li key={tier.level}>
                          <span className="lordBreakdownLabel">{tier.label}</span>
                          <span className="lordBreakdownValue">{value || '— (정량 효과 없음)'}</span>
                          {tier.note ? <small className="lordBreakdownNote">{tier.note}</small> : null}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}

              {result.formula.lordEffectName ? (
                <div className="lordBreakdown">
                  <div className="lordBreakdownHeader">
                    <strong>영주 효과 상세 — {result.formula.lordEffectName}</strong>
                    <span className="lordBreakdownTotal">
                      합산: {result.formula.lordEffectAtkPctBonus > 0 ? `공격력 +${Math.round(result.formula.lordEffectAtkPctBonus * 100)}%` : null}
                      {result.formula.lordEffectDamageBonus > 0 ? ` / 피해 +${Math.round(result.formula.lordEffectDamageBonus * 100)}%` : ''}
                      {result.formula.lordEffectBasicDamageBonus > 0 ? ` / 기본 공격 피해 +${Math.round(result.formula.lordEffectBasicDamageBonus * 100)}%` : ''}
                      {result.formula.lordEffectCritDmgBonus > 0 ? ` / 치피 +${result.formula.lordEffectCritDmgBonus}` : ''}
                      {result.formula.lordEffectAttackSpeedBonus > 0 ? ` / 공속 +${result.formula.lordEffectAttackSpeedBonus}` : ''}
                      {result.formula.lordEffectPenetrationBonus > 0 ? ` / 관통 +${Math.round(result.formula.lordEffectPenetrationBonus * 100)}%` : ''}
                    </span>
                  </div>
                  {result.formula.lordEffectBreakdown.length > 0 ? (
                    <ul className="lordBreakdownList">
                      {result.formula.lordEffectBreakdown.map((item, idx) => (
                        <li key={`${item.label}-${idx}`}>
                          <span className="lordBreakdownLabel">{item.label}</span>
                          <span className="lordBreakdownValue">{formatLordBreakdownValue(item)}</span>
                          {item.note ? <small className="lordBreakdownNote">{item.note}</small> : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted helperText">{result.formula.lordEffectSummary}</p>
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="card footerNote">
        <h3>현재 버전 메모</h3>
        <ul>
          <li>공속 breakpoint는 기본 공격 간격 그룹 기준으로 관리하며, 총 공속은 기본 100 포함 기준으로 계산합니다.</li>
          <li>입력 총 공속과 판테온 공속을 합쳐 최종 공속을 만들고, 공격 간격은 최종 공속 기준으로 판정합니다.</li>
          <li>입력 총 스탯에는 장비/아티팩트/세트의 상시 수치가 이미 포함된 것으로 보고, 조건부 효과만 별도 반영합니다.</li>
          <li>비교 지표는 방어무시/중방어 기준 데미지와 아이템 최대 적용 상태 DPS(30s) 위주로 단순화했습니다.</li>
          <li>우측 3세트 조건부 효과는 사용자 입력 없이 결과 카드에서 발동 구조를 설명합니다.</li>
          <li>데이터와 계산 로직은 분리되어 있어 GitHub Pages 같은 정적 배포에 그대로 맞출 수 있습니다.</li>
        </ul>
      </section>
    </div>
  )
}
