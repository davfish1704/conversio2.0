"use client"

import { useState, useEffect, useContext } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import BoardTabs from "@/components/boards/BoardTabs"
import BoardSkeleton from "@/components/boards/BoardSkeleton"
import { LanguageContext } from "@/lib/LanguageContext"

type Asset = {
  id: string
  type: string
  name: string
  content: string | null
  fileUrl: string | null
  tags: string[]
}

interface Board {
  id: string
  name: string
  description: string | null
  isActive: boolean
}

export default function MediaManagerPage() {
  const params = useParams()
  const boardId = params.id as string
  const { t } = useContext(LanguageContext)

  const [board, setBoard] = useState<Board | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [newAsset, setNewAsset] = useState({
    type: "TEXT_SNIPPET",
    name: "",
    content: "",
    fileUrl: "",
    tags: "",
  })

  useEffect(() => {
    fetch(`/api/boards/${boardId}`)
      .then((res) => res.json())
      .then((data) => setBoard(data.board || data))

    fetch(`/api/boards/${boardId}/assets`)
      .then((res) => res.json())
      .then((data) => setAssets(data || []))
  }, [boardId])

  const addAsset = async () => {
    const asset = {
      ...newAsset,
      tags: newAsset.tags.split(",").map((t) => t.trim()).filter(Boolean),
    }
    const res = await fetch(`/api/boards/${boardId}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(asset),
    })
    if (res.ok) {
      const created = await res.json()
      setAssets([...assets, created])
      setNewAsset({ type: "TEXT_SNIPPET", name: "", content: "", fileUrl: "", tags: "" })
    }
  }

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "AUDIO_MEMO": return "🎙️"
      case "PDF_DOC": return "📄"
      case "IMAGE_ASSET": return "🖼️"
      case "TEXT_SNIPPET": return "📝"
      case "KNOWLEDGE_BASE": return "📚"
      default: return "📦"
    }
  }

  const getAssetLabel = (type: string) => {
    switch (type) {
      case "AUDIO_MEMO": return t("assets.audioMemo")
      case "PDF_DOC": return t("assets.pdfDocument")
      case "IMAGE_ASSET": return t("assets.image")
      case "TEXT_SNIPPET": return t("assets.textSnippet")
      case "KNOWLEDGE_BASE": return t("assets.knowledgeBase")
      default: return type
    }
  }

  if (!board) return <BoardSkeleton />

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <BoardTabs board={board} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t("assets.mediaManager")}</h2>
            <p className="text-gray-500 dark:text-gray-400">{t("assets.boardMemory")}</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t("assets.addNewAsset")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t("common.type")}</label>
                <Select
                  value={newAsset.type}
                  onValueChange={(val) => setNewAsset({ ...newAsset, type: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUDIO_MEMO">🎙️ {t("assets.audioMemo")}</SelectItem>
                    <SelectItem value="PDF_DOC">📄 {t("assets.pdfDocument")}</SelectItem>
                    <SelectItem value="IMAGE_ASSET">🖼️ {t("assets.image")}</SelectItem>
                    <SelectItem value="TEXT_SNIPPET">📝 {t("assets.textSnippet")}</SelectItem>
                    <SelectItem value="KNOWLEDGE_BASE">📚 {t("assets.knowledgeBase")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">{t("common.name")}</label>
                <Input
                  value={newAsset.name}
                  onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                  placeholder={t("assets.enterName")}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">{t("assets.contentURL")}</label>
                <Input
                  value={newAsset.type === "AUDIO_MEMO" || newAsset.type === "PDF_DOC" || newAsset.type === "IMAGE_ASSET" ? newAsset.fileUrl : newAsset.content}
                  onChange={(e) => {
                    if (["AUDIO_MEMO", "PDF_DOC", "IMAGE_ASSET"].includes(newAsset.type)) {
                      setNewAsset({ ...newAsset, fileUrl: e.target.value })
                    } else {
                      setNewAsset({ ...newAsset, content: e.target.value })
                    }
                  }}
                  placeholder={newAsset.type === "AUDIO_MEMO" ? t("assets.enterURL") : t("assets.enterContent")}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {newAsset.type === "AUDIO_MEMO"
                    ? t("assets.audioURLNote")
                    : t("assets.textOrURLNote")}
                </p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">{t("common.tags")}</label>
                <Input
                  value={newAsset.tags}
                  onChange={(e) => setNewAsset({ ...newAsset, tags: e.target.value })}
                  placeholder={t("assets.tagsPlaceholder")}
                />
              </div>
            </div>
            <Button onClick={addAsset} className="mt-4">{t("assets.saveAsset")}</Button>
          </CardContent>
        </Card>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">{t("assets.all")} ({assets.length})</TabsTrigger>
            <TabsTrigger value="audio">🎙️ {t("assets.audio")}</TabsTrigger>
            <TabsTrigger value="docs">📄 {t("assets.documents")}</TabsTrigger>
            <TabsTrigger value="text">📝 {t("assets.text")}</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <div className="grid grid-cols-3 gap-4">
              {assets.map((asset) => (
                <Card key={asset.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{getAssetIcon(asset.type)} {asset.name}</CardTitle>
                      <Badge variant="outline">{asset.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                      {asset.content || asset.fileUrl || t("assets.noContent")}
                    </p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {asset.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {assets.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">{t("assets.noAssetsYet")}</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
