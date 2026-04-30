import type { Metadata } from "next"
import Link from "next/link"
import { Zap, ArrowRight } from "lucide-react"

export const metadata: Metadata = {
  title: "Product — Conversio",
  description: "The AI-Powered WhatsApp CRM That Replaces Your Sales Team — And Outperforms Them.",
}

export default function ProductPage() {
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
            <Link href="/product" className="text-sm font-medium text-blue-600">Product</Link>
            <Link href="/features" className="text-sm font-medium text-gray-600 hover:text-gray-900">Features</Link>
            <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900">Pricing</Link>
            <Link href="/contact" className="text-sm font-medium text-gray-600 hover:text-gray-900">Contact</Link>
          </div>
          <Link href="/login" className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors">
            Get Started Free
          </Link>
        </div>
      </nav>

      <div className="pt-24 pb-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">

        {/* Hero */}
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            The AI-Powered WhatsApp CRM<br />That Replaces Your Sales Team —<br />And Outperforms Them
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Stop hiring setters. Stop losing leads in scattered chats. Conversio is the first AI-native CRM
            built for teams that sell on WhatsApp — handling everything from first contact to closed deal
            without human intervention.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="px-8 py-3 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors">
              Start for Free
            </Link>
            <Link href="/features" className="flex items-center gap-2 text-sm font-semibold text-blue-500 hover:text-blue-600 transition-colors">
              Explore Features <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* What Makes Conversio Different */}
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-gray-900">What Makes Conversio Different</h2>
          <div className="space-y-6">
            {[
              {
                icon: "🤖",
                title: "AI That Sells, Not Just Chats",
                desc: "Your AI agent qualifies leads, sends personalized offers, calculates insurance quotes, and closes deals — 24/7. It learns your product, pricing, and sales process. You just approve the revenue.",
              },
              {
                icon: "📊",
                title: "Visual Pipeline, Zero Chaos",
                desc: "Drag-and-drop boards track every lead from first message to payment. Know exactly who needs follow-up and when. No more leads falling through cracks.",
              },
              {
                icon: "💬",
                title: "One Inbox, Every Channel",
                desc: "WhatsApp Business, web chat, Meta leads — all unified. Your team sees full conversation history instantly. Customers never repeat themselves.",
              },
              {
                icon: "⚡",
                title: "Zero-Code Automations",
                desc: "Build custom flows in minutes. Auto-reply to FAQs, route hot leads, send follow-ups, calculate quotes, and trigger actions based on behavior.",
              },
              {
                icon: "🧠",
                title: "BrainLab — Your AI Knowledge Base",
                desc: "Upload pricing sheets, product docs, and brand guidelines. Your AI uses them to answer accurately, calculate quotes, and close consistently. Train once, scale forever.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-5 bg-gray-50 rounded-xl p-6 border border-gray-100">
                <span className="text-3xl shrink-0">{item.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* What Conversio Replaces */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">What Conversio Replaces</h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-4 font-semibold text-gray-500">Instead Of</th>
                  <th className="text-left px-6 py-4 font-semibold text-blue-600">Conversio Does</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ["Human Setters", "AI qualifies leads 24/7, books meetings, warms up prospects"],
                  ["Manual Quote Calculation", "AI calculates insurance quotes, service pricing, custom offers instantly"],
                  ["Follow-up Emails", "Automated WhatsApp sequences with personalized timing"],
                  ["Spreadsheet Tracking", "Real-time pipeline with deal probability and revenue forecasting"],
                  ["Multiple Tools", "One platform: CRM + AI + WhatsApp + automation"],
                ].map(([instead, does]) => (
                  <tr key={instead} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-gray-500">{instead}</td>
                    <td className="px-6 py-4 text-gray-900 font-medium">{does}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Numbers */}
        <div className="bg-blue-600 rounded-2xl p-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "3×", label: "Faster lead response time" },
            { value: "40%+", label: "Increase in conversion rates" },
            { value: "10h+", label: "Saved per team member / week" },
            { value: "$0", label: "Spent on human setters" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-white">{s.value}</p>
              <p className="text-blue-100 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Ready to close more deals on autopilot?</h2>
          <Link href="/login" className="inline-block px-8 py-3 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors">
            Start for Free
          </Link>
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
