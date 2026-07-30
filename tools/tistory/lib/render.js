/**
 * 티스토리 초안 마크다운 → 티스토리 에디터에 붙여넣을 HTML.
 *
 * 범용 마크다운 렌더러가 아니다. 초안에서 실제로 쓰는 문법만 지원한다.
 *  소제목(## ~ ####) / 문단 / 목록 / 순서목록 / 인용 / 표 / 이미지 / 링크 / 강조
 *
 * 광고 코드는 넣지 않는다. 자연스러운 위치에 HTML 주석 마커만 남긴다.
 */

import { AD_SLOTS } from './rules.js'
import { parseDraft } from './qa.js'

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** 인라인 문법. 반드시 escapeHtml 이후에 적용한다. */
function inline(text) {
  return escapeHtml(text)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, '') // 인라인 이미지는 블록으로 따로 처리
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

const IMAGE_LINE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/
const HEADING_LINE = /^(#{2,4})\s+(.*)$/
const LIST_LINE = /^\s*[-*]\s+(.*)$/
const ORDERED_LINE = /^\s*\d+[.)]\s+(.*)$/
const QUOTE_LINE = /^\s*>\s?(.*)$/
const TABLE_LINE = /^\s*\|(.+)\|\s*$/
const TABLE_DIVIDER = /^\s*\|[\s:|-]+\|\s*$/

/** 초안 본문을 블록 배열로 쪼갠다. */
export function toBlocks(body) {
  const lines = String(body || '').split(/\r?\n/)
  const blocks = []
  let i = 0

  const flushParagraph = (buf) => {
    const text = buf.join(' ').trim()
    if (text) blocks.push({ type: 'para', text })
  }

  let paraBuf = []

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) {
      flushParagraph(paraBuf)
      paraBuf = []
      i += 1
      continue
    }

    const heading = HEADING_LINE.exec(line)
    if (heading) {
      flushParagraph(paraBuf)
      paraBuf = []
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2].trim() })
      i += 1
      continue
    }

    const image = IMAGE_LINE.exec(line)
    if (image) {
      flushParagraph(paraBuf)
      paraBuf = []
      blocks.push({ type: 'image', alt: image[1], src: image[2], caption: image[3] || '' })
      i += 1
      continue
    }

    if (TABLE_LINE.test(line)) {
      flushParagraph(paraBuf)
      paraBuf = []
      const rows = []
      while (i < lines.length && TABLE_LINE.test(lines[i])) {
        if (!TABLE_DIVIDER.test(lines[i])) {
          rows.push(
            TABLE_LINE.exec(lines[i])[1]
              .split('|')
              .map((c) => c.trim())
          )
        }
        i += 1
      }
      if (rows.length) blocks.push({ type: 'table', rows })
      continue
    }

    if (QUOTE_LINE.test(line)) {
      flushParagraph(paraBuf)
      paraBuf = []
      const quoted = []
      while (i < lines.length && QUOTE_LINE.test(lines[i])) {
        quoted.push(QUOTE_LINE.exec(lines[i])[1])
        i += 1
      }
      blocks.push({ type: 'quote', text: quoted.join(' ').trim() })
      continue
    }

    const isOrdered = ORDERED_LINE.test(line)
    if (isOrdered || LIST_LINE.test(line)) {
      flushParagraph(paraBuf)
      paraBuf = []
      const items = []
      const re = isOrdered ? ORDERED_LINE : LIST_LINE
      while (i < lines.length && re.test(lines[i])) {
        items.push(re.exec(lines[i])[1].trim())
        i += 1
      }
      blocks.push({ type: 'list', ordered: isOrdered, items })
      continue
    }

    paraBuf.push(line.trim())
    i += 1
  }

  flushParagraph(paraBuf)
  return blocks
}

/**
 * 광고 마커를 넣을 블록 인덱스를 고른다.
 * 문단 중간을 자르지 않도록 항상 소제목 앞에 붙인다.
 */
function adInsertIndices(blocks) {
  const headingIdx = blocks.map((b, idx) => (b.type === 'heading' ? idx : -1)).filter((idx) => idx >= 0)
  const positions = new Map()

  for (const slot of AD_SLOTS) {
    let target = -1

    if (slot.after === 'MIDPOINT') {
      const middle = blocks.length / 2
      target = headingIdx.reduce(
        (best, idx) => (best < 0 || Math.abs(idx - middle) < Math.abs(best - middle) ? idx : best),
        -1
      )
    } else if (slot.after === 'BEFORE_FAQ') {
      target = blocks.findIndex((b) => b.type === 'heading' && /^FAQ\b/i.test(b.text))
    } else {
      // 지정 섹션 바로 다음 소제목 앞
      const start = blocks.findIndex((b) => b.type === 'heading' && b.text.includes('핵심 정보'))
      if (start >= 0) target = headingIdx.find((idx) => idx > start) ?? -1
    }

    // 이미 다른 광고가 차지한 자리거나 못 찾았으면 건너뛴다.
    if (target >= 0 && !positions.has(target)) positions.set(target, slot)
  }

  return positions
}

/** 블록 하나를 HTML로. */
function renderBlock(block) {
  switch (block.type) {
    case 'heading':
      return `<h${block.level}>${inline(block.text)}</h${block.level}>`

    case 'para':
      return `<p>${inline(block.text)}</p>`

    case 'quote':
      return `<blockquote><p>${inline(block.text)}</p></blockquote>`

    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul'
      const items = block.items.map((it) => `  <li>${inline(it)}</li>`).join('\n')
      return `<${tag}>\n${items}\n</${tag}>`
    }

    case 'table': {
      const [head, ...rest] = block.rows
      const th = head.map((c) => `      <th>${inline(c)}</th>`).join('\n')
      const bodyRows = rest
        .map((row) => `    <tr>\n${row.map((c) => `      <td>${inline(c)}</td>`).join('\n')}\n    </tr>`)
        .join('\n')
      return [
        '<table>',
        '  <thead>',
        '    <tr>',
        th,
        '    </tr>',
        '  </thead>',
        ...(bodyRows ? ['  <tbody>', bodyRows, '  </tbody>'] : []),
        '</table>',
      ].join('\n')
    }

    case 'image': {
      const alt = escapeHtml(block.alt || '')
      const src = escapeHtml(block.src)
      const caption = block.caption
        ? `\n  <figcaption>${inline(block.caption)}</figcaption>`
        : ''
      return `<figure>\n  <img src="${src}" alt="${alt}" loading="lazy" />${caption}\n</figure>`
    }

    default:
      return ''
  }
}

/**
 * 초안 마크다운 전체를 티스토리용 HTML로 변환한다.
 * @returns {{ html: string, meta: object, imagePlan: Array, adSlots: Array }}
 */
export function renderTistoryHtml(draft) {
  const parsed = parseDraft(draft)
  const blocks = toBlocks(parsed.body)
  const adPositions = adInsertIndices(blocks)

  const out = []
  const usedAdSlots = []

  blocks.forEach((block, idx) => {
    const slot = adPositions.get(idx)
    if (slot) {
      out.push(`<!-- [광고 위치 추천 ${slot.n}: ${slot.label}] -->`)
      usedAdSlots.push(slot)
    }
    const html = renderBlock(block)
    if (html) out.push(html)
  })

  // FAQ가 없어 3번 자리를 못 잡았으면 최종 정리 앞에 넣는다.
  if (!usedAdSlots.some((s) => s.n === 3)) {
    const closingIdx = out.findIndex((chunk) => /^<h[234]>.*최종 정리/.test(chunk))
    if (closingIdx > 0) {
      const slot = AD_SLOTS.find((s) => s.n === 3)
      out.splice(closingIdx, 0, `<!-- [광고 위치 추천 3: ${slot.label} (FAQ 없어 최종 정리 앞)] -->`)
      usedAdSlots.push(slot)
    }
  }

  const imagePlan = parsed.images.map((img, idx) => ({
    order: idx + 1,
    src: img.src,
    alt: img.alt,
    isHero: parsed.data.hero_image ? img.src === parsed.data.hero_image : idx === 0,
  }))

  return {
    html: out.join('\n\n'),
    meta: parsed.data,
    imagePlan,
    adSlots: usedAdSlots.sort((a, b) => a.n - b.n),
    parsed,
  }
}
