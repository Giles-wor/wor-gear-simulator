import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { GlobalNav } from './components/GlobalNav'
import { SiteCredit } from './components/SiteCredit'
import { decryptContent } from './crypto'
import type { EncryptedBlob, GuildCell, GuildContent } from './types'
import encryptedBlob from './data/content.encrypted.json'

const blob = encryptedBlob as EncryptedBlob
const SESSION_KEY = 'guildUnlockCode'

function cellOf(cell: GuildCell): { v: string; hi: boolean } {
  return typeof cell === 'string' ? { v: cell, hi: false } : { v: cell.v, hi: !!cell.hi }
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

function LockScreen({
  onSubmit,
  busy,
  error,
}: {
  onSubmit: (code: string) => void
  busy: boolean
  error: string
}) {
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

function ContentView({ content, onLock }: { content: GuildContent; onLock: () => void }) {
  const [shot, setShot] = useState<{ src: string; alt: string } | null>(null)
  const hasTables = content.tables.length > 0
  const hasImages = content.images.length > 0
  const hasLinks = content.links.length > 0

  return (
    <>
      <header className="guildHeader">
        <div className="guildHeaderTop">
          <h1>길드원 전용 🛡️</h1>
          <button type="button" className="guildLockOut" onClick={onLock}>
            잠그기
          </button>
        </div>
        <p className="guildUpdated">갱신일 {content.updatedAt}</p>
      </header>

      <section className="guildBlock">
        <h2 className="guildBlockTitle">📢 공지</h2>
        {content.notice.trim() ? (
          <p className="guildNotice">{content.notice}</p>
        ) : (
          <p className="guildEmpty">아직 등록된 공지가 없습니다.</p>
        )}
      </section>

      <section className="guildBlock">
        <h2 className="guildBlockTitle">📊 진행 현황</h2>
        {hasTables ? (
          content.tables.map((table, ti) => (
            <div key={ti} className="guildTableWrap">
              {table.title && <h3 className="guildTableTitle">{table.title}</h3>}
              <div className="guildTableScroll">
                <table className="guildTable">
                  <thead>
                    <tr>
                      {table.headers.map((h, hi) => (
                        <th key={hi}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => {
                          const { v, hi } = cellOf(cell)
                          return (
                            <td key={ci} className={hi ? 'guildCellHi' : undefined}>
                              {v}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {table.note && <p className="guildTableNote">{table.note}</p>}
            </div>
          ))
        ) : (
          <p className="guildEmpty">아직 등록된 표가 없습니다.</p>
        )}
      </section>

      <section className="guildBlock">
        <h2 className="guildBlockTitle">🖼️ 이미지</h2>
        {hasImages ? (
          <div className="guildImages">
            {content.images.map((im, ii) => (
              <figure key={ii} className="guildImageFig">
                <button
                  type="button"
                  className="guildImageThumb"
                  onClick={() => setShot({ src: im.src, alt: im.caption || `길드 이미지 ${ii + 1}` })}
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
        {hasLinks ? (
          <ul className="guildLinks">
            {content.links.map((lk, li) => (
              <li key={li}>
                <a href={lk.url} target="_blank" rel="noopener noreferrer">
                  {lk.label}
                </a>
                {lk.desc && <span className="guildLinkDesc"> — {lk.desc}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="guildEmpty">아직 등록된 링크가 없습니다.</p>
        )}
      </section>

      {shot && <ImageLightbox src={shot.src} alt={shot.alt} onClose={() => setShot(null)} />}
    </>
  )
}

export default function App() {
  const [content, setContent] = useState<GuildContent | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const tryUnlock = useCallback(async (code: string, silent: boolean) => {
    setBusy(true)
    setError('')
    try {
      const data = await decryptContent(code, blob)
      setContent(data)
      try {
        sessionStorage.setItem(SESSION_KEY, code)
      } catch {
        /* sessionStorage 불가 환경 무시 */
      }
    } catch {
      try {
        sessionStorage.removeItem(SESSION_KEY)
      } catch {
        /* noop */
      }
      if (!silent) setError('코드가 올바르지 않습니다. 다시 확인해 주세요.')
    } finally {
      setBusy(false)
    }
  }, [])

  // 같은 탭 세션에서 새로고침/페이지 이동 시 다시 입력하지 않도록.
  useEffect(() => {
    let saved: string | null = null
    try {
      saved = sessionStorage.getItem(SESSION_KEY)
    } catch {
      saved = null
    }
    if (saved) void tryUnlock(saved, true)
  }, [tryUnlock])

  const lock = useCallback(() => {
    setContent(null)
    setError('')
    try {
      sessionStorage.removeItem(SESSION_KEY)
    } catch {
      /* noop */
    }
  }, [])

  return (
    <div className="app guildApp">
      <SiteCredit />
      <GlobalNav active="guild" />
      {content ? (
        <ContentView content={content} onLock={lock} />
      ) : (
        <LockScreen onSubmit={(c) => void tryUnlock(c, false)} busy={busy} error={error} />
      )}
    </div>
  )
}
