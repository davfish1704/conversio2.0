import type { Metadata } from "next"
import Link from "next/link"
import {
  Zap,
  ArrowRight,
  Lock,
  Check,
  Menu,
  X,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Conversio — CRM & WhatsApp Automation",
  description:
    "The CRM platform built for teams that sell on WhatsApp. Automate follow-ups, manage pipelines, and never lose a lead again.",
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 cursor-pointer"
            >
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                Conversio
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <Link
                href="#features"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Features
              </Link>
              <Link
                href="/agb"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                AGB
              </Link>
            </div>

            {/* CTAs */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
              >
                LOGIN
              </Link>
              <Link
                href="/login"
                className="px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors duration-200 cursor-pointer"
              >
                Try for Free
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <MobileNav />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-white overflow-hidden">
        {/* Blue gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/30 via-white to-white pointer-events-none" />
        {/* Dot Pattern */}
        <div className="dot-pattern absolute inset-0 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <Link
            href="#"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 text-sm cursor-pointer hover:border-blue-300 transition-colors duration-200 mb-8"
          >
            <span className="text-blue-500">What&apos;s new?</span>
            <span className="text-gray-900">The App for Everyone</span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </Link>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 mb-6">
            Conversations That Drive
            <br className="hidden sm:block" /> Success
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10">
            The CRM platform built for teams that sell on WhatsApp.
            Automate follow-ups, manage pipelines, and never lose a
            lead again.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3 text-sm font-semibold uppercase tracking-wide text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors duration-200 cursor-pointer"
            >
              Jetzt starten
            </Link>
            <Link
              href="#features"
              className="w-full sm:w-auto px-8 py-3 text-sm font-semibold uppercase tracking-wide text-blue-500 bg-white border-2 border-blue-500 rounded-lg hover:bg-blue-50 transition-colors duration-200 cursor-pointer"
            >
              Learn More
            </Link>
          </div>

          {/* Trust Row */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <Lock className="w-4 h-4" />
              <span>GDPR Compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-blue-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-blue-500" />
              <span>14-day free trial</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { value: "2,500+", label: "Active Businesses" },
              { value: "1.2M+", label: "Conversations Automated" },
              { value: "34%", label: "Avg. Conversion Lift" },
              { value: "99.9%", label: "Platform Uptime" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-4xl font-bold text-gray-900">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Preview Section */}
      <section id="features" className="py-20 bg-gradient-to-b from-white to-blue-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Your Central Dashboard
            </h2>
            <p className="text-gray-500">
              All customer conversations in one place
            </p>
          </div>

          {/* Mockup */}
          <div className="relative mx-auto max-w-5xl">
            {/* Dot pattern background */}
            <div
              className="absolute -inset-4 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(circle, #CBD5E1 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />

            <div className="relative bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Browser chrome */}
              <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <div className="ml-4 flex-1 max-w-md">
                  <div className="bg-white rounded-md px-3 py-1 text-xs text-gray-400 border border-gray-200">
                    app.conversio.io/dashboard
                  </div>
                </div>
              </div>

              {/* Dashboard mock content */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pipeline columns */}
                <div className="md:col-span-2 space-y-3">
                  <div className="flex gap-3">
                    {["New", "Contacted", "Qualified", "Closed"].map(
                      (stage) => (
                        <div
                          key={stage}
                          className="flex-1 bg-gray-50 rounded-lg p-3"
                        >
                          <p className="text-xs font-medium text-gray-500 mb-2">
                            {stage}
                          </p>
                          <div className="space-y-2">
                            <div className="bg-white p-2 rounded border border-gray-200">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-blue-100" />
                                <div className="h-2 w-20 bg-gray-200 rounded" />
                              </div>
                            </div>
                            {stage !== "Closed" && (
                              <div className="bg-white p-2 rounded border border-gray-200">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-blue-100" />
                                  <div className="h-2 w-16 bg-gray-200 rounded" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Chat preview */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 mb-3">
                    Recent Messages
                  </p>
                  <div className="space-y-3">
                    <div className="bg-white p-2 rounded-lg text-xs text-gray-600 border border-gray-200">
                      Hello! How can I help?
                    </div>
                    <div className="bg-blue-500 p-2 rounded-lg text-xs text-white ml-4">
                      I need a quote for my car insurance
                    </div>
                    <div className="bg-white p-2 rounded-lg text-xs text-gray-600 border border-gray-200">
                      Of course! Can you tell me the model?
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
              <span className="text-lg font-bold text-gray-900">
                Conversio
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <Link
                href="/impressum"
                className="hover:text-gray-900 transition-colors cursor-pointer"
              >
                Impressum
              </Link>
              <Link
                href="/datenschutz"
                className="hover:text-gray-900 transition-colors cursor-pointer"
              >
                Datenschutz
              </Link>
              <Link
                href="/agb"
                className="hover:text-gray-900 transition-colors cursor-pointer"
              >
                AGB
              </Link>
            </div>

            <p className="text-sm text-gray-400">
              © 2026 Conversio. Alle Rechte vorbehalten.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* Mobile Navigation Component */
function MobileNav() {
  return (
    <div className="md:hidden">
      {/* Mobile nav uses a simple toggle via checkbox hack to avoid client JS */}
      <details className="group">
        <summary className="list-none cursor-pointer p-2 text-gray-600 hover:text-gray-900 transition-colors">
          <Menu className="w-6 h-6 group-open:hidden" />
          <X className="w-6 h-6 hidden group-open:block" />
        </summary>
        <div className="absolute left-0 right-0 top-16 bg-white border-b border-gray-100 px-4 py-4 space-y-3">
          <Link
            href="#features"
            className="block text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors py-2"
          >
            Features
          </Link>
          <Link
            href="/agb"
            className="block text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors py-2"
          >
            AGB
          </Link>
          <div className="pt-3 border-t border-gray-100 space-y-3">
            <Link
              href="/login"
              className="block text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors py-2"
            >
              LOGIN
            </Link>
            <Link
              href="/login"
              className="block w-full text-center px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors duration-200"
            >
              Try for Free
            </Link>
          </div>
        </div>
      </details>
    </div>
  )
}
