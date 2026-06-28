"use client"

import { useRef, useState, useCallback } from "react"
import { Upload, Loader2, CheckCircle2, XCircle, RefreshCw, X } from "lucide-react"
import { cn } from "@/lib/utils"

const MAX_CONCURRENT = 3

interface AssetUploadZoneProps {
  boardId: string
  onUploaded: (asset: unknown) => void
}

type UploadStatus = "pending" | "uploading" | "done" | "error"

interface FileEntry {
  id: string
  file: File
  status: UploadStatus
  progress: number
  error: string | null
}

function uploadXHR(url: string, file: File, onProgress: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`R2 abgelehnt (HTTP ${xhr.status})`))
    xhr.onerror = () => reject(new Error("Netzwerkfehler beim Upload zu R2"))
    xhr.open("PUT", url)
    xhr.setRequestHeader("Content-Type", file.type)
    xhr.send(file)
  })
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function AssetUploadZone({ boardId, onUploaded }: AssetUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [entries, setEntries] = useState<FileEntry[]>([])

  // Track active upload count outside React state to avoid stale closures in processQueue
  const activeRef = useRef(0)
  // Forward ref so doUpload can call processQueue without a circular useCallback dependency
  const processQueueRef = useRef<() => void>(() => {})

  const patchEntry = useCallback((id: string, patch: Partial<FileEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }, [])

  const doUpload = useCallback(
    async (entry: FileEntry) => {
      try {
        // Step 1 — get presigned PUT URL from Vercel (small JSON request, bypasses 4.5 MB body limit)
        const pRes = await fetch(`/api/boards/${boardId}/assets/presign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: entry.file.name,
            contentType: entry.file.type,
            size: entry.file.size,
          }),
        })
        const pData = await pRes.json()
        if (!pRes.ok) throw new Error(pData.error ?? `Presign fehlgeschlagen (${pRes.status})`)

        // Step 2 — PUT the file directly from the browser to R2 (no Vercel in the data path)
        await uploadXHR(pData.presignedUrl as string, entry.file, (p) =>
          patchEntry(entry.id, { progress: p }),
        )

        // Step 3 — confirm with backend to create the Prisma Asset record
        const cRes = await fetch(`/api/boards/${boardId}/assets/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            r2Key: pData.r2Key,
            name: entry.file.name.replace(/\.[^.]+$/, ""),
            size: entry.file.size,
            contentType: entry.file.type,
          }),
        })
        const cData = await cRes.json()
        if (!cRes.ok) throw new Error(cData.error ?? `Bestätigung fehlgeschlagen (${cRes.status})`)

        patchEntry(entry.id, { status: "done", progress: 100 })
        onUploaded(cData)
      } catch (err) {
        patchEntry(entry.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Upload fehlgeschlagen",
        })
      } finally {
        activeRef.current--
        processQueueRef.current()
      }
    },
    [boardId, onUploaded, patchEntry],
  )

  const processQueue = useCallback(() => {
    setEntries((prev) => {
      const slots = MAX_CONCURRENT - activeRef.current
      if (slots <= 0) return prev

      const pending = prev.filter((e) => e.status === "pending")
      if (pending.length === 0) return prev

      const batch = pending.slice(0, slots)
      activeRef.current += batch.length
      const batchIds = new Set(batch.map((e) => e.id))

      // Kick off uploads outside the render cycle
      batch.forEach((e) => setTimeout(() => doUpload(e), 0))

      return prev.map((e) => (batchIds.has(e.id) ? { ...e, status: "uploading", progress: 0 } : e))
    })
  }, [doUpload])

  // Keep ref current so doUpload can always call the latest processQueue
  processQueueRef.current = processQueue

  const addFiles = useCallback((files: File[]) => {
    if (files.length === 0) return
    const newEntries: FileEntry[] = files.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      status: "pending",
      progress: 0,
      error: null,
    }))
    setEntries((prev) => [...prev, ...newEntries])
    setTimeout(() => processQueueRef.current(), 0)
  }, [])

  const retry = useCallback(
    (entry: FileEntry) => {
      patchEntry(entry.id, { status: "pending", progress: 0, error: null })
      setTimeout(() => processQueueRef.current(), 0)
    },
    [patchEntry],
  )

  const remove = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      addFiles(Array.from(e.dataTransfer.files))
    },
    [addFiles],
  )

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      addFiles(Array.from(e.target.files ?? []))
      e.target.value = ""
    },
    [addFiles],
  )

  const doneCount = entries.filter((e) => e.status === "done").length
  const errorCount = entries.filter((e) => e.status === "error").length
  const hasActive = entries.some((e) => e.status === "uploading" || e.status === "pending")

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all select-none",
          dragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,audio/*,video/*,.doc,.docx,.txt"
          onChange={onFileChange}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Upload className="h-8 w-8" />
          <p className="text-sm font-medium">Dateien hierher ziehen oder klicken</p>
          <p className="text-xs opacity-70">
            Bilder, PDFs, Audio, Video, Dokumente · max. 25 MB · Mehrfachauswahl möglich
          </p>
        </div>
      </div>

      {/* File list */}
      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.length > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
              <span>
                {doneCount}/{entries.length} hochgeladen
                {errorCount > 0 && (
                  <span className="text-destructive ml-1.5">· {errorCount} fehlgeschlagen</span>
                )}
              </span>
              {!hasActive && doneCount > 0 && (
                <button
                  onClick={() => setEntries((prev) => prev.filter((e) => e.status !== "done"))}
                  className="hover:text-foreground transition-colors"
                >
                  Erledigte ausblenden
                </button>
              )}
            </div>
          )}

          {entries.map((entry) => (
            <div
              key={entry.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2",
                entry.status === "error"
                  ? "border-destructive/30 bg-destructive/5"
                  : entry.status === "done"
                    ? "border-emerald-200/50 bg-emerald-50/30 dark:border-emerald-800/30 dark:bg-emerald-950/20"
                    : "border-border bg-card",
              )}
            >
              {/* Status icon */}
              <div className="shrink-0 w-5 flex items-center justify-center">
                {entry.status === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                {entry.status === "error" && <XCircle className="w-4 h-4 text-destructive" />}
                {entry.status === "uploading" && (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                )}
                {entry.status === "pending" && (
                  <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/25" />
                )}
              </div>

              {/* Filename + progress + error */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "truncate text-sm",
                    entry.status === "done" && "text-muted-foreground",
                  )}
                >
                  {entry.file.name}
                </p>
                {entry.status === "uploading" && (
                  <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-150"
                      style={{ width: `${entry.progress}%` }}
                    />
                  </div>
                )}
                {entry.error && (
                  <p className="text-xs text-destructive mt-0.5 truncate" title={entry.error}>
                    {entry.error}
                  </p>
                )}
              </div>

              {/* File size */}
              <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                {formatSize(entry.file.size)}
              </span>

              {/* Retry button (error only) */}
              {entry.status === "error" && (
                <button
                  onClick={(e) => { e.stopPropagation(); retry(entry) }}
                  className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                  title="Erneut versuchen"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Remove (blocked while uploading) */}
              {entry.status !== "uploading" && (
                <button
                  onClick={(e) => { e.stopPropagation(); remove(entry.id) }}
                  className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                  title="Entfernen"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
