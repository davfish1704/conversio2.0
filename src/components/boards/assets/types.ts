export type AssetType = "IMAGE" | "PDF" | "AUDIO" | "VIDEO" | "DOCUMENT"

export interface Asset {
  id: string
  boardId: string
  name: string
  type: AssetType
  mimeType: string
  sizeBytes: number
  publicUrl: string
  r2Key: string
  description: string | null
  tags: string[]
  createdAt: string
  links: { stateId: string }[]
}

export interface BoardState {
  id: string
  name: string
  orderIndex: number
  color?: string | null
}
