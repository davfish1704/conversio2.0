"use client"

import { FileText, Music, Video, File, ImageIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { Asset } from "./types"

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  IMAGE:    <ImageIcon className="h-10 w-10 text-blue-400" />,
  PDF:      <FileText  className="h-10 w-10 text-red-400" />,
  AUDIO:    <Music     className="h-10 w-10 text-purple-400" />,
  VIDEO:    <Video     className="h-10 w-10 text-green-400" />,
  DOCUMENT: <File      className="h-10 w-10 text-yellow-400" />,
}

const TYPE_LABELS: Record<string, string> = {
  IMAGE: "Bild", PDF: "PDF", AUDIO: "Audio", VIDEO: "Video", DOCUMENT: "Dokument",
}

interface AssetCardProps {
  asset: Asset
  onClick: () => void
}

export function AssetCard({ asset, onClick }: AssetCardProps) {
  return (
    <Card
      onClick={onClick}
      className="cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all group"
    >
      <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center overflow-hidden relative">
        {asset.type === "IMAGE" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.publicUrl}
            alt={asset.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            {TYPE_ICONS[asset.type]}
          </div>
        )}
        <Badge
          variant="secondary"
          className="absolute top-2 right-2 text-xs opacity-80 group-hover:opacity-100"
        >
          {TYPE_LABELS[asset.type] ?? asset.type}
        </Badge>
      </div>
      <CardContent className="p-3">
        <p className="font-medium text-sm truncate" title={asset.name}>{asset.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{formatBytes(asset.sizeBytes)}</p>
        {asset.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-2">
            {asset.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">{tag}</Badge>
            ))}
            {asset.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">+{asset.tags.length - 3}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
