import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Imprint — Conversio",
}

export default function ImprintPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Imprint</h1>
        <p className="text-gray-700">
          <strong>TR Sales LLC</strong>
        </p>
        <div className="mt-8">
          <Link href="/" className="text-sm text-blue-600 hover:underline">← Back to Home</Link>
        </div>
      </div>
    </div>
  )
}
