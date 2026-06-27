import { useEffect, useState } from 'react'
import type { GuildCell, GuildTable } from '../types'

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

/** 데스크톱: 가로 스크롤 표 / 모바일: 멤버별 카드(값 있는 항목만 → 한눈에). */
export function ResponsiveTable({ table }: { table: GuildTable }) {
  const mobile = useIsMobile()
  const titleCol = titleColIndex(table.headers)

  if (mobile) {
    return (
      <div className="guildCards">
        {table.rows.map((row, ri) => {
          const title = cellOf(row[titleCol] ?? '').v || `행 ${ri + 1}`
          const fields = row
            .map((cell, ci) => ({ label: table.headers[ci] ?? '', ...cellOf(cell) }))
            .filter((f, ci) => ci !== titleCol && f.v.trim() !== '')
          return (
            <div key={ri} className="guildCard">
              <div className="guildCardName">{title}</div>
              {fields.length > 0 ? (
                <dl className="guildCardGrid">
                  {fields.map((f, fi) => (
                    <div key={fi} className={f.hi ? 'guildCardItem hi' : 'guildCardItem'}>
                      <dt>{f.label}</dt>
                      <dd>{f.v}</dd>
                    </div>
                  ))}
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
              <th key={hi} className={hi === titleCol ? 'guildColName' : undefined}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => {
                const { v, hi } = cellOf(cell)
                const cls = [hi ? 'guildCellHi' : '', ci === titleCol ? 'guildColName' : '']
                  .filter(Boolean)
                  .join(' ')
                return (
                  <td key={ci} className={cls || undefined}>
                    {v}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
