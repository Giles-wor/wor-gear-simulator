// Web Crypto 기반 클라이언트 사이드 복호화.
// 콘텐츠는 ciphertext 로만 번들에 들어가므로, 코드(암호) 없이는 소스를 열어도 내용을 알 수 없습니다.
// 암호 → PBKDF2(SHA-256) → AES-GCM 256 키. 암호가 틀리면 AES-GCM 인증 태그 검증에서 예외가 납니다.
import type { EncryptedBlob, GuildContent } from './types'

function b64ToBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out.buffer
}

async function deriveKey(code: string, salt: ArrayBuffer, iterations: number): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  )
}

/** 암호로 콘텐츠를 복호화. 암호가 틀리면 throw. */
export async function decryptContent(code: string, blob: EncryptedBlob): Promise<GuildContent> {
  const key = await deriveKey(code, b64ToBuffer(blob.salt), blob.iterations)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBuffer(blob.iv) }, key, b64ToBuffer(blob.ct))
  return JSON.parse(new TextDecoder().decode(plain)) as GuildContent
}
