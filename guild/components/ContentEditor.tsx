import { useState, type ChangeEvent } from 'react'
import type { GuildCell, GuildContent, GuildTable, RowMeta } from '../types'
import { cellOf, titleColIndex } from './ResponsiveTable'

type Props = {
  initial: GuildContent
  /** 편집 시작 시 선택할 길드원(읽기 화면에서 클릭한 멤버). 비면 첫 멤버. */
  initialMember?: string
  onSave: (next: GuildContent) => void
  onCancel: () => void
  busy: boolean
  error: string
  canPublish: boolean
  /** 헤더명 → 아이콘 URL(편집 시 매칭용). */
  headerIcon?: (header: string) => string | undefined
}

export function ContentEditor({
  initial,
  initialMember,
  onSave,
  onCancel,
  busy,
  error,
  canPublish,
  headerIcon,
}: Props) {
  const [draft, setDraft] = useState<GuildContent>(() => structuredClone(initial))

  const mainTitleCol = draft.tables[0] ? titleColIndex(draft.tables[0].headers) : 1
  const members = draft.tables[0]?.rows.map((r) => cellOf(r[mainTitleCol] ?? '').v) ?? []

  const [selRaw, setSel] = useState<string>(() => {
    if (initialMember) return initialMember
    const t0 = initial.tables[0]
    return t0 ? cellOf(t0.rows[0]?.[titleColIndex(t0.headers)] ?? '').v : ''
  })
  const selected = members.includes(selRaw) ? selRaw : (members[0] ?? '')

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

  const rowIndexOf = (t: GuildTable, name: string) => {
    const tc = titleColIndex(t.headers)
    return t.rows.findIndex((r) => cellOf(r[tc] ?? '').v === name)
  }

  // ── 길드원 추가/삭제/이름변경 (모든 표에 동기) ──
  const addMember = () => {
    let name = '새 길드원'
    let i = 1
    while (members.includes(name)) name = `새 길드원 ${++i}`
    setDraft((d) => ({
      ...d,
      tables: d.tables.map((t) => {
        const tc = titleColIndex(t.headers)
        const row: GuildCell[] = t.headers.map((_, ci) => (ci === tc ? name : ''))
        return { ...t, rows: [...t.rows, row] }
      }),
    }))
    setSel(name)
  }

  const deleteMember = () => {
    if (!selected) return
    const remaining = members.filter((m) => m !== selected)
    setDraft((d) => ({
      ...d,
      tables: d.tables.map((t) => {
        const tc = titleColIndex(t.headers)
        const idx = t.rows.findIndex((r) => cellOf(r[tc] ?? '').v === selected)
        if (idx < 0) return t
        return {
          ...t,
          rows: t.rows.filter((_, r) => r !== idx),
          rowMeta: t.rowMeta?.filter((_, r) => r !== idx),
        }
      }),
    }))
    setSel(remaining[0] ?? '')
  }

  const renameMember = (newName: string) => {
    setDraft((d) => ({
      ...d,
      tables: d.tables.map((t) => {
        const tc = titleColIndex(t.headers)
        return {
          ...t,
          rows: t.rows.map((r) =>
            cellOf(r[tc] ?? '').v === selected ? r.map((c, ci) => (ci === tc ? newName : c)) : r,
          ),
        }
      }),
    }))
    setSel(newName)
  }

  // ── 링크 ──
  const addLink = () => setDraft((d) => ({ ...d, links: [...d.links, { label: '', url: '' }] }))
  const setLink = (i: number, key: 'label' | 'url' | 'desc', value: string) =>
    setDraft((d) => ({ ...d, links: d.links.map((l, j) => (j === i ? { ...l, [key]: value } : l)) }))
  const removeLink = (i: number) =>
    setDraft((d) => ({ ...d, links: d.links.filter((_, j) => j !== i) }))

  // ── 이미지 ──
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

      <section className="guildBlock">
        <div className="guildBlockTitle guildMemberHead">
          <span>👤 길드원 편집</span>
          <span className="guildMemberCount">{members.length}명</span>
        </div>
        <p className="guildEditHint">길드원을 골라 그 사람의 진행 현황·마병만 입력하세요.</p>

        <div className="guildMemberBar">
          <select
            className="guildMemberSelect"
            value={selected}
            onChange={(e) => setSel(e.target.value)}
            aria-label="길드원 선택"
          >
            {members.map((m, i) => (
              <option key={i} value={m}>
                {m || '(이름 없음)'}
              </option>
            ))}
          </select>
          <button type="button" className="guildAddBtn" onClick={addMember}>
            + 길드원
          </button>
          <button type="button" className="guildRowDel" onClick={deleteMember} disabled={!selected}>
            삭제
          </button>
        </div>

        {members.length === 0 ? (
          <p className="guildEmpty">길드원이 없습니다. “+ 길드원”으로 추가하세요.</p>
        ) : (
          <>
            <label className="guildEditField guildNameField">
              <span className="guildEditFieldLabel">캐릭명</span>
              <input value={selected} onChange={(e) => renameMember(e.target.value)} aria-label="캐릭명" />
            </label>

            {draft.tables.map((table, ti) => {
              const ri = rowIndexOf(table, selected)
              if (ri < 0) return null
              const tc = titleColIndex(table.headers)
              return (
                <div className="guildMemberSection" key={ti}>
                  <h3 className="guildMemberSecTitle">{table.title || `표 ${ti + 1}`}</h3>
                  <div className={table.sumColumn ? 'guildEditMemberGrid soldiers' : 'guildEditMemberGrid'}>
                    {table.headers.map((h, ci) => {
                      if (ci === tc) return null
                      const icon = headerIcon?.(h)
                      const v = cellOf(table.rows[ri][ci] ?? '').v
                      return (
                        <label key={ci} className="guildEditField" title={icon ? h : undefined}>
                          <span className="guildEditFieldLabel">
                            {icon ? <img className="guildHeaderIcon sm" src={icon} alt={h} /> : h}
                          </span>
                          <input
                            value={v}
                            onChange={(e) => setCell(ti, ri, ci, e.target.value)}
                            inputMode={/구분/.test(h) ? undefined : 'numeric'}
                            aria-label={`${selected} ${h}`}
                          />
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </section>

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
