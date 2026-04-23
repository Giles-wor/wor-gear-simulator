import type { DamageResult } from '../lib/calc'

type DamageTimelineChartProps = {
  resultA: DamageResult
  resultB: DamageResult
}

function buildPoints(points: { second: number; cumulativeDamage: number }[], width: number, height: number, maxValue: number) {
  return points.map((point) => {
    const x = (point.second / 10) * width
    const y = height - (point.cumulativeDamage / Math.max(maxValue, 1)) * height
    return `${x},${y}`
  }).join(' ')
}

export function DamageTimelineChart({ resultA, resultB }: DamageTimelineChartProps) {
  const width = 320
  const height = 200
  const maxValue = Math.max(
    resultA.timeline10s[resultA.timeline10s.length - 1]?.cumulativeDamage ?? 0,
    resultB.timeline10s[resultB.timeline10s.length - 1]?.cumulativeDamage ?? 0,
    1
  )

  return (
    <section className="card chartCard">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">10초 그래프</p>
          <h2>초기 10초 누적 딜 변화</h2>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="timelineChart" aria-label="10초 누적 딜 그래프">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((tick) => (
          <line key={tick} x1={(tick / 10) * width} y1="0" x2={(tick / 10) * width} y2={height} className="chartGrid" />
        ))}
        <polyline fill="none" stroke="#9ff1b9" strokeWidth="4" points={buildPoints(resultA.timeline10s, width, height, maxValue)} />
        <polyline fill="none" stroke="#ff9f9f" strokeWidth="4" points={buildPoints(resultB.timeline10s, width, height, maxValue)} />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((tick) => (
          <text key={`label-${tick}`} x={(tick / 10) * width} y={height - 6} textAnchor="middle" className="chartTickLabel">
            {tick}
          </text>
        ))}
      </svg>

      <div className="chartLegend">
        <div><span className="legendSwatch legendA" />세팅 A 10초 누적: <strong>{resultA.itemMaxCumulative10s.toLocaleString()}</strong></div>
        <div><span className="legendSwatch legendB" />세팅 B 10초 누적: <strong>{resultB.itemMaxCumulative10s.toLocaleString()}</strong></div>
      </div>
      <p className="muted chartNote">첫 타는 0초, 이후 공격 간격마다 타격합니다. Cataclysm은 첫 타 0%에서 시작해 다음 타부터 10%씩 누적합니다.</p>
    </section>
  )
}
