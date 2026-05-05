import type { Metadata } from "next"
import { Mail, MessageCircle, Calendar } from "lucide-react"
import PublicNav from "@/components/layout/PublicNav"
import PublicFooter from "@/components/layout/PublicFooter"

export const metadata: Metadata = {
  title: "Contact — Conversio",
  description: "Get in touch with the Conversio team.",
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white text-[#0B0B0C] antialiased">
      <PublicNav activeLink="/contact" />

      <div className="pt-28 md:pt-36 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.15em] mb-3 animate-fade-up">
              Contact
            </p>
            <h1
              className="font-syne text-5xl md:text-6xl font-bold tracking-tight text-[#0B0B0C] mb-6 animate-fade-up leading-[0.92]"
              style={{ animationDelay: "60ms" }}
            >
              Let&apos;s Talk
            </h1>
            <p
              className="text-lg text-zinc-500 leading-relaxed mb-12 animate-fade-up"
              style={{ animationDelay: "120ms" }}
            >
              Questions about pricing, onboarding, or a custom plan?
              We respond within one business day.
            </p>

            <div className="space-y-3">
              <a
                href="mailto:info@attrsales.net"
                className="flex items-center gap-4 p-6 bg-zinc-50 rounded-2xl border border-zinc-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-200 group"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-syne font-bold text-[#0B0B0C]">Email</p>
                  <p className="text-sm text-blue-600 mt-0.5">info@attrsales.net</p>
                </div>
              </a>

              <div className="flex items-center gap-4 p-6 bg-zinc-50 rounded-2xl border border-zinc-100 opacity-60 cursor-not-allowed">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-syne font-bold text-[#0B0B0C]">WhatsApp</p>
                  <p className="text-sm text-zinc-400 mt-0.5">Available soon</p>
                </div>
              </div>

              <a
                href="mailto:info@attrsales.net?subject=Demo Request — Conversio"
                className="flex items-center gap-4 p-6 bg-blue-50 rounded-2xl border border-blue-100 hover:border-blue-300 hover:bg-blue-100/50 transition-all duration-200 group"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-syne font-bold text-[#0B0B0C]">Book a Demo</p>
                  <p className="text-sm text-blue-600 mt-0.5">20-minute walkthrough + trial setup</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  )
}
