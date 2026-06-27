import { Fragment, useEffect, useState } from 'react'
import type { GuildCell, GuildTable } from '../types'
import { belowCut, parseNum } from '../thresholds'

export function cellOf(cell: GuildCell): { v: string; hi: boolean } {
  return typeof cell === 'string' ? { v: cell, hi: false } : { v: cell.v, hi: !!cell.hi }
}

/** 좁은 화면(모바일) 여부. */
export function useIsMobile(breakpoint = 640): boolean {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const onChange = () => setMobile(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [breakpoint])
  return mobile
}

/** 카드 제목으로 쓸 열 인덱스(캐릭명/이름 우선, 없으면 첫 열). */
export function titleColIndex(headers: string[]): number {
  const i = headers.findIndex((h) => /캐릭명|이름|닉/.test(h))
  return i >= 0 ? i : 0
}

/** YYYY-MM-DD → 오늘로부터 며칠 지났는지. 없으면 null. */
export function daysSince(iso?: string): number | null {
  if (!iso) return null
  const then = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(then.getTime())) return null
  const now = new Date()
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const b = Date.UTC(then.getFullYear(), then.getMonth(), then.getDate())
  return Math.round((a - b) / 86400000)
}

/** "오늘 / 어제 / N일 전". 없으면 빈 문자열. */
export function daysAgoLabel(iso?: string): string {
  const d = daysSince(iso)
  if (d == null) return ''
  if (d <= 0) return '오늘'
  if (d === 1) return '어제'
  return `${d}일 전`
}

/** 30일 초과 = 갱신 지연 경고. */
export const STALE_DAYS = 30
export function isStale(iso?: string): boolean {
  const d = daysSince(iso)
  return d != null && d > STALE_DAYS
}

const UPDATED_HEADER = '최근 업데이트'

/** 캐릭명/구분 외 수치 칸에 값이 하나라도 있으면 true. */
function rowHasData(row: GuildCell[], headers: string[], titleCol: number): boolean {
  return row.some(
    (cell, ci) => ci !== titleCol && !/구분/.test(headers[ci] ?? '') && cellOf(cell).v.trim() !== '',
  )
}

/** 데스크톱: 가로 스크롤 표 / 모바일: 멤버별 카드(값 있는 항목만 → 한눈에). */
export function ResponsiveTable({ table, fallbackDate }: { table: GuildTable; fallbackDate?: string }) {
  const mobile = useIsMobile()
  const titleCol = titleColIndex(table.headers)

  // 행별 최종 수정일: rowMeta 우선, 없으면 값이 있는 행은 콘텐츠 마지막 저장일로 대체.
  const rowDate = (ri: number, row: GuildCell[]): string | undefined =>
    table.rowMeta?.[ri]?.updatedAt ?? (rowHasData(row, table.headers, titleCol) ? fallbackDate : undefined)

  // 계: 캐릭명/구분 외 수치 칸 합계(빈 칸=0).
  const rowSum = (row: GuildCell[]): number =>
    row.reduce((acc, cell, ci) => {
      if (ci === titleCol || /구분/.test(table.headers[ci] ?? '')) return acc
      return acc + (parseNum(cellOf(cell).v) ?? 0)
    }, 0)

  if (mobile) {
    return (
      <div className="guildCards">
        {table.rows.map((row, ri) => {
          const title = cellOf(row[titleCol] ?? '').v || `행 ${ri + 1}`
          const fields = row
            .map((cell, ci) => {
              const { v, hi } = cellOf(cell)
              const label = table.headers[ci] ?? ''
              return { label, v, hi: hi || belowCut(label, v), ci }
            })
            // 캐릭명/구분 제외한 수치 열은 값이 없어도 NaN 으로 표시
            .filter((f) => f.ci !== titleCol && !/구분/.test(f.label))
          const date = rowDate(ri, row)
          const upd = daysAgoLabel(date)
          return (
            <div key={ri} className="guildCard">
              <div className="guildCardName">
                {title}
                {table.sumColumn && <span className="guildCardSum">계 {rowSum(row)}</span>}
                {upd && (
                  <span className={isStale(date) ? 'guildCardUpd stale' : 'guildCardUpd'}>업데이트 {upd}</span>
                )}
              </div>
              {fields.length > 0 ? (
                <dl className="guildCardGrid">
                  {fields.map((f) => {
                    const empty = f.v.trim() === ''
                    return (
                      <div key={f.ci} className={!empty && f.hi ? 'guildCardItem hi' : 'guildCardItem'}>
                        <dt>{f.label}</dt>
                        <dd className={empty ? 'guildNaN' : undefined}>{empty ? 'NaN' : f.v}</dd>
                      </div>
                    )
                  })}
                </dl>
              ) : (
                <p className="guildCardEmpty">기록 없음</p>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="guildTableScroll">
      <table className="guildTable">
        <thead>
          <tr>
            {table.headers.map((h, hi) => (
              <Fragment key={hi}>
                <th className={hi === titleCol ? 'guildColName' : undefined}>{h}</th>
                {table.sumColumn && hi === titleCol && <th className="guildSumCol">계</th>}
              </Fragment>
            ))}
            <th className="guildUpdCol">{UPDATED_HEADER}</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => {
                const { v, hi } = cellOf(cell)
                const header = table.headers[ci] ?? ''
                const isStat = ci !== titleCol && !/구분/.test(header)
                const showNaN = isStat && v.trim() === ''
                const lit = hi || belowCut(header, v)
                const cls = [
                  lit ? 'guildCellHi' : '',
                  ci === titleCol ? 'guildColName' : '',
                  showNaN ? 'guildNaN' : '',
                ]
                  .filter(Boolean)
                  .join(' ')
                return (
                  <Fragment key={ci}>
                    <td className={cls || undefined}>{showNaN ? 'NaN' : v}</td>
                    {table.sumColumn && ci === titleCol && <td className="guildSum">{rowSum(row)}</td>}
                  </Fragment>
                )
              })}
              <td className={isStale(rowDate(ri, row)) ? 'guildUpd stale' : 'guildUpd'}>
                {daysAgoLabel(rowDate(ri, row)) || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
