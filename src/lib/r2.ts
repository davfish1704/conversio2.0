import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

let _client: S3Client | null = null

export function getR2Client(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: "auto",
      endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
      },
    })
  }
  return _client
}

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: requireEnv("R2_BUCKET_NAME"),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
  return `${requireEnv("R2_PUBLIC_URL")}/${key}`
}

export async function deleteFromR2(key: string): Promise<void> {
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: requireEnv("R2_BUCKET_NAME"),
      Key: key,
    })
  )
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const bucket = requireEnv("R2_BUCKET_NAME")
  const presignedUrl = await getSignedUrl(
    getR2Client(),
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn }
  )
  const urlBase = presignedUrl.split("?")[0]
  console.log("[r2-presign] Bucket:", bucket)
  console.log("[r2-presign] Object key:", key)
  console.log("[r2-presign] URL-Base:", urlBase)
  console.log("[r2-presign] URL-Stil:", urlBase.includes("//" + bucket + ".") ? "VIRTUAL-HOSTED" : "PATH-STYLE")
  return presignedUrl
}
