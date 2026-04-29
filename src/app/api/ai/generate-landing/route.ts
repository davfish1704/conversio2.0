import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { rateLimit } from "@/lib/rate-limit"
import { groqChat } from "@/lib/ai/groq-client"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Rate Limit: 10 AI landing page generations per minute per user
  const limit = rateLimit(`ai-landing:${session.user.id}`, 10, 60000)
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { prompt } = body

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt required" }, { status: 400 })
    }

    const systemPrompt = `You are an expert landing page copywriter specializing in Video Sales Letter (VSL) pages.

Generate a complete VSL landing page as a JSON array of sections. Each section has: id, type, and content.

Available section types and their content schemas:

1. "vslHero" - Video Sales Letter Hero
   { videoUrl: "", headline: "...", subheadline: "...", ctaText: "...", ctaLink: "#form", trustBadges: ["...", "..."], bgColor: "#0f172a", textColor: "#ffffff" }

2. "problem" - Problem/Agitation section
   { headline: "...", subheadline: "...", painPoints: [{icon: "AlertTriangle", title: "...", description: "..."}, ...], bgColor: "#fef2f2", textColor: "#7f1d1d" }

3. "solution" - Solution section
   { headline: "...", subheadline: "...", benefits: [{icon: "Check", title: "...", description: "..."}, ...], bgColor: "#f0fdf4", textColor: "#14532d" }

4. "socialProof" - Testimonials
   { headline: "...", testimonials: [{name: "...", role: "...", quote: "...", rating: 5}, ...], bgColor: "#ffffff", textColor: "#111827" }

5. "offer" - Price/Offer box
   { headline: "...", originalPrice: "$997", price: "$297", guarantee: "...", features: ["...", "..."], ctaText: "...", ctaLink: "#form", bgColor: "#eff6ff", accentColor: "#3b82f6", textColor: "#111827" }

6. "urgency" - Scarcity/Countdown
   { headline: "...", subheadline: "...", spotsLeft: 12, totalSpots: 100, deadlineText: "...", ctaText: "...", ctaLink: "#form", bgColor: "#fff7ed", textColor: "#7c2d12", accentColor: "#ea580c" }

7. "ctaForm" - Lead capture form
   { headline: "...", subheadline: "...", fields: ["name", "email", "phone"], submitText: "...", trustText: "...", buttonColor: "#ea580c", bgColor: "#f8fafc" }

8. "vslFooter" - Footer
   { company: "...", links: [{label: "...", href: "#"}, ...], copyright: "© 2026 ...", socials: [{icon: "Facebook", href: "#"}, ...] }

Available icons: Shield, Zap, Clock, MessageCircle, Check, Mail, Phone, User, Play, Star, AlertTriangle, Target, TrendingUp, Award, Lock, Timer, Users, Facebook, Linkedin, Instagram, Twitter, ArrowRight, Send.

RULES:
- Respond ONLY with valid JSON. No markdown, no code blocks, no explanations.
- Use the user's language (German if prompt is in German, English otherwise).
- Generate compelling, persuasive copy appropriate for a VSL page.
- Create exactly 8 sections in this order: vslHero, problem, solution, socialProof, offer, urgency, ctaForm, vslFooter.
- Make the copy specific to the user's business/industry described in the prompt.
- Adapt colors to match the user's theme preference if mentioned (e.g., blue, green, orange).
- trustBadges should be 3 short strings.
- painPoints should be exactly 3 items.
- benefits should be 3-4 items.
- testimonials should be 3 items with realistic names and roles.
- features should be 4-5 items.
- socials should include Facebook, Linkedin, Instagram.

Response format:
[
  { "id": "1", "type": "vslHero", "content": { ... } },
  { "id": "2", "type": "problem", "content": { ... } },
  ...
]`

    const result = await groqChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt.trim() },
      ],
      "llama-3.1-8b-instant",
      0.7,
      4000
    )

    let sections
    try {
      const cleaned = result.content.replace(/^```json\s*|\s*```$/g, "").trim()
      sections = JSON.parse(cleaned)
      if (!Array.isArray(sections)) {
        throw new Error("Response is not an array")
      }
    } catch (parseErr) {
      console.error("Failed to parse AI response:", parseErr, "Content:", result.content)
      return NextResponse.json(
        { error: "Failed to parse AI response. Please try again." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      sections,
      usage: result.usage,
    })
  } catch (error) {
    console.error("AI Landing Generation Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
