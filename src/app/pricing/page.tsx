import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle2, ArrowRight } from "lucide-react"
import PublicNav from "@/components/layout/PublicNav"
import PublicFooter from "@/components/layout/PublicFooter"

export const metadata: Metadata = {
  title: "Pricing — Conversio",
  description: "Simple, transparent pricing for teams of all sizes.",
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white text-[#0B0B0C] antialiased">
      <PublicNav activeLink="/pricing" />

      {/* Header */}
      <section className="pt-28 md:pt-36 pb-16 md:pb-20 relative overflow-hidden">
        <div className="hero-mesh absolute inset-0 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.15em] mb-3 animate-fade-up">
            Pricing
          </p>
          <h1
            className="font-syne text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#0B0B0C] mb-6 animate-fade-up leading-[0.92]"
            style={{ animationDelay: "60ms" }}
          >
            Simple,
            <br />
            <span className="text-blue-600">Transparent Pricing</span>
          </h1>
          <p
            className="text-lg text-zinc-500 max-w-xl mx-auto leading-relaxed animate-fade-up"
            style={{ animationDelay: "120ms" }}
          >
            Start for free. Scale as you grow. No hidden fees.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">

        {/* Platform License */}
        <div className="max-w-lg mx-auto mb-20">
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

            <ul className="text-left space-y-2.5 text-sm text-zinc-600 mb-8 max-w-xs mx-auto">
              {[
                "Unlimited boards",
                "Unlimited team members",
                "BrainLab AI knowledge base",
                "Flow Builder & automations",
                "Multi-channel inbox",
                "Analytics & reporting",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/login"
              className="inline-block px-8 py-3.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-all duration-200 shadow-lg shadow-blue-600/20 hover:scale-[1.02]"
            >
              Start Free Trial
            </Link>
            <div className="flex flex-wrap justify-center gap-4 mt-5 text-xs text-zinc-400">
              {["No credit card", "Cancel anytime", "GDPR compliant"].map((f) => (
                <span key={f} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Token Packages */}
        <div className="text-center mb-10">
          <h2 className="font-syne text-2xl md:text-3xl font-bold tracking-tight text-[#0B0B0C] mb-2">
            Token Packages
          </h2>
          <p className="text-zinc-500">Choose the AI capacity that fits your team</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto mb-20 items-start">
          {[
            {
              tier: "Starter",
              price: "€149",
              desc: "For small teams getting started",
              features: ["~1M tokens per month", "1 AI model included", "Standard response speed", "Email support"],
              popular: false,
              cta: { href: "/login", label: "Get Started" },
            },
            {
              tier: "Professional",
              price: "€299",
              desc: "For growing teams at scale",
              features: ["~5M tokens per month", "3 AI models included", "Priority response speed", "MCP tool calls included", "Priority support"],
              popular: true,
              cta: { href: "/login", label: "Get Started" },
            },
            {
              tier: "Enterprise",
              price: "€600",
              desc: "For large organizations",
              features: ["Unlimited tokens", "All AI models", "Custom AI training", "Dedicated onboarding", "SLA guarantee"],
              popular: false,
              cta: { href: "/contact", label: "Contact Sales" },
            },
          ].map((t) => (
            <div
              key={t.tier}
              className={`rounded-2xl p-7 transition-all duration-300 ${
                t.popular
                  ? "bg-[#0B0B0C] text-white shadow-2xl shadow-zinc-900/20 scale-105 relative"
                  : "border border-zinc-100 hover:border-zinc-200 hover:shadow-sm bg-white"
              }`}
            >
              {t.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                  Most Popular
                </div>
              )}
              <p className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-3 ${t.popular ? "text-blue-400" : "text-zinc-400"}`}>
                {t.tier}
              </p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className={`font-syne text-4xl font-bold tracking-tight ${t.popular ? "text-white" : "text-[#0B0B0C]"}`}>
                  {t.price}
                </span>
                <span className="text-sm text-zinc-400">/mo</span>
              </div>
              <p className={`text-sm mb-6 ${t.popular ? "text-zinc-400" : "text-zinc-500"}`}>{t.desc}</p>
              <ul className="space-y-2.5 mb-8">
                {t.features.map((f) => (
                  <li key={f} className={`flex items-center gap-2 text-sm ${t.popular ? "text-zinc-300" : "text-zinc-600"}`}>
                    <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${t.popular ? "text-blue-400" : "text-green-500"}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={t.cta.href}
                className={`block w-full text-center px-4 py-3 text-sm font-semibold rounded-full transition-all duration-200 ${
                  t.popular
                    ? "bg-blue-600 text-white hover:bg-blue-500 hover:scale-[1.02]"
                    : "border border-zinc-200 text-zinc-800 hover:bg-zinc-50"
                }`}
              >
                {t.cta.label}
              </Link>
            </div>
          ))}
        </div>

        {/* Add-ons */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-zinc-50 rounded-2xl border border-zinc-100 p-8">
            <h3 className="font-syne text-lg font-bold text-[#0B0B0C] mb-5">Add-ons & Flex Options</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Pay-as-you-go", desc: "~€2 per 100K tokens" },
                { label: "Custom setup", desc: "Starting at €500" },
                { label: "MCP Tool Calls", desc: "Starting at €200" },
                { label: "White-label", desc: "Available on Enterprise" },
              ].map((addon) => (
                <div key={addon.label} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-[#0B0B0C]">{addon.label}</p>
                    <p className="text-xs text-zinc-500">{addon.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center mt-8">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-all duration-200 shadow-lg shadow-blue-600/20 hover:scale-[1.02]"
            >
              Book a Demo
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  )
}
