"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, Trash2, ExternalLink, FileText, Music, Video, File, ImageIcon, Check, Copy } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { Asset, BoardState } from "./types"

const TYPE_ICONS: Record<string, React.ReactNode> = {
  IMAGE:    <ImageIcon className="h-12 w-12 text-blue-400" />,
  PDF:      <FileText  className="h-12 w-12 text-red-400" />,
  AUDIO:    <Music     className="h-12 w-12 text-purple-400" />,
  VIDEO:    <Video     className="h-12 w-12 text-green-400" />,
  DOCUMENT: <File      className="h-12 w-12 text-yellow-400" />,
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

interface AssetDetailDrawerProps {
  asset: Asset | null
  states: BoardState[]
  boardId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (asset: Asset) => void
  onDeleted: (id: string) => void
}

export function AssetDetailDrawer({
  asset,
  states,
  boardId,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: AssetDetailDrawerProps) {
  const [name,        setName]        = useState("")
  const [description, setDescription] = useState("")
  const [tagsInput,   setTagsInput]   = useState("")
  const [linkedIds,   setLinkedIds]   = useState<string[]>([])
  const [saving,      setSaving]      = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [savingStages, setSavingStages] = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [copied,      setCopied]      = useState(false)

  useEffect(() => {
    if (!asset) return
    setName(asset.name)
    setDescription(asset.description ?? "")
    setTagsInput(asset.tags.join(", "))
    setLinkedIds(asset.links.map((l) => l.stateId))
    setSaved(false)
  }, [asset])

  const saveMetadata = useCallback(async () => {
    if (!asset) return
    setSaving(true)
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean)
      const res = await fetch(`/api/boards/${boardId}/assets/${asset.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, description: description || null, tags }),
      })
      if (!res.ok) throw new Error("Speichern fehlgeschlagen")
      const updated = await res.json()
      onUpdated({ ...updated, links: updated.links ?? asset.links })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }, [asset, boardId, name, description, tagsInput, onUpdated])

  const saveStages = useCallback(async () => {
    if (!asset) return
    setSavingStages(true)
    try {
      const res = await fetch(`/api/boards/${boardId}/assets/${asset.id}/stages`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ stageIds: linkedIds }),
      })
      if (!res.ok) throw new Error("Stages konnten nicht gespeichert werden")
      onUpdated({ ...asset, links: linkedIds.map((stateId) => ({ stateId })) })
    } finally {
      setSavingStages(false)
    }
  }, [asset, boardId, linkedIds, onUpdated])

  const toggleStage = useCallback((id: string) => {
    setLinkedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }, [])

  const copyUrl = useCallback(() => {
    if (!asset) return
    navigator.clipboard.writeText(asset.publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [asset])

  const deleteAsset = useCallback(async () => {
    if (!asset || !confirm(`„${asset.name}" wirklich löschen?`)) return
    setDeleting(true)
    try {
      await fetch(`/api/boards/${boardId}/assets/${asset.id}`, { method: "DELETE" })
      onDeleted(asset.id)
      onOpenChange(false)
    } finally {
      setDeleting(false)
    }
  }, [asset, boardId, onDeleted, onOpenChange])

  if (!asset) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto flex flex-col gap-6 py-6">
        <SheetHeader>
          <SheetTitle className="truncate">{asset.name}</SheetTitle>
        </SheetHeader>

        {/* Preview */}
        <div className="bg-muted rounded-lg flex items-center justify-center overflow-hidden" style={{ minHeight: 180 }}>
          {asset.type === "IMAGE" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.publicUrl} alt={asset.name} className="max-h-64 max-w-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              {TYPE_ICONS[asset.type]}
            </div>
          )}
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={asset.publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            In neuem Tab öffnen
          </a>
          <span className="text-muted-foreground/40">·</span>
          <button
            onClick={copyUrl}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied
              ? <><Check className="h-3.5 w-3.5 text-green-500" /><span className="text-green-500">URL kopiert</span></>
              : <><Copy className="h-3.5 w-3.5" />URL kopieren</>
            }
          </button>
          <span className="text-muted-foreground/40 ml-auto text-xs">{formatBytes(asset.sizeBytes)}</span>
        </div>

        {/* Metadata edit */}
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Beschreibung</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionale Beschreibung…"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags (kommagetrennt)</label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="z.B. grundriss, expose, angebot"
            />
          </div>
          <Button onClick={saveMetadata} disabled={saving} size="sm" className="self-start">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : saved ? <Check className="h-4 w-4 mr-1.5" /> : null}
            {saved ? "Gespeichert" : "Metadaten speichern"}
          </Button>
        </div>

        {/* Stage links */}
        {states.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Verfügbar in Stages
            </p>
            <div className="flex flex-col gap-1.5">
              {states.map((s) => {
                const linked = linkedIds.includes(s.id)
                return (
                  <label
                    key={s.id}
                    className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-md hover:bg-muted cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={linked}
                      onChange={() => toggleStage(s.id)}
                      className="h-4 w-4 rounded accent-primary"
                    />
                    <span>{s.name}</span>
                    {linked && (
                      <Badge variant="secondary" className="text-xs ml-auto">verknüpft</Badge>
                    )}
                  </label>
                )
              })}
            </div>
            <Button
              onClick={saveStages}
              disabled={savingStages}
              size="sm"
              variant="outline"
              className="mt-3"
            >
              {savingStages && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Stages speichern
            </Button>
          </div>
        )}

        {/* Delete */}
        <div className="mt-auto pt-4 border-t">
          <Button
            onClick={deleteAsset}
            disabled={deleting}
            variant="destructive"
            size="sm"
            className="w-full"
          >
            {deleting
              ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              : <Trash2 className="h-4 w-4 mr-1.5" />
            }
            Asset löschen
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
