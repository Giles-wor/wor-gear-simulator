// 관리자 전용: Supabase 에 저장된 길드(코드) 목록 보기 + 휴지통 삭제/복구.
// 원래 코드는 어디에도 저장되지 않아서(행 id = 코드의 SHA-256) 목록엔 해시·저장 시각·크기만 보임.
// 코드를 넣으면 그 코드의 행이 어느 것인지 표시해 줌. 관리자 비밀번호는 이 화면 상태에만 두고 저장하지 않음.
import { useState, type FormEvent } from 'react'
import { guildIdFromCode } from '../crypto'
import { adminDeleteGuild, adminListGuilds, adminRestoreGuild, LEGACY_ID, type AdminGuildRow } from '../supabase'

function fmtTime(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function fmtSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`
}

function shortId(id: string): string {
  return id === LEGACY_ID ? 'main' : `${id.slice(0, 10)}…`
}

export function AdminPanel({ currentId }: { currentId?: string }) {
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [rows, setRows] = useState<AdminGuildRow[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [probe, setProbe] = useState('')
  const [probeId, setProbeId] = useState('')

  const refresh = async (s = secret) => {
    setBusy(true)
    setErr('')
    try {
      setRows(await adminListGuilds(s))
      setAuthed(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '목록을 불러오지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const login = (e: FormEvent) => {
    e.preventDefault()
    if (secret) void refresh()
  }

  const findCode = async (e: FormEvent) => {
    e.preventDefault()
    setProbeId(probe.trim() ? await guildIdFromCode(probe.trim()) : '')
  }

  const del = async (r: AdminGuildRow) => {
    const warn = r.guildId === currentId ? '\n\n⚠️ 지금 입장해 있는 코드의 데이터입니다.' : ''
    if (!window.confirm(`${shortId(r.guildId)} (마지막 저장 ${fmtTime(r.savedAt)}) 을 휴지통으로 옮길까요?\n휴지통에서 다시 복구할 수 있습니다.${warn}`))
      return
    setBusy(true)
    setErr('')
    try {
      await adminDeleteGuild(secret, r.guildId)
      setMsg(`${shortId(r.guildId)} 을 휴지통으로 옮겼습니다.`)
      await refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : '삭제에 실패했습니다.')
      setBusy(false)
    }
  }

  const restore = async (r: AdminGuildRow) => {
    if (r.trashId == null) return
    setBusy(true)
    setErr('')
    try {
      await adminRestoreGuild(secret, r.trashId)
      setMsg(`${shortId(r.guildId)} 을 복구했습니다.`)
      await refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : '복구에 실패했습니다.')
      setBusy(false)
    }
  }

  if (!authed) {
    return (
      <form className="guildMigForm" onSubmit={login}>
        <p className="guildMigDesc">
          저장된 길드 코드 목록을 보고 지울 수 있는 관리자 화면입니다. 길드 코드가 아니라 <b>관리자 비밀번호</b>를
          입력하세요.
        </p>
        <input
          className="guildLockInput"
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="관리자 비밀번호"
          autoComplete="off"
          aria-label="관리자 비밀번호"
        />
        <button className="guildLockBtn" type="submit" disabled={busy || !secret}>
          {busy ? '확인 중…' : '목록 보기'}
        </button>
        {err && (
          <p className="guildLockError" role="alert">
            {err}
          </p>
        )}
      </form>
    )
  }

  const live = rows.filter((r) => r.trashId == null)
  const trash = rows.filter((r) => r.trashId != null)
  const tag = (r: AdminGuildRow) =>
    [
      r.guildId === currentId && '지금 코드',
      r.guildId === LEGACY_ID && '예전 단일길드',
      probeId && r.guildId === probeId && '입력한 코드',
    ].filter(Boolean) as string[]

  const table = (list: AdminGuildRow[], inTrash: boolean) => (
    <div className="guildAdminTableWrap">
      <table className="guildAdminTable">
        <thead>
          <tr>
            <th>식별자(해시)</th>
            <th>마지막 저장</th>
            {inTrash && <th>삭제한 때</th>}
            <th>크기</th>
            <th aria-label="작업" />
          </tr>
        </thead>
        <tbody>
          {list.map((r) => {
            const tags = tag(r)
            return (
              <tr key={inTrash ? `t${r.trashId}` : r.guildId} className={tags.length ? 'mark' : undefined}>
                <td>
                  <code title={r.guildId}>{shortId(r.guildId)}</code>
                  {tags.map((t) => (
                    <span key={t} className="guildAdminTag">
                      {t}
                    </span>
                  ))}
                </td>
                <td>{fmtTime(r.savedAt)}</td>
                {inTrash && <td>{fmtTime(r.deletedAt)}</td>}
                <td>{fmtSize(r.bytes)}</td>
                <td>
                  {inTrash ? (
                    <button type="button" className="guildAdminBtn" disabled={busy} onClick={() => void restore(r)}>
                      복구
                    </button>
                  ) : (
                    <button type="button" className="guildAdminBtn danger" disabled={busy} onClick={() => void del(r)}>
                      삭제
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="guildMigForm guildAdmin">
      <p className="guildMigDesc">
        원래 코드는 저장되지 않아 해시로만 보입니다. 코드를 입력하면 그 코드의 줄을 표시해 드려요.
      </p>
      <form className="guildLockForm" onSubmit={findCode}>
        <input
          className="guildLockInput"
          type="text"
          value={probe}
          onChange={(e) => setProbe(e.target.value)}
          placeholder="코드로 찾기"
          autoComplete="off"
          aria-label="코드로 찾기"
        />
        <button className="guildLockBtn" type="submit">
          찾기
        </button>
      </form>
      {probeId && !rows.some((r) => r.guildId === probeId) && (
        <p className="guildMigDesc">이 코드로 저장된 데이터는 없습니다.</p>
      )}

      <h3 className="guildAdminHead">
        저장된 길드 {live.length}개
        <button type="button" className="guildAdminBtn" disabled={busy} onClick={() => void refresh()}>
          새로고침
        </button>
      </h3>
      {live.length ? table(live, false) : <p className="guildMigDesc">없음</p>}

      <h3 className="guildAdminHead">휴지통 {trash.length}개</h3>
      {trash.length ? table(trash, true) : <p className="guildMigDesc">비어 있음</p>}
      <p className="guildMigDesc">휴지통을 완전히 비우는 건 Supabase SQL Editor 에서만 할 수 있어요.</p>

      {msg && <p className="guildMigDesc">✓ {msg}</p>}
      {err && (
        <p className="guildLockError" role="alert">
          {err}
        </p>
      )}
    </div>
  )
}
