import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALG = "aes-256-gcm"

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY || ""
  if (hex.length === 64) return Buffer.from(hex, "hex")
  // Derive a 32-byte key from the string if not 64-char hex
  const buf = Buffer.alloc(32)
  Buffer.from(hex || "conversio-dev-key-placeholder-32c").copy(buf)
  return buf
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return ""
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALG, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext) return ""
  try {
    const [ivHex, tagHex, dataHex] = ciphertext.split(":")
    const key = getKey()
    const iv = Buffer.from(ivHex, "hex")
    const tag = Buffer.from(tagHex, "hex")
    const data = Buffer.from(dataHex, "hex")
    const decipher = createDecipheriv(ALG, key, iv)
    decipher.setAuthTag(tag)
    return decipher.update(data).toString("utf8") + decipher.final("utf8")
  } catch {
    return ""
  }
}
