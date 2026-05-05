import type { Metadata } from "next"
import Link from "next/link"
import {
  Brain, Workflow, MessageSquare, Sparkles, Zap, Kanban,
  Shield, Users, BarChart3, FileText, Globe, ArrowRight, Cpu,
} from "lucide-react"
import PublicNav from "@/components/layout/PublicNav"
import PublicFooter from "@/components/layout/PublicFooter"

export const metadata: Metadata = {
  title: "Features — Conversio",
  description: "AI state machine, multi-channel inbox, BrainLab, Flow Builder — everything your sales team needs.",
}

const features = [
  {
    icon: Brain,
    title: "BrainLab",
    desc: "Teach your AI everything about your business. Upload pricing sheets, product docs, FAQs, and brand guidelines. The AI uses them to answer accurately every time.",
    items: ["Upload documents & URLs", "Define rules & constraints", "Set personality & tone", "Test in sandbox mode"],
  },
  {
    icon: Workflow,
    title: "Flow Builder",
    desc: "Visual workflow editor for any sales process. Define states, transitions, and triggers — no code required.",
    items: ["Drag & drop state machine", "AI-generated flows", "Auto-transitions", "Conditional routing"],
  },
  {
    icon: MessageSquare,
    title: "Multi-Channel Inbox",
    desc: "WhatsApp, Telegram, Instagram — all unified in one inbox. Full conversation history, always.",
    items: ["WhatsApp Business API", "Telegram integration", "Instagram DMs", "Web chat widget"],
  },
  {
    icon: Sparkles,
    title: "AI Model Choice",
    desc: "GPT-4o, Claude, DeepSeek, Llama — you choose. Per-board model selection for speed, cost, or quality.",
    items: ["OpenAI GPT-4o", "Anthropic Claude", "DeepSeek", "Llama / Groq"],
  },
  {
    icon: Zap,
    title: "Tool-Use & MCP",
    desc: "AI doesn't just chat — it acts. Calculate quotes, update CRM records, send documents, trigger workflows.",
    items: ["Real-time calculations", "CRM record updates", "External API calls", "Workflow triggers"],
  },
  {
    icon: Kanban,
    title: "Pipeline CRM",
    desc: "Kanban board with drag & drop, auto state transitions, lead scoring, and deal forecasting.",
    items: ["Visual drag & drop", "Auto state transitions", "Lead scoring", "Revenue forecasting"],
  },
]

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white text-[#0B0B0C] antialiased">
      <PublicNav activeLink="/features" />

      {/* Header */}
      <section className="pt-28 md:pt-36 pb-16 md:pb-20 relative overflow-hidden">
        <div className="hero-mesh absolute inset-0 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.15em] mb-3 animate-fade-up">
            Features
          </p>
          <h1
            className="font-syne text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#0B0B0C] mb-6 animate-fade-up leading-[0.92]"
            style={{ animationDelay: "60ms" }}
          >
            Everything to Close
            <br />
            <span className="text-blue-600">Deals on Autopilot</span>
          </h1>
          <p
            className="text-lg text-zinc-500 max-w-xl leading-relaxed animate-fade-up"
            style={{ animationDelay: "120ms" }}
          >
            From automated outreach to AI-powered closings — every feature designed
            for sales teams that operate on messaging.
          </p>
        </div>
      </section>

      {/* Feature rows — alternating layout */}
      <section className="pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-0">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-0 border-b border-zinc-100 ${i === 0 ? "border-t" : ""}`}
            >
              {/* Text side */}
              <div
                className={`p-8 md:p-12 flex flex-col justify-center ${i % 2 === 1 ? "lg:order-2 lg:border-l border-zinc-100" : "lg:border-r border-zinc-100"}`}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="font-syne text-2xl font-bold text-[#0B0B0C] tracking-tight">
                    {feature.title}
                  </h2>
                </div>
                <p className="text-zinc-500 leading-relaxed mb-6">{feature.desc}</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {feature.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-[#0B0B0C]">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual side */}
              <div
                className={`p-8 md:p-12 bg-zinc-50/50 flex items-center justify-center min-h-[240px] ${i % 2 === 1 ? "lg:order-1" : ""}`}
              >
                <div className="w-full max-w-sm aspect-[4/3] rounded-xl border border-zinc-200 bg-white flex flex-col items-center justify-center gap-3 shadow-sm">
                  <feature.icon className="w-10 h-10 text-blue-200" />
                  <div className="space-y-1.5 w-2/3">
                    <div className="h-2 bg-zinc-100 rounded-full w-full" />
                    <div className="h-2 bg-zinc-100 rounded-full w-3/4" />
                    <div className="h-2 bg-blue-100 rounded-full w-1/2" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Additional features — gap-px grid */}
      <section className="py-16 md:py-24 bg-zinc-50/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-syne text-3xl font-bold tracking-tight text-[#0B0B0C] text-center mb-12">
            And Much More
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-200/60 rounded-2xl overflow-hidden shadow-sm">
            {[
              { icon: Shield, title: "GDPR Compliant", desc: "EU-hosted data, full privacy controls, audit trails." },
              { icon: Users, title: "Team Management", desc: "Roles, permissions, and board-level access control." },
              { icon: BarChart3, title: "Analytics & Reports", desc: "Conversion rates, response times, lead volume." },
              { icon: FileText, title: "CSV & API Import", desc: "Bulk import leads via CSV or REST API." },
              { icon: Globe, title: "Multi-Language AI", desc: "German, English, and more — AI responds naturally." },
              { icon: Cpu, title: "Custom Integrations", desc: "Connect any tool via MCP or webhook." },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white p-6 hover:bg-blue-50/20 transition-colors duration-200 group"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                  <f.icon className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-syne text-sm font-bold text-[#0B0B0C] mb-1">{f.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-syne text-3xl md:text-4xl font-bold tracking-tight text-[#0B0B0C] mb-4">
            Ready to see it in action?
          </h2>
          <p className="text-lg text-zinc-500 mb-8">
            Start your free trial — no credit card required.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-all duration-200 shadow-lg shadow-blue-600/20 hover:scale-[1.02]"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
