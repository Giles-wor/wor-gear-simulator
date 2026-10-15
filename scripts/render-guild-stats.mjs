// 카톡 방장봇용 길드 집계 이미지 생성 (마병 레벨 / 방어덱 영웅 각성).
//
// Supabase 의 길드 암호문을 GUILD_CODE 로 복호화 → 표 HTML 을 그려 PNG 로 캡처 →
//   dist/stats/<토큰>/soldiers.png, heroes.png (+ -og.png 썸네일), soldiers.html, heroes.html, index.html
// 토큰 = sha256(`${GUILD_CODE}:${GUILD_STATS_SALT}`) 앞 32자.
//   - 접속코드가 리포(README)에 공개돼 있어도 salt(Secret) 없이는 주소를 못 만듦
//   - 접속코드를 바꾸면(= GUILD_CODE Secret 갱신) 주소도 바뀌어 옛 링크는 죽음
// 이미지는 배포 산출물(dist)에만 들어가고 커밋하지 않음. 로그에도 토큰/주소를 찍지 않음.
//
// 사용법 (deploy.yml 에서 빌드 후 실행):
//   GUILD_CODE=... GUILD_STATS_SALT=... node scripts/render-guild-stats.mjs
// 로컬에서 주소 확인: 위 명령에 --print-url (CI 로그에는 쓰지 말 것)
// Secret 이 없거나 복호화에 실패하면 경고만 남기고 종료(사이트 배포는 계속).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, extname } from 'node:path'
import { createHash } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const GUILD = resolve(ROOT, 'guild')
const OUT_ROOT = resolve(ROOT, process.env.STATS_OUT || 'dist/stats')
const SITE = 'https://giles-wor.github.io/wor-gear-simulator'
const SOLDIER_TABLE_TITLE = '마병 레벨'
const DEFENSE_TABLE_TITLE = '길드전 방어덱 각성'
const LEGACY_ID = 'main'

const code = process.env.GUILD_CODE?.trim()
const salt = process.env.GUILD_STATS_SALT?.trim()
if (!code || !salt) {
  console.log('::notice::GUILD_CODE / GUILD_STATS_SALT Secret 이 없어 길드 집계 이미지를 건너뜁니다.')
  process.exit(0)
}

const sha256 = (s) => createHash('sha256').update(s).digest('hex')
// v2: v1 주소가 공개 배포 로그(업로드 파일 목록)에 노출돼 교체함. 로그 노출은 deploy.yml 에서 막음.
const token = sha256(`${code}:${salt}:v2`).slice(0, 32)

// ── 데이터 로드 (앱과 같은 순서: 코드 행 → 레거시 'main' 행 → 번들 기본값) ──
const cfgSrc = readFileSync(resolve(GUILD, 'supabase.config.ts'), 'utf8')
const sbUrl = cfgSrc.match(/url:\s*'([^']*)'/)?.[1]
const sbKey = cfgSrc.match(/anonKey:\s*'([^']*)'/)?.[1]

async function loadRemoteBlob(id) {
  if (!sbUrl || !sbKey) return null
  const res = await fetch(`${sbUrl}/rest/v1/guild_content?id=eq.${encodeURIComponent(id)}&select=blob`, {
    headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
  })
  if (!res.ok) throw new Error(`Supabase 불러오기 실패 (${res.status})`)
  const rows = await res.json()
  return rows[0]?.blob ?? null
}

const b64 = (s) => Buffer.from(s, 'base64')
async function decrypt(blob) {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: b64(blob.salt), iterations: blob.iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  )
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(blob.iv) }, key, b64(blob.ct))
  return JSON.parse(new TextDecoder().decode(plain))
}

async function loadContent() {
  const candidates = [
    () => loadRemoteBlob(sha256(code)),
    () => loadRemoteBlob(LEGACY_ID),
    () => JSON.parse(readFileSync(resolve(GUILD, 'data/content.encrypted.json'), 'utf8')),
  ]
  for (const get of candidates) {
    const blob = await get()
    if (!blob) continue
    try {
      return await decrypt(blob)
    } catch {
      // 코드가 다르면 다음 후보로
    }
  }
  return null
}

let content
try {
  content = await loadContent()
} catch (e) {
  console.log(`::warning::길드 데이터 로드 실패로 집계 이미지를 건너뜁니다: ${e.message}`)
  process.exit(0)
}
if (!content) {
  console.log('::warning::길드 데이터를 복호화하지 못해 집계 이미지를 건너뜁니다 (GUILD_CODE 확인).')
  process.exit(0)
}

// ── 표 → 멤버별 값 ──
const cellOf = (c) => (typeof c === 'string' ? c : (c?.v ?? ''))
const titleColIndex = (headers) => Math.max(0, headers.findIndex((h) => /캐릭명|이름|닉/.test(h)))
function memberValues(table) {
  const map = new Map()
  if (!table) return map
  const tc = titleColIndex(table.headers)
  for (const r of table.rows) {
    const vals = {}
    table.headers.forEach((h, ci) => {
      if (ci !== tc) vals[h] = cellOf(r[ci] ?? '').trim()
    })
    map.set(cellOf(r[tc] ?? '').trim(), vals)
  }
  return map
}
const main = content.tables?.[0]
const members = main ? main.rows.map((r) => cellOf(r[titleColIndex(main.headers)] ?? '').trim()).filter(Boolean) : []
const levels = memberValues(content.tables.find((t) => t.title === SOLDIER_TABLE_TITLE))
const awakens = memberValues(content.tables.find((t) => t.title === DEFENSE_TABLE_TITLE))

// 길전 투력(진행 현황 표의 '길전 투력1~3', 옛 헤더 '전투력 최고/최저'). 셀 v = 영주 산식 적용 최종값.
const POWER_HEADERS = ['길전 투력1', '길전 투력2', '길전 투력3']
const OLD_POWER = { '길전 투력1': '전투력 최고', '길전 투력2': '전투력 최저' }
const parseNum = (v) => {
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''))
  return String(v ?? '').trim() && Number.isFinite(n) ? n : null
}
const power = (() => {
  const map = new Map()
  if (!main) return map
  const tc = titleColIndex(main.headers)
  const col = (h) => {
    const i = main.headers.indexOf(h)
    return i >= 0 ? i : main.headers.indexOf(OLD_POWER[h] ?? '')
  }
  for (const r of main.rows) {
    const name = cellOf(r[tc] ?? '').trim()
    if (!name) continue
    map.set(
      name,
      POWER_HEADERS.map((h) => {
        const i = col(h)
        const cell = i >= 0 ? r[i] : ''
        const n = parseNum(cellOf(cell ?? ''))
        if (n === null) return null
        const lord = typeof cell === 'object' && cell?.lord
        return { n, lord: !!lord, awaken: typeof cell === 'object' ? (cell?.awaken ?? 0) : 0 }
      }),
    )
  }
  return map
})()

// ── 아이콘 (guild/soldiers.ts, defenseHeroes.ts 와 같은 슬러그 규칙) ──
const soldierKey = (n) => n.toLowerCase().replace(/[()]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const heroKey = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const MIME = { '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' }
function iconData(dir, key) {
  const full = resolve(GUILD, 'assets', dir)
  if (!existsSync(full)) return ''
  const f = readdirSync(full).find((x) => x.toLowerCase().startsWith(`${key}.`))
  if (!f) return ''
  const mime = MIME[extname(f).toLowerCase()] ?? 'image/png'
  return `data:${mime};base64,${readFileSync(resolve(full, f)).toString('base64')}`
}
const soldiers = JSON.parse(readFileSync(resolve(GUILD, 'soldiers.json'), 'utf8')).map((n) => ({
  key: n,
  label: '',
  alt: n.slice(0, 3),
  icon: iconData('soldiers', soldierKey(n)),
}))
const heroes = JSON.parse(readFileSync(resolve(GUILD, 'defenseHeroes.json'), 'utf8')).map((h) => ({
  key: h.name,
  label: h.nick,
  alt: h.nick,
  icon: iconData('heroes', heroKey(h.name)),
}))

// 마병: 1 이상 = 보유. 영웅: 0~5 = 보유(0 = 노각), 그 외 = 미보유.
const soldierLv = (v) => (/^\d+$/.test(v ?? '') && Number(v) > 0 ? Number(v) : null)
const heroLv = (v) => (/^[0-5]$/.test(v ?? '') ? Number(v) : null)

// ── HTML ──
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const now = new Date()
const stamp = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}).format(now)

const CSS = `body{margin:0;background:#14161c;font-family:'Noto Sans CJK KR','Noto Sans KR','WenQuanYi Zen Hei',sans-serif;color:#e8e8ea}
.wrap{padding:16px;display:inline-block}
h1{font-size:20px;margin:0 0 4px}.sub{font-size:12px;color:#9a9ca5;margin-bottom:10px}
table{border-collapse:collapse}th,td{border:1px solid #2a2d36;text-align:center;padding:0}
th{background:#1d2028;padding:3px;font-size:10px;font-weight:normal;color:#bfc3cc}
th img{width:40px;height:40px;display:block;border-radius:6px;margin:0 auto}
th .ab{display:block;width:40px;height:40px;line-height:40px;font-size:11px;margin:0 auto}
td{width:46px;height:26px;font-size:15px;font-weight:bold}
td.nm{width:96px;max-width:120px;text-align:left;padding:0 8px;font-weight:normal;font-size:14px;background:#1a1c23;white-space:nowrap;overflow:hidden}
tr:nth-child(even) td.nm{background:#20232b}
td.lx{color:#444}td.l0{color:#8a8d96}td.l1{color:#bfc3cc}td.l2{color:#7fd38a}td.l3{background:#2b3f63;color:#9cc8ff}
td.l4{background:#4a2f63;color:#e0b0ff}td.l5{background:#6b4a14;color:#ffd27a}td.lh{background:#6b4a14;color:#ffd27a}
td.sum{color:#ffd27a;width:44px}
tr.stat td{background:#1d2028;color:#ffd27a;font-size:13px;height:30px;border-top:2px solid #555}
tr.stat td.nm{color:#e8e8ea;font-weight:bold}
.who{margin-top:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:6px 14px;font-size:13px}
.who div{display:flex;gap:8px;align-items:flex-start;background:#1a1c23;border-radius:6px;padding:5px 8px}
.who img{width:30px;height:30px;border-radius:5px;flex:none}.who b{color:#ffd27a}
.who .none{color:#666}.who .t5{color:#ffd27a}.who .t4{color:#e0b0ff}.who .t3{color:#9cc8ff}.who .t2{color:#7fd38a}`

function renderHtml({ title, legend, cols, values, toLv, unit, withSum }) {
  const data = members.map((m) => cols.map((c) => toLv(values.get(m)?.[c.key])))
  const iconCell = (c, cls = '') => (c.icon ? `<img${cls} src="${c.icon}">` : `<span class="ab">${esc(c.alt)}</span>`)
  const head = cols.map((c) => `<th>${iconCell(c)}${esc(c.label)}</th>`).join('')
  let rows = ''
  members.forEach((m, k) => {
    const cells = data[k].map((v) => `<td class="${v === null ? 'lx' : v > 5 ? 'lh' : `l${v}`}">${v === null ? '·' : v}</td>`).join('')
    const sum = withSum ? `<td class="sum">${data[k].reduce((a, v) => a + (v ?? 0), 0)}</td>` : ''
    rows += `<tr><td class="nm">${esc(m)}</td>${cells}${sum}</tr>`
  })
  const owners = (i) => members.map((m, k) => [m, data[k][i]]).filter(([, v]) => v !== null)
  rows += `<tr class="stat"><td class="nm">보유 ${members.length}명 중</td>${cols
    .map((_, i) => `<td>${owners(i).length}</td>`)
    .join('')}${withSum ? '<td></td>' : ''}</tr>`
  const cards = cols
    .map((c, i) => {
      const o = owners(i)
      const lvs = [...new Set(o.map(([, v]) => v))].sort((a, b) => b - a)
      const lines = lvs.map((lv) => {
        const names = o.filter(([, v]) => v === lv).map(([m]) => esc(m))
        return `<span class="t${Math.min(lv, 5)}">${unit}${lv}</span> ${names.join(', ')}`
      })
      const icon = c.icon ? `<img src="${c.icon}">` : ''
      const name = esc(c.label || c.key)
      return `<div>${icon}<span><b>${o.length}/${members.length}</b> ${name}<br>${lines.join('<br>') || '<span class="none">보유자 없음</span>'}</span></div>`
    })
    .join('')
  return `<!doctype html><meta charset="utf-8"><style>${CSS}</style><div class="wrap"><h1>${esc(title)}</h1><div class="sub">${esc(stamp)} 기준 · ${esc(legend)}</div><table><tr><th>캐릭명</th>${head}${withSum ? '<th>계</th>' : ''}</tr>${rows}</table><div class="who">${cards}</div></div>`
}

// 카톡 미리보기 카드(2:1)용 요약: 아이콘별 보유 인원 / 고레벨(3 이상) 인원.
function renderOg({ title, cols, values, toLv, perRow }) {
  const total = members.length
  const cells = cols
    .map((c) => {
      const lvs = members.map((m) => toLv(values.get(m)?.[c.key])).filter((v) => v !== null)
      const hi = lvs.filter((v) => v >= 3).length
      const icon = c.icon ? `<img src="${c.icon}">` : `<span class="ab">${esc(c.alt)}</span>`
      return `<div class="c">${icon}<b class="${lvs.length ? '' : 'z'}">${lvs.length}<i>/${total}</i></b><s>3↑ ${hi}</s></div>`
    })
    .join('')
  const css = `body{margin:0;background:#14161c;color:#e8e8ea;font-family:'Noto Sans CJK KR','Noto Sans KR','WenQuanYi Zen Hei',sans-serif}
.og{width:1200px;height:600px;box-sizing:border-box;padding:26px 30px;display:flex;flex-direction:column}
h1{font-size:40px;margin:0}.sub{font-size:20px;color:#9a9ca5;margin:4px 0 16px}
.g{flex:1;display:grid;grid-template-columns:repeat(${perRow},1fr);align-content:center;gap:10px 6px}
.c{display:flex;flex-direction:column;align-items:center}.c img,.c .ab{width:72px;height:72px;border-radius:10px}
.c .ab{display:flex;align-items:center;justify-content:center;background:#2a2d36;font-size:16px}
.c b{font-size:26px;color:#ffd27a;line-height:1.1;margin-top:4px}.c b.z{color:#555}.c i{font-style:normal;font-size:15px;color:#9a9ca5}
.c s{text-decoration:none;font-size:15px;color:#9cc8ff}`
  return `<!doctype html><meta charset="utf-8"><style>${css}</style><div class="og"><h1>${esc(title)}</h1><div class="sub">${esc(stamp)} 기준 · 길드원 ${total}명 중 보유 인원 · 눌러서 전체 표 보기</div><div class="g">${cells}</div></div>`
}

// 길전 투력: 투력1(귀속 투력) 내림차순 순위표 + 막대. 합계는 참고용.
const fmt = (n) => Math.round(n).toLocaleString('ko-KR')
const powerRows = members
  .map((m) => {
    const vals = power.get(m) ?? [null, null, null]
    const filled = vals.filter(Boolean)
    const key = vals[0]?.n ?? 0
    return { m, vals, key, sum: filled.reduce((a, v) => a + v.n, 0), has: vals[0] != null }
  })
  .sort((a, b) => b.has - a.has || b.key - a.key || b.sum - a.sum)
const ranked = powerRows.filter((r) => r.has)

function renderPowerHtml() {
  const max = Math.max(1, ...ranked.map((r) => r.key))
  const cell = (v, i, r) => {
    if (!v) return '<td class="pw lx">·</td>'
    const bar = i === 0 ? `<span class="bar" style="width:${(r.key / max) * 100}%"></span>` : ''
    return `<td class="pw${i === 0 ? ' p1' : ''}">${bar}<b>${fmt(v.n)}</b>${v.lord ? `<i>영주(${v.awaken})</i>` : ''}</td>`
  }
  let rank = 0
  const rows = powerRows
    .map((r) => {
      const rk = r.has ? ++rank : ''
      return `<tr><td class="rk">${rk}</td><td class="nm">${esc(r.m)}</td>${r.vals.map((v, i) => cell(v, i, r)).join('')}<td class="tot">${r.sum ? fmt(r.sum) : '·'}</td></tr>`
    })
    .join('')
  const colAvg = POWER_HEADERS.map((_, i) => {
    const ns = powerRows.map((r) => r.vals[i]?.n).filter((n) => n != null)
    return ns.length ? fmt(ns.reduce((a, n) => a + n, 0) / ns.length) : '·'
  })
  const total = powerRows.reduce((a, r) => a + r.sum, 0)
  const css = `${CSS}
td.rk{width:34px;color:#9a9ca5;font-size:13px}td.pw{width:120px;font-size:14px;padding:0 8px;text-align:right}
td.pw b{position:relative;font-weight:normal}td.pw i{position:relative;display:block;font-style:normal;font-size:10px;color:#e0b0ff;line-height:1}
td.p1{width:260px;position:relative}td.p1 b{color:#ffd27a;font-weight:bold}
td.p1 .bar{position:absolute;left:0;top:3px;bottom:3px;background:#2b3f63;border-radius:0 4px 4px 0}
td.tot{width:120px;text-align:right;padding:0 8px;color:#9a9ca5;font-size:13px}`
  return `<!doctype html><meta charset="utf-8"><style>${css}</style><div class="wrap"><h1>귀속 투력 현황</h1><div class="sub">${esc(stamp)} 기준 · 영주는 산식 적용 최종값 · 투력1(귀속) 순</div><table><tr><th>#</th><th>캐릭명</th>${POWER_HEADERS.map((h) => `<th>${esc(h.replace('길전 ', ''))}</th>`).join('')}<th>합계</th></tr>${rows}<tr class="stat"><td></td><td class="nm">평균</td>${colAvg.map((a) => `<td>${a}</td>`).join('')}<td>길드 합계 ${fmt(total)}</td></tr></table></div>`
}

function renderPowerOg() {
  const top = ranked.slice(0, 10)
  const avg = ranked.length ? ranked.reduce((a, r) => a + r.key, 0) / ranked.length : 0
  const item = (r, i) => `<li><span class="r">${i + 1}</span><span class="n">${esc(r.m)}</span><b>${fmt(r.key)}</b></li>`
  const css = `body{margin:0;background:#14161c;color:#e8e8ea;font-family:'Noto Sans CJK KR','Noto Sans KR','WenQuanYi Zen Hei',sans-serif}
.og{width:1200px;height:600px;box-sizing:border-box;padding:26px 36px;display:flex;flex-direction:column}
h1{font-size:40px;margin:0}.sub{font-size:20px;color:#9a9ca5;margin:4px 0 14px}
ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;grid-auto-flow:column;grid-template-rows:repeat(5,1fr);gap:8px 40px;flex:1}
li{display:flex;align-items:center;gap:14px;font-size:28px;background:#1a1c23;border-radius:10px;padding:0 18px}
li .r{color:#9cc8ff;width:30px}li .n{flex:1;overflow:hidden;white-space:nowrap}li b{color:#ffd27a}`
  return `<!doctype html><meta charset="utf-8"><style>${css}</style><div class="og"><h1>귀속 투력 TOP 10</h1><div class="sub">${esc(stamp)} 기준 · 투력1 기준 · 입력 ${ranked.length}/${members.length}명 · 평균 ${fmt(avg)} · 눌러서 전체 보기</div><ol>${top.map(item).join('')}</ol></div>`
}

const pages = [
  {
    file: 'soldiers.png',
    html: renderHtml({
      title: '마병 보유 현황',
      legend: '숫자 = 레벨, · = 미보유',
      cols: soldiers,
      values: levels,
      toLv: soldierLv,
      unit: 'Lv',
      withSum: true,
    }),
    og: renderOg({ title: '마병 보유 현황', cols: soldiers, values: levels, toLv: soldierLv, perRow: 7 }),
  },
  {
    file: 'heroes.png',
    html: renderHtml({
      title: '방어덱 영웅 각성 현황',
      legend: '숫자 = 각성(0 = 노각), · = 미보유',
      cols: heroes,
      values: awakens,
      toLv: heroLv,
      unit: '각',
      withSum: false,
    }),
    og: renderOg({ title: '방어덱 영웅 각성 현황', cols: heroes, values: awakens, toLv: heroLv, perRow: 8 }),
  },
  { file: 'power.png', html: renderPowerHtml(), og: renderPowerOg() },
]

// ── 캡처 ──
const { chromium } = await import('playwright-core')
const chromeCandidates = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
].filter(Boolean)
const executablePath = chromeCandidates.find((p) => existsSync(p))
if (!executablePath) {
  console.log('::warning::Chrome 을 찾지 못해 집계 이미지를 건너뜁니다 (CHROME_PATH 지정).')
  process.exit(0)
}

const outDir = resolve(OUT_ROOT, token)
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] })
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 })
  for (const p of pages) {
    await page.setContent(p.html, { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    await page.locator('.wrap').screenshot({ path: resolve(outDir, p.file) })
    // 카톡 링크 미리보기 썸네일(1200×600 요약 카드)
    await page.setContent(p.og, { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    await page.locator('.og').screenshot({ path: resolve(outDir, p.file.replace('.png', '-og.png')) })
  }
} finally {
  await browser.close()
}

// 카톡 방장봇 답변에 넣을 페이지. 카톡은 이미지 주소(.png)는 링크로만 보여주고,
// HTML 페이지의 og:image 는 썸네일 카드로 보여주므로 이 페이지들의 주소를 씀.
const v = now.getTime()
const base = `${SITE}/stats/${token}`
const page = (title, imgs, og) =>
  `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width,initial-scale=1">` +
  `<title>${esc(title)}</title><meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(stamp)} 기준 · 눌러서 전체 보기">` +
  `<meta property="og:image" content="${base}/${og}?v=${v}">` +
  `<style>body{margin:0;background:#14161c;color:#e8e8ea;font-family:sans-serif}img{display:block;max-width:none;margin:0 0 12px}</style></head><body>` +
  imgs.map(([src, alt]) => `<img src="${src}?v=${v}" alt="${esc(alt)}">`).join('') +
  `</body></html>`
writeFileSync(resolve(outDir, 'soldiers.html'), page('마병 보유 현황', [['soldiers.png', '마병 보유 현황']], 'soldiers-og.png'))
writeFileSync(resolve(outDir, 'heroes.html'), page('방어덱 영웅 각성 현황', [['heroes.png', '방어덱 영웅 각성 현황']], 'heroes-og.png'))
writeFileSync(resolve(outDir, 'power.html'), page('귀속 투력 현황', [['power.png', '귀속 투력 현황']], 'power-og.png'))
writeFileSync(
  resolve(outDir, 'index.html'),
  page(
    '길드 집계',
    [
      ['soldiers.png', '마병 보유 현황'],
      ['heroes.png', '방어덱 영웅 각성 현황'],
      ['power.png', '귀속 투력 현황'],
    ],
    'soldiers-og.png',
  ),
)
// 상위 경로에 빈 페이지를 둬서 /stats/ 가 404 대신 아무 정보 없는 페이지가 되게 함.
writeFileSync(resolve(OUT_ROOT, 'index.html'), '<!doctype html><meta name="robots" content="noindex">')

console.log(`✓ 길드 집계 이미지 생성: 멤버 ${members.length}명, 마병 ${soldiers.length}종, 영웅 ${heroes.length}명, 투력 입력 ${ranked.length}명`)
if (process.argv.includes('--print-url')) {
  console.log(`  ${base}/soldiers.html   (마병, 카톡 미리보기 카드)`)
  console.log(`  ${base}/heroes.html     (영웅, 카톡 미리보기 카드)`)
  console.log(`  ${base}/power.html      (길전 투력, 카톡 미리보기 카드)`)
  console.log(`  ${base}/                (두 장 모아보기)`)
}
