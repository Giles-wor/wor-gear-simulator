// Web Crypto 기반 클라이언트 사이드 암·복호화.
// 콘텐츠는 ciphertext 로만 번들/DB 에 들어가므로, 코드(암호) 없이는 소스/DB 를 열어도 내용을 알 수 없습니다.
// 암호 → PBKDF2(SHA-256) → AES-GCM 256 키. 암호가 틀리면 AES-GCM 인증 태그 검증에서 예외가 납니다.
import type { EncryptedBlob, GuildContent } from './types'

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

async function deriveKey(
  code: string,
  salt: ArrayBuffer,
  iterations: number,
  usage: KeyUsage,
): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    [usage],
  )
}

/** 암호로 콘텐츠를 복호화. 암호가 틀리면 throw. */
export async function decryptContent(code: string, blob: EncryptedBlob): Promise<GuildContent> {
  const key = await deriveKey(code, b64ToBuffer(blob.salt), blob.iterations, 'decrypt')
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBuffer(blob.iv) }, key, b64ToBuffer(blob.ct))
  return JSON.parse(new TextDecoder().decode(plain)) as GuildContent
}

/** 콘텐츠를 코드로 암호화해 저장용 블록 생성. */
export async function encryptContent(code: string, content: GuildContent): Promise<EncryptedBlob> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(code, salt.buffer, PBKDF2_ITERATIONS, 'encrypt')
  const enc = new TextEncoder()
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(content)))
  return {
    v: 1,
    iterations: PBKDF2_ITERATIONS,
    salt: bufferToB64(salt.buffer),
    iv: bufferToB64(iv.buffer),
    ct: bufferToB64(ct),
  }
}
