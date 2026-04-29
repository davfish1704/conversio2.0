"use client"

import { useState, useCallback, useContext } from "react"
import { LanguageContext } from "@/lib/LanguageContext"

interface LeadImportModalProps {
  isOpen: boolean
  onClose: () => void
  boardId: string
  onSuccess: () => void
}

type ImportTab = "file" | "api"

export default function LeadImportModal({ isOpen, onClose, boardId, onSuccess }: LeadImportModalProps) {
  const [activeTab, setActiveTab] = useState<ImportTab>("file")
  const [file, setFile] = useState<File | null>(null)
  const [manualLead, setManualLead] = useState({ name: "", phone: "", email: "", tags: "" })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ imported: number; errors: string[] } | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const { t } = useContext(LanguageContext)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setUploadResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setIsUploading(true)
    setUploadResult(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch(`/api/boards/${boardId}/leads/import`, {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      setUploadResult(data)
      if (data.imported > 0) {
        onSuccess()
      }
    } catch {
      setUploadResult({ imported: 0, errors: ["Upload failed"] })
    } finally {
      setIsUploading(false)
    }
  }

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualLead.phone) return

    setIsCreating(true)
    try {
      const res = await fetch(`/api/boards/${boardId}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: manualLead.name,
          phone: manualLead.phone,
          email: manualLead.email,
          tags: manualLead.tags ? manualLead.tags.split(",").map((t) => t.trim()) : [],
          source: "manual",
        }),
      })

      if (res.ok) {
        setManualLead({ name: "", phone: "", email: "", tags: "" })
        onSuccess()
      }
    } finally {
      setIsCreating(false)
    }
  }

  const downloadTemplate = () => {
    const csv = "name,phone,email,tags\nMax Mustermann,+4915731329868,max@example.com,hot_lead\nAnna Schmidt,+4915123456789,anna@test.de,insurance"
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "lead-template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const curlExample = `curl -X POST https://conversio-corp-v2.vercel.app/api/boards/${boardId}/leads \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer {api_token}" \\
  -d '{
    "name": "Max Mustermann",
    "phone": "+4915731329868",
    "email": "max@example.com",
    "tags": ["hot_lead", "insurance"]
  }'`

  const copyCurl = useCallback(() => {
    navigator.clipboard.writeText(curlExample)
  }, [curlExample])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("leadImport.importLeads")}</h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex gap-1 mt-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("file")}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${
                activeTab === "file" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {t("leadImport.fileUpload")}
            </button>
            <button
              onClick={() => setActiveTab("api")}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${
                activeTab === "api" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {t("leadImport.apiManual")}
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === "file" ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">{t("leadImport.acceptedFormats")}</p>
                <button
                  onClick={downloadTemplate}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {t("leadImport.downloadTemplate")}
                </button>
              </div>

              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
                  file ? "border-blue-300 bg-blue-50" : "border-gray-300 hover:border-gray-400"
                }`}
              >
                {file ? (
                  <div>
                    <svg className="w-8 h-8 text-blue-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                    <button onClick={() => setFile(null)} className="text-xs text-red-600 hover:text-red-700 mt-2">
                      {t("leadImport.remove")}
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm font-medium text-gray-700">{t("crm.dropFiles")}</p>
                    <p className="text-xs text-gray-500 mt-1">{t("leadImport.csvOrExcel")}</p>
                    <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
                  </label>
                )}
              </div>

              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isUploading ? t("leadImport.importing") : t("leadImport.importLeadsBtn")}
              </button>

              {uploadResult && (
                <div className={`p-4 rounded-lg text-sm ${uploadResult.imported > 0 ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                  <p className="font-medium">
                    {uploadResult.imported} {t("leadImport.leadsImported")}
                    {uploadResult.errors.length > 0 && `, ${uploadResult.errors.length} ${t("leadImport.errors")}`}
                  </p>
                  {uploadResult.errors.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs">
                      {uploadResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>&bull; {err}</li>
                      ))}
                      {uploadResult.errors.length > 5 && <li>... {t("leadImport.andMore").replace("{count}", String(uploadResult.errors.length - 5))}</li>}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <form onSubmit={handleCreateManual} className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">{t("leadImport.addManually")}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">{t("common.name")}</label>
                    <input
                      type="text"
                      value={manualLead.name}
                      onChange={(e) => setManualLead({ ...manualLead, name: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Max Mustermann"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">{t("leadImport.phoneRequired")}</label>
                    <input
                      type="tel"
                      value={manualLead.phone}
                      onChange={(e) => setManualLead({ ...manualLead, phone: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+4915731329868"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">{t("common.email")}</label>
                    <input
                      type="email"
                      value={manualLead.email}
                      onChange={(e) => setManualLead({ ...manualLead, email: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="max@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">{t("common.tags")}</label>
                    <input
                      type="text"
                      value={manualLead.tags}
                      onChange={(e) => setManualLead({ ...manualLead, tags: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="hot_lead, insurance"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isCreating ? t("leadImport.saving") : t("leadImport.saveLead")}
                </button>
              </form>

              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">{t("leadImport.apiIntegration")}</h3>
                <p className="text-xs text-gray-500 mb-3">
                  {t("leadImport.replaceToken")}
                </p>
                <div className="relative bg-gray-900 rounded-lg p-4">
                  <pre className="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap break-all">
                    {curlExample}
                  </pre>
                  <button
                    onClick={copyCurl}
                    className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-white bg-gray-800 rounded transition"
                    title={t("leadImport.copy")}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
