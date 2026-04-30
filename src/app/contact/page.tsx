import type { Metadata } from "next"
import Link from "next/link"
import { Zap, Mail, MessageCircle } from "lucide-react"

export const metadata: Metadata = {
  title: "Contact — Conversio",
  description: "Get in touch with the Conversio team.",
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="fixed top-0 w-full bg-white border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Conversio</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/product" className="text-sm font-medium text-gray-600 hover:text-gray-900">Product</Link>
            <Link href="/features" className="text-sm font-medium text-gray-600 hover:text-gray-900">Features</Link>
            <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900">Pricing</Link>
            <Link href="/contact" className="text-sm font-medium text-blue-600">Contact</Link>
          </div>
          <Link href="/login" className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors">
            Get Started Free
          </Link>
        </div>
      </nav>

      <div className="pt-24 pb-20 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold text-gray-900">Get in Touch</h1>
          <p className="text-lg text-gray-500">
            Questions about pricing, onboarding, or a custom plan? We respond within one business day.
          </p>
        </div>

        <div className="space-y-4">
          <a
            href="mailto:info@attrsales.net"
            className="flex items-center gap-4 p-6 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Email</p>
              <p className="text-sm text-blue-600">info@attrsales.net</p>
            </div>
          </a>

          <div className="flex items-center gap-4 p-6 bg-gray-50 rounded-xl border border-gray-200">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">WhatsApp</p>
              <p className="text-sm text-gray-500">Available soon</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center space-y-3">
          <p className="font-semibold text-gray-900">Want a live demo?</p>
          <p className="text-sm text-gray-600">
            We can walk you through Conversio in 20 minutes and set up a trial tailored to your team.
          </p>
          <a
            href="mailto:info@attrsales.net?subject=Demo Request — Conversio"
            className="inline-block px-6 py-2.5 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Request a Demo
          </a>
        </div>
      </div>

      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <span>© 2026 Conversio. All rights reserved.</span>
          <div className="flex gap-6">
            <Link href="/imprint" className="hover:text-gray-900">Imprint</Link>
            <Link href="/privacy" className="hover:text-gray-900">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
