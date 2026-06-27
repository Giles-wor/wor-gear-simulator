// 길드원 페이지 콘텐츠 암호화 스크립트.
//
// 사용법:
//   1) guild/content.source.json 에 평문 콘텐츠를 작성 (스키마는 guild/types.ts 의 GuildContent)
//   2) npm run encrypt:guild      (암호 기본값 time0303, 바꾸려면 GUILD_CODE=xxxx npm run encrypt:guild)
//   3) guild/data/content.encrypted.json 이 갱신됨 → 이 파일만 커밋
//
// 평문(content.source.json)은 .gitignore 되어 리포에 올라가지 않습니다.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SRC = resolve(ROOT, 'guild/content.source.json')
const OUT = resolve(ROOT, 'guild/data/content.encrypted.json')
const ITERATIONS = 250000
const code = process.env.GUILD_CODE || 'time0303'

let plaintext
try {
  plaintext = readFileSync(SRC, 'utf8')
} catch {
  console.error(`✗ 평문 파일이 없습니다: ${SRC}`)
  console.error('  guild/content.source.json 을 만들고 다시 실행하세요 (스키마: guild/types.ts).')
  process.exit(1)
}
JSON.parse(plaintext) // 형식 검증 (깨진 JSON 이면 여기서 throw)

const enc = new TextEncoder()
const salt = crypto.getRandomValues(new Uint8Array(16))
const iv = crypto.getRandomValues(new Uint8Array(12))
const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveKey'])
const key = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
  keyMaterial,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt'],
)
const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext))
const b64 = (buf) => Buffer.from(buf).toString('base64')
const blob = {
  v: 1,
  iterations: ITERATIONS,
  salt: b64(salt),
  iv: b64(iv),
  ct: b64(new Uint8Array(ct)),
}
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(blob))
console.log(`✓ 암호화 완료 → ${OUT} (${(blob.ct.length / 1024).toFixed(1)} KB, 코드: ${code})`)
