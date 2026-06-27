import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { GlobalNav } from './components/GlobalNav'
import { SiteCredit } from './components/SiteCredit'
import { ResponsiveTable } from './components/ResponsiveTable'
import { ContentEditor } from './components/ContentEditor'
import { decryptContent, encryptContent } from './crypto'
import { ensureSoldierTable } from './soldiers'
import { loadRemoteBlob, saveRemoteBlob, supabaseEnabled } from './supabase'
import type { EncryptedBlob, GuildContent } from './types'
import bundledBlob from './data/content.encrypted.json'

const SEED = bundledBlob as EncryptedBlob
const UNLOCK_KEY = 'guildUnlock'
const UNLOCK_TTL = 24 * 60 * 60 * 1000 // 잠금 해제 유효기간: 1일(이후 코드 재입력)
const LOCAL_BLOB = 'guildContentBlob'

function readUnlock(): { code: string; ts: number } | null {
  try {
    const raw = localStorage.getItem(UNLOCK_KEY)
    const o = raw ? JSON.parse(raw) : null
    return o && typeof o.code === 'string' && typeof o.ts === 'number' ? o : null
  } catch {
    return null
  }
}

function writeUnlock(code: string, ts: number) {
  try {
    localStorage.setItem(UNLOCK_KEY, JSON.stringify({ code, ts }))
  } catch {
    /* noop */
  }
}

function clearUnlock() {
  try {
    localStorage.removeItem(UNLOCK_KEY)
  } catch {
    /* noop */
  }
}

function readLocalBlob(): EncryptedBlob | null {
  try {
    const raw = localStorage.getItem(LOCAL_BLOB)
    return raw ? (JSON.parse(raw) as EncryptedBlob) : null
  } catch {
    return null
  }
}

function writeLocalBlob(blob: EncryptedBlob) {
  try {
    localStorage.setItem(LOCAL_BLOB, JSON.stringify(blob))
  } catch {
    /* noop */
  }
}

/** 우선순위(원격 → 로컬 → 번들) 블록들을 코드로 차례로 복호화, 처음 성공한 콘텐츠 반환. */
async function loadContent(code: string): Promise<GuildContent> {
  const candidates: EncryptedBlob[] = []
  if (supabaseEnabled()) {
    try {
      const remote = await loadRemoteBlob()
      if (remote) candidates.push(remote)
    } catch {
      /* 네트워크 실패 시 로컬/번들로 폴백 */
    }
  }
  const local = readLocalBlob()
  if (local) candidates.push(local)
  candidates.push(SEED)

  let lastErr: unknown = null
  for (const blob of candidates) {
    try {
      return ensureSoldierTable(await decryptContent(code, blob))
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr ?? new Error('복호화 실패')
}

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])
  return (
    <div className="leakOverlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="leakOverlayBox" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="leakOverlayClose" onClick={onClose} aria-label="닫기">
          ✕
        </button>
        <img className="leakOverlayImg" src={src} alt={alt} />
      </div>
    </div>
  )
}

function LockScreen({ onSubmit, busy, error }: { onSubmit: (code: string) => void; busy: boolean; error: string }) {
  const [code, setCode] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (code.trim()) onSubmit(code.trim())
  }
  return (
    <div className="guildLock">
      <div className="guildLockBox">
        <div className="guildLockIcon" aria-hidden="true">
          🔒
        </div>
        <h1 className="guildLockTitle">길드원 전용</h1>
        <p className="guildLockDesc">
          이 페이지는 <strong>Time 길드</strong> 길드원만 볼 수 있습니다. 길드에서 받은 코드를 입력하세요.
        </p>
        <form className="guildLockForm" onSubmit={submit}>
          <input
            className="guildLockInput"
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="잠금 코드"
            autoComplete="off"
            autoFocus
            aria-label="잠금 코드"
          />
          <button className="guildLockBtn" type="submit" disabled={busy || !code.trim()}>
            {busy ? '확인 중…' : '입장'}
          </button>
        </form>
        {error && (
          <p className="guildLockError" role="alert">
            {error}
          </p>
        )}
        <p className="guildLockHint">코드는 길드 카카오톡에서 안내받을 수 있어요.</p>
      </div>
    </div>
  )
}

function ReadView({ content, onShot }: { content: GuildContent; onShot: (src: string, alt: string) => void }) {
  return (
    <>
      <section className="guildBlock">
        <h2 className="guildBlockTitle">📢 공지</h2>
        {content.notice.trim() ? (
          <p className="guildNotice">{content.notice}</p>
        ) : (
          <p className="guildEmpty">아직 등록된 공지가 없습니다.</p>
        )}
      </section>

      {content.tables.length > 0 ? (
        content.tables.map((table, ti) => (
          <section className="guildBlock guildTableBlock" key={ti}>
            <h2 className="guildBlockTitle">📊 {table.title || '진행 현황'}</h2>
            <ResponsiveTable table={table} fallbackDate={content.updatedAt} />
            {table.note && <p className="guildTableNote">{table.note}</p>}
          </section>
        ))
      ) : (
        <section className="guildBlock">
          <h2 className="guildBlockTitle">📊 진행 현황</h2>
          <p className="guildEmpty">아직 등록된 표가 없습니다.</p>
        </section>
      )}

      <section className="guildBlock">
        <h2 className="guildBlockTitle">🖼️ 이미지</h2>
        {content.images.length > 0 ? (
          <div className="guildImages">
            {content.images.map((im, ii) => (
              <figure key={ii} className="guildImageFig">
                <button
                  type="button"
                  className="guildImageThumb"
                  onClick={() => onShot(im.src, im.caption || `길드 이미지 ${ii + 1}`)}
                >
                  <img src={im.src} alt={im.caption || `길드 이미지 ${ii + 1}`} loading="lazy" />
                  <span className="leakShotHint">🔍 크게 보기</span>
                </button>
                {im.caption && <figcaption className="guildImageCap">{im.caption}</figcaption>}
              </figure>
            ))}
          </div>
        ) : (
          <p className="guildEmpty">아직 등록된 이미지가 없습니다.</p>
        )}
      </section>

      <section className="guildBlock">
        <h2 className="guildBlockTitle">🔗 링크 모음</h2>
        {content.links.length > 0 ? (
          <ul className="guildLinks">
            {content.links.map((lk, li) => (
              <li key={li}>
                <a href={lk.url} target="_blank" rel="noopener noreferrer">
                  {lk.label || lk.url}
                </a>
                {lk.desc && <span className="guildLinkDesc"> — {lk.desc}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="guildEmpty">아직 등록된 링크가 없습니다.</p>
        )}
      </section>
    </>
  )
}

export default function App() {
  const [content, setContent] = useState<GuildContent | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [status, setStatus] = useState('')
  const [shot, setShot] = useState<{ src: string; alt: string } | null>(null)
  const statusTimer = useRef<number | undefined>(undefined)
  const lockTimer = useRef<number | undefined>(undefined)

  const flashStatus = useCallback((msg: string) => {
    setStatus(msg)
    window.clearTimeout(statusTimer.current)
    statusTimer.current = window.setTimeout(() => setStatus(''), 4000)
  }, [])

  const lock = useCallback(() => {
    window.clearTimeout(lockTimer.current)
    setContent(null)
    setCode('')
    setEditing(false)
    setError('')
    clearUnlock()
  }, [])

  // ts = 잠금 해제 기준 시각(수동 입력=지금, 자동복원=저장된 시각). ts+1일에 자동 잠금.
  const tryUnlock = useCallback(
    async (c: string, ts: number, silent: boolean) => {
      setBusy(true)
      setError('')
      try {
        const data = await loadContent(c)
        setContent(data)
        setCode(c)
        writeUnlock(c, ts)
        window.clearTimeout(lockTimer.current)
        lockTimer.current = window.setTimeout(lock, Math.max(0, ts + UNLOCK_TTL - Date.now()))
      } catch {
        clearUnlock()
        if (!silent) setError('코드가 올바르지 않습니다. 다시 확인해 주세요.')
      } finally {
        setBusy(false)
      }
    },
    [lock],
  )

  // 1일 이내 해제 기록이 있으면 자동 입장, 아니면 코드 재입력.
  useEffect(() => {
    const u = readUnlock()
    if (u && Date.now() - u.ts < UNLOCK_TTL) void tryUnlock(u.code, u.ts, true)
    else clearUnlock()
  }, [tryUnlock])

  const handleSave = useCallback(
    async (next: GuildContent) => {
      setSaving(true)
      setSaveError('')
      try {
        const blob = await encryptContent(code, next)
        if (supabaseEnabled()) await saveRemoteBlob(blob, code)
        writeLocalBlob(blob)
        setContent(next)
        setEditing(false)
        flashStatus(supabaseEnabled() ? '저장됨 · 전 길드원에게 반영됩니다' : '이 브라우저에 저장됨')
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : '저장에 실패했습니다.')
      } finally {
        setSaving(false)
      }
    },
    [code, flashStatus],
  )

  return (
    <div className="app guildApp">
      <SiteCredit />
      <GlobalNav active="guild" />

      {!content ? (
        <LockScreen onSubmit={(c) => void tryUnlock(c, Date.now(), false)} busy={busy} error={error} />
      ) : (
        <>
          <header className="guildHeader">
            <div className="guildHeaderTop">
              <h1>길드원 전용 🛡️</h1>
              <div className="guildHeaderBtns">
                {!editing && (
                  <button type="button" className="guildEditOpen" onClick={() => setEditing(true)}>
                    ✏️ 편집
                  </button>
                )}
                <button type="button" className="guildLockOut" onClick={lock}>
                  잠그기
                </button>
              </div>
            </div>
            <p className="guildUpdated">
              갱신일 {content.updatedAt}
              <span className="guildSyncTag">
                {supabaseEnabled() ? '· 공동편집 켜짐' : '· 로컬 저장(공동편집 꺼짐)'}
              </span>
            </p>
          </header>

          {status && <div className="guildToast">{status}</div>}

          {editing ? (
            <ContentEditor
              initial={content}
              onSave={handleSave}
              onCancel={() => {
                setEditing(false)
                setSaveError('')
              }}
              busy={saving}
              error={saveError}
              canPublish={supabaseEnabled()}
            />
          ) : (
            <ReadView content={content} onShot={(src, alt) => setShot({ src, alt })} />
          )}
        </>
      )}

      {shot && <ImageLightbox src={shot.src} alt={shot.alt} onClose={() => setShot(null)} />}
    </div>
  )
}
