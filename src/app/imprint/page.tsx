import type { Metadata } from "next"
import Link from "next/link"
import PublicNav from "@/components/layout/PublicNav"
import PublicFooter from "@/components/layout/PublicFooter"

export const metadata: Metadata = {
  title: "Imprint — Conversio",
}

export default function ImprintPage() {
  return (
    <div className="min-h-screen bg-white text-[#1d1d1f] antialiased">
      <PublicNav />

      <div className="pt-24 pb-20">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-[#1d1d1f] mb-8">Imprint</h1>

          <div className="bg-[#F5F5F7] rounded-xl border border-gray-200 p-6 space-y-3 text-sm">
            <p><strong className="text-[#1d1d1f]">TR Sales LLC</strong></p>
            <p className="text-[#6e6e73]">30 N Gould St Ste R</p>
            <p className="text-[#6e6e73]">Sheridan, WY 82801</p>
            <p className="text-[#6e6e73]">USA</p>
            <p className="pt-2">
              <a href="mailto:info@attrsales.net" className="text-blue-500 hover:text-blue-600">
                info@attrsales.net
              </a>
            </p>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  )
}
