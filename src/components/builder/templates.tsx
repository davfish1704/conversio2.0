"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Check,
  Mail,
  Phone,
  User,
  Send,
  MessageCircle,
  Shield,
  Zap,
  Clock,
  Play,
  Star,
  AlertTriangle,
  Target,
  TrendingUp,
  Award,
  Lock,
  Timer,
  Users,
  Globe,
  type LucideIcon,
} from "lucide-react"

// ─── Shared Types ───────────────────────────────────────────────

export interface HeroContent {
  headline: string
  subheadline: string
  ctaText: string
  ctaLink: string
  bgColor: string
  textColor: string
}

export interface Feature {
  icon: string
  title: string
  description: string
}

export interface FeaturesContent {
  title: string
  subtitle: string
  features: Feature[]
}

export interface CTAContent {
  text: string
  buttonText: string
  bgColor: string
  textColor: string
}

export interface FormContent {
  title: string
  subtitle: string
  fields: ("name" | "email" | "phone")[]
  submitText: string
  buttonColor: string
}

export interface FooterContent {
  company: string
  links: { label: string; href: string }[]
  copyright: string
}

// ─── VSL Types ──────────────────────────────────────────────────

export interface VSLHeroContent {
  videoUrl: string
  headline: string
  subheadline: string
  ctaText: string
  ctaLink: string
  trustBadges: string[]
  bgColor: string
  textColor: string
}

export interface PainPoint {
  icon: string
  title: string
  description: string
}

export interface ProblemContent {
  headline: string
  subheadline: string
  painPoints: PainPoint[]
  bgColor: string
  textColor: string
}

export interface Benefit {
  icon: string
  title: string
  description: string
}

export interface SolutionContent {
  headline: string
  subheadline: string
  benefits: Benefit[]
  bgColor: string
  textColor: string
}

export interface Testimonial {
  name: string
  role: string
  quote: string
  rating: number
}

export interface SocialProofContent {
  headline: string
  testimonials: Testimonial[]
  bgColor: string
  textColor: string
}

export interface OfferContent {
  headline: string
  originalPrice: string
  price: string
  guarantee: string
  features: string[]
  ctaText: string
  ctaLink: string
  bgColor: string
  accentColor: string
  textColor: string
}

export interface UrgencyContent {
  headline: string
  subheadline: string
  spotsLeft: number
  totalSpots: number
  deadlineText: string
  ctaText: string
  ctaLink: string
  bgColor: string
  textColor: string
  accentColor: string
}

export interface CTAFormContent {
  headline: string
  subheadline: string
  fields: ("name" | "email" | "phone")[]
  submitText: string
  trustText: string
  buttonColor: string
  bgColor: string
}

export interface SocialLink {
  icon: string
  href: string
}

export interface VSLFooterContent {
  company: string
  links: { label: string; href: string }[]
  copyright: string
  socials: SocialLink[]
}

// ─── Union Types ────────────────────────────────────────────────

export type TemplateType =
  | "hero"
  | "features"
  | "cta"
  | "form"
  | "footer"
  | "vslHero"
  | "problem"
  | "solution"
  | "socialProof"
  | "offer"
  | "urgency"
  | "ctaForm"
  | "vslFooter"

export interface BuilderSection {
  id: string
  type: TemplateType
  content:
    | HeroContent
    | FeaturesContent
    | CTAContent
    | FormContent
    | FooterContent
    | VSLHeroContent
    | ProblemContent
    | SolutionContent
    | SocialProofContent
    | OfferContent
    | UrgencyContent
    | CTAFormContent
    | VSLFooterContent
}

// ─── Icon Map ───────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  Shield,
  Zap,
  Clock,
  MessageCircle,
  Check,
  Mail,
  Phone,
  User,
  Play,
  Star,
  AlertTriangle,
  Target,
  TrendingUp,
  Award,
  Lock,
  Timer,
  Users,
  Globe,
  ArrowRight,
  Send,
}

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || Check
  return <Icon className={className} />
}

// ─── Original Templates ─────────────────────────────────────────

export function HeroTemplate({ content }: { content: HeroContent }) {
  return (
    <section
      className="relative py-20 md:py-32 px-6 text-center overflow-hidden"
      style={{ backgroundColor: content.bgColor || "#f8fafc" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto"
      >
        <h1
          className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6"
          style={{ color: content.textColor || "#111827" }}
        >
          {content.headline}
        </h1>
        <p
          className="text-lg md:text-xl mb-8 max-w-2xl mx-auto"
          style={{ color: content.textColor ? `${content.textColor}cc` : "#4b5563" }}
        >
          {content.subheadline}
        </p>
        <a
          href={content.ctaLink || "#"}
          className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
        >
          {content.ctaText}
          <ArrowRight className="w-5 h-5" />
        </a>
      </motion.div>
    </section>
  )
}

export function FeaturesTemplate({ content }: { content: FeaturesContent }) {
  return (
    <section className="py-16 md:py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{content.title}</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">{content.subtitle}</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {content.features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-blue-200 hover:shadow-md transition"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-5">
                <DynamicIcon name={feature.icon} className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function CTATemplate({ content }: { content: CTAContent }) {
  return (
    <section className="py-16 md:py-20 px-6" style={{ backgroundColor: content.bgColor || "#3b82f6" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto text-center"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: content.textColor || "#ffffff" }}>
          {content.text}
        </h2>
        <button
          className="inline-flex items-center gap-2 px-8 py-4 bg-white font-semibold rounded-xl hover:bg-gray-100 transition shadow-lg"
          style={{ color: content.bgColor || "#3b82f6" }}
        >
          {content.buttonText}
          <ArrowRight className="w-5 h-5" />
        </button>
      </motion.div>
    </section>
  )
}

export function FormTemplate({ content }: { content: FormContent }) {
  return (
    <section className="py-16 md:py-24 px-6 bg-gray-50">
      <div className="max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl p-8 md:p-10 border border-gray-200 shadow-sm"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{content.title}</h2>
          <p className="text-gray-600 mb-8">{content.subtitle}</p>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            {content.fields.includes("name") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
            {content.fields.includes("email") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    placeholder="john@example.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
            {content.fields.includes("phone") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    placeholder="+49 157 3132 9868"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
            <button
              type="submit"
              className="w-full py-3.5 font-semibold text-white rounded-xl transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              style={{ backgroundColor: content.buttonColor || "#3b82f6" }}
            >
              <Send className="w-4 h-4" />
              {content.submitText}
            </button>
          </form>
        </motion.div>
      </div>
    </section>
  )
}

export function FooterTemplate({ content }: { content: FooterContent }) {
  return (
    <footer className="py-10 px-6 bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-lg font-bold">{content.company}</h3>
          </div>
          <nav className="flex flex-wrap items-center gap-6">
            {content.links.map((link, i) => (
              <a key={i} href={link.href} className="text-sm text-gray-400 hover:text-white transition">
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800 text-center">
          <p className="text-sm text-gray-500">{content.copyright}</p>
        </div>
      </div>
    </footer>
  )
}

// ─── VSL Templates ──────────────────────────────────────────────

export function VSLHeroTemplate({ content }: { content: VSLHeroContent }) {
  const videoId = content.videoUrl.includes("youtube")
    ? new URLSearchParams(new URL(content.videoUrl).search).get("v") || content.videoUrl.split("/").pop()
    : content.videoUrl.includes("vimeo")
    ? content.videoUrl.split("/").pop()
    : ""

  const embedUrl = content.videoUrl.includes("youtube")
    ? `https://www.youtube.com/embed/${videoId}`
    : content.videoUrl.includes("vimeo")
    ? `https://player.vimeo.com/video/${videoId}`
    : content.videoUrl

  return (
    <section
      className="py-16 md:py-24 px-6"
      style={{ backgroundColor: content.bgColor || "#0f172a" }}
    >
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h1
            className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4"
            style={{ color: content.textColor || "#ffffff" }}
          >
            {content.headline}
          </h1>
          <p
            className="text-lg md:text-xl max-w-2xl mx-auto"
            style={{ color: content.textColor ? `${content.textColor}cc` : "#94a3b8" }}
          >
            {content.subheadline}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative aspect-video bg-gray-800 rounded-2xl overflow-hidden shadow-2xl mb-8"
        >
          {content.videoUrl ? (
            <iframe
              src={embedUrl}
              title="VSL Video"
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Play className="w-8 h-8 text-white ml-1" />
                </div>
                <p className="text-gray-400 text-sm">Video placeholder</p>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="text-center"
        >
          <a
            href={content.ctaLink || "#"}
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg hover:shadow-xl text-lg"
          >
            {content.ctaText}
            <ArrowRight className="w-5 h-5" />
          </a>
          {content.trustBadges.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
              {content.trustBadges.map((badge, i) => (
                <div key={i} className="flex items-center gap-1.5 text-sm" style={{ color: content.textColor ? `${content.textColor}99` : "#64748b" }}>
                  <Check className="w-4 h-4 text-emerald-400" />
                  {badge}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  )
}

export function ProblemTemplate({ content }: { content: ProblemContent }) {
  return (
    <section className="py-16 md:py-24 px-6" style={{ backgroundColor: content.bgColor || "#fef2f2" }}>
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: content.textColor || "#7f1d1d" }}>
            {content.headline}
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: content.textColor ? `${content.textColor}cc` : "#991b1b" }}>
            {content.subheadline}
          </p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {content.painPoints.map((point, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="bg-white rounded-2xl p-8 border border-red-100 shadow-sm"
            >
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-5">
                <DynamicIcon name={point.icon} className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{point.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{point.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function SolutionTemplate({ content }: { content: SolutionContent }) {
  return (
    <section className="py-16 md:py-24 px-6" style={{ backgroundColor: content.bgColor || "#f0fdf4" }}>
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: content.textColor || "#14532d" }}>
            {content.headline}
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: content.textColor ? `${content.textColor}cc` : "#166534" }}>
            {content.subheadline}
          </p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {content.benefits.map((benefit, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="flex items-start gap-5 bg-white rounded-2xl p-6 border border-green-100 shadow-sm"
            >
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                <DynamicIcon name={benefit.icon} className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{benefit.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{benefit.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function SocialProofTemplate({ content }: { content: SocialProofContent }) {
  return (
    <section className="py-16 md:py-24 px-6" style={{ backgroundColor: content.bgColor || "#ffffff" }}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: content.textColor || "#111827" }}>
            {content.headline}
          </h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {content.testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="bg-gray-50 rounded-2xl p-8 border border-gray-100"
            >
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className={`w-4 h-4 ${j < t.rating ? "text-amber-400 fill-amber-400" : "text-gray-300"}`}
                  />
                ))}
              </div>
              <p className="text-gray-700 text-sm leading-relaxed mb-6 italic">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function OfferTemplate({ content }: { content: OfferContent }) {
  return (
    <section className="py-16 md:py-24 px-6" style={{ backgroundColor: content.bgColor || "#eff6ff" }}>
      <div className="max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl p-8 md:p-12 border-2 shadow-xl"
          style={{ borderColor: content.accentColor || "#3b82f6" }}
        >
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8" style={{ color: content.textColor || "#111827" }}>
            {content.headline}
          </h2>

          <div className="text-center mb-8">
            {content.originalPrice && (
              <p className="text-lg text-gray-400 line-through mb-1">{content.originalPrice}</p>
            )}
            <p className="text-5xl font-extrabold" style={{ color: content.accentColor || "#3b82f6" }}>
              {content.price}
            </p>
          </div>

          <ul className="space-y-3 mb-8">
            {content.features.map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-gray-700">
                <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <a
            href={content.ctaLink || "#"}
            className="block w-full py-4 text-center text-white font-bold rounded-xl transition shadow-lg hover:shadow-xl text-lg"
            style={{ backgroundColor: content.accentColor || "#3b82f6" }}
          >
            {content.ctaText}
          </a>

          {content.guarantee && (
            <div className="flex items-center justify-center gap-2 mt-6 text-sm text-gray-500">
              <Shield className="w-4 h-4 text-emerald-500" />
              {content.guarantee}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  )
}

function CountdownTimer({ deadlineText }: { deadlineText: string }) {
  const [timeLeft, setTimeLeft] = useState({ h: 23, m: 59, s: 59 })

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        let { h, m, s } = prev
        s--
        if (s < 0) { s = 59; m-- }
        if (m < 0) { m = 59; h-- }
        if (h < 0) { h = 23; m = 59; s = 59 }
        return { h, m, s }
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center justify-center gap-3">
      {[
        { value: timeLeft.h, label: "HRS" },
        { value: timeLeft.m, label: "MIN" },
        { value: timeLeft.s, label: "SEC" },
      ].map((item, i) => (
        <div key={i} className="text-center">
          <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-200">
            <span className="text-2xl font-bold text-gray-900">
              {String(item.value).padStart(2, "0")}
            </span>
          </div>
          <p className="text-[10px] font-semibold text-gray-400 mt-1 tracking-wider">{item.label}</p>
        </div>
      ))}
    </div>
  )
}

export function UrgencyTemplate({ content }: { content: UrgencyContent }) {
  const progress = content.totalSpots > 0 ? ((content.totalSpots - content.spotsLeft) / content.totalSpots) * 100 : 0

  return (
    <section className="py-16 md:py-24 px-6" style={{ backgroundColor: content.bgColor || "#fff7ed" }}>
      <div className="max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: content.textColor || "#7c2d12" }}>
            {content.headline}
          </h2>
          <p className="text-lg mb-8" style={{ color: content.textColor ? `${content.textColor}cc` : "#9a3412" }}>
            {content.subheadline}
          </p>

          <CountdownTimer deadlineText={content.deadlineText} />

          <div className="mt-8 bg-white rounded-xl p-6 border border-orange-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Spots remaining</span>
              <span className="text-sm font-bold" style={{ color: content.accentColor || "#ea580c" }}>
                {content.spotsLeft} / {content.totalSpots}
              </span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${progress}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.3 }}
                className="h-full rounded-full"
                style={{ backgroundColor: content.accentColor || "#ea580c" }}
              />
            </div>
          </div>

          <a
            href={content.ctaLink || "#"}
            className="inline-flex items-center gap-2 px-8 py-4 text-white font-bold rounded-xl transition shadow-lg hover:shadow-xl text-lg mt-8"
            style={{ backgroundColor: content.accentColor || "#ea580c" }}
          >
            {content.ctaText}
            <ArrowRight className="w-5 h-5" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}

export function CTAFormTemplate({ content }: { content: CTAFormContent }) {
  return (
    <section className="py-16 md:py-24 px-6" style={{ backgroundColor: content.bgColor || "#f8fafc" }}>
      <div className="max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl p-8 md:p-10 border border-gray-200 shadow-sm"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{content.headline}</h2>
          <p className="text-gray-600 mb-8">{content.subheadline}</p>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            {content.fields.includes("name") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
            {content.fields.includes("email") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    placeholder="john@example.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
            {content.fields.includes("phone") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    placeholder="+49 157 3132 9868"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
            <button
              type="submit"
              className="w-full py-3.5 font-semibold text-white rounded-xl transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              style={{ backgroundColor: content.buttonColor || "#3b82f6" }}
            >
              <Send className="w-4 h-4" />
              {content.submitText}
            </button>
          </form>

          {content.trustText && (
            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
              <Lock className="w-3 h-3" />
              {content.trustText}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  )
}

export function VSLFooterTemplate({ content }: { content: VSLFooterContent }) {
  return (
    <footer className="py-12 px-6 bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-lg font-bold">{content.company}</h3>
          </div>
          <nav className="flex flex-wrap items-center gap-6">
            {content.links.map((link, i) => (
              <a key={i} href={link.href} className="text-sm text-gray-400 hover:text-white transition">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {content.socials.map((s, i) => (
              <a
                key={i}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition"
              >
                <DynamicIcon name={s.icon} className="w-4 h-4 text-gray-400" />
              </a>
            ))}
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800 text-center">
          <p className="text-sm text-gray-500">{content.copyright}</p>
        </div>
      </div>
    </footer>
  )
}

// ─── Section Renderer ───────────────────────────────────────────

export function RenderSection({ section }: { section: BuilderSection }) {
  switch (section.type) {
    case "hero":
      return <HeroTemplate content={section.content as HeroContent} />
    case "features":
      return <FeaturesTemplate content={section.content as FeaturesContent} />
    case "cta":
      return <CTATemplate content={section.content as CTAContent} />
    case "form":
      return <FormTemplate content={section.content as FormContent} />
    case "footer":
      return <FooterTemplate content={section.content as FooterContent} />
    case "vslHero":
      return <VSLHeroTemplate content={section.content as VSLHeroContent} />
    case "problem":
      return <ProblemTemplate content={section.content as ProblemContent} />
    case "solution":
      return <SolutionTemplate content={section.content as SolutionContent} />
    case "socialProof":
      return <SocialProofTemplate content={section.content as SocialProofContent} />
    case "offer":
      return <OfferTemplate content={section.content as OfferContent} />
    case "urgency":
      return <UrgencyTemplate content={section.content as UrgencyContent} />
    case "ctaForm":
      return <CTAFormTemplate content={section.content as CTAFormContent} />
    case "vslFooter":
      return <VSLFooterTemplate content={section.content as VSLFooterContent} />
    default:
      return null
  }
}
