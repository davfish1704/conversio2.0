import type { Metadata } from "next"
import Link from "next/link"
import { Zap, Check } from "lucide-react"

export const metadata: Metadata = {
  title: "Pricing — Conversio",
  description: "Simple, transparent pricing for teams of all sizes.",
}

export default function PricingPage() {
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
            <Link href="/pricing" className="text-sm font-medium text-blue-600">Pricing</Link>
            <Link href="/contact" className="text-sm font-medium text-gray-600 hover:text-gray-900">Contact</Link>
          </div>
          <Link href="/login" className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors">
            Get Started Free
          </Link>
        </div>
      </nav>

      <div className="pt-24 pb-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">

        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">Simple, Transparent Pricing</h1>
          <p className="text-lg text-gray-500">Start for free. Scale as you grow. No hidden fees.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Starter */}
          <div className="border border-gray-200 rounded-2xl p-8 space-y-6">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Starter</p>
              <p className="mt-2 text-4xl font-bold text-gray-900">Free</p>
              <p className="text-sm text-gray-500 mt-1">14-day trial, no credit card</p>
            </div>
            <ul className="space-y-3 text-sm text-gray-600">
              {["1 board", "Up to 100 leads", "Basic AI responses", "WhatsApp integration", "Email support"].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/login" className="block w-full text-center px-4 py-2.5 text-sm font-semibold text-blue-600 border-2 border-blue-500 rounded-lg hover:bg-blue-50 transition-colors">
              Start Free
            </Link>
          </div>

          {/* Pro — highlighted */}
          <div className="border-2 border-blue-500 rounded-2xl p-8 space-y-6 shadow-lg relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-semibold px-4 py-1 rounded-full">
              Most Popular
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Pro</p>
              <div className="mt-2 flex items-baseline gap-1">
                <p className="text-4xl font-bold text-gray-900">€79</p>
                <span className="text-gray-500 text-sm">/ month</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Per team, billed monthly</p>
            </div>
            <ul className="space-y-3 text-sm text-gray-600">
              {[
                "Unlimited boards",
                "Unlimited leads",
                "Full AI agent suite",
                "BrainLab knowledge base",
                "MCP tool calls",
                "Advanced analytics",
                "Priority support",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/login" className="block w-full text-center px-4 py-2.5 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors">
              Get Started
            </Link>
          </div>

          {/* Enterprise */}
          <div className="border border-gray-200 rounded-2xl p-8 space-y-6">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Enterprise</p>
              <p className="mt-2 text-4xl font-bold text-gray-900">Custom</p>
              <p className="text-sm text-gray-500 mt-1">For large teams and agencies</p>
            </div>
            <ul className="space-y-3 text-sm text-gray-600">
              {[
                "Everything in Pro",
                "Dedicated onboarding",
                "Custom AI training",
                "SLA guarantee",
                "White-label option",
                "Custom integrations",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/contact" className="block w-full text-center px-4 py-2.5 text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Contact Sales
            </Link>
          </div>
        </div>

        <p className="text-center text-sm text-gray-400">
          Pricing is subject to change before public launch.{" "}
          <Link href="/contact" className="text-blue-500 hover:underline">Contact us</Link> for early-access rates.
        </p>
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
