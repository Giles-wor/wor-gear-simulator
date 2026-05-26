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
  const [targetIndex, setTargetIndex] = useState<number>(banners.limited.defaultTargetIndex ?? 0)

  const [pity, setPity] = useState(0)
  const [rateUpMisses, setRateUpMisses] = useState(0)
  const [pullsOnBanner, setPullsOnBanner] = useState(0)
  const [copies, setCopies] = useState(0)
  const [goal, setGoal] = useState(1)
  const [availablePulls, setAvailablePulls] = useState(200)

  // 배너 바꾸면 픽업 구성 / 타겟도 default 로 리셋
  useEffect(() => {
    setConfig(banners[bannerId])
    setPickups(banners[bannerId].defaultPickups.map((p) => ({ ...p })))
    setTargetIndex(banners[bannerId].defaultTargetIndex ?? 0)
  }, [bannerId])

  const isLimited = config.featuredHardGuarantee != null
  const selection: PickupSelection = useMemo(
    () => ({
      pickups,
      targetIndex: Math.min(targetIndex, Math.max(0, pickups.length - 1)),
    }),
    [pickups, targetIndex],
  )

  const state: SummonState = useMemo(
    () => ({
      pity: Math.max(0, pity),
      rateUpMisses: Math.max(0, rateUpMisses),
      copies: Math.max(0, copies),
      pullsOnBanner: Math.max(0, pullsOnBanner),
    }),
    [pity, rateUpMisses, copies, pullsOnBanner],
  )

  const report = useMemo(
    () => buildStrategyReport(config, selection, goal, state, availablePulls),
    [config, selection, goal, state, availablePulls],
  )

  const updateConfig = (patch: Partial<BannerConfig>) =>
    setConfig((prev) => ({ ...prev, ...patch }))

  const pityGroupLabel = PITY_GROUP_LABEL[config.id]
  const isLordOnlyPity = config.pityFocus === 'lord'
  const targetHero = pickups[selection.targetIndex]

  const updatePickup = (idx: number, patch: Partial<FeaturedHero>) => {
    setPickups((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }
  const removePickup = (idx: number) => {
    if (pickups.length <= 1) return
    setPickups((prev) => prev.filter((_, i) => i !== idx))
    if (idx <= targetIndex) setTargetIndex((t) => Math.max(0, t - (idx === t ? 0 : 1)))
  }
  const addPickup = () => {
    const lastGroup = pickups[pickups.length - 1]?.group ?? 'common'
    setPickups((prev) => [...prev, { label: `픽업 ${prev.length + 1}`, group: lastGroup }])
  }
  type Preset = { id: string; label: string; pickups: FeaturedHero[] }
  const presets: Preset[] = [
    { id: 'common1', label: '일반 픽업 1명', pickups: [{ label: '픽업', group: 'common' as FeaturedGroup }] },
    {
      id: 'common2',
      label: '일반 픽업 2명',
      pickups: [
        { label: '픽업 A', group: 'common' as FeaturedGroup },
        { label: '픽업 B', group: 'common' as FeaturedGroup },
      ],
    },
    {
      id: 'mixed',
      label: '영주 + 일반',
      pickups: [
        { label: '영주 픽업', group: 'lord' as FeaturedGroup },
        { label: '일반 픽업', group: 'common' as FeaturedGroup },
      ],
    },
    {
      id: 'lord2',
      label: '영주 2명',
      pickups: [
        { label: '영주 A', group: 'lord' as FeaturedGroup },
        { label: '영주 B', group: 'lord' as FeaturedGroup },
      ],
    },
  ]
  const applyPreset = (preset: Preset) => {
    setPickups(preset.pickups.map((x) => ({ ...x })))
    setTargetIndex(0)
  }

  return (
    <div className="app">
      <GlobalNav active="summon" />
      <section className="card">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">SUMMON LAB</p>
            <h1>픽업 영웅 달성 확률 계산기</h1>
          </div>
        </div>
        <p className="muted">
          ① 소환 풀 선택 → ② 픽업 영웅·타겟 설정 (그룹 + 행 클릭으로 타겟 지정) →
          ③ 현재 스택과 남은 소환 수로 <strong>달성 확률 계산</strong>. 인게임 Drop Rates 탭 기준
          (×20 픽업 + ×10/×2 stacking, 한정 200픽 자체 확정, 고대 영주 전용 천장, 혼합 그룹 픽업) 반영.
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
      </section>

      <section className="card">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">② 픽업 영웅 + 타겟</p>
            <h2>이 배너의 픽업 영웅들과 노리는 타겟 영웅</h2>
          </div>
        </div>
        {!isLimited ? (
          <div className="pickupPresets">
            <span className="presetLabel">빠른 설정:</span>
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                className="presetChip"
                onClick={() => applyPreset(p)}
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="pickupList">
          {pickups.map((p, i) => {
            const isTarget = i === selection.targetIndex
            return (
              <div
                key={i}
                className={`pickupRow${isTarget ? ' isTarget' : ''} ${p.group}`}
                onClick={() => setTargetIndex(i)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setTargetIndex(i)
                  }
                }}
              >
                <span className={`targetRadio${isTarget ? ' active' : ''}`} aria-label={isTarget ? '타겟' : '타겟 아님'}>
                  {isTarget ? '🎯' : '○'}
                </span>
                <div className="pickupGroupToggle" onClick={(e) => e.stopPropagation()}>
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
                  onClick={(e) => e.stopPropagation()}
                  placeholder={`픽업 ${i + 1}`}
                />
                {pickups.length > 1 && !isLimited ? (
                  <button
                    type="button"
                    className="pickupRemove"
                    onClick={(e) => {
                      e.stopPropagation()
                      removePickup(i)
                    }}
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
        {targetHero ? (
          <p className="muted helperText">
            타겟 그룹: <strong>{targetHero.group === 'lord' ? `영주 (${config.lordPoolSize}명 풀 · ${(config.lordGroupRate * 100).toFixed(2)}%)` : `일반 (${config.commonPoolSize}명 풀 · ${(config.commonGroupRate * 100).toFixed(2)}%)`}</strong>
            {isLordOnlyPity ? ' · 고대 천장은 영주만 카운터를 리셋 (일반 타겟이면 천장 도움 없음)' : ''}
          </p>
        ) : null}
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
              천장 카운트
              <small className="hint"> · {pityGroupLabel} 통합 (마지막 {isLordOnlyPity ? '영주' : '5성'} 이후 소환)</small>
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
            <span>이미 보유한 타겟 카피</span>
            <input type="number" value={copies} onChange={(e) => setCopies(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>목표 타겟 카피 수</span>
            <input
              type="number"
              min={1}
              value={goal}
              onChange={(e) => setGoal(Math.max(1, Number(e.target.value)))}
            />
          </label>
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
            <h2>
              {availablePulls}회 소환 안에 <strong>{targetHero?.label || '타겟'}</strong> {goal}카피 확보 확률
            </h2>
          </div>
        </div>
        <div className="heroNumber">{pctSharp(report.probabilityWithBudget)}</div>
        <div className="summaryGrid">
          <div>
            <span>타겟 기대 카피</span>
            <strong>{report.expectedCopiesWithBudget.toFixed(2)}</strong>
          </div>
          {pickups.length > 1 ? (
            <div>
              <span>다른 픽업 기대 횟수</span>
              <strong>{report.expectedOtherFeaturedWithBudget.toFixed(2)}</strong>
            </div>
          ) : null}
          <div>
            <span>픽업 아닌 5성 기대 횟수</span>
            <strong>{report.expectedNonRateUpLegendaryWithBudget.toFixed(2)}</strong>
          </div>
          <div>
            <span>지금 5성 1개 나오면 타겟일 확률</span>
            <strong>{pct(report.conditionalFeatured)}</strong>
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
          <div className="outcomeRow target">
            <span>🎯 타겟 픽업 ({targetHero?.label || '-'})</span>
            <strong>{pctSharp(report.outcomeNow.target)}</strong>
          </div>
          {pickups.length > 1 ? (
            <div className="outcomeRow other">
              <span>🟣 다른 픽업 ({pickups.length - 1}명 합)</span>
              <strong>{pctSharp(report.outcomeNow.otherFeatured)}</strong>
            </div>
          ) : null}
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
            <h2>곡선</h2>
          </div>
        </div>
        <CdfChart cdf={report.cdf} budget={report.availablePulls} />
        <p className="muted helperText">
          세로 점선 = 현재 남은 소환 수 ({num(report.availablePulls)}회).
        </p>
      </section>

      <section className="card">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">필요 소환수</p>
            <h2>목표 확률별</h2>
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
            <span>하드 천장 (보장 확정 픽수)</span>
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
