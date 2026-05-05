import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Bot, Kanban, MessageSquare, Zap, Brain } from "lucide-react"
import PublicNav from "@/components/layout/PublicNav"
import PublicFooter from "@/components/layout/PublicFooter"

export const metadata: Metadata = {
  title: "Product — Conversio",
  description: "The AI-native CRM that replaces your sales team and outperforms them.",
}

export default function ProductPage() {
  return (
    <div className="min-h-screen bg-white text-[#0B0B0C] antialiased">
      <PublicNav activeLink="/product" />

      {/* Hero */}
      <section className="pt-28 md:pt-36 pb-16 md:pb-24 relative overflow-hidden">
        <div className="hero-mesh absolute inset-0 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.15em] mb-3 animate-fade-up">
            Product
          </p>
          <h1
            className="font-syne text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#0B0B0C] leading-[0.9] mb-8 animate-fade-up"
            style={{ animationDelay: "60ms" }}
          >
            The AI-Powered CRM
            <br />
            <span className="text-blue-600">That Replaces</span>
            <br />
            Your Sales Team
          </h1>
          <p
            className="text-lg text-zinc-500 max-w-xl leading-relaxed mb-10 animate-fade-up"
            style={{ animationDelay: "120ms" }}
          >
            Stop hiring setters. Stop losing leads in scattered chats. Conversio is the first
            AI-native CRM built for teams that sell on messaging — handling everything from
            first contact to closed deal without human intervention.
          </p>
          <div
            className="flex flex-wrap items-center gap-3 animate-fade-up"
            style={{ animationDelay: "180ms" }}
          >
            <Link
              href="/login"
              className="px-7 py-3.5 bg-blue-600 text-white font-semibold text-sm rounded-full hover:bg-blue-700 transition-all duration-200 shadow-lg shadow-blue-600/20 hover:scale-[1.02]"
            >
              Start for Free
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-[#0B0B0C] border border-zinc-200 rounded-full hover:border-zinc-400 hover:bg-zinc-50 transition-all duration-200"
            >
              Explore Features
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Product Screenshot */}
      <section className="pb-16 md:pb-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500/5 via-transparent to-blue-400/8 rounded-3xl blur-2xl pointer-events-none" />
            <div className="relative rounded-2xl border border-zinc-200 shadow-2xl shadow-zinc-300/25 overflow-hidden bg-white">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-50 border-b border-zinc-100">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-3">
                  <div className="bg-white rounded px-3 py-1 text-[10px] text-zinc-400 border border-zinc-100 max-w-[200px] mx-auto text-center font-mono">
                    app.conversio.io/boards
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 border border-green-100 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-medium text-green-700">AI Active</span>
                </div>
              </div>
              <div className="p-6 bg-gradient-to-br from-zinc-50/80 to-white">
                <div className="grid grid-cols-4 gap-3">
                  {["New Leads", "Qualified", "Proposal", "Closed"].map((stage, i) => (
                    <div key={stage} className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-semibold ${["text-blue-600", "text-amber-600", "text-violet-600", "text-green-600"][i]}`}>
                          {stage}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${["bg-blue-50 text-blue-600", "bg-amber-50 text-amber-600", "bg-violet-50 text-violet-600", "bg-green-50 text-green-600"][i]}`}>
                          {4 - i}
                        </span>
                      </div>
                      {Array.from({ length: 4 - i }).map((_, j) => (
                        <div key={j} className="bg-white border border-zinc-100 rounded-xl p-3 space-y-2 shadow-sm hover:shadow-md hover:border-zinc-200 transition-all duration-150 cursor-default">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${["bg-blue-100 text-blue-700", "bg-amber-100 text-amber-700", "bg-violet-100 text-violet-700", "bg-green-100 text-green-700"][i]}`}>
                              {["MK", "SB", "LW", "TF"][j]?.charAt(0) ?? "A"}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] font-semibold text-zinc-900 truncate">
                                {["Max K.", "Sarah B.", "Lisa W.", "Tom F."][j] ?? "Lead"}
                              </div>
                              <div className="text-[9px] text-zinc-400">WA · {["2m", "15m", "1h", "3h"][j]}</div>
                            </div>
                          </div>
                          <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${["bg-blue-500", "bg-amber-400", "bg-violet-500", "bg-green-500"][i]}`}
                              style={{ width: `${85 - i * 15 + j * 3}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What makes Conversio different */}
      <section className="py-16 md:py-24 bg-zinc-50/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.15em] mb-3">
              Why Conversio
            </p>
            <h2 className="font-syne text-4xl font-bold tracking-tight text-[#0B0B0C]">
              What Makes Conversio Different
            </h2>
          </div>

          <div className="space-y-4 max-w-4xl">
            {[
              {
                icon: Bot,
                title: "AI That Sells, Not Just Chats",
                desc: "Your AI agent qualifies leads, sends personalized offers, calculates quotes, and closes deals — 24/7. It learns your product, pricing, and sales process.",
              },
              {
                icon: Kanban,
                title: "Visual Pipeline, Zero Chaos",
                desc: "Drag-and-drop boards track every lead from first message to payment. Know exactly who needs follow-up and when.",
              },
              {
                icon: MessageSquare,
                title: "One Inbox, Every Channel",
                desc: "WhatsApp Business, web chat, Meta leads — all unified. Your team sees full conversation history instantly.",
              },
              {
                icon: Zap,
                title: "Zero-Code Automations",
                desc: "Build custom flows in minutes. Auto-reply to FAQs, route hot leads, send follow-ups, calculate quotes.",
              },
              {
                icon: Brain,
                title: "BrainLab — Your AI Knowledge Base",
                desc: "Upload pricing sheets, product docs, and brand guidelines. Your AI uses them to answer accurately and close consistently. Train once, scale forever.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex gap-5 bg-white rounded-2xl border border-zinc-100 p-6 hover:border-zinc-200 hover:shadow-sm transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-syne font-bold text-[#0B0B0C] mb-1.5">{item.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.15em] mb-3">
              Comparison
            </p>
            <h2 className="font-syne text-4xl font-bold tracking-tight text-[#0B0B0C]">
              What Conversio Replaces
            </h2>
          </div>
          <div className="overflow-hidden rounded-2xl border border-zinc-100 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-100">
                <tr>
                  <th className="text-left px-6 py-4 font-semibold text-zinc-400">Instead Of</th>
                  <th className="text-left px-6 py-4 font-semibold text-blue-600">Conversio Does</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {[
                  ["Human Setters", "AI qualifies leads 24/7, books meetings, warms up prospects"],
                  ["Manual Quote Calculation", "AI calculates pricing and custom offers instantly"],
                  ["Follow-up Emails", "Automated WhatsApp sequences with personalized timing"],
                  ["Spreadsheet Tracking", "Real-time pipeline with deal probability and forecasting"],
                  ["Multiple Tools", "One platform: CRM + AI + WhatsApp + automation"],
                ].map(([instead, does]) => (
                  <tr key={instead} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4 text-zinc-400">{instead}</td>
                    <td className="px-6 py-4 text-[#0B0B0C] font-medium">{does}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="py-16 md:py-24 bg-[#0B0B0C] text-white relative overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(37,99,235,0.1) 0%, transparent 65%)" }}
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { v: "3×", l: "Faster lead response" },
              { v: "40%+", l: "Higher conversion" },
              { v: "10h+", l: "Saved / week / rep" },
              { v: "$0", l: "Spent on setters" },
            ].map((s) => (
              <div key={s.l}>
                <p className="font-syne text-5xl font-bold mb-2">{s.v}</p>
                <p className="text-sm text-zinc-400">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-syne text-3xl md:text-4xl font-bold tracking-tight text-[#0B0B0C] mb-4">
            Ready to close more deals on autopilot?
          </h2>
          <p className="text-lg text-zinc-500 mb-8">
            No credit card required. Setup in 30 minutes.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-all duration-200 shadow-lg shadow-blue-600/20 hover:scale-[1.02]"
          >
            Start for Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
