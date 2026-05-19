import { useEffect, useMemo, useState } from 'react'
import {
  buildStrategyReport,
  conditionalFeaturedGivenLegendary,
  expectedPullsForFirst,
  reachGoalDistribution,
  type BannerConfig,
  type SummonState,
} from './lib/gacha'
import { banners, bannerOrder, summonDataSource } from './data/banners'

const pct = (v: number) => `${(v * 100).toFixed(1)}%`
const num = (v: number) => Math.round(v).toLocaleString()

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

  const [pity, setPity] = useState(0)
  const [guaranteed, setGuaranteed] = useState(false)
  const [copies, setCopies] = useState(0)
  const [goal, setGoal] = useState(1)
  const [gems, setGems] = useState(30000)
  const [tickets, setTickets] = useState(0)

  useEffect(() => {
    setConfig(banners[bannerId])
  }, [bannerId])

  const state: SummonState = useMemo(
    () => ({ pity: Math.max(0, pity), guaranteed, copies: Math.max(0, copies) }),
    [pity, guaranteed, copies],
  )

  const report = useMemo(
    () => buildStrategyReport(config, goal, state, { gems, tickets }),
    [config, goal, state, gems, tickets],
  )

  const horizon = useMemo(() => {
    const m90 = report.milestones.find((x) => x.p === 0.9)?.pulls ?? config.hardPity * 2
    return Math.min(2000, Math.max(report.availablePulls, m90 ?? 0, config.hardPity * 2, 60))
  }, [report, config])

  const { cdf } = useMemo(
    () => reachGoalDistribution(config, goal, horizon, state),
    [config, goal, horizon, state],
  )

  const expectedFirst = useMemo(() => expectedPullsForFirst(config, state), [config, state])
  const condFeatured = conditionalFeaturedGivenLegendary(config, state)

  const updateConfig = (patch: Partial<BannerConfig>) =>
    setConfig((prev) => ({ ...prev, ...patch }))

  return (
    <div className="app">
      <section className="card">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">SUMMON LAB</p>
            <h1>소환 확률 계산기</h1>
          </div>
        </div>
        <p className="muted">
          일반 · 한정 · 고대 · 신성 배너의 천장/픽업 규칙을 반영해, 보유 자원과 현재 천장 스택으로
          목표 캐릭 확보 확률과 뽑기 전략을 계산합니다.
        </p>
        {config.placeholder ? (
          <p className="alert">
            ⚠️ 현재 <strong>{config.name}</strong> 배너 수치는 추정 placeholder 입니다. 실제 값은
            GitHub Action 크롤(scripts/sync-summon.mjs) 또는 직접 입력으로 교체하세요.
          </p>
        ) : (
          <p className="muted helperText">
            데이터 출처: {summonDataSource?.url ?? '크롤'} ({summonDataSource?.fetchedAt ?? '-'})
          </p>
        )}
      </section>

      <section className="card">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">배너</p>
            <h2>배너 선택</h2>
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
            <p className="eyebrow">배너 규칙 (편집 가능)</p>
            <h2>확률 / 천장 / 픽업</h2>
          </div>
        </div>
        <div className="summonGrid">
          <label className="field">
            <span>전설 기본 확률 (%)</span>
            <input
              type="number"
              step="0.1"
              value={config.legendaryBaseRate * 100}
              onChange={(e) => updateConfig({ legendaryBaseRate: Number(e.target.value) / 100 })}
            />
          </label>
          <label className="field">
            <span>하드 천장 (소환 수)</span>
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
          {config.targetModel === 'featured' ? (
            <label className="field">
              <span>픽업 확률 (전설 중 %)</span>
              <input
                type="number"
                step="1"
                value={(config.featuredShare ?? 0) * 100}
                onChange={(e) => updateConfig({ featuredShare: Number(e.target.value) / 100 })}
              />
            </label>
          ) : (
            <label className="field">
              <span>전설 풀 크기</span>
              <input
                type="number"
                value={config.legendaryPoolSize ?? 1}
                onChange={(e) => updateConfig({ legendaryPoolSize: Number(e.target.value) })}
              />
            </label>
          )}
          <label className="field">
            <span>소환당 보석</span>
            <input
              type="number"
              value={config.gemsPerPull ?? 0}
              onChange={(e) => updateConfig({ gemsPerPull: Number(e.target.value) })}
            />
          </label>
          {config.targetModel === 'featured' ? (
            <label className="checkboxField">
              <input
                type="checkbox"
                checked={!!config.guaranteedAfterLoss}
                onChange={(e) => updateConfig({ guaranteedAfterLoss: e.target.checked })}
              />
              <span>픽업 실패 시 다음 전설 픽업 확정 (50/50 보장형)</span>
            </label>
          ) : null}
        </div>
      </section>

      <section className="card">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">내 현황</p>
            <h2>보유 스택 / 자원</h2>
          </div>
        </div>
        <div className="summonGrid">
          <label className="field">
            <span>현재 천장 카운트</span>
            <input type="number" value={pity} onChange={(e) => setPity(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>이미 보유 카피</span>
            <input type="number" value={copies} onChange={(e) => setCopies(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>목표 카피 수</span>
            <input
              type="number"
              min={1}
              value={goal}
              onChange={(e) => setGoal(Math.max(1, Number(e.target.value)))}
            />
          </label>
          <label className="field">
            <span>보유 보석</span>
            <input type="number" value={gems} onChange={(e) => setGems(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>보유 소환 티켓</span>
            <input
              type="number"
              value={tickets}
              onChange={(e) => setTickets(Number(e.target.value))}
            />
          </label>
          {config.targetModel === 'featured' && config.guaranteedAfterLoss ? (
            <label className="checkboxField">
              <input
                type="checkbox"
                checked={guaranteed}
                onChange={(e) => setGuaranteed(e.target.checked)}
              />
              <span>다음 전설 픽업 확정 상태</span>
            </label>
          ) : null}
        </div>
      </section>

      <section className="card">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">결과</p>
            <h2>현재 자원 기준 전략</h2>
          </div>
        </div>
        <div className="summaryGrid">
          <div>
            <span>가능 소환 수</span>
            <strong>{num(report.availablePulls)}회</strong>
          </div>
          <div>
            <span>목표({goal}카피) 달성 확률</span>
            <strong>{pct(report.probabilityWithBudget)}</strong>
          </div>
          <div>
            <span>기대 확보 카피</span>
            <strong>{report.expectedCopiesWithBudget.toFixed(2)}</strong>
          </div>
          <div>
            <span>전설 1개 → 픽업일 확률</span>
            <strong>{pct(condFeatured)}</strong>
          </div>
          <div>
            <span>첫 1카피 기대 소환</span>
            <strong>{num(expectedFirst)}회</strong>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">목표 확률별</p>
            <h2>필요 소환 수 / 부족분</h2>
          </div>
        </div>
        <div className="milestoneGrid">
          <div className="milestoneHead">목표 확률</div>
          <div className="milestoneHead">필요 소환</div>
          <div className="milestoneHead">현재 부족분</div>
          <div className="milestoneHead">추가 보석</div>
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
              <div>
                {m.deficitPulls != null && m.deficitPulls > 0
                  ? `${num(m.deficitPulls * (config.gemsPerPull ?? 0))} 보석`
                  : '-'}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">분포</p>
            <h2>소환 수 대비 달성 확률</h2>
          </div>
        </div>
        <CdfChart cdf={cdf} budget={report.availablePulls} />
        <p className="muted helperText">
          세로 점선 = 현재 보유 자원으로 가능한 소환 수({num(report.availablePulls)}회).
        </p>
      </section>
    </div>
  )
}
