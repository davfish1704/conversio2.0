"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { Upload, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import BoardTabs from "@/components/boards/BoardTabs"
import BoardSkeleton from "@/components/boards/BoardSkeleton"
import { AssetFilters, type AssetTypeFilter } from "@/components/boards/assets/AssetFilters"
import { AssetCard } from "@/components/boards/assets/AssetCard"
import { AssetUploadZone } from "@/components/boards/assets/AssetUploadZone"
import { AssetDetailDrawer } from "@/components/boards/assets/AssetDetailDrawer"
import type { Asset, BoardState } from "@/components/boards/assets/types"

interface Board {
  id: string
  name: string
  description: string | null
  isActive: boolean
}

export default function AssetsPage() {
  const { id: boardId } = useParams() as { id: string }

  const [board,     setBoard]     = useState<Board | null>(null)
  const [assets,    setAssets]    = useState<Asset[]>([])
  const [states,    setStates]    = useState<BoardState[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState("")
  const [typeFilter, setTypeFilter] = useState<AssetTypeFilter>("ALL")
  const [showUpload, setShowUpload] = useState(false)
  const [selected,  setSelected]  = useState<Asset | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalBytes = assets.reduce((sum, a) => sum + a.sizeBytes, 0)

  function formatStorage(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
  }

  // Load board + states once
  useEffect(() => {
    Promise.all([
      fetch(`/api/boards/${boardId}`).then((r) => r.json()),
      fetch(`/api/boards/${boardId}/states`).then((r) => r.json()),
    ]).then(([boardData, statesData]) => {
      setBoard(boardData.board ?? boardData)
      setStates(statesData.states ?? statesData ?? [])
    })
  }, [boardId])

  // Load assets when filters change
  const fetchAssets = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: "1", limit: "50" })
    if (search)                  params.set("search", search)
    if (typeFilter !== "ALL")    params.set("type", typeFilter)

    fetch(`/api/boards/${boardId}/assets?${params}`)
      .then((r) => r.json())
      .then((data) => setAssets(data.assets ?? []))
      .finally(() => setLoading(false))
  }, [boardId, search, typeFilter])

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(fetchAssets, 300)
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [fetchAssets])

  const handleUploaded = useCallback((asset: unknown) => {
    setAssets((prev) => [asset as Asset, ...prev])
    setShowUpload(false)
  }, [])

  const handleUpdated = useCallback((updated: Asset) => {
    setAssets((prev) => prev.map((a) => a.id === updated.id ? updated : a))
    setSelected(updated)
  }, [])

  const handleDeleted = useCallback((id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id))
    setSelected(null)
  }, [])

  const openDrawer = useCallback((asset: Asset) => {
    setSelected(asset)
    setDrawerOpen(true)
  }, [])

  if (!board) return <BoardSkeleton />

  return (
    <div className="min-h-screen bg-background">
      <BoardTabs board={board} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Asset-Bibliothek</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {assets.length} {assets.length === 1 ? "Asset" : "Assets"}
              {assets.length > 0 && (
                <> · <span className="tabular-nums">{formatStorage(totalBytes)}</span> gesamt</>
              )}
              {" · Bilder, PDFs, Audio & Dokumente"}
            </p>
          </div>
          <Button
            onClick={() => setShowUpload((v) => !v)}
            variant={showUpload ? "outline" : "default"}
            size="sm"
          >
            <Upload className="h-4 w-4 mr-1.5" />
            {showUpload ? "Schließen" : "Asset hochladen"}
          </Button>
        </div>

        {/* Upload zone */}
        {showUpload && (
          <AssetUploadZone boardId={boardId} onUploaded={handleUploaded} />
        )}

        {/* Filters */}
        <AssetFilters
          search={search}
          typeFilter={typeFilter}
          onSearchChange={setSearch}
          onTypeChange={setTypeFilter}
        />

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Wird geladen…</span>
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <p className="text-muted-foreground text-sm">
              {search || typeFilter !== "ALL"
                ? "Keine Assets für diese Suche gefunden."
                : "Noch keine Assets hochgeladen."}
            </p>
            {!showUpload && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpload(true)}
              >
                <Upload className="h-4 w-4 mr-1.5" />
                Erstes Asset hochladen
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {assets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} onClick={() => openDrawer(asset)} />
            ))}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      <AssetDetailDrawer
        asset={selected}
        states={states}
        boardId={boardId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />
    </div>
  )
}
