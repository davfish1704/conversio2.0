import { z } from "zod"

export const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB

export const ALLOWED_MIME_TYPES: Record<string, "IMAGE" | "PDF" | "AUDIO" | "VIDEO" | "DOCUMENT"> = {
  "image/jpeg":   "IMAGE",
  "image/png":    "IMAGE",
  "image/gif":    "IMAGE",
  "image/webp":   "IMAGE",
  "image/svg+xml": "IMAGE",
  "application/pdf": "PDF",
  "audio/mpeg":   "AUDIO",
  "audio/mp4":    "AUDIO",
  "audio/wav":    "AUDIO",
  "audio/ogg":    "AUDIO",
  "audio/webm":   "AUDIO",
  "video/mp4":    "VIDEO",
  "video/webm":   "VIDEO",
  "video/ogg":    "VIDEO",
  "video/quicktime": "VIDEO",
  "application/msword": "DOCUMENT",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCUMENT",
  "application/vnd.ms-excel": "DOCUMENT",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "DOCUMENT",
  "text/plain":   "DOCUMENT",
  "text/csv":     "DOCUMENT",
}

export const assetUpdateSchema = z.object({
  name:        z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  tags:        z.array(z.string().max(50)).max(20).optional(),
})

export const assetStagesSchema = z.object({
  stageIds: z.array(z.string()),
})

export const assetQuerySchema = z.object({
  type:    z.enum(["IMAGE", "PDF", "AUDIO", "VIDEO", "DOCUMENT"]).optional(),
  tags:    z.string().optional(),
  stateId: z.string().optional(),
  search:  z.string().max(100).optional(),
  page:    z.coerce.number().int().min(1).default(1),
  limit:   z.coerce.number().int().min(1).max(100).default(20),
})
