import { Fragment } from 'react'
import type { DamageResult } from '../lib/calc'

type QuickCompareTableProps = {
  resultA: DamageResult
  resultB: DamageResult
}

type CompareRow = {
  label: string
  a: number
  b: number
  invert?: boolean
  digits?: number
  suffix?: string
}

function valueClass(left: number, right: number, invert = false) {
  if (left === right) return 'same'
  if (!invert) return left > right ? 'better' : 'worse'
  return left < right ? 'better' : 'worse'
}

export function QuickCompareTable({ resultA, resultB }: QuickCompareTableProps) {
  const rows: CompareRow[] = [
    { label: '스탯 기반 데미지 (방어 무시)', a: resultA.statDamageIgnoreDefense, b: resultB.statDamageIgnoreDefense },
    { label: '아이템 적용 최대 데미지 (방어 무시)', a: resultA.itemMaxDamageIgnoreDefense, b: resultB.itemMaxDamageIgnoreDefense },
    { label: '스탯 기반 데미지 (중 방어)', a: resultA.statDamageMidDefense, b: resultB.statDamageMidDefense },
    { label: '아이템 적용 최대 데미지 (중 방어)', a: resultA.itemMaxDamageMidDefense, b: resultB.itemMaxDamageMidDefense },
    { label: '아이템 적용 최대 상태 DPS(10s)', a: resultA.itemMaxDps10s, b: resultB.itemMaxDps10s },
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
