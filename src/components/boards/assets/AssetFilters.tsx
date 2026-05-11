"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type AssetTypeFilter = "ALL" | "IMAGE" | "PDF" | "AUDIO" | "VIDEO" | "DOCUMENT"

interface AssetFiltersProps {
  search: string
  typeFilter: AssetTypeFilter
  onSearchChange: (v: string) => void
  onTypeChange: (v: AssetTypeFilter) => void
}

export function AssetFilters({ search, typeFilter, onSearchChange, onTypeChange }: AssetFiltersProps) {
  return (
    <div className="flex gap-3 items-center">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Assets durchsuchen…"
          className="pl-9"
        />
      </div>
      <Select value={typeFilter} onValueChange={(v) => onTypeChange(v as AssetTypeFilter)}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Alle Typen</SelectItem>
          <SelectItem value="IMAGE">Bilder</SelectItem>
          <SelectItem value="PDF">PDFs</SelectItem>
          <SelectItem value="AUDIO">Audio</SelectItem>
          <SelectItem value="VIDEO">Video</SelectItem>
          <SelectItem value="DOCUMENT">Dokumente</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
