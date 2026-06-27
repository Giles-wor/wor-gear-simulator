import { useState, type ChangeEvent } from 'react'
import type { GuildContent, GuildTable } from '../types'
import { cellOf } from './ResponsiveTable'

type Props = {
  initial: GuildContent
  onSave: (next: GuildContent) => void
  onCancel: () => void
  busy: boolean
  error: string
  canPublish: boolean
}

export function ContentEditor({ initial, onSave, onCancel, busy, error, canPublish }: Props) {
  const [draft, setDraft] = useState<GuildContent>(() => structuredClone(initial))

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

  const toggleHi = (ti: number, ri: number, ci: number) =>
    updateTable(ti, (t) => ({
      ...t,
      rows: t.rows.map((row, r) =>
        r !== ri
          ? row
          : row.map((cell, c) => {
              if (c !== ci) return cell
              const prev = cellOf(cell)
              return prev.hi ? prev.v : { v: prev.v, hi: true }
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
    onSave({ ...draft, updatedAt: today })
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

      {draft.tables.map((table, ti) => (
        <section className="guildBlock" key={ti}>
          <h2 className="guildBlockTitle">📊 {table.title || `표 ${ti + 1}`}</h2>
          <p className="guildEditHint">
            칸을 눌러 값을 입력하세요. 칸의 <b>●</b>를 누르면 주황 강조 ON/OFF. 미달/주의 표시에 쓰세요.
          </p>
          <div className="guildTableScroll">
            <table className="guildTable guildEditTable">
              <thead>
                <tr>
                  <th aria-label="행 삭제" />
                  {table.headers.map((h, hi) => (
                    <th key={hi}>{h}</th>
                  ))}
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
                      const { v, hi } = cellOf(cell)
                      return (
                        <td key={ci} className={hi ? 'guildEditCell hi' : 'guildEditCell'}>
                          <input
                            value={v}
                            onChange={(e) => setCell(ti, ri, ci, e.target.value)}
                            aria-label={`${table.headers[ci]} ${ri + 1}행`}
                          />
                          <button
                            type="button"
                            className="guildHiToggle"
                            onClick={() => toggleHi(ti, ri, ci)}
                            aria-label="강조 토글"
                            title="강조(주황) 토글"
                          >
                            ●
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="guildAddBtn" onClick={() => addRow(ti)}>
            + 행(길드원) 추가
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
