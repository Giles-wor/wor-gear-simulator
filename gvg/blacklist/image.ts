// 블랙리스트를 브라우저 안에서 PNG 로 그린다. 서버로는 아무것도 보내지 않고,
// 운영진 코드로 연 사람이 직접 저장·공유할 때만 밖으로 나간다.
import type { BlacklistEntry } from './types'

const W = 1080
const PAD = 48
const FONT = `'Pretendard', 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif`

/** 폭 maxW 에 맞춰 글자 단위로 줄바꿈(한글은 띄어쓰기가 적어 글자 단위가 안전). */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = []
  for (const para of text.split('\n')) {
    let line = ''
    for (const ch of para) {
      if (ctx.measureText(line + ch).width > maxW && line) {
        out.push(line)
        line = ch.trimStart()
      } else {
        line += ch
      }
    }
    out.push(line)
  }
  return out
}

type Block = { kind: 'uid' | 'names' | 'reason' | 'meta'; lines: string[]; font: string; color: string; lh: number }

function blocksFor(ctx: CanvasRenderingContext2D, e: BlacklistEntry, maxW: number): Block[] {
  const blocks: Block[] = []
  const cur = e.names[0]?.name ?? '(닉네임 없음)'
  blocks.push({ kind: 'uid', lines: [`${e.uid}   ${cur}`], font: `700 34px ${FONT}`, color: '#f0a54a', lh: 46 })
  const past = e.names.slice(1)
  if (past.length) {
    ctx.font = `400 24px ${FONT}`
    const t = '이전 닉: ' + past.map((n) => `${n.name}${n.seenAt ? ` (${n.seenAt})` : ''}`).join(', ')
    blocks.push({ kind: 'names', lines: wrap(ctx, t, maxW), font: ctx.font, color: '#aeb7c4', lh: 34 })
  }
  ctx.font = `400 28px ${FONT}`
  blocks.push({ kind: 'reason', lines: wrap(ctx, e.reason, maxW), font: ctx.font, color: '#e6e9ef', lh: 40 })
  blocks.push({
    kind: 'meta',
    lines: [`${e.addedAt} ${e.addedBy} 추가${e.updatedAt ? ` · ${e.updatedAt} ${e.updatedBy ?? ''} 수정` : ''}`],
    font: `400 22px ${FONT}`,
    color: '#7d8796',
    lh: 32,
  })
  return blocks
}

/** 항목 목록을 PNG Blob 으로. */
export async function renderBlacklistPng(entries: BlacklistEntry[], title: string): Promise<Blob> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('이 브라우저에서는 이미지를 만들 수 없습니다.')
  const inner = W - PAD * 2 - 40

  const cards = entries.map((e) => {
    const blocks = blocksFor(ctx, e, inner)
    const h = blocks.reduce((s, b) => s + b.lines.length * b.lh, 0) + 40
    return { blocks, h }
  })
  const headH = 150
  const footH = 80
  const H = headH + cards.reduce((s, c) => s + c.h + 18, 0) + footH + (entries.length ? 0 : 80)

  canvas.width = W
  canvas.height = H
  ctx.fillStyle = '#0f131b'
  ctx.fillRect(0, 0, W, H)
  ctx.textBaseline = 'top'

  ctx.fillStyle = '#e6e9ef'
  ctx.font = `800 44px ${FONT}`
  ctx.fillText(title, PAD, PAD)
  ctx.fillStyle = '#ff9b9b'
  ctx.font = `600 24px ${FONT}`
  ctx.fillText(`운영진 전용 · 외부 공유 금지 · ${entries.length}명`, PAD, PAD + 60)

  let y = headH
  if (!entries.length) {
    ctx.fillStyle = '#8b94a3'
    ctx.font = `400 28px ${FONT}`
    ctx.fillText('항목이 없습니다.', PAD, y)
  }
  for (const c of cards) {
    ctx.fillStyle = '#151b26'
    ctx.strokeStyle = '#2a3344'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(PAD, y, W - PAD * 2, c.h, 14)
    ctx.fill()
    ctx.stroke()
    let ty = y + 20
    for (const b of c.blocks) {
      ctx.font = b.font
      ctx.fillStyle = b.color
      for (const line of b.lines) {
        ctx.fillText(line, PAD + 20, ty)
        ty += b.lh
      }
    }
    y += c.h + 18
  }

  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  ctx.fillStyle = '#5f6876'
  ctx.font = `400 20px ${FONT}`
  ctx.fillText(
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())} 기준`,
    PAD,
    H - footH + 24,
  )

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('이미지 생성 실패'))), 'image/png'),
  )
}

/** 폰이면 공유 시트(카톡 등)로, 아니면 파일로 내려받기. */
export async function shareOrDownload(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare?.({ files: [file] }) && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
    try {
      await nav.share({ files: [file] })
      return
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
