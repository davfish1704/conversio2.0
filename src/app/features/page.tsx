import type { Metadata } from "next"
import Link from "next/link"
import { Zap } from "lucide-react"

export const metadata: Metadata = {
  title: "Features — Conversio",
  description: "Automated lead outreach, AI integration, MCP tool calls, and more — everything your sales team needs on WhatsApp.",
}

export default function FeaturesPage() {
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
            <Link href="/features" className="text-sm font-medium text-blue-600">Features</Link>
            <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900">Pricing</Link>
            <Link href="/contact" className="text-sm font-medium text-gray-600 hover:text-gray-900">Contact</Link>
          </div>
          <Link href="/login" className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors">
            Get Started Free
          </Link>
        </div>
      </nav>

      <div className="pt-24 pb-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">

        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">Everything You Need to Close Deals on WhatsApp</h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            From automated outreach to AI-powered closings — every feature designed for sales teams that operate on WhatsApp.
          </p>
        </div>

        {/* Feature 1 — Automated Lead Outreach */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚡</span>
            <h2 className="text-2xl font-bold text-gray-900">Automated Lead Outreach</h2>
          </div>
          <p className="text-gray-600 leading-relaxed">
            Never let a lead go cold. Conversio automatically reaches out the moment a lead enters your pipeline —
            with the right message, at the right time, on WhatsApp.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Instant first contact", desc: "New leads receive a personalized WhatsApp message within seconds of entering the system." },
              { title: "Follow-up sequences", desc: "Automated multi-step follow-up flows with configurable timing. No manual chasing." },
              { title: "Behavior-based triggers", desc: "Trigger outreach based on lead actions — opened a message, clicked a link, went quiet for N days." },
              { title: "Lead scoring", desc: "AI scores each lead based on engagement, responses, and profile data. Focus on the hottest prospects." },
            ].map((f) => (
              <div key={f.title} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <p className="font-semibold text-gray-900 mb-1">{f.title}</p>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Feature 2 — AI Integration */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🤖</span>
            <h2 className="text-2xl font-bold text-gray-900">AI Integration</h2>
          </div>
          <p className="text-gray-600 leading-relaxed">
            Your AI agent is not a chatbot — it is a full sales rep. It understands context, uses your knowledge base,
            handles objections, and closes deals at human quality, at machine speed.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "BrainLab knowledge base", desc: "Upload your pricing, product docs, FAQs, and guidelines. The AI uses them to answer accurately every time." },
              { title: "Context-aware responses", desc: "The AI reads the full conversation history and adapts its responses accordingly — no repetition, no confusion." },
              { title: "Qualification logic", desc: "Define qualification criteria. The AI asks the right questions, scores the lead, and routes to the right stage." },
              { title: "Human handoff", desc: "Freeze a conversation at any time to take over manually. The AI picks back up seamlessly when you're done." },
              { title: "Multi-model support", desc: "Run Groq (Llama), Kimi, or custom models per board. Choose speed, cost, or quality based on your use case." },
              { title: "Tone & persona config", desc: "Configure the AI's style, personality, and communication rules per board — brand-consistent at all times." },
            ].map((f) => (
              <div key={f.title} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <p className="font-semibold text-gray-900 mb-1">{f.title}</p>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Feature 3 — MCP Tool Calls */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔗</span>
            <h2 className="text-2xl font-bold text-gray-900">MCP Tool Calls</h2>
          </div>
          <p className="text-gray-600 leading-relaxed">
            Conversio AI agents can use tools mid-conversation — not just chat. They calculate, look up data,
            update records, and trigger workflows in real time, all without leaving the WhatsApp thread.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Real-time quote calculation", desc: "The AI calls a pricing tool, gets the quote, and sends it — while the customer is still in the chat." },
              { title: "CRM record updates", desc: "AI agents can update lead fields, change pipeline stages, and add notes as part of the conversation." },
              { title: "External API calls", desc: "Connect any REST API as a tool. Look up inventory, check eligibility, fetch product data — live." },
              { title: "Workflow triggers", desc: "AI can trigger automation workflows — schedule follow-ups, send documents, notify team members." },
            ].map((f) => (
              <div key={f.title} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <p className="font-semibold text-gray-900 mb-1">{f.title}</p>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Additional Features */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Everything Else</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: "📋", title: "Visual Kanban Pipeline", desc: "Drag-and-drop boards for every stage of your sales process." },
              { icon: "📥", title: "CSV & API Lead Import", desc: "Bulk import leads via CSV or push them in via REST API." },
              { icon: "👥", title: "Team Management", desc: "Roles, permissions, and board-level access control." },
              { icon: "📊", title: "Analytics & Reports", desc: "Conversion rates, response times, lead volume — all tracked." },
              { icon: "🌐", title: "Multi-channel Inbox", desc: "WhatsApp Business, Facebook, web — unified in one place." },
              { icon: "🔒", title: "GDPR Compliant", desc: "Data hosted in compliance with EU privacy regulations." },
            ].map((f) => (
              <div key={f.title} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <span className="text-2xl">{f.icon}</span>
                <p className="font-semibold text-gray-900 mt-2 mb-1">{f.title}</p>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-blue-600 rounded-2xl p-10 text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">Ready to see it in action?</h2>
          <p className="text-blue-100">Start your free trial — no credit card required.</p>
          <Link href="/login" className="inline-block px-8 py-3 text-sm font-semibold text-blue-600 bg-white rounded-lg hover:bg-blue-50 transition-colors">
            Get Started Free
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
