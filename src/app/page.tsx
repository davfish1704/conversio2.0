import type { Metadata } from "next"
import Link from "next/link"
import {
  Zap, ArrowRight, Bot, Workflow, MessageSquare, Brain,
  Kanban, Shield, Sparkles, Plug, Rocket, Clock,
  BarChart3, CheckCircle2,
} from "lucide-react"
import PublicNav from "@/components/layout/PublicNav"
import PublicFooter from "@/components/layout/PublicFooter"

export const metadata: Metadata = {
  title: "Conversio — AI Agents That Sell For You",
  description:
    "Build your company's AI employee in minutes. No code. Every channel. From first contact to closed deal.",
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0B0C] text-gray-900 dark:text-white antialiased overflow-x-hidden">
      <PublicNav activeLink="/" />

      {/* ════════════════════════════════════════════════════
          HERO — Dark field with floating pipeline
      ════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        {/* Glow orbs */}
        <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-32 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 md:py-40">
          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-16 xl:gap-20 items-center">

            {/* Copy */}
            <div className="animate-fade-up">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-blue-300 mb-8 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                Product Live · 110+ Active Leads in Production
              </div>

              <h1 className="font-syne text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold tracking-tight leading-[0.82] text-white mb-8">
                AI Agents
                <br />
                That Sell
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-blue-400 to-indigo-300">
                  For You
                </span>
              </h1>

              <p className="text-lg md:text-xl text-gray-400 max-w-md leading-relaxed mb-10">
                Build your company&apos;s AI employee in minutes. No code. Every
                channel. From first contact to closed deal.
              </p>

              <div className="flex flex-wrap items-center gap-3 mb-10">
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-2.5 px-7 py-3.5 text-sm font-semibold text-white bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-300"
                >
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  href="/product"
                  className="group inline-flex items-center gap-2.5 px-7 py-3.5 text-sm font-semibold text-white/80 border border-white/15 hover:border-white/30 rounded-xl hover:bg-white/5 hover:text-white transition-all duration-300"
                >
                  Watch Demo
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              <div className="flex flex-wrap gap-6 text-sm text-gray-500">
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  DSGVO-konform
                </span>
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  Keine Kreditkarte
                </span>
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  Setup in 30 Min
                </span>
              </div>
            </div>

            {/* Pipeline Mockup — Floating card stack */}
            <div
              className="relative animate-fade-up"
              style={{ animationDelay: "200ms" }}
            >
              <div className="absolute -inset-8 bg-gradient-to-tr from-blue-500/10 via-transparent to-indigo-500/10 rounded-[48px] blur-3xl pointer-events-none" />

              <div className="relative rounded-2xl border border-white/[0.08] shadow-2xl shadow-black/50 overflow-hidden bg-gray-900/80 backdrop-blur-sm">
                {/* Chrome */}
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-900/50 border-b border-white/[0.06]">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex-1 mx-3">
                    <div className="bg-gray-800/50 rounded-md px-3 py-1.5 text-[11px] text-gray-500 text-center font-mono border border-white/[0.04]">
                      app.conversio.io/boards
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-semibold text-emerald-300">AI Active</span>
                  </div>
                </div>

                {/* Kanban content */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs font-bold text-white">Versicherungs-Pipeline</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">7 Leads · Heute</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2.5">
                    {[
                      {
                        stage: "New", color: "blue", count: 3,
                        leads: [
                          { n: "Max K.", init: "MK", ch: "WA", score: 68, dot: "bg-emerald-400" },
                          { n: "Anna B.", init: "AB", ch: "TG", score: 52, dot: "bg-sky-400" },
                          { n: "Tim S.", init: "TS", ch: "WA", score: 38, dot: "bg-emerald-400" },
                        ],
                      },
                      {
                        stage: "Qualified", color: "amber", count: 2,
                        leads: [
                          { n: "Sarah M.", init: "SM", ch: "WA", score: 85, dot: "bg-emerald-400" },
                          { n: "Lars W.", init: "LW", ch: "TG", score: 77, dot: "bg-sky-400" },
                        ],
                      },
                      {
                        stage: "Proposal", color: "violet", count: 1,
                        leads: [
                          { n: "Nina V.", init: "NV", ch: "WA", score: 92, dot: "bg-emerald-400" },
                        ],
                      },
                      {
                        stage: "Won ✓", color: "emerald", count: 1,
                        leads: [
                          { n: "Jonas B.", init: "JB", ch: "TG", score: 100, dot: "bg-sky-400" },
                        ],
                      },
                    ].map((col) => {
                      const colors = {
                        blue: { label: "text-blue-400", badge: "bg-blue-500/10 text-blue-400", av: "bg-blue-500/20 text-blue-300" },
                        amber: { label: "text-amber-400", badge: "bg-amber-500/10 text-amber-400", av: "bg-amber-500/20 text-amber-300" },
                        violet: { label: "text-violet-400", badge: "bg-violet-500/10 text-violet-400", av: "bg-violet-500/20 text-violet-300" },
                        emerald: { label: "text-emerald-400", badge: "bg-emerald-500/10 text-emerald-400", av: "bg-emerald-500/20 text-emerald-300" },
                      }
                      const c = colors[col.color as keyof typeof colors]
                      return (
                        <div key={col.stage}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${c.label}`}>{col.stage}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${c.badge}`}>{col.count}</span>
                          </div>
                          <div className="space-y-2">
                            {col.leads.map((lead) => (
                              <div key={lead.n} className="bg-gray-800/50 rounded-lg border border-white/[0.06] p-2.5 space-y-2 hover:bg-gray-800 hover:border-white/[0.1] transition-all duration-150 cursor-default">
                                <div className="flex items-center gap-2">
                                  <div className={`w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center flex-shrink-0 ${c.av}`}>{lead.init}</div>
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-semibold text-white truncate">{lead.n}</p>
                                    <div className="flex items-center gap-1">
                                      <div className={`w-1.5 h-1.5 rounded-full ${lead.dot}`} />
                                      <span className="text-[9px] text-gray-500">{lead.ch}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${
                                    lead.score >= 90 ? "bg-emerald-400" :
                                    lead.score >= 70 ? "bg-blue-400" :
                                    lead.score >= 50 ? "bg-amber-400" : "bg-gray-600"
                                  }`} style={{ width: `${lead.score}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Bottom glow */}
                <div className="h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-950 to-transparent" />
      </section>

      {/* ════════════════════════════════════════════════════
          METRICS STRIP
      ════════════════════════════════════════════════════ */}
      <div className="border-y border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-[0.2em]">
              Trusted by DACH teams
            </p>
            <div className="flex flex-wrap gap-10 sm:gap-14">
              {[
                { v: "110+", l: "Active Leads" },
                { v: "5", l: "AI Models" },
                { v: "3", l: "Channels" },
                { v: "<3s", l: "Avg. Response" },
              ].map((m) => (
                <div key={m.l} className="flex items-baseline gap-1.5">
                  <span className="font-syne text-xl font-bold text-gray-900 dark:text-white">{m.v}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{m.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          HOW IT WORKS — Numbered with connectors
      ════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] mb-4">
              How It Works
            </p>
            <h2 className="font-syne text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
              From Setup to First Sale
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                in 30 Minutes
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-0 md:gap-8 lg:gap-12">
            {[
              {
                icon: Rocket,
                n: "01",
                title: "Configure Your Agent",
                desc: "Fill BrainLab with your company knowledge. Define your sales flow. Done in 30 minutes — no code, no developer.",
              },
              {
                icon: Plug,
                n: "02",
                title: "Connect Your Channels",
                desc: "WhatsApp, Telegram, Instagram — connect in one click. No API knowledge required. Reach customers everywhere.",
              },
              {
                icon: Bot,
                n: "03",
                title: "Watch It Close Deals",
                desc: "AI qualifies, engages, and converts 24/7. Every lead tracked. Every deal logged. You just approve the revenue.",
              },
            ].map((step, i) => (
              <div key={step.n} className="relative p-8 md:p-0">
                <div className="flex md:flex-col items-start md:items-start gap-5 md:gap-0">
                  <div className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center md:mb-6">
                    <step.icon className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <span className="font-syne text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.15em] block mb-2 md:mb-3">
                      Step {step.n}
                    </span>
                    <h3 className="font-syne text-xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
                      {step.title}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">{step.desc}</p>
                  </div>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-7 -right-6 w-12 h-px bg-gradient-to-r from-gray-200 to-transparent dark:from-gray-800" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          FEATURES — Split layout with visual examples
      ════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 bg-gray-50/70 dark:bg-black relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] mb-4">
              Features
            </p>
            <h2 className="font-syne text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
              Everything You Need.
              <br />
              Nothing You Don&apos;t.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Brain,
                title: "BrainLab",
                desc: "Teach your AI everything — products, pricing, guidelines. Persistent memory across all conversations.",
              },
              {
                icon: Workflow,
                title: "Flow Builder",
                desc: "Visual workflow editor. Drag, connect, automate. No code required, infinitely flexible.",
              },
              {
                icon: MessageSquare,
                title: "Multi-Channel",
                desc: "WhatsApp, Telegram, Instagram. One unified inbox. Your AI speaks natively on every platform.",
              },
              {
                icon: Sparkles,
                title: "AI Model Choice",
                desc: "GPT-4o, Claude, DeepSeek, Llama — switch instantly. Optimize for speed, cost, or quality.",
              },
              {
                icon: Zap,
                title: "Tool-Use",
                desc: "AI that acts: updates CRM, sends documents, calculates quotes, books meetings.",
              },
              {
                icon: Kanban,
                title: "Pipeline CRM",
                desc: "Kanban with drag & drop, auto-transitions, lead scoring, and deal forecasting.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group relative bg-white dark:bg-[#0E0E0E] rounded-2xl border border-gray-100 dark:border-gray-800 p-7 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-lg hover:shadow-blue-500/5 dark:hover:shadow-blue-500/5 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-5 group-hover:bg-blue-100 dark:group-hover:bg-blue-800/40 group-hover:scale-110 transition-all duration-300">
                  <f.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-syne text-base font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {f.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          USE CASES — Dark immersive section
      ════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 bg-gray-900 dark:bg-black text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Ccircle cx='20' cy='20' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-500/5 rounded-full blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start mb-20">
            <div>
              <p className="text-[11px] font-bold text-blue-400 uppercase tracking-[0.2em] mb-4">
                One Platform
              </p>
              <h2 className="font-syne text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                One Platform.
                <br />
                Every Department.
              </h2>
            </div>
            <p className="text-gray-400 text-lg leading-relaxed">
              Not just a sales tool — an AI layer for your entire organization.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: BarChart3,
                title: "Sales Setter Agent",
                desc: "Qualifies leads 24/7, books meetings, warms up prospects before your team touches them.",
              },
              {
                icon: MessageSquare,
                title: "Customer Support",
                desc: "Instant responses, smart routing, escalation only when needed. Automated resolution.",
              },
              {
                icon: Workflow,
                title: "Onboarding Flows",
                desc: "Guide clients through documents, signatures, and setup — zero manual follow-up.",
              },
              {
                icon: Brain,
                title: "Internal Assistant",
                desc: "Company wiki, policy lookups, HR queries — your internal AI that knows everything.",
              },
            ].map((u) => (
              <div
                key={u.title}
                className="group bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-500"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all duration-300">
                  <u.icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-syne text-sm font-bold mb-2">{u.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          PRICING — Enterprise tiers
      ════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] mb-4">
              Pricing
            </p>
            <h2 className="font-syne text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
              Simple, Transparent Pricing
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-4 text-lg max-w-xl mx-auto">
              One platform license. Token packages that scale with you.
            </p>
          </div>

          {/* Platform License — Hero card */}
          <div className="max-w-lg mx-auto mb-20">
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 p-10 text-center shadow-2xl shadow-blue-500/20">
              <div className="absolute inset-0 opacity-[0.04]" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Ccircle cx='20' cy='20' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
              }} />
              <p className="text-[11px] font-bold text-blue-200 uppercase tracking-[0.2em] mb-4 relative">
                Platform License
              </p>
              <div className="flex items-baseline justify-center gap-2 mb-2 relative">
                <span className="font-syne text-7xl md:text-8xl font-bold text-white tracking-tight">€99</span>
                <span className="text-blue-200 text-lg">/mo</span>
              </div>
              <p className="text-blue-100 text-sm mb-8 relative">Full platform access · All features · All channels</p>
              <Link
                href="/login"
                className="group inline-flex items-center gap-2.5 px-8 py-3.5 text-sm font-semibold text-blue-600 bg-white hover:bg-blue-50 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 relative"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <div className="flex flex-wrap justify-center gap-5 mt-6 text-xs text-blue-200 relative">
                {["No credit card", "Cancel anytime", "GDPR compliant"].map((f) => (
                  <span key={f} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Token Tiers */}
          <p className="text-center text-[11px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-[0.2em] mb-8">
            Add token packages as you grow
          </p>
          <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto items-start">
            {[
              {
                name: "Starter",
                price: "€149",
                desc: "For small teams",
                features: ["~500K AI tokens", "2 channels", "Email support"],
                popular: false,
              },
              {
                name: "Professional",
                price: "€299",
                desc: "For growing teams",
                features: ["~1.2M AI tokens", "All channels", "Priority support"],
                popular: true,
              },
              {
                name: "Enterprise",
                price: "€600",
                desc: "For large organizations",
                features: ["~3M AI tokens", "Dedicated setup", "SLA + CSM"],
                popular: false,
              },
            ].map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl p-8 transition-all duration-300 ${
                  tier.popular
                    ? "bg-gray-900 dark:bg-black text-white shadow-2xl shadow-gray-900/30 dark:shadow-black/50 scale-[1.03] border border-gray-800"
                    : "bg-white dark:bg-[#0E0E0E] border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-lg"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-bold px-5 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                    Most Popular
                  </div>
                )}
                <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-4 ${
                  tier.popular ? "text-blue-400" : "text-gray-400 dark:text-gray-500"
                }`}>
                  {tier.name}
                </p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={`font-syne text-4xl font-bold tracking-tight ${
                    tier.popular ? "text-white" : "text-gray-900 dark:text-white"
                  }`}>
                    {tier.price}
                  </span>
                  <span className={`text-sm ${tier.popular ? "text-gray-400" : "text-gray-400 dark:text-gray-500"}`}>/mo</span>
                </div>
                <p className={`text-sm mb-6 ${tier.popular ? "text-gray-400" : "text-gray-500 dark:text-gray-400"}`}>
                  {tier.desc}
                </p>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2.5 text-sm ${
                      tier.popular ? "text-gray-300" : "text-gray-600 dark:text-gray-300"
                    }`}>
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${
                        tier.popular ? "text-blue-400" : "text-emerald-500"
                      }`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`block w-full text-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                    tier.popular
                      ? "bg-gradient-to-br from-blue-500 to-indigo-500 text-white hover:from-blue-400 hover:to-indigo-400 hover:-translate-y-0.5 shadow-lg shadow-blue-500/20"
                      : "border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center mt-10 text-xs text-gray-400 dark:text-gray-600">
            Pay-as-you-go · ~€2 per 100K tokens · Custom Setup ab €500 · MCP Tool Calls ab €200
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          CTA — Large dark section
      ════════════════════════════════════════════════════ */}
      <section className="py-32 md:py-40 bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px]" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-syne text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
            Ready to Build Your
            <br />
            AI Agent?
          </h2>
          <p className="text-xl text-gray-400 mb-12">
            Setup in 30 minutes. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2.5 px-8 py-4 text-base font-semibold text-blue-600 bg-white hover:bg-blue-50 rounded-xl shadow-lg shadow-blue-900/20 hover:-translate-y-0.5 transition-all duration-300"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/contact"
              className="group inline-flex items-center gap-2.5 px-8 py-4 text-base font-semibold text-white/80 border border-white/20 hover:border-white/40 hover:text-white rounded-xl hover:bg-white/5 transition-all duration-300"
            >
              Contact Sales
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
