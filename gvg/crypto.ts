// Web Crypto 기반 클라이언트 사이드 암·복호화 (길드원 페이지 guild/crypto.ts 와 같은 방식).
// 보드/편집 로그는 ciphertext 로만 DB 에 들어가므로, 코드 없이는 DB 를 열어도 내용을 알 수 없습니다.
// 코드 → PBKDF2(SHA-256) → AES-GCM 256 키. 코드가 틀리면 인증 태그 검증에서 예외가 납니다.
//
// salt 는 보드 id(= sha256(code))로 고정합니다. 코드마다 값이 달라 유일하고 공개돼도 안전하며,
// 무엇보다 파생 결과를 캐시할 수 있어 편집 로그 여러 줄을 풀 때 PBKDF2(25만 회)를 한 번만 돌립니다.
import type { EncBlob } from './types'

const PBKDF2_ITERATIONS = 250000

function b64ToBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out.buffer
}

function bufferToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

/** 코드 → 보드 id(SHA-256 hex). Postgres encode(digest(code,'sha256'),'hex') 와 동일. */
export async function boardIdFromCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** 보드 id 는 코드와 1:1 이므로 캐시 키로 쓴다. */
const keyCache = new Map<string, Promise<CryptoKey>>()

function keyFor(code: string, boardId: string, iterations: number): Promise<CryptoKey> {
  const cacheKey = `${iterations}:${boardId}`
  const hit = keyCache.get(cacheKey)
  if (hit) return hit
  const enc = new TextEncoder()
  const derived = crypto.subtle
    .importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveKey'])
    .then((material) =>
      crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: enc.encode(boardId), iterations, hash: 'SHA-256' },
        material,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      ),
    )
    .catch((e) => {
      keyCache.delete(cacheKey) // 실패한 파생을 캐시에 남기지 않는다
      throw e
    })
  keyCache.set(cacheKey, derived)
  return derived
}

/** 값을 코드로 암호화해 저장용 블록 생성. */
export async function encryptJson(code: string, boardId: string, value: unknown): Promise<EncBlob> {
  const key = await keyFor(code, boardId, PBKDF2_ITERATIONS)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(value)),
  )
  return { v: 1, iterations: PBKDF2_ITERATIONS, iv: bufferToB64(iv.buffer), ct: bufferToB64(ct) }
}

/** 암호문 블록을 코드로 복호화. 코드가 틀리면 throw. */
export async function decryptJson<T>(code: string, boardId: string, blob: EncBlob): Promise<T> {
  const key = await keyFor(code, boardId, blob.iterations || PBKDF2_ITERATIONS)
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBuffer(blob.iv) },
    key,
    b64ToBuffer(blob.ct),
  )
  return JSON.parse(new TextDecoder().decode(plain)) as T
}
