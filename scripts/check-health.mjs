// 데이터 상태 점검 — 크롤 결과·수동 데이터가 낡거나 깨졌는지 확인해 마크다운 보고서를 만든다.
// GitHub Actions(health-check.yml)가 주간 크롤 직후 실행해 결과를 이슈 하나로 유지한다.
//
//   node scripts/check-health.mjs [보고서.md]
//
// ❌ 오류: 사이트에 틀린/낡은 정보가 보이는 상태 (배너 고장, 크롤 중단, 배포 누락, 아이콘 누락)
// ⚠️ 경고: 사람이 채워야 할 것 (신캐 한글명, 신규 진영 효과, 유출 정보 갱신)
// 출력: GITHUB_OUTPUT 에 has_issues=true|false. 종료 코드는 항상 0 (점검 자체가 크롤을 막지 않게).
import { readFile, readdir, writeFile, appendFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (rel) => readFile(new URL(rel, root), 'utf8')
const DAY = 86400000
const now = Date.now()

const errors = []
const warnings = []
const infos = []

/** `export const x... = <JSON>` 형태의 생성 파일에서 JSON 부분만 파싱 */
function parseGenerated(src, marker) {
  const i = src.indexOf(marker)
  if (i < 0) throw new Error(`marker 없음: ${marker}`)
  const start = src.indexOf('=', i) + 1
  let body = src.slice(start).trim()
  // 뒤따르는 export 문 앞에서 자르기
  const next = body.search(/\n\s*export\s/)
  if (next >= 0) body = body.slice(0, next)
  return JSON.parse(body.trim().replace(/;$/, ''))
}

const ageDays = (iso) => (iso ? Math.floor((now - Date.parse(iso)) / DAY) : Infinity)
const fmtDate = (iso) => (iso ? iso.slice(0, 10) : '없음')

async function check(name, fn) {
  try {
    await fn()
  } catch (e) {
    errors.push(`**${name}** 점검 실패: ${e.message}`)
  }
}

// ── 1. 배너 일정 ──────────────────────────────────────────────
await check('배너 일정', async () => {
  const s = parseGenerated(await read('banners/data/schedule.generated.ts'), 'generatedSchedule')
  if (!s) return errors.push('**배너 일정**: 크롤 데이터 없음 (null)')
  const age = ageDays(s.fetchedAt)
  if (age > 14) errors.push(`**배너 일정**: 마지막 크롤 성공이 ${age}일 전 (${fmtDate(s.fetchedAt)}) — sync:banners 실패 중`)
  const live = s.banners.filter((b) => Date.parse(b.endUtc) > now)
  if (!live.length) {
    errors.push(`**배너 일정**: 진행 중/예정 배너가 하나도 없음 — 배너 페이지에 지난 배너만 보임`)
  }
  const empty = live.filter((b) => !b.heroes?.length)
  if (live.length && empty.length === live.length) {
    errors.push(`**배너 일정**: 진행 중/예정 배너 ${live.length}건 모두 영웅 목록이 비어 있음 — 출처(${s.source}) 파싱 고장 또는 출처 갱신 중단`)
  }
  if (s.sourceModified && ageDays(s.sourceModified) > 30) {
    warnings.push(`**배너 일정**: 출처 페이지 최종 수정이 ${ageDays(s.sourceModified)}일 전 (${fmtDate(s.sourceModified)}) — 출처가 더 이상 관리되지 않을 수 있음`)
  }
  infos.push(`배너: 크롤 ${fmtDate(s.fetchedAt)}, 진행/예정 ${live.length}건`)
})

// ── 2. 소환 확률 크롤 ────────────────────────────────────────
await check('소환 확률', async () => {
  const src = await read('summon/data/banners.generated.ts')
  const m = src.match(/"fetchedAt":\s*"([^"]+)"/)
  const at = m?.[1]
  if (ageDays(at) > 14) errors.push(`**소환 확률**: 마지막 크롤 성공이 ${ageDays(at)}일 전 (${fmtDate(at)}) — sync:summon 실패 중`)
  infos.push(`소환 확률: 크롤 ${fmtDate(at)}`)
})

// ── 3. 영웅 한글명 / 진영 ─────────────────────────────────────
await check('영웅 데이터', async () => {
  const heroes = parseGenerated(await read('src/data/heroes.generated.ts'), 'export const heroes')
  const baseline = JSON.parse(await read('scripts/health-baseline.json'))
  const koSrc = await read('src/data/heroNamesKo.ts')
  const manualKo = Object.fromEntries([...koSrc.matchAll(/^\s*'?([a-z0-9_]+)'?\s*:\s*(['"])(.+?)\2/gm)].map((m) => [m[1], m[3]]))
  // worwiki 크롤 결과 (영문명 → id 규칙은 sync-heroes 와 동일)
  const idOf = (en) => en.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  let crawledKo = {}
  let crawledAt = null
  try {
    const g = JSON.parse(await read('src/data/heroNamesKo.generated.json'))
    crawledAt = g.fetchedAt
    crawledKo = Object.fromEntries(Object.values(g.pages ?? {}).map((p) => [idOf(p.en), p.ko]))
  } catch {}
  const koKeys = new Set([...Object.keys(manualKo), ...Object.keys(crawledKo)])
  const ignore = new Set(baseline.heroesWithoutKo)
  let pending = []
  try {
    pending = JSON.parse(await read('src/data/heroes.pending.generated.json'))
  } catch {}
  if (pending.length) {
    warnings.push(
      `**스탯 미기재 신캐 (${pending.length}명)** — 위키 문서는 있으나 ATK/공격간격이 비어 시뮬레이터에 아직 없음 (위키가 채워지면 주간 크롤이 자동 반영)\n` +
        pending.map((h) => `  - ${h.name} (${[h.rarity, h.heroClass].filter(Boolean).join(' ') || '정보 없음'}${h.factions?.length ? ', ' + h.factions.join('/') : ''})`).join('\n'),
    )
  }

  const missing = [...heroes, ...pending].filter((h) => !koKeys.has(h.id) && !ignore.has(h.id))
  if (missing.length) {
    warnings.push(
      `**신규 영웅 한글명 없음 (${missing.length}명)** — \`src/data/heroNamesKo.ts\` 에 추가 필요 (없으면 영문으로 표시)\n` +
        missing.map((h) => `  - \`${h.id}\` ${h.name} (${[h.rarity, h.heroClass].filter(Boolean).join(' ')}${h.factions?.length ? ', ' + h.factions.join('/') : ''})`).join('\n'),
    )
  }
  const oldMissing = heroes.filter((h) => !koKeys.has(h.id) && ignore.has(h.id)).length

  // 수동 한글명과 worwiki 표기가 다른 영웅 (수동이 우선 적용됨 — 어느 쪽이 맞는지 확인용)
  const heroIds = new Set(heroes.map((h) => h.id))
  const conflicts = Object.entries(manualKo).filter(([id, ko]) => heroIds.has(id) && crawledKo[id] && crawledKo[id] !== ko)
  if (conflicts.length) {
    warnings.push(
      `**한글명 불일치 (${conflicts.length}명)** — 수동 매핑(적용 중)과 worwiki 표기가 다름. 수동 쪽이 틀렸으면 \`heroNamesKo.ts\` 에서 해당 줄을 지우면 worwiki 표기가 적용됨\n` +
        conflicts.map(([id, ko]) => `  - \`${id}\`: 수동 '${ko}' / worwiki '${crawledKo[id]}'`).join('\n'),
    )
  }
  if (crawledAt && ageDays(crawledAt) > 14) {
    errors.push(`**한글명 크롤**: 마지막 성공이 ${ageDays(crawledAt)}일 전 (${fmtDate(crawledAt)}) — sync:names-ko 실패 중`)
  }
  infos.push(`한글명: 수동 ${Object.keys(manualKo).length}개 + worwiki ${Object.keys(crawledKo).length}개 (크롤 ${fmtDate(crawledAt)})`)

  // 시뮬레이터 진영 효과(영주 효과/진영 반지)에 없는 진영
  const factionSrc = (await read('src/data/lordEffects.ts')) + (await read('src/data/factionAccessories.ts'))
  const covered = new Set([...factionSrc.matchAll(/faction:\s*'([^']+)'/g)].map((m) => m[1]))
  const ignoredF = new Set(baseline.factionsIgnored ?? [])
  const everyone = [...heroes, ...pending]
  const all = [...new Set(everyone.flatMap((h) => h.factions || []))]
  const uncovered = all.filter((f) => !covered.has(f) && !ignoredF.has(f))
  for (const f of uncovered) {
    const members = everyone.filter((h) => (h.factions || []).includes(f)).map((h) => h.name)
    warnings.push(
      `**진영 효과 데이터 없음: ${f}** (${members.join(', ')}) — \`src/data/lordEffects.ts\` / \`factionAccessories.ts\` 에 영주 효과·진영 반지 추가 필요`,
    )
  }
  infos.push(`영웅: ${heroes.length}명 (한글명 없는 구 영웅 ${oldMissing}명은 기준선으로 제외)`)
})

// ── 4. 마병 아이콘 ────────────────────────────────────────────
await check('마병 아이콘', async () => {
  const names = JSON.parse(await read('guild/soldiers.json'))
  const key = (n) => n.toLowerCase().replace(/[()]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  let files = []
  try {
    files = await readdir(new URL('guild/assets/soldiers/', root))
  } catch {}
  const have = new Set(files.map((f) => f.replace(/\.[a-z]+$/i, '').toLowerCase()))
  const noIcon = names.filter((n) => !have.has(key(n)))
  if (noIcon.length) {
    errors.push(`**마병 아이콘 없음**: ${noIcon.join(', ')} — 위키 문서명이 다르면 \`guild/soldiers.json\` 이름 수정 (길드 표에 텍스트로 표시됨)`)
  }
  infos.push(`마병: ${names.length}종, 아이콘 ${names.length - noIcon.length}개`)
})

// ── 5. 유출 정보 ──────────────────────────────────────────────
await check('유출 정보', async () => {
  const src = await read('leaks/data/leaks.ts')
  const at = src.match(/leakUpdatedAt\s*=\s*'([^']+)'/)?.[1]
  const age = ageDays(at)
  if (age > 45) warnings.push(`**유출 정보**: 정리일이 ${age}일 전 (${at}) — 출시된 영웅 정리/새 유출 반영 필요`)
  infos.push(`유출: 정리일 ${at}`)
})

// ── 6. 배포 누락 (main 최신 커밋이 배포됐는지) ─────────────────
await check('배포', async () => {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPOSITORY
  if (!token || !repo) return infos.push('배포: 로컬 실행이라 건너뜀')
  const gh = async (path) => {
    const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) throw new Error(`GitHub API ${res.status} ${path}`)
    return res.json()
  }
  const main = await gh('/commits/main')
  const runs = await gh(`/actions/workflows/deploy.yml/runs?head_sha=${main.sha}&per_page=10`)
  const ok = runs.workflow_runs.some((r) => r.conclusion === 'success' || r.status !== 'completed')
  const commitAt = main.commit.committer.date
  // 방금 머지된 커밋은 배포가 곧 시작될 수 있으니 1시간 유예
  if (!ok && now - Date.parse(commitAt) > 3600000) {
    const last = await gh('/actions/workflows/deploy.yml/runs?branch=main&status=success&per_page=1')
    const lastAt = last.workflow_runs[0]?.created_at
    errors.push(
      `**배포 누락**: main 최신 커밋(${main.sha.slice(0, 7)}, ${fmtDate(commitAt)})이 배포되지 않음. 마지막 배포 ${fmtDate(lastAt)} — Actions 에서 "Deploy to GitHub Pages" 수동 실행`,
    )
  }
  infos.push(`배포: main ${main.sha.slice(0, 7)} ${ok ? '배포됨/진행 중' : '미배포'}`)
})

// ── 보고서 ───────────────────────────────────────────────────
const lines = ['# 🩺 데이터 상태 점검', '']
lines.push(`점검 시각: ${new Date(now).toISOString().replace('T', ' ').slice(0, 16)} UTC`, '')
if (errors.length) lines.push('## ❌ 오류 (사이트에 틀린/낡은 정보가 보임)', '', ...errors.map((e) => `- ${e}`), '')
if (warnings.length) lines.push('## ⚠️ 채워야 할 데이터', '', ...warnings.map((w) => `- ${w}`), '')
if (!errors.length && !warnings.length) lines.push('✅ 문제 없음', '')
lines.push('<details><summary>현황</summary>', '', ...infos.map((i) => `- ${i}`), '', '</details>', '')
lines.push('_이 이슈는 `health-check.yml` 이 매주 크롤 직후 자동 갱신하며, 문제가 모두 해결되면 자동으로 닫힙니다._')
const report = lines.join('\n')

const out = process.argv[2]
if (out) await writeFile(out, report + '\n', 'utf8')
console.log(report)
const hasIssues = errors.length + warnings.length > 0
if (process.env.GITHUB_OUTPUT) {
  await appendFile(process.env.GITHUB_OUTPUT, `has_issues=${hasIssues}\nerrors=${errors.length}\nwarnings=${warnings.length}\n`)
}
