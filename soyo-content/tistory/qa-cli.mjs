#!/usr/bin/env node
/**
 * 티스토리 재가공 CLI — 웹 도구 없이 폴더/터미널로 쓸 때 사용한다.
 * 웹 도구(index.html)와 같은 lib/ 모듈을 쓰므로 판정 결과가 다르지 않다.
 *
 *   node tistory/qa-cli.mjs init  <입력파일>
 *     → 네이버 원고 입력 템플릿을 만든다
 *
 *   node tistory/qa-cli.mjs prompt <입력파일>
 *     → 변환 프롬프트를 표준출력으로 뽑는다 (클로드에 붙여넣는다)
 *
 *   node tistory/qa-cli.mjs check  <초안파일> [--naver <입력파일>] [--out <디렉터리>]
 *     → 품질 검수 결과를 출력하고, --out을 주면 티스토리 HTML 등을 파일로 쓴다
 *
 * check 결과에 "수정" 항목이 있으면 종료 코드 1을 반환한다.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'

import { buildConversionPrompt, INPUT_TEMPLATE } from './lib/prompt.js'
import { renderTistoryHtml } from './lib/render.js'
import { parseDraft, runQa } from './lib/qa.js'
import { LIMITS } from './lib/rules.js'

const STATUS_LABEL = { pass: '통과', warn: '확인', fail: '수정', manual: '직접' }
const STATUS_ORDER = ['fail', 'warn', 'manual', 'pass']

function parseArgs(argv) {
  const [command, file, ...rest] = argv
  const flags = {}
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i].startsWith('--')) {
      const key = rest[i].slice(2)
      const next = rest[i + 1]
      if (next && !next.startsWith('--')) {
        flags[key] = next
        i += 1
      } else {
        flags[key] = true
      }
    }
  }
  return { command, file, flags }
}

/** 입력 템플릿 프론트매터 → buildConversionPrompt 입력 형태로. */
function toPromptInput(raw) {
  const { data, body } = parseDraft(raw)
  return {
    naverTitle: data.naver_title || '',
    naverBody: body.trim(),
    subject: data.subject || '',
    region: data.region || '',
    category: data.category || '',
    naverUrl: data.naver_url || '',
    naverImageCount: Number(data.naver_image_count) || 0,
    sponsored: /^(true|yes|y|1|예)$/i.test(String(data.sponsored || '')),
    keyFacts: {
      address: data.address || '',
      hours: data.hours || '',
      parking: data.parking || '',
      price: data.price || '',
      reservation: data.reservation || '',
      kids: data.kids || '',
      bring: data.bring || '',
      pros: data.pros || '',
      cons: data.cons || '',
    },
    images: Array.isArray(data.images) ? data.images.filter(Boolean) : [],
    relatedTistoryUrls: Array.isArray(data.related) ? data.related.filter(Boolean) : [],
  }
}

function printReport(qa) {
  const groups = STATUS_ORDER.filter((s) => qa.checks.some((c) => c.status === s))

  console.log('\n=== 품질 검수 ===\n')
  for (const status of groups) {
    for (const c of qa.checks.filter((x) => x.status === status)) {
      console.log(`[${STATUS_LABEL[c.status]}] ${c.label}`)
      console.log(`        ${c.detail}`)
    }
  }

  const { pass, warn, fail, manual } = qa.summary
  console.log(`\n통과 ${pass} / 확인 ${warn} / 수정 ${fail} / 직접 확인 ${manual}`)
  console.log(
    qa.publishable
      ? `\n발행 가능. 목표는 글당 ${LIMITS.minutesPerPostTarget}분이다. 직접 읽어보고 발행하자.`
      : '\n수정 필요 항목을 먼저 고치자.'
  )
}

async function main() {
  const { command, file, flags } = parseArgs(process.argv.slice(2))

  if (!command || flags.help) {
    console.log(
      [
        '사용법:',
        '  node tistory/qa-cli.mjs init   <입력파일>',
        '  node tistory/qa-cli.mjs prompt <입력파일>',
        '  node tistory/qa-cli.mjs check  <초안파일> [--naver <입력파일>] [--out <디렉터리>]',
      ].join('\n')
    )
    process.exit(command ? 0 : 1)
  }

  if (!file) {
    console.error('파일 경로가 필요하다.')
    process.exit(1)
  }

  if (command === 'init') {
    await writeFile(resolve(file), INPUT_TEMPLATE, 'utf8')
    console.log(`입력 템플릿을 만들었다: ${file}`)
    console.log('네이버 제목/본문/핵심 정보를 채운 뒤 prompt 명령을 쓰자.')
    return
  }

  if (command === 'prompt') {
    const raw = await readFile(resolve(file), 'utf8')
    console.log(buildConversionPrompt(toPromptInput(raw)))
    return
  }

  if (command === 'check') {
    const draft = await readFile(resolve(file), 'utf8')

    let source = { naverTitle: '', naverBody: '', keyFacts: {}, subject: '', region: '' }
    if (flags.naver) {
      source = toPromptInput(await readFile(resolve(flags.naver), 'utf8'))
    }

    const rendered = renderTistoryHtml(draft)
    const qa = runQa({
      draft,
      naverTitle: source.naverTitle,
      naverBody: source.naverBody,
      context: {
        subject: source.subject,
        region: source.region,
        keyFacts: source.keyFacts,
        naverImageCount: source.naverImageCount,
        naverUrl: source.naverUrl,
        sponsored: source.sponsored,
      },
    })

    printReport(qa)

    if (flags.out) {
      const dir = resolve(String(flags.out))
      await mkdir(dir, { recursive: true })
      const meta = rendered.meta

      const titles = [meta.title, ...(Array.isArray(meta.title_alt) ? meta.title_alt : [])].filter(Boolean)
      const imagePlan = rendered.imagePlan
        .map((i) => `${i.order}. ${i.src}${i.isHero ? '  (대표 이미지)' : ''}  — ${i.alt || '대체텍스트 없음'}`)
        .join('\n')

      await Promise.all([
        writeFile(join(dir, 'title_candidates.txt'), titles.join('\n'), 'utf8'),
        writeFile(join(dir, 'meta_description.txt'), String(meta.meta || ''), 'utf8'),
        writeFile(join(dir, 'tags.txt'), qa.parsed.tags.join(', '), 'utf8'),
        writeFile(join(dir, 'tistory_post.html'), rendered.html, 'utf8'),
        writeFile(
          join(dir, 'image_plan.md'),
          [
            `# 이미지 계획 (${rendered.imagePlan.length}장)`,
            '',
            imagePlan || '(이미지 없음)',
            '',
            '# 광고 위치',
            '',
            rendered.adSlots.map((s) => `${s.n}. ${s.label}`).join('\n') || '(없음)',
          ].join('\n'),
          'utf8'
        ),
        writeFile(
          join(dir, 'metadata.json'),
          JSON.stringify({ ...meta, tags: qa.parsed.tags, qa: qa.summary, publishable: qa.publishable }, null, 2),
          'utf8'
        ),
      ])

      console.log(`\n출력: ${dir}`)
    }

    process.exit(qa.publishable ? 0 : 1)
  }

  console.error(`알 수 없는 명령: ${command}`)
  process.exit(1)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
