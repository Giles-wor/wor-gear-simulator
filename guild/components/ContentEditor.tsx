import { useState, type ChangeEvent } from 'react'
import type { GuildCell, GuildContent, GuildTable, RowMeta } from '../types'
import { cellOf, titleColIndex, useIsMobile } from './ResponsiveTable'

type Props = {
  initial: GuildContent
  onSave: (next: GuildContent) => void
  onCancel: () => void
  busy: boolean
  error: string
  canPublish: boolean
  /** 헤더명 → 아이콘 URL(편집 시 매칭용). */
  headerIcon?: (header: string) => string | undefined
}

export function ContentEditor({ initial, onSave, onCancel, busy, error, canPublish, headerIcon }: Props) {
  const [draft, setDraft] = useState<GuildContent>(() => structuredClone(initial))
  const mobile = useIsMobile()

  const setNotice = (notice: string) => setDraft((d) => ({ ...d, notice }))

  const updateTable = (ti: number, fn: (t: GuildTable) => GuildTable) =>
    setDraft((d) => ({ ...d, tables: d.tables.map((t, i) => (i === ti ? fn(t) : t)) }))

  const setCell = (ti: number, ri: number, ci: number, value: string) =>
    updateTable(ti, (t) => ({
      ...t,
      rows: t.rows.map((row, r) =>
        r !== ri
          ? row
          : row.map((cell, c) => {
              if (c !== ci) return cell
              const prev = cellOf(cell)
              return prev.hi ? { v: value, hi: true } : value
            }),
      ),
    }))

  const addRow = (ti: number) =>
    updateTable(ti, (t) => ({ ...t, rows: [...t.rows, t.headers.map(() => '')] }))

  const removeRow = (ti: number, ri: number) =>
    updateTable(ti, (t) => ({ ...t, rows: t.rows.filter((_, r) => r !== ri) }))

  // 링크
  const addLink = () => setDraft((d) => ({ ...d, links: [...d.links, { label: '', url: '' }] }))
  const setLink = (i: number, key: 'label' | 'url' | 'desc', value: string) =>
    setDraft((d) => ({ ...d, links: d.links.map((l, j) => (j === i ? { ...l, [key]: value } : l)) }))
  const removeLink = (i: number) =>
    setDraft((d) => ({ ...d, links: d.links.filter((_, j) => j !== i) }))

  // 이미지
  const addImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () =>
      setDraft((d) => ({ ...d, images: [...d.images, { src: String(reader.result), caption: '' }] }))
    reader.readAsDataURL(file)
    e.target.value = ''
  }
  const setCaption = (i: number, caption: string) =>
    setDraft((d) => ({ ...d, images: d.images.map((im, j) => (j === i ? { ...im, caption } : im)) }))
  const removeImage = (i: number) =>
    setDraft((d) => ({ ...d, images: d.images.filter((_, j) => j !== i) }))

  const save = () => {
    const today = new Date().toISOString().slice(0, 10)
    // 변경된 행만 오늘 날짜로 갱신(캐릭명 기준 매칭). 안 바뀐 행은 기존 날짜 유지.
    const tables = draft.tables.map((t, ti) => {
      const init = initial.tables[ti]
      const titleCol = titleColIndex(t.headers)
      const prev = new Map<string, { row: GuildCell[]; meta?: RowMeta }>()
      init?.rows.forEach((r, i) => {
        prev.set(cellOf(r[titleCol] ?? '').v, { row: r, meta: init.rowMeta?.[i] })
      })
      const rowMeta: RowMeta[] = t.rows.map((r) => {
        const p = prev.get(cellOf(r[titleCol] ?? '').v)
        const changed = !p || JSON.stringify(p.row) !== JSON.stringify(r)
        return changed ? { updatedAt: today } : (p.meta ?? {})
      })
      return { ...t, rowMeta }
    })
    onSave({ ...draft, updatedAt: today, tables })
  }

  // 모바일: 멤버별 카드 입력폼 (가로 스크롤 없이 한 명씩 입력)
  const renderMobileTable = (table: GuildTable, ti: number) => {
    const titleCol = titleColIndex(table.headers)
    return (
      <div className="guildEditMembers">
        {table.rows.map((row, ri) => {
          const name = cellOf(row[titleCol] ?? '').v
          return (
            <div className="guildEditMemberCard" key={ri}>
              <div className="guildEditMemberHead">
                <input
                  className="guildEditMemberName"
                  value={name}
                  onChange={(e) => setCell(ti, ri, titleCol, e.target.value)}
                  placeholder={table.headers[titleCol] || '이름'}
                  aria-label="캐릭명"
                />
                <button
                  type="button"
                  className="guildRowDel"
                  onClick={() => removeRow(ti, ri)}
                  aria-label="삭제"
                >
                  ✕
                </button>
              </div>
              <div className={table.sumColumn ? 'guildEditMemberGrid soldiers' : 'guildEditMemberGrid'}>
                {row.map((cell, ci) => {
                  if (ci === titleCol) return null
                  const { v } = cellOf(cell)
                  const label = table.headers[ci] ?? ''
                  const icon = headerIcon?.(label)
                  return (
                    <label key={ci} className="guildEditField" title={icon ? label : undefined}>
                      <span className="guildEditFieldLabel">
                        {icon ? <img className="guildHeaderIcon sm" src={icon} alt={label} /> : label}
                      </span>
                      <input
                        value={v}
                        onChange={(e) => setCell(ti, ri, ci, e.target.value)}
                        inputMode={ci >= 2 ? 'numeric' : undefined}
                        aria-label={`${name || ri + 1} ${label}`}
                      />
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // 데스크톱: 표 형태 입력
  const renderDesktopTable = (table: GuildTable, ti: number) => (
    <div className="guildTableScroll">
      <table className="guildTable guildEditTable">
        <thead>
          <tr>
            <th aria-label="행 삭제" />
            {table.headers.map((h, hi) => {
              const icon = headerIcon?.(h)
              return (
                <th key={hi} title={icon ? h : undefined}>
                  {icon ? <img className="guildHeaderIcon" src={icon} alt={h} /> : h}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri}>
              <td className="guildEditDelCell">
                <button
                  type="button"
                  className="guildRowDel"
                  onClick={() => removeRow(ti, ri)}
                  aria-label="행 삭제"
                  title="행 삭제"
                >
                  ✕
                </button>
              </td>
              {row.map((cell, ci) => {
                const { v } = cellOf(cell)
                return (
                  <td key={ci} className="guildEditCell">
                    <input
                      value={v}
                      onChange={(e) => setCell(ti, ri, ci, e.target.value)}
                      aria-label={`${table.headers[ci]} ${ri + 1}행`}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="guildEditor">
      <section className="guildBlock">
        <h2 className="guildBlockTitle">📢 공지</h2>
        <textarea
          className="guildEditNotice"
          value={draft.notice}
          onChange={(e) => setNotice(e.target.value)}
          rows={4}
          placeholder="공지 / 자유 텍스트 (줄바꿈 가능)"
        />
      </section>

      {draft.tables.map((table, ti) => (
        <section className="guildBlock" key={ti}>
          <h2 className="guildBlockTitle">📊 {table.title || `표 ${ti + 1}`}</h2>
          <p className="guildEditHint">
            값만 입력하면 됩니다. 미달(주황) 표시는 컷 기준으로 자동 적용됩니다.
          </p>
          {mobile ? renderMobileTable(table, ti) : renderDesktopTable(table, ti)}
          <button type="button" className="guildAddBtn" onClick={() => addRow(ti)}>
            + 길드원 추가
          </button>
        </section>
      ))}

      <section className="guildBlock">
        <h2 className="guildBlockTitle">🖼️ 이미지</h2>
        <div className="guildEditImages">
          {draft.images.map((im, i) => (
            <div key={i} className="guildEditImage">
              <img src={im.src} alt={im.caption || `이미지 ${i + 1}`} />
              <input
                value={im.caption ?? ''}
                onChange={(e) => setCaption(i, e.target.value)}
                placeholder="설명(선택)"
              />
              <button type="button" className="guildRowDel" onClick={() => removeImage(i)}>
                삭제
              </button>
            </div>
          ))}
        </div>
        <label className="guildAddBtn guildFileBtn">
          + 이미지 추가
          <input type="file" accept="image/*" onChange={addImage} hidden />
        </label>
      </section>

      <section className="guildBlock">
        <h2 className="guildBlockTitle">🔗 링크 모음</h2>
        {draft.links.map((lk, i) => (
          <div key={i} className="guildEditLink">
            <input value={lk.label} onChange={(e) => setLink(i, 'label', e.target.value)} placeholder="표시 이름" />
            <input value={lk.url} onChange={(e) => setLink(i, 'url', e.target.value)} placeholder="https://..." />
            <input
              value={lk.desc ?? ''}
              onChange={(e) => setLink(i, 'desc', e.target.value)}
              placeholder="설명(선택)"
            />
            <button type="button" className="guildRowDel" onClick={() => removeLink(i)}>
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="guildAddBtn" onClick={addLink}>
          + 링크 추가
        </button>
      </section>

      {error && (
        <p className="guildLockError" role="alert">
          {error}
        </p>
      )}

      <div className="guildEditBar">
        <button type="button" className="guildLockOut" onClick={onCancel} disabled={busy}>
          취소
        </button>
        <button type="button" className="guildSaveBtn" onClick={save} disabled={busy}>
          {busy ? '저장 중…' : canPublish ? '저장 (전 길드원 반영)' : '저장 (이 브라우저)'}
        </button>
      </div>
    </div>
  )
}
