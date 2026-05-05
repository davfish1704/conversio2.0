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
    <div className="min-h-screen bg-white text-[#0B0B0C] antialiased">
      <PublicNav activeLink="/" />

      {/* ════════════════════════════════════════════════════
          HERO — left-aligned 2-col grid, pipeline right
      ════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-white pt-20 md:pt-24">
        <div className="hero-mesh absolute inset-0 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10 xl:gap-16 items-center py-14 md:py-20 lg:py-16">

            {/* ── Copy ── */}
            <div className="animate-fade-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 border border-blue-100 text-blue-700 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Product Live · 110+ Active Leads in Production
              </div>

              <h1 className="font-syne text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] xl:text-8xl font-bold tracking-tight leading-[0.9] text-[#0B0B0C] mb-8">
                AI Agents
                <br />
                That Sell
                <br />
                <span className="text-blue-600">For You</span>
              </h1>

              <p className="text-lg text-zinc-500 max-w-sm leading-relaxed mb-10">
                Build your company&apos;s AI employee in minutes. No code. Every
                channel. From first contact to closed deal.
              </p>

              <div className="flex flex-wrap items-center gap-3 mb-10">
                <Link
                  href="/login"
                  className="px-7 py-3.5 bg-blue-600 text-white font-semibold text-sm rounded-full hover:bg-blue-700 transition-all duration-200 shadow-lg shadow-blue-600/20 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-600/25"
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/product"
                  className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-[#0B0B0C] border border-zinc-200 rounded-full hover:border-zinc-400 hover:bg-zinc-50 transition-all duration-200"
                >
                  Watch Demo
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="flex flex-wrap gap-5 text-sm text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-green-500" />
                  DSGVO-konform
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-blue-400" />
                  Keine Kreditkarte
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  Setup in 30 Min
                </span>
              </div>
            </div>

            {/* ── Pipeline Mockup ── */}
            <div
              className="relative animate-fade-up lg:self-end"
              style={{ animationDelay: "160ms" }}
            >
              <div className="absolute -inset-6 bg-gradient-to-tr from-blue-500/5 via-transparent to-blue-400/8 rounded-3xl blur-3xl pointer-events-none" />

              <div className="relative rounded-2xl border border-zinc-200 shadow-2xl shadow-zinc-300/25 overflow-hidden bg-white animate-float">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-50 border-b border-zinc-100">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-3">
                    <div className="bg-white rounded px-3 py-1 text-[10px] text-zinc-400 border border-zinc-100 max-w-[180px] mx-auto text-center font-mono">
                      app.conversio.io/boards
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 border border-green-100 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-medium text-green-700">AI Active</span>
                  </div>
                </div>

                {/* Kanban */}
                <div className="p-4 bg-gradient-to-br from-zinc-50/80 to-white">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs font-semibold text-zinc-800">Versicherungs-Pipeline</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">7 Leads · Heute</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[
                      {
                        stage: "New",
                        color: "blue",
                        count: 3,
                        leads: [
                          { n: "Max K.", init: "MK", ch: "WA", score: 68, dot: "bg-green-500" },
                          { n: "Anna B.", init: "AB", ch: "TG", score: 52, dot: "bg-sky-500" },
                          { n: "Tim S.", init: "TS", ch: "WA", score: 38, dot: "bg-green-500" },
                        ],
                      },
                      {
                        stage: "Qualified",
                        color: "amber",
                        count: 2,
                        leads: [
                          { n: "Sarah M.", init: "SM", ch: "WA", score: 85, dot: "bg-green-500" },
                          { n: "Lars W.", init: "LW", ch: "TG", score: 77, dot: "bg-sky-500" },
                        ],
                      },
                      {
                        stage: "Proposal",
                        color: "violet",
                        count: 1,
                        leads: [
                          { n: "Nina V.", init: "NV", ch: "WA", score: 92, dot: "bg-green-500" },
                        ],
                      },
                      {
                        stage: "Won ✓",
                        color: "green",
                        count: 1,
                        leads: [
                          { n: "Jonas B.", init: "JB", ch: "TG", score: 100, dot: "bg-sky-500" },
                        ],
                      },
                    ].map((col) => {
                      const colors = {
                        blue: { label: "text-blue-600", badge: "bg-blue-50 text-blue-600", av: "bg-blue-100 text-blue-700" },
                        amber: { label: "text-amber-600", badge: "bg-amber-50 text-amber-600", av: "bg-amber-100 text-amber-700" },
                        violet: { label: "text-violet-600", badge: "bg-violet-50 text-violet-600", av: "bg-violet-100 text-violet-700" },
                        green: { label: "text-green-600", badge: "bg-green-50 text-green-600", av: "bg-green-100 text-green-700" },
                      }
                      const c = colors[col.color as keyof typeof colors]
                      return (
                        <div key={col.stage}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-[10px] font-semibold ${c.label}`}>{col.stage}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${c.badge}`}>{col.count}</span>
                          </div>
                          <div className="space-y-1.5">
                            {col.leads.map((lead) => (
                              <div
                                key={lead.n}
                                className="bg-white rounded-lg border border-zinc-100 p-2 space-y-1.5 shadow-sm hover:shadow-md hover:border-zinc-200 transition-all duration-150 cursor-default"
                              >
                                <div className="flex items-center gap-1.5">
                                  <div className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center flex-shrink-0 ${c.av}`}>
                                    {lead.init}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-semibold text-zinc-900 truncate">{lead.n}</p>
                                    <div className="flex items-center gap-0.5">
                                      <div className={`w-1.5 h-1.5 rounded-full ${lead.dot}`} />
                                      <span className="text-[9px] text-zinc-400">{lead.ch}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      lead.score >= 90 ? "bg-green-500" :
                                      lead.score >= 70 ? "bg-blue-500" :
                                      lead.score >= 50 ? "bg-amber-400" : "bg-zinc-300"
                                    }`}
                                    style={{ width: `${lead.score}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          METRICS STRIP
      ════════════════════════════════════════════════════ */}
      <div className="border-y border-zinc-100 bg-zinc-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-[0.15em]">
              Trusted by DACH teams
            </p>
            <div className="flex flex-wrap gap-8 sm:gap-10">
              {[
                { v: "110+", l: "Active Leads" },
                { v: "5", l: "AI Models" },
                { v: "3", l: "Channels" },
                { v: "<3s", l: "Avg. Response" },
              ].map((m) => (
                <div key={m.l} className="flex items-baseline gap-1.5">
                  <span className="font-syne text-lg font-bold text-[#0B0B0C]">{m.v}</span>
                  <span className="text-xs text-zinc-400">{m.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          HOW IT WORKS — numbered steps with dividers
      ════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.15em] mb-3">
              How It Works
            </p>
            <h2 className="font-syne text-4xl md:text-5xl font-bold tracking-tight text-[#0B0B0C]">
              From Setup to First Sale
              <br />
              in 30 Minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3">
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
              <div
                key={step.n}
                className={`relative p-8 md:p-10 overflow-hidden ${i < 2 ? "md:border-r border-zinc-100" : ""} border-b md:border-b-0 border-zinc-100`}
              >
                <span className="font-syne text-[90px] font-bold text-zinc-100 leading-none absolute top-2 right-4 select-none pointer-events-none">
                  {step.n}
                </span>
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-5">
                    <step.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-syne text-xl font-bold text-[#0B0B0C] mb-3 tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-zinc-500 leading-relaxed text-sm">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          FEATURES — gap-px grid (Linear/Stripe pattern)
      ════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 bg-zinc-50/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.15em] mb-3">
              Features
            </p>
            <h2 className="font-syne text-4xl md:text-5xl font-bold tracking-tight text-[#0B0B0C]">
              Everything You Need.
              <br />
              Nothing You Don&apos;t.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-200/60 rounded-2xl overflow-hidden shadow-sm">
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
                className="bg-white p-8 hover:bg-blue-50/30 transition-colors duration-300 group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-5 group-hover:bg-blue-100 transition-colors">
                  <f.icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-syne text-base font-bold text-[#0B0B0C] mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          USE CASES — dark section
      ════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 bg-[#0B0B0C] text-white relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, rgba(37,99,235,0.1) 0%, transparent 65%)",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-[0.15em] mb-3">
              One Platform
            </p>
            <h2 className="font-syne text-4xl md:text-5xl font-bold tracking-tight">
              One Platform.
              <br />
              Every Department.
            </h2>
            <p className="text-zinc-400 mt-4 max-w-lg text-lg leading-relaxed">
              Not just a sales tool — an AI layer for your entire organization.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 hover:bg-white/[0.07] hover:border-white/[0.15] transition-all duration-300"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center mb-4">
                  <u.icon className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="font-syne text-sm font-bold mb-2">{u.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          PRICING
      ════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.15em] mb-3">
              Pricing
            </p>
            <h2 className="font-syne text-4xl md:text-5xl font-bold tracking-tight text-[#0B0B0C]">
              Simple, Transparent Pricing
            </h2>
            <p className="text-zinc-500 mt-4 text-lg">
              One platform license. Token packages that scale with you.
            </p>
          </div>

          {/* Platform license */}
          <div className="max-w-lg mx-auto mb-16">
            <div className="relative rounded-2xl overflow-hidden border border-blue-200/60 bg-gradient-to-br from-blue-50/70 to-white p-8 text-center shadow-xl shadow-blue-100/40">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.15em] mb-3">
                Platform License
              </p>
              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className="font-syne text-7xl font-bold text-[#0B0B0C] tracking-tight">€99</span>
                <span className="text-zinc-400 text-lg">/mo</span>
              </div>
              <p className="text-sm text-zinc-500 mb-8">Full platform access · All features · All channels</p>
              <Link
                href="/login"
                className="inline-block px-8 py-3.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-all duration-200 shadow-lg shadow-blue-600/20 hover:scale-[1.02]"
              >
                Start Free Trial
              </Link>
              <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs text-zinc-400">
                {["No credit card", "Cancel anytime", "GDPR compliant"].map((f) => (
                  <span key={f} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Token tiers */}
          <p className="text-center text-xs font-semibold text-zinc-400 uppercase tracking-[0.15em] mb-8">
            Add token packages as you grow
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto items-start">
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
                className={`rounded-2xl p-7 transition-all duration-300 ${
                  tier.popular
                    ? "bg-[#0B0B0C] text-white shadow-2xl shadow-zinc-900/20 scale-105 relative"
                    : "border border-zinc-100 hover:border-zinc-200 hover:shadow-sm bg-white"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                <p
                  className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-3 ${
                    tier.popular ? "text-blue-400" : "text-zinc-400"
                  }`}
                >
                  {tier.name}
                </p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span
                    className={`font-syne text-4xl font-bold tracking-tight ${
                      tier.popular ? "text-white" : "text-[#0B0B0C]"
                    }`}
                  >
                    {tier.price}
                  </span>
                  <span className="text-sm text-zinc-400">/mo</span>
                </div>
                <p className={`text-sm mb-6 ${tier.popular ? "text-zinc-400" : "text-zinc-500"}`}>
                  {tier.desc}
                </p>
                <ul className="space-y-2 mb-8">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className={`flex items-center gap-2 text-sm ${
                        tier.popular ? "text-zinc-300" : "text-zinc-600"
                      }`}
                    >
                      <CheckCircle2
                        className={`w-4 h-4 flex-shrink-0 ${
                          tier.popular ? "text-blue-400" : "text-green-500"
                        }`}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`block w-full text-center px-4 py-3 text-sm font-semibold rounded-full transition-all duration-200 ${
                    tier.popular
                      ? "bg-blue-600 text-white hover:bg-blue-500 hover:scale-[1.02]"
                      : "border border-zinc-200 text-zinc-800 hover:bg-zinc-50"
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center mt-10 text-xs text-zinc-400">
            Pay-as-you-go · ~€2 per 100K tokens · Custom Setup ab €500 · MCP Tool Calls ab €200
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          CTA — full-bleed blue
      ════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 bg-blue-600 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div
          className="absolute -right-32 -top-32 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, rgba(255,255,255,0.08) 0%, transparent 65%)",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-syne text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
            Ready to Build Your
            <br />
            AI Agent?
          </h2>
          <p className="text-xl text-blue-100 mb-10">
            Setup in 30 minutes. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="px-8 py-4 text-base font-semibold text-blue-600 bg-white hover:bg-blue-50 rounded-full transition-all duration-200 shadow-lg shadow-blue-900/20 hover:scale-[1.02]"
            >
              Start Free Trial
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white border border-white/30 hover:bg-white/10 rounded-full transition-all duration-200"
            >
              Contact Sales
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
