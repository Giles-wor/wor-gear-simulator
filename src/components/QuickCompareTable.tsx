import { Fragment } from 'react'
import type { DamageResult } from '../lib/calc'

type QuickCompareTableProps = {
  resultA: DamageResult
  resultB: DamageResult
}

function valueClass(left: number, right: number, invert = false) {
  if (left === right) return 'same'
  if (!invert) return left > right ? 'better' : 'worse'
  return left < right ? 'better' : 'worse'
}

export function QuickCompareTable({ resultA, resultB }: QuickCompareTableProps) {
  const rows = [
    { label: '평균 DPS', a: resultA.avgDps, b: resultB.avgDps },
    { label: '최종 공격력', a: resultA.finalAtk, b: resultB.finalAtk },
    { label: '최종 치피', a: resultA.finalCritDmg, b: resultB.finalCritDmg, suffix: '%' },
    { label: '총 공속', a: resultA.bonusAspd - resultA.pantheonAspdBonus, b: resultB.bonusAspd - resultB.pantheonAspdBonus },
    { label: '최종 공속', a: resultA.totalAspd, b: resultB.totalAspd },
    { label: '공격 간격', a: resultA.interval, b: resultB.interval, suffix: '초', invert: true, digits: 2 },
  ]

  return (
    <section className="card quickCompareCard">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">한눈 비교</p>
          <h2>세팅 A / B 핵심 차이</h2>
        </div>
      </div>

      <div className="quickCompareTable">
        <div className="compareHeader">항목</div>
        <div className="compareHeader">세팅 A</div>
        <div className="compareHeader">세팅 B</div>

        {rows.map((row) => (
          <Fragment key={row.label}>
            <div className="compareLabel">{row.label}</div>
            <div className={`compareValue ${valueClass(row.a, row.b, row.invert)}`}>
              {row.digits !== undefined ? row.a.toFixed(row.digits) : row.a.toLocaleString()}{row.suffix ?? ''}
            </div>
            <div className={`compareValue ${valueClass(row.b, row.a, row.invert)}`}>
              {row.digits !== undefined ? row.b.toFixed(row.digits) : row.b.toLocaleString()}{row.suffix ?? ''}
            </div>
          </Fragment>
        ))}
      </div>
    </section>
  )
}
