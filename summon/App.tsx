import { useEffect, useMemo, useState } from 'react'
import {
  buildStrategyReport,
  type BannerConfig,
  type FeaturedGroup,
  type FeaturedHero,
  type PickupSelection,
  type SummonState,
} from './lib/gacha'
import { banners, bannerOrder, summonDataSource } from './data/banners'
import { GlobalNav } from './components/GlobalNav'
import { SiteCredit } from './components/SiteCredit'

const pct = (v: number) => `${(v * 100).toFixed(1)}%`
const pctSharp = (v: number) => `${(v * 100).toFixed(2)}%`
const num = (v: number) => Math.round(v).toLocaleString()

const PITY_GROUP_LABEL: Record<BannerConfig['id'], string> = {
  normal: '스피릿 소환',
  limited: '스피릿 소환',
  ancient: '고대 소환',
  divine: '디바인 소환',
}

function CdfChart({ cdf, budget }: { cdf: number[]; budget: number }) {
  const width = 640
  const height = 200
  const padding = 32
  const maxX = cdf.length - 1
  if (maxX <= 0) return null

  const x = (k: number) => padding + (k / maxX) * (width - padding * 2)
  const y = (p: number) => height - padding - p * (height - padding * 2)
  const points = cdf.map((p, k) => `${x(k).toFixed(1)},${y(p).toFixed(1)}`).join(' ')

  return (
    <svg className="cdfChart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="달성 확률 곡선">
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (
        <g key={g}>
          <line x1={padding} x2={width - padding} y1={y(g)} y2={y(g)} className="cdfGrid" />
          <text x={4} y={y(g) + 4} className="cdfAxisLabel">{Math.round(g * 100)}%</text>
        </g>
      ))}
      {budget > 0 && budget <= maxX ? (
        <line x1={x(budget)} x2={x(budget)} y1={padding} y2={height - padding} className="cdfBudget" />
      ) : null}
      <polyline points={points} className="cdfLine" fill="none" />
      <text x={padding} y={height - 8} className="cdfAxisLabel">0회</text>
      <text x={width - padding} y={height - 8} className="cdfAxisLabel" textAnchor="end">
        {maxX}회
      </text>
    </svg>
  )
}

export default function App() {
  const [bannerId, setBannerId] = useState<BannerConfig['id']>('limited')
  const [config, setConfig] = useState<BannerConfig>(banners.limited)
  const [pickups, setPickups] = useState<FeaturedHero[]>(banners.limited.defaultPickups)
  const [goals, setGoals] = useState<number[]>(banners.limited.defaultGoals)
  const [ownedCopies, setOwnedCopies] = useState<number[]>(
    banners.limited.defaultPickups.map(() => 0),
  )

  const [pity, setPity] = useState(0)
  const [rateUpMisses, setRateUpMisses] = useState(0)
  const [pullsOnBanner, setPullsOnBanner] = useState(0)
  const [availablePulls, setAvailablePulls] = useState(200)
  // 배너 변종: 열광(5성 ×2) / 1+1(전설 나오면 1개 더)
  const [crazy, setCrazy] = useState(false)
  const [onePlusOne, setOnePlusOne] = useState(false)

  // 배너 변경 시 픽업 구성과 목표/보유 리셋
  useEffect(() => {
    const cfg = banners[bannerId]
    setConfig(cfg)
    setPickups(cfg.defaultPickups.map((p) => ({ ...p })))
    setGoals([...cfg.defaultGoals])
    setOwnedCopies(cfg.defaultPickups.map(() => 0))
  }, [bannerId])

  const isLimited = config.featuredHardGuarantee != null

  const selection: PickupSelection = useMemo(
    () => ({
      pickups,
      goals: pickups.map((_, i) => goals[i] ?? 0),
      ownedCopies: pickups.map((_, i) => ownedCopies[i] ?? 0),
    }),
    [pickups, goals, ownedCopies],
  )

  const state: SummonState = useMemo(
    () => ({
      pity: Math.max(0, pity),
      rateUpMisses: Math.max(0, rateUpMisses),
      pullsOnBanner: Math.max(0, pullsOnBanner),
    }),
    [pity, rateUpMisses, pullsOnBanner],
  )

  const report = useMemo(
    () => buildStrategyReport(config, selection, state, availablePulls, { crazy, onePlusOne }),
    [config, selection, state, availablePulls, crazy, onePlusOne],
  )

  const updateConfig = (patch: Partial<BannerConfig>) =>
    setConfig((prev) => ({ ...prev, ...patch }))

  const pityGroupLabel = PITY_GROUP_LABEL[config.id]
  const isLordOnlyPity = config.pityFocus === 'lord'

  const activeTargets = report.activeTargets
  const numActiveTargets = activeTargets.length

  const updatePickup = (idx: number, patch: Partial<FeaturedHero>) => {
    setPickups((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }
  const updateGoal = (idx: number, value: number) => {
    setGoals((prev) => {
      const next = [...prev]
      while (next.length <= idx) next.push(0)
      next[idx] = Math.max(0, Math.floor(value))
      return next
    })
  }
  const updateOwned = (idx: number, value: number) => {
    setOwnedCopies((prev) => {
      const next = [...prev]
      while (next.length <= idx) next.push(0)
      next[idx] = Math.max(0, Math.floor(value))
      return next
    })
  }
  const removePickup = (idx: number) => {
    if (pickups.length <= 1) return
    setPickups((prev) => prev.filter((_, i) => i !== idx))
    setGoals((prev) => prev.filter((_, i) => i !== idx))
    setOwnedCopies((prev) => prev.filter((_, i) => i !== idx))
  }
  const addPickup = () => {
    const lastGroup = pickups[pickups.length - 1]?.group ?? 'common'
    setPickups((prev) => [...prev, { label: `픽업 ${prev.length + 1}`, group: lastGroup }])
    setGoals((prev) => [...prev, 1])
    setOwnedCopies((prev) => [...prev, 0])
  }

  type Preset = { id: string; label: string; pickups: FeaturedHero[]; goals: number[] }
  const presets: Preset[] = [
    {
      id: 'common1',
      label: '일반 픽업 1명',
      pickups: [{ label: '픽업', group: 'common' as FeaturedGroup }],
      goals: [1],
    },
    {
      id: 'common2-one',
      label: '일반 2명 중 1명만',
      pickups: [
        { label: '픽업 A', group: 'common' as FeaturedGroup },
        { label: '픽업 B', group: 'common' as FeaturedGroup },
      ],
      goals: [1, 0],
    },
    {
      id: 'common2-both',
      label: '일반 2명 모두',
      pickups: [
        { label: '픽업 A', group: 'common' as FeaturedGroup },
        { label: '픽업 B', group: 'common' as FeaturedGroup },
      ],
      goals: [1, 1],
    },
    {
      id: 'mixed-lord',
      label: '영주 + 일반 중 영주만',
      pickups: [
        { label: '영주 픽업', group: 'lord' as FeaturedGroup },
        { label: '일반 픽업', group: 'common' as FeaturedGroup },
      ],
      goals: [1, 0],
    },
    {
      id: 'mixed-both',
      label: '영주 + 일반 둘 다',
      pickups: [
        { label: '영주 픽업', group: 'lord' as FeaturedGroup },
        { label: '일반 픽업', group: 'common' as FeaturedGroup },
      ],
      goals: [1, 1],
    },
  ]
  const applyPreset = (preset: Preset) => {
    setPickups(preset.pickups.map((x) => ({ ...x })))
    setGoals([...preset.goals])
    setOwnedCopies(preset.pickups.map(() => 0))
  }

  // 결과 헤더 텍스트
  const resultHeader = useMemo(() => {
    if (numActiveTargets === 0) return '노리는 픽업 영웅이 없습니다. 픽업 행의 "획득 목표" 를 1 이상으로 설정하세요.'
    if (numActiveTargets === 1) {
      const t = activeTargets[0]
      const label = pickups[t.pickupIdx]?.label || `픽업 ${t.pickupIdx + 1}`
      return `${availablePulls}회 안에 ${label} ${t.goal}회 획득 확률`
    }
    const labels = activeTargets.map((t) => {
      const lab = pickups[t.pickupIdx]?.label || `픽업 ${t.pickupIdx + 1}`
      return `${lab} ${t.goal}회`
    })
    return `${availablePulls}회 안에 ${labels.join(' + ')} 모두 달성 확률`
  }, [activeTargets, numActiveTargets, availablePulls, pickups])

  return (
    <div className="app">
      <SiteCredit />
      <GlobalNav active="summon" />
      <section className="card">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">SUMMON LAB</p>
            <h1>픽업 영웅 달성 확률 계산기</h1>
          </div>
        </div>
        <p className="muted">
          ① 소환 풀 선택 → ② 픽업 영웅 설정 (그룹·획득 목표·이미 보유) → ③ 천장 스택 + 남은 소환 수 →
          <strong> 모든 노리는 픽업 동시 달성 확률</strong> 계산. 인게임 Drop Rates 기준 (×20 픽업,
          ×10/×2 stacking, 한정 200픽 자체 확정, 고대 영주 전용 천장, 혼합 그룹 픽업) 반영.
        </p>
        {config.placeholder ? (
          <p className="alert">⚠️ <strong>{config.name}</strong> 의 일부 수치는 추정. 인게임 확인 후 고급 편집에서 교체하세요.</p>
        ) : (
          <p className="muted helperText">데이터 출처: 인게임 Drop Rates 탭 확정 ({summonDataSource?.fetchedAt ?? '-'})</p>
        )}
      </section>

      <section className="card">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">① 소환 풀</p>
            <h2>어느 배너에서 픽업을 노리고 있어요?</h2>
          </div>
        </div>
        <div className="bannerTabs">
          {bannerOrder.map((id) => (
            <button
              key={id}
              type="button"
              className={bannerId === id ? 'bannerTab active' : 'bannerTab'}
              onClick={() => setBannerId(id)}
            >
              {banners[id].name}
            </button>
          ))}
        </div>
        <p className="muted helperText">{config.notes}</p>

        <div className="modRow">
          <span className="modRowLabel">배너 이벤트</span>
          <button
            type="button"
            className={crazy ? 'modChip active' : 'modChip'}
            onClick={() => setCrazy((v) => !v)}
          >
            🔥 열광 (5성 확률 ×2)
          </button>
          <button
            type="button"
            className={onePlusOne ? 'modChip active' : 'modChip'}
            onClick={() => setOnePlusOne((v) => !v)}
          >
            ➕ 1+1 (전설 나오면 1개 더)
          </button>
        </div>
        <p className="muted helperText">
          {crazy && onePlusOne
            ? '열광 + 1+1 동시 적용 — 5성 확률 2배 + 전설마다 보너스 1개.'
            : crazy
              ? '열광: 모든 5성 base 확률이 2배 (예: 영주 0.04%→0.08%). 천장은 그대로.'
              : onePlusOne
                ? '1+1: 전설이 나올 때마다 같은 풀에서 보너스 5성 1개 추가 (천장/보정 무관).'
                : '일반 배너. 두 이벤트를 켜서 어느 쪽이 픽업 확보에 유리한지 비교해 보세요.'}
        </p>
      </section>

      <section className="card">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">② 픽업 영웅</p>
            <h2>이 배너의 픽업 영웅들 — 각자의 획득 목표와 현재 보유</h2>
          </div>
        </div>
        {!isLimited ? (
          <div className="pickupPresets">
            <span className="presetLabel">빠른 설정:</span>
            {presets.map((p) => (
              <button key={p.id} type="button" className="presetChip" onClick={() => applyPreset(p)}>
                {p.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="pickupList">
          <div className="pickupHeader">
            <span className="pickupHeaderTarget">노림</span>
            <span className="pickupHeaderGroup">그룹</span>
            <span className="pickupHeaderName">영웅 라벨</span>
            <span className="pickupHeaderInputs">획득 목표 / 이미 보유</span>
          </div>
          {pickups.map((p, i) => {
            const goal = goals[i] ?? 0
            const owned = ownedCopies[i] ?? 0
            const isActive = goal > 0
            return (
              <div key={i} className={`pickupRow ${p.group}${isActive ? ' isActive' : ''}`}>
                <button
                  type="button"
                  className={`targetRadio${isActive ? ' active' : ''}`}
                  onClick={() => updateGoal(i, isActive ? 0 : 1)}
                  aria-label={isActive ? '노림 끄기' : '노림 켜기'}
                  title={isActive ? '노림 끄기' : '노림 켜기'}
                >
                  {isActive ? '🎯' : '○'}
                </button>
                <div className="pickupGroupToggle">
                  <button
                    type="button"
                    className={p.group === 'lord' ? 'groupChip lord active' : 'groupChip lord'}
                    onClick={() => updatePickup(i, { group: 'lord' })}
                  >
                    영주
                  </button>
                  <button
                    type="button"
                    className={p.group === 'common' ? 'groupChip common active' : 'groupChip common'}
                    onClick={() => updatePickup(i, { group: 'common' })}
                  >
                    일반
                  </button>
                </div>
                <input
                  className="pickupLabel"
                  value={p.label}
                  onChange={(e) => updatePickup(i, { label: e.target.value })}
                  placeholder={`픽업 ${i + 1}`}
                />
                <div className="pickupNumbers">
                  <label className="miniField">
                    <span>목표</span>
                    <input
                      type="number"
                      min={0}
                      value={goal}
                      onChange={(e) => updateGoal(i, Number(e.target.value))}
                    />
                  </label>
                  <label className={`miniField ${isActive ? '' : 'dim'}`}>
                    <span>보유</span>
                    <input
                      type="number"
                      min={0}
                      value={owned}
                      onChange={(e) => updateOwned(i, Number(e.target.value))}
                      disabled={!isActive}
                    />
                  </label>
                </div>
                {pickups.length > 1 && !isLimited ? (
                  <button
                    type="button"
                    className="pickupRemove"
                    onClick={() => removePickup(i)}
                    aria-label="픽업 제거"
                  >
                    ×
                  </button>
                ) : null}
              </div>
            )
          })}
          {!isLimited ? (
            <button type="button" className="pickupAdd" onClick={addPickup}>
              + 픽업 추가
            </button>
          ) : (
            <p className="muted helperText">한정 선택 소환은 한 번에 픽업 1명만 선택 가능합니다.</p>
          )}
        </div>
        <p className="muted helperText">
          🎯 표시된 영웅이 "노리는 타겟". 여러 명에 🎯 켜면 <strong>모두 자기 목표 만큼 획득</strong>해야 성공으로 집계 (AND).
          {isLordOnlyPity ? ' · 고대 천장은 영주만 카운터 리셋 (일반만 노리면 천장 도움 없음)' : ''}
        </p>
      </section>

      <section className="card">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">③ 내 현황</p>
            <h2>지금 스택과 남은 소환 수</h2>
          </div>
        </div>
        <div className="summonGrid">
          <label className="field">
            <span>
              현재 스택수
              <small className="hint"> · {pityGroupLabel} 통합 천장 카운터 (마지막 {isLordOnlyPity ? '영주' : '5성'} 이후 소환 수)</small>
            </span>
            <input type="number" value={pity} onChange={(e) => setPity(Number(e.target.value))} />
          </label>
          {config.featuredMultiplier > 1 ? (
            <label className="field">
              <span>
                픽업 미스 누적
                <small className="hint"> · 마지막 픽업 영웅 이후 뽑은 비-픽업 5성 수</small>
              </span>
              <input
                type="number"
                value={rateUpMisses}
                onChange={(e) => setRateUpMisses(Number(e.target.value))}
              />
            </label>
          ) : null}
          {config.featuredHardGuarantee != null ? (
            <label className="field">
              <span>
                이 배너 누적 소환
                <small className="hint"> · {config.featuredHardGuarantee}픽 타겟 확정용 (이 한정 배너에서만)</small>
              </span>
              <input
                type="number"
                value={pullsOnBanner}
                onChange={(e) => setPullsOnBanner(Number(e.target.value))}
              />
            </label>
          ) : null}
          <label className="field">
            <span>
              남은 소환 수
              <small className="hint"> · 보석/티켓 합산 (1회 = 1소환)</small>
            </span>
            <input
              type="number"
              value={availablePulls}
              onChange={(e) => setAvailablePulls(Math.max(0, Number(e.target.value)))}
            />
          </label>
        </div>
      </section>

      <section className="card heroResult">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">결과</p>
            <h2>{resultHeader}</h2>
          </div>
        </div>
        {numActiveTargets > 0 ? (
          <div className="heroNumber">{pctSharp(report.jointProbabilityWithBudget)}</div>
        ) : null}

        {numActiveTargets > 1 ? (
          <div className="marginalGrid">
            <div className="marginalHead">개별 픽업 단독 달성 확률 (각자 목표만 충족)</div>
            {activeTargets.map((t) => {
              const lab = pickups[t.pickupIdx]?.label || `픽업 ${t.pickupIdx + 1}`
              return (
                <div key={t.pickupIdx} className="marginalRow">
                  <span>{lab} ({t.goal}회)</span>
                  <strong>{pct(report.marginalProbabilityWithBudget[t.pickupIdx] ?? 0)}</strong>
                </div>
              )
            })}
          </div>
        ) : null}

        <div className="summaryGrid">
          {pickups.map((p, i) => (
            <div key={i}>
              <span>{p.label || `픽업 ${i + 1}`} 기대 획득 수</span>
              <strong>{(report.expectedHitsWithBudget[i] ?? 0).toFixed(2)}</strong>
            </div>
          ))}
          <div>
            <span>픽업 아닌 5성 기대 횟수</span>
            <strong>{report.expectedNonRateUpLegendaryWithBudget.toFixed(2)}</strong>
          </div>
          <div>
            <span>지금 5성 1개 나오면 픽업(어느 것이든)일 확률</span>
            <strong>{pct(report.conditionalAnyPickup)}</strong>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">1회 소환 분기</p>
            <h2>다음 1회 소환 시 결과 분포</h2>
          </div>
        </div>
        <div className="outcomeGrid">
          {pickups.map((p, i) => {
            const isActive = (goals[i] ?? 0) > 0
            return (
              <div key={i} className={`outcomeRow ${isActive ? 'target' : 'other'}`}>
                <span>
                  {isActive ? '🎯 ' : ''}
                  {p.label || `픽업 ${i + 1}`}
                  <small className="hint"> · {p.group === 'lord' ? '영주' : '일반'} 그룹</small>
                </span>
                <strong>{pctSharp(report.outcomeNow.pickupProbs[i] ?? 0)}</strong>
              </div>
            )
          })}
          <div className="outcomeRow nonRateUp">
            <span>🟠 픽업 아닌 5성</span>
            <strong>{pctSharp(report.outcomeNow.nonRateUpLegendary)}</strong>
          </div>
          <div className="outcomeRow noLeg">
            <span>5성 아님 (에픽/레어 등)</span>
            <strong>{pctSharp(report.outcomeNow.noLegendary)}</strong>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">소환 수 vs 달성 확률</p>
            <h2>곡선 (모든 노리는 픽업 동시 달성)</h2>
          </div>
        </div>
        <CdfChart cdf={report.jointCdf} budget={report.availablePulls} />
        <p className="muted helperText">
          세로 점선 = 현재 남은 소환 수 ({num(report.availablePulls)}회).
        </p>
      </section>

      <section className="card">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">필요 소환수</p>
            <h2>목표 확률별 (전체 달성 기준)</h2>
          </div>
        </div>
        <div className="milestoneGrid">
          <div className="milestoneHead">달성 확률</div>
          <div className="milestoneHead">필요 추가 소환</div>
          <div className="milestoneHead">현재 보유 대비</div>
          {report.milestones.map((m) => (
            <div key={m.label} className="milestoneRow">
              <div>{m.label}</div>
              <div>{m.pulls != null ? `${num(m.pulls)}회` : '한도 초과'}</div>
              <div className={m.deficitPulls === 0 ? 'positive' : 'negative'}>
                {m.deficitPulls != null
                  ? m.deficitPulls === 0
                    ? '충분'
                    : `${num(m.deficitPulls)}회 부족`
                  : '-'}
              </div>
            </div>
          ))}
        </div>
      </section>

      <details className="card">
        <summary className="advancedSummary">
          <span className="eyebrow">고급</span>
          <span>배너 룰 직접 편집 (인게임 Drop Rates 탭 수치로 교체)</span>
        </summary>
        <div className="summonGrid">
          <label className="field">
            <span>영주 그룹 전체 5성 확률 (%)</span>
            <input
              type="number"
              step="0.01"
              value={config.lordGroupRate * 100}
              onChange={(e) => updateConfig({ lordGroupRate: Number(e.target.value) / 100 })}
            />
          </label>
          <label className="field">
            <span>일반 그룹 전체 5성 확률 (%)</span>
            <input
              type="number"
              step="0.01"
              value={config.commonGroupRate * 100}
              onChange={(e) => updateConfig({ commonGroupRate: Number(e.target.value) / 100 })}
            />
          </label>
          <label className="field">
            <span>영주 풀 크기</span>
            <input
              type="number"
              value={config.lordPoolSize}
              onChange={(e) => updateConfig({ lordPoolSize: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span>일반 풀 크기</span>
            <input
              type="number"
              value={config.commonPoolSize}
              onChange={(e) => updateConfig({ commonPoolSize: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span>하드 천장</span>
            <input
              type="number"
              value={config.hardPity}
              onChange={(e) => updateConfig({ hardPity: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span>소프트 천장 시작</span>
            <input
              type="number"
              value={config.softPityStart ?? 0}
              onChange={(e) =>
                updateConfig({ softPityStart: Number(e.target.value) || undefined })
              }
            />
          </label>
          <label className="field">
            <span>소프트 천장 증가 (%/회)</span>
            <input
              type="number"
              step="0.1"
              value={(config.softPityIncrement ?? 0) * 100}
              onChange={(e) =>
                updateConfig({ softPityIncrement: Number(e.target.value) / 100 || undefined })
              }
            />
          </label>
          <label className="field">
            <span>픽업 영웅 가중치 (이벤트 ×20, 일반 ×1)</span>
            <input
              type="number"
              step="1"
              value={config.featuredMultiplier}
              onChange={(e) => updateConfig({ featuredMultiplier: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span>미스 stacking (스피릿/디바인 ×10, 고대 ×2)</span>
            <input
              type="number"
              step="1"
              value={config.rateUpStackingMultiplier ?? 1}
              onChange={(e) =>
                updateConfig({
                  rateUpStackingMultiplier:
                    Number(e.target.value) > 1 ? Number(e.target.value) : undefined,
                })
              }
            />
          </label>
          <label className="field">
            <span>타겟 자체 확정 픽수 (한정=200, 그 외=0)</span>
            <input
              type="number"
              value={config.featuredHardGuarantee ?? 0}
              onChange={(e) =>
                updateConfig({
                  featuredHardGuarantee:
                    Number(e.target.value) > 0 ? Number(e.target.value) : undefined,
                })
              }
            />
          </label>
          <label className="field">
            <span>천장 카운터 대상</span>
            <select
              value={config.pityFocus ?? 'anyLegendary'}
              onChange={(e) =>
                updateConfig({
                  pityFocus: e.target.value as BannerConfig['pityFocus'],
                })
              }
            >
              <option value="anyLegendary">모든 5성 (스피릿/디바인)</option>
              <option value="lord">영주만 (고대 소환)</option>
            </select>
          </label>
        </div>
      </details>
    </div>
  )
}
