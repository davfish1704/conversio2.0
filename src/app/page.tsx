import type { Metadata } from "next"
import Link from "next/link"
import { Zap, ArrowRight, Lock, Check, Menu, X } from "lucide-react"

export const metadata: Metadata = {
  title: "Conversio — The AI-Powered WhatsApp CRM",
  description:
    "The AI-powered WhatsApp CRM that replaces your sales team and outperforms them. Automated lead outreach, AI integration, and MCP tool calls — from first contact to closed deal.",
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Conversio</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link href="/product" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Product</Link>
              <Link href="/features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Features</Link>
              <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Pricing</Link>
              <Link href="/contact" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Contact</Link>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">Login</Link>
              <Link
                href="/login"
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Get Started Free
              </Link>
            </div>

            <MobileNav />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 bg-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/30 via-white to-white pointer-events-none" />
        <div className="dot-pattern absolute inset-0 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Link
            href="/product"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 text-sm hover:border-blue-300 transition-colors mb-8"
          >
            <span className="text-blue-500">New</span>
            <span className="text-gray-900">BrainLab — Your AI Knowledge Base</span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </Link>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 mb-6">
            The AI-Powered WhatsApp CRM
            <br className="hidden sm:block" /> That Replaces Your Sales Team
          </h1>

          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10">
            Stop hiring setters. Stop losing leads in scattered chats. Conversio handles everything
            from first contact to closed deal — without human intervention.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3 text-sm font-semibold uppercase tracking-wide text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Start for Free
            </Link>
            <Link
              href="/product"
              className="w-full sm:w-auto px-8 py-3 text-sm font-semibold uppercase tracking-wide text-blue-500 bg-white border-2 border-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
            >
              See How It Works
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
            <div className="flex items-center gap-1.5"><Lock className="w-4 h-4" /><span>GDPR Compliant</span></div>
            <div className="flex items-center gap-1.5"><Check className="w-4 h-4 text-blue-500" /><span>No credit card required</span></div>
            <div className="flex items-center gap-1.5"><Check className="w-4 h-4 text-blue-500" /><span>14-day free trial</span></div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { value: "3×", label: "Faster Lead Response" },
              { value: "40%+", label: "Higher Conversion Rate" },
              { value: "10h+", label: "Saved Per Team Member / Week" },
              { value: "$0", label: "Spent on Human Setters" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-4xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What Makes Conversio Different */}
      <section id="features" className="py-20 bg-gradient-to-b from-white to-blue-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What Makes Conversio Different</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Built for teams that sell on WhatsApp — not just a CRM, an AI sales engine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: "🤖",
                title: "AI That Sells, Not Just Chats",
                desc: "Your AI agent qualifies leads, sends personalized offers, calculates insurance quotes, and closes deals — 24/7. You just approve the revenue.",
              },
              {
                icon: "📊",
                title: "Visual Pipeline, Zero Chaos",
                desc: "Drag-and-drop boards track every lead from first message to payment. Know exactly who needs follow-up and when.",
              },
              {
                icon: "💬",
                title: "One Inbox, Every Channel",
                desc: "WhatsApp Business, web chat, Meta leads — all unified. Your team sees full conversation history instantly.",
              },
              {
                icon: "⚡",
                title: "Zero-Code Automations",
                desc: "Build custom flows in minutes. Auto-reply to FAQs, route hot leads, send follow-ups, and trigger actions based on behavior.",
              },
              {
                icon: "🧠",
                title: "BrainLab — Your AI Knowledge Base",
                desc: "Upload pricing sheets, product docs, and brand guidelines. Train once, scale forever.",
              },
              {
                icon: "🔗",
                title: "MCP Tool Calls",
                desc: "AI agents use tools to calculate quotes, look up data, and trigger workflows — all directly in the conversation.",
              },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What Conversio Replaces */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What Conversio Replaces</h2>
          </div>
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
                  ["Manual Quote Calculation", "AI calculates insurance quotes, pricing, and custom offers instantly"],
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
      </section>

      {/* Industries */}
      <section className="py-20 bg-blue-50/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Built For Teams That Sell</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { industry: "Insurance", desc: "Instant quote calculation, policy comparison, application collection" },
              { industry: "Real Estate", desc: "Property matching, viewing bookings, mortgage pre-qualification" },
              { industry: "SaaS / Agencies", desc: "Demo booking, proposal generation, contract closing" },
              { industry: "E-Commerce", desc: "Personalized offers, abandoned cart recovery, upselling" },
              { industry: "Consulting", desc: "Discovery calls, proposal calculation, retainer closing" },
              { industry: "Any Sales Team", desc: "If you sell on WhatsApp, Conversio is your unfair advantage" },
            ].map((item) => (
              <div key={item.industry} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <p className="font-semibold text-gray-900 mb-1">{item.industry}</p>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to outperform your sales team?</h2>
          <p className="text-blue-100 mb-8">
            Join teams that have replaced manual outreach with AI-native sales on WhatsApp.
          </p>
          <Link
            href="/login"
            className="px-8 py-3 text-sm font-semibold text-blue-600 bg-white rounded-lg hover:bg-blue-50 transition inline-block"
          >
            Start for Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-500 rounded-md flex items-center justify-center">
                <Zap className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">Conversio</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <Link href="/imprint" className="hover:text-gray-900 transition-colors">Imprint</Link>
              <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy Policy</Link>
            </div>

            <p className="text-sm text-gray-400">© 2026 Conversio. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function MobileNav() {
  return (
    <div className="md:hidden">
      <details className="group">
        <summary className="list-none cursor-pointer p-2 text-gray-600 hover:text-gray-900 transition-colors">
          <Menu className="w-6 h-6 group-open:hidden" />
          <X className="w-6 h-6 hidden group-open:block" />
        </summary>
        <div className="absolute left-0 right-0 top-16 bg-white border-b border-gray-100 px-4 py-4 space-y-3">
          <Link href="/product" className="block text-sm font-medium text-gray-600 hover:text-gray-900 py-2">Product</Link>
          <Link href="/features" className="block text-sm font-medium text-gray-600 hover:text-gray-900 py-2">Features</Link>
          <Link href="/pricing" className="block text-sm font-medium text-gray-600 hover:text-gray-900 py-2">Pricing</Link>
          <Link href="/contact" className="block text-sm font-medium text-gray-600 hover:text-gray-900 py-2">Contact</Link>
          <div className="pt-3 border-t border-gray-100 space-y-3">
            <Link href="/login" className="block text-sm font-semibold text-gray-600 hover:text-gray-900 py-2">Login</Link>
            <Link
              href="/login"
              className="block w-full text-center px-5 py-2.5 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </details>
    </div>
  )
}
