"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { FEATURES } from "@/lib/features"
import { useToast } from "@/hooks/use-toast"
import {
  PenTool,
  Plus,
  Eye,
  Save,
  Sparkles,
  X,
  GripVertical,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  LayoutTemplate,
  Type,
  Star,
  Send,
  FileText,
  Check,
  Play,
  AlertTriangle,
  Target,
  Award,
  Timer,
  Lock,
  Globe,
  Quote,
} from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  RenderSection,
  type BuilderSection,
  type HeroContent,
  type FeaturesContent,
  type CTAContent,
  type FormContent,
  type FooterContent,
  type VSLHeroContent,
  type ProblemContent,
  type SolutionContent,
  type SocialProofContent,
  type OfferContent,
  type UrgencyContent,
  type CTAFormContent,
  type VSLFooterContent,
  type Feature,
  type PainPoint,
  type Benefit,
  type Testimonial,
  type SocialLink,
} from "@/components/builder/templates"

// ─── Default Templates ──────────────────────────────────────────

const DEFAULT_TEMPLATES: Record<string, BuilderSection["content"]> = {
  hero: {
    headline: "Your Headline Here",
    subheadline: "Describe your value proposition in one or two sentences.",
    ctaText: "Get Started",
    ctaLink: "#form",
    bgColor: "#f8fafc",
    textColor: "#111827",
  },
  features: {
    title: "Why Choose Us",
    subtitle: "Discover the benefits that set us apart from the competition.",
    features: [
      { icon: "Shield", title: "Secure & Reliable", description: "Enterprise-grade security for your peace of mind." },
      { icon: "Zap", title: "Lightning Fast", description: "Optimized performance that never keeps you waiting." },
      { icon: "Clock", title: "24/7 Support", description: "Round-the-clock assistance whenever you need it." },
    ],
  },
  cta: {
    text: "Ready to get started?",
    buttonText: "Contact Us Now",
    bgColor: "#3b82f6",
    textColor: "#ffffff",
  },
  form: {
    title: "Get in Touch",
    subtitle: "Fill out the form and we will get back to you within 24 hours.",
    fields: ["name", "email", "phone"],
    submitText: "Send Request",
    buttonColor: "#3b82f6",
  },
  footer: {
    company: "Your Company",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Imprint", href: "#" },
    ],
    copyright: "© 2026 All rights reserved.",
  },
  vslHero: {
    videoUrl: "",
    headline: "Discover the Secret That Changed Everything",
    subheadline: "Watch this short video to see how thousands are already benefiting.",
    ctaText: "Get Instant Access",
    ctaLink: "#form",
    trustBadges: ["No credit card required", "Cancel anytime", "24/7 Support"],
    bgColor: "#0f172a",
    textColor: "#ffffff",
  },
  problem: {
    headline: "Are You Struggling With...",
    subheadline: "Most people face these challenges every single day. You're not alone.",
    painPoints: [
      { icon: "AlertTriangle", title: "Wasting Time", description: "Hours spent on repetitive tasks that could be automated." },
      { icon: "Target", title: "Missing Opportunities", description: "Leads slipping through the cracks without follow-up." },
      { icon: "Timer", title: "Slow Growth", description: "Your competitors are moving faster and capturing your market." },
    ],
    bgColor: "#fef2f2",
    textColor: "#7f1d1d",
  },
  solution: {
    headline: "Here's How It Works",
    subheadline: "A simple 3-step process designed to get you results fast.",
    benefits: [
      { icon: "Check", title: "Set Up in Minutes", description: "No technical skills required. Connect your channels and go live instantly." },
      { icon: "Zap", title: "Automate Everything", description: "Let AI handle conversations while you focus on closing deals." },
      { icon: "TrendingUp", title: "Scale Faster", description: "Handle 10x more leads without hiring additional staff." },
      { icon: "Award", title: "Close More Deals", description: "Smart follow-ups and lead scoring ensure nothing falls through." },
    ],
    bgColor: "#f0fdf4",
    textColor: "#14532d",
  },
  socialProof: {
    headline: "What Our Customers Say",
    testimonials: [
      { name: "Sarah M.", role: "Insurance Broker", quote: "This completely transformed how I handle leads. My response time went from hours to seconds.", rating: 5 },
      { name: "Thomas K.", role: "Real Estate Agent", quote: "I closed 3 more deals in the first month alone. The automation is incredibly powerful.", rating: 5 },
      { name: "Lisa B.", role: "Consultant", quote: "Best investment I made this year. The ROI was visible within the first two weeks.", rating: 5 },
    ],
    bgColor: "#ffffff",
    textColor: "#111827",
  },
  offer: {
    headline: "Get Full Access Today",
    originalPrice: "$997",
    price: "$297",
    guarantee: "30-Day Money-Back Guarantee",
    features: ["Unlimited conversations", "AI-powered responses", "CRM integration", "Priority support", "Custom workflows"],
    ctaText: "Claim Your Spot Now",
    ctaLink: "#form",
    bgColor: "#eff6ff",
    accentColor: "#3b82f6",
    textColor: "#111827",
  },
  urgency: {
    headline: "Don't Miss Out",
    subheadline: "This special offer expires soon. Secure your spot before it's too late.",
    spotsLeft: 12,
    totalSpots: 100,
    deadlineText: "Offer ends tonight at midnight",
    ctaText: "Reserve My Spot",
    ctaLink: "#form",
    bgColor: "#fff7ed",
    textColor: "#7c2d12",
    accentColor: "#ea580c",
  },
  ctaForm: {
    headline: "Get Started Now",
    subheadline: "Enter your details below and get instant access to the platform.",
    fields: ["name", "email", "phone"],
    submitText: "Get Instant Access",
    trustText: "Your information is secure. We never share your data.",
    buttonColor: "#ea580c",
    bgColor: "#f8fafc",
  },
  vslFooter: {
    company: "Your Company",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Contact", href: "#" },
      { label: "Imprint", href: "#" },
    ],
    copyright: "© 2026 All rights reserved.",
    socials: [
      { icon: "Facebook", href: "#" },
      { icon: "Linkedin", href: "#" },
      { icon: "Instagram", href: "#" },
    ],
  },
}

const TEMPLATE_META = [
  { type: "vslHero" as const, label: "VSL Hero", icon: Play, desc: "Video + Headline + CTA", category: "VSL" },
  { type: "problem" as const, label: "Problem", icon: AlertTriangle, desc: "3 Pain Points", category: "VSL" },
  { type: "solution" as const, label: "Solution", icon: Target, desc: "Benefit Cards", category: "VSL" },
  { type: "socialProof" as const, label: "Social Proof", icon: Quote, desc: "Testimonials + Stars", category: "VSL" },
  { type: "offer" as const, label: "Offer", icon: Award, desc: "Price Box + Guarantee", category: "VSL" },
  { type: "urgency" as const, label: "Urgency", icon: Timer, desc: "Countdown + Scarcity", category: "VSL" },
  { type: "ctaForm" as const, label: "CTA Form", icon: Lock, desc: "Form + Trust Text", category: "VSL" },
  { type: "vslFooter" as const, label: "VSL Footer", icon: Globe, desc: "Links + Social Icons", category: "VSL" },
  { type: "hero" as const, label: "Hero", icon: Type, desc: "Headline + CTA", category: "Basic" },
  { type: "features" as const, label: "Features", icon: Star, desc: "3-card grid", category: "Basic" },
  { type: "cta" as const, label: "CTA Banner", icon: Send, desc: "Call-to-action", category: "Basic" },
  { type: "form" as const, label: "Lead Form", icon: FileText, desc: "Capture leads", category: "Basic" },
  { type: "footer" as const, label: "Footer", icon: LayoutTemplate, desc: "Links + Copyright", category: "Basic" },
]

// ─── Sortable Section Item ──────────────────────────────────────

function SortableSectionItem({
  section,
  index,
  selectedId,
  onSelect,
  onRemove,
  onDuplicate,
  onMove,
}: {
  section: BuilderSection
  index: number
  selectedId: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(section.id)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition ${
        selectedId === section.id
          ? "bg-blue-50 border border-blue-200"
          : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 dark:border-gray-700 hover:border-gray-300"
      }`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-3.5 h-3.5 text-gray-300" />
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize flex-1 truncate">
        {index + 1}. {section.type.replace(/([A-Z])/g, " $1").trim()}
      </span>
      <div className="flex items-center gap-0.5">
        <button
          onClick={(e) => { e.stopPropagation(); onMove(section.id, -1) }}
          className="p-1 text-gray-300 hover:text-gray-500 dark:text-gray-400 rounded"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMove(section.id, 1) }}
          className="p-1 text-gray-300 hover:text-gray-500 dark:text-gray-400 rounded"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate(section.id) }}
          className="p-1 text-gray-300 hover:text-blue-500 rounded"
        >
          <Copy className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(section.id) }}
          className="p-1 text-gray-300 hover:text-red-500 rounded"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────

export default function PageBuilder() {
  const router = useRouter()
  const { toast } = useToast()
  const [sections, setSections] = useState<BuilderSection[]>([])
  const [pageName, setPageName] = useState("My Landing Page")

  useEffect(() => {
    if (!FEATURES.builder) {
      router.replace("/dashboard")
    }
  }, [router])

  if (!FEATURES.builder) return null
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [activeCategory, setActiveCategory] = useState("VSL")
  const previewRef = useRef<HTMLDivElement>(null)

  const selectedSection = sections.find((s) => s.id === selectedId)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function addSection(type: BuilderSection["type"]) {
    const id = crypto.randomUUID()
    setSections((prev) => [
      ...prev,
      { id, type, content: JSON.parse(JSON.stringify(DEFAULT_TEMPLATES[type])) },
    ])
  }

  function removeSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  function duplicateSection(id: string) {
    const section = sections.find((s) => s.id === id)
    if (!section) return
    setSections((prev) => [
      ...prev,
      { ...section, id: crypto.randomUUID() },
    ])
  }

  function moveSection(id: string, direction: -1 | 1) {
    const idx = sections.findIndex((s) => s.id === id)
    if (idx < 0) return
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= sections.length) return
    const newSections = [...sections]
    const [removed] = newSections.splice(idx, 1)
    newSections.splice(newIdx, 0, removed)
    setSections(newSections)
  }

  function updateSection(id: string, content: BuilderSection["content"]) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, content } : s)))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setSections((prev) => {
        const oldIndex = prev.findIndex((s) => s.id === active.id)
        const newIndex = prev.findIndex((s) => s.id === over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  async function generateWithAI() {
    if (!aiPrompt.trim()) return
    setAiLoading(true)
    try {
      const res = await fetch("/api/ai/generate-landing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      })
      const data = await res.json()
      if (!res.ok || !data.sections) {
        throw new Error(data.error || "Generation failed")
      }
      setSections(data.sections.map((s: BuilderSection) => ({ ...s, id: crypto.randomUUID() })))
      setAiOpen(false)
      setAiPrompt("")
    } catch (err) {
      console.error("AI generation failed:", err)
      toast({ title: "KI-Generierung fehlgeschlagen", description: "Bitte versuche es mit einem detaillierteren Prompt.", variant: "destructive" })
    } finally {
      setAiLoading(false)
    }
  }

  const categories = ["VSL", "Basic"]
  const filteredTemplates = TEMPLATE_META.filter((t) => t.category === activeCategory)

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-900 dark:bg-black border-b border-gray-200 dark:border-gray-800 dark:border-gray-700 dark:border-gray-800 transition-colors shrink-0">
        <div className="flex items-center gap-4">
          <PenTool className="w-5 h-5 text-blue-600" />
          <input
            type="text"
            value={pageName}
            onChange={(e) => setPageName(e.target.value)}
            className="text-lg font-semibold text-gray-900 dark:text-white bg-transparent border-none focus:outline-none focus:ring-0 w-64"
          />
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            {sections.length} sections
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAiOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-violet-700 bg-violet-50 rounded-lg hover:bg-violet-100 transition"
          >
            <Sparkles className="w-4 h-4" />
            Generate with AI
          </button>
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition ${
              previewMode ? "text-blue-700 bg-blue-50" : "text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200"
            }`}
          >
            <Eye className="w-4 h-4" />
            {previewMode ? "Edit" : "Preview"}
          </button>
          <button
            disabled
            title="Publish – coming soon"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg opacity-50 cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            Publish
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        {!previewMode && (
          <div className="w-72 bg-gray-50 dark:bg-black dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 dark:border-gray-700 dark:border-gray-800 transition-colors flex flex-col shrink-0">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-300 uppercase tracking-wide">Templates</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1">Click to add a section</p>
            </div>

            {/* Category Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800 dark:border-gray-700">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                    activeCategory === cat
                      ? "text-blue-700 bg-blue-50 border-b-2 border-blue-600"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="p-3 space-y-1.5 overflow-y-auto">
              {filteredTemplates.map((tmpl) => (
                <button
                  key={tmpl.type}
                  onClick={() => addSection(tmpl.type)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-gray-900 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-800 dark:border-gray-700 dark:border-gray-700 transition-colors hover:border-blue-300 hover:shadow-sm transition text-left"
                >
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                    <tmpl.icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">{tmpl.label}</p>
                    <p className="text-[11px] text-gray-500">{tmpl.desc}</p>
                  </div>
                  <Plus className="w-4 h-4 text-gray-300 ml-auto shrink-0" />
                </button>
              ))}
            </div>

            {/* Section List with DnD */}
            {sections.length > 0 && (
              <>
                <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-800 dark:border-gray-700">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Sections ({sections.length})
                  </h3>
                </div>
                <div className="px-3 pb-3 space-y-1 overflow-y-auto">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                      {sections.map((section, idx) => (
                        <SortableSectionItem
                          key={section.id}
                          section={section}
                          index={idx}
                          selectedId={selectedId}
                          onSelect={setSelectedId}
                          onRemove={removeSection}
                          onDuplicate={duplicateSection}
                          onMove={moveSection}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              </>
            )}
          </div>
        )}

        {/* Preview Canvas */}
        <div className="flex-1 bg-gray-100 dark:bg-gray-800 overflow-y-auto" ref={previewRef}>
          {sections.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <LayoutTemplate className="w-16 h-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">Start building your landing page</p>
              <p className="text-sm text-gray-400 mt-1">Add a template from the sidebar or generate with AI</p>
            </div>
          ) : (
            <div className={previewMode ? "" : "max-w-5xl mx-auto bg-white dark:bg-gray-900 dark:bg-gray-900 shadow-lg my-4 transition-colors rounded-xl overflow-hidden"}>
              {sections.map((section) => (
                <div
                  key={section.id}
                  onClick={() => !previewMode && setSelectedId(section.id)}
                  className={`relative ${
                    !previewMode && selectedId === section.id
                      ? "ring-2 ring-blue-400 ring-inset cursor-pointer"
                      : !previewMode
                      ? "cursor-pointer hover:ring-1 hover:ring-blue-200 hover:ring-inset"
                      : ""
                  }`}
                >
                  {!previewMode && selectedId === section.id && (
                    <div className="absolute top-2 right-2 z-10 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase">
                      Selected
                    </div>
                  )}
                  <RenderSection section={section} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Generator Modal */}
      <AnimatePresence>
        {aiOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg mx-4 p-6 shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-600" />
                  Generate VSL Landing Page
                </h2>
                <button
                  onClick={() => setAiOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-800 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 dark:text-gray-400 mb-4">
                Describe your product, target audience, and language. The AI will generate a complete VSL landing page.
              </p>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. Create a VSL landing page for an insurance broker in Berlin targeting young families, German language, blue theme..."
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none h-32 text-sm"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setAiOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-black dark:hover:bg-gray-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={generateWithAI}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                >
                  {aiLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Drawer */}
      <AnimatePresence>
        {selectedSection && !previewMode && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-16 bottom-0 w-96 bg-white dark:bg-gray-900 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 dark:border-gray-800 transition-colors dark:border-gray-700 shadow-xl z-40 overflow-y-auto"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white capitalize">
                Edit {selectedSection.type.replace(/([A-Z])/g, " $1").trim()}
              </h3>
              <button
                onClick={() => setSelectedId(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-800 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <SectionEditor
                section={selectedSection}
                onChange={(content) => updateSection(selectedSection.id, content)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Section Editor ─────────────────────────────────────────────

function SectionEditor({
  section,
  onChange,
}: {
  section: BuilderSection
  onChange: (content: BuilderSection["content"]) => void
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = section.content as any

  const Field = ({
    label,
    value,
    onChangeValue,
    type = "text",
  }: {
    label: string
    value: string
    onChangeValue: (v: string) => void
    type?: string
  }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-300 uppercase tracking-wide mb-1.5">{label}</label>
      {type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChangeValue(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
          rows={3}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChangeValue(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      )}
    </div>
  )

  const ColorField = ({
    label,
    value,
    onChangeValue,
  }: {
    label: string
    value: string
    onChangeValue: (v: string) => void
  }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-300 uppercase tracking-wide mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#3b82f6"}
          onChange={(e) => onChangeValue(e.target.value)}
          className="w-8 h-8 rounded border border-gray-200 dark:border-gray-800 dark:border-gray-700 cursor-pointer"
        />
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChangeValue(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-800 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>
    </div>
  )

  const NumberField = ({
    label,
    value,
    onChangeValue,
  }: {
    label: string
    value: number
    onChangeValue: (v: number) => void
  }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-300 uppercase tracking-wide mb-1.5">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChangeValue(Number(e.target.value))}
        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      />
    </div>
  )

  const ArrayField = ({
    label,
    items,
    onChangeItems,
    placeholder,
  }: {
    label: string
    items: string[]
    onChangeItems: (items: string[]) => void
    placeholder?: string
  }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-300 uppercase tracking-wide mb-1.5">{label}</label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => {
                const next = [...items]
                next[i] = e.target.value
                onChangeItems(next)
              }}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-800 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              onClick={() => onChangeItems(items.filter((_, idx) => idx !== i))}
              className="p-1.5 text-gray-400 hover:text-red-500 rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button
          onClick={() => onChangeItems([...items, ""])}
          className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add item
        </button>
      </div>
    </div>
  )

  switch (section.type) {
    case "hero":
      return (
        <div className="space-y-4">
          <Field label="Headline" value={c.headline} onChangeValue={(v) => onChange({ ...c, headline: v })} />
          <Field label="Subheadline" value={c.subheadline} onChangeValue={(v) => onChange({ ...c, subheadline: v })} type="textarea" />
          <Field label="CTA Text" value={c.ctaText} onChangeValue={(v) => onChange({ ...c, ctaText: v })} />
          <Field label="CTA Link" value={c.ctaLink} onChangeValue={(v) => onChange({ ...c, ctaLink: v })} />
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Background" value={c.bgColor} onChangeValue={(v) => onChange({ ...c, bgColor: v })} />
            <ColorField label="Text Color" value={c.textColor} onChangeValue={(v) => onChange({ ...c, textColor: v })} />
          </div>
        </div>
      )

    case "features":
      return (
        <div className="space-y-4">
          <Field label="Title" value={c.title} onChangeValue={(v) => onChange({ ...c, title: v })} />
          <Field label="Subtitle" value={c.subtitle} onChangeValue={(v) => onChange({ ...c, subtitle: v })} type="textarea" />
          {c.features.map((f: Feature, i: number) => (
            <div key={i} className="bg-gray-50 dark:bg-black rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500">Feature {i + 1}</p>
              <Field
                label="Title"
                value={f.title}
                onChangeValue={(v) => {
                  const nf = [...c.features]
                  nf[i] = { ...f, title: v }
                  onChange({ ...c, features: nf })
                }}
              />
              <Field
                label="Description"
                value={f.description}
                onChangeValue={(v) => {
                  const nf = [...c.features]
                  nf[i] = { ...f, description: v }
                  onChange({ ...c, features: nf })
                }}
                type="textarea"
              />
            </div>
          ))}
        </div>
      )

    case "cta":
      return (
        <div className="space-y-4">
          <Field label="Text" value={c.text} onChangeValue={(v) => onChange({ ...c, text: v })} type="textarea" />
          <Field label="Button Text" value={c.buttonText} onChangeValue={(v) => onChange({ ...c, buttonText: v })} />
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Background" value={c.bgColor} onChangeValue={(v) => onChange({ ...c, bgColor: v })} />
            <ColorField label="Text Color" value={c.textColor} onChangeValue={(v) => onChange({ ...c, textColor: v })} />
          </div>
        </div>
      )

    case "form":
      return (
        <div className="space-y-4">
          <Field label="Title" value={c.title} onChangeValue={(v) => onChange({ ...c, title: v })} />
          <Field label="Subtitle" value={c.subtitle} onChangeValue={(v) => onChange({ ...c, subtitle: v })} type="textarea" />
          <Field label="Submit Button" value={c.submitText} onChangeValue={(v) => onChange({ ...c, submitText: v })} />
          <ColorField label="Button Color" value={c.buttonColor} onChangeValue={(v) => onChange({ ...c, buttonColor: v })} />
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-300 uppercase tracking-wide mb-1.5">Fields</label>
            <div className="flex gap-2">
              {["name", "email", "phone"].map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    const has = c.fields.includes(f)
                    onChange({ ...c, fields: has ? c.fields.filter((x: string) => x !== f) : [...c.fields, f] })
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition capitalize ${
                    c.fields.includes(f) ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 dark:border-gray-700 text-gray-500"
                  }`}
                >
                  {c.fields.includes(f) && <Check className="w-3 h-3 inline mr-1" />}
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      )

    case "footer":
      return (
        <div className="space-y-4">
          <Field label="Company Name" value={c.company} onChangeValue={(v) => onChange({ ...c, company: v })} />
          <Field label="Copyright" value={c.copyright} onChangeValue={(v) => onChange({ ...c, copyright: v })} />
        </div>
      )

    case "vslHero":
      return (
        <div className="space-y-4">
          <Field label="Video URL" value={c.videoUrl} onChangeValue={(v) => onChange({ ...c, videoUrl: v })} />
          <Field label="Headline" value={c.headline} onChangeValue={(v) => onChange({ ...c, headline: v })} />
          <Field label="Subheadline" value={c.subheadline} onChangeValue={(v) => onChange({ ...c, subheadline: v })} type="textarea" />
          <Field label="CTA Text" value={c.ctaText} onChangeValue={(v) => onChange({ ...c, ctaText: v })} />
          <Field label="CTA Link" value={c.ctaLink} onChangeValue={(v) => onChange({ ...c, ctaLink: v })} />
          <ArrayField label="Trust Badges" items={c.trustBadges} onChangeItems={(v) => onChange({ ...c, trustBadges: v })} />
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Background" value={c.bgColor} onChangeValue={(v) => onChange({ ...c, bgColor: v })} />
            <ColorField label="Text Color" value={c.textColor} onChangeValue={(v) => onChange({ ...c, textColor: v })} />
          </div>
        </div>
      )

    case "problem":
      return (
        <div className="space-y-4">
          <Field label="Headline" value={c.headline} onChangeValue={(v) => onChange({ ...c, headline: v })} />
          <Field label="Subheadline" value={c.subheadline} onChangeValue={(v) => onChange({ ...c, subheadline: v })} type="textarea" />
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Background" value={c.bgColor} onChangeValue={(v) => onChange({ ...c, bgColor: v })} />
            <ColorField label="Text Color" value={c.textColor} onChangeValue={(v) => onChange({ ...c, textColor: v })} />
          </div>
          {c.painPoints.map((p: PainPoint, i: number) => (
            <div key={i} className="bg-gray-50 dark:bg-black rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500">Pain Point {i + 1}</p>
              <Field label="Title" value={p.title} onChangeValue={(v) => {
                const np = [...c.painPoints]; np[i] = { ...p, title: v }; onChange({ ...c, painPoints: np })
              }} />
              <Field label="Description" value={p.description} onChangeValue={(v) => {
                const np = [...c.painPoints]; np[i] = { ...p, description: v }; onChange({ ...c, painPoints: np })
              }} type="textarea" />
            </div>
          ))}
        </div>
      )

    case "solution":
      return (
        <div className="space-y-4">
          <Field label="Headline" value={c.headline} onChangeValue={(v) => onChange({ ...c, headline: v })} />
          <Field label="Subheadline" value={c.subheadline} onChangeValue={(v) => onChange({ ...c, subheadline: v })} type="textarea" />
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Background" value={c.bgColor} onChangeValue={(v) => onChange({ ...c, bgColor: v })} />
            <ColorField label="Text Color" value={c.textColor} onChangeValue={(v) => onChange({ ...c, textColor: v })} />
          </div>
          {c.benefits.map((b: Benefit, i: number) => (
            <div key={i} className="bg-gray-50 dark:bg-black rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500">Benefit {i + 1}</p>
              <Field label="Title" value={b.title} onChangeValue={(v) => {
                const nb = [...c.benefits]; nb[i] = { ...b, title: v }; onChange({ ...c, benefits: nb })
              }} />
              <Field label="Description" value={b.description} onChangeValue={(v) => {
                const nb = [...c.benefits]; nb[i] = { ...b, description: v }; onChange({ ...c, benefits: nb })
              }} type="textarea" />
            </div>
          ))}
        </div>
      )

    case "socialProof":
      return (
        <div className="space-y-4">
          <Field label="Headline" value={c.headline} onChangeValue={(v) => onChange({ ...c, headline: v })} />
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Background" value={c.bgColor} onChangeValue={(v) => onChange({ ...c, bgColor: v })} />
            <ColorField label="Text Color" value={c.textColor} onChangeValue={(v) => onChange({ ...c, textColor: v })} />
          </div>
          {c.testimonials.map((t: Testimonial, i: number) => (
            <div key={i} className="bg-gray-50 dark:bg-black rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500">Testimonial {i + 1}</p>
              <Field label="Name" value={t.name} onChangeValue={(v) => {
                const nt = [...c.testimonials]; nt[i] = { ...t, name: v }; onChange({ ...c, testimonials: nt })
              }} />
              <Field label="Role" value={t.role} onChangeValue={(v) => {
                const nt = [...c.testimonials]; nt[i] = { ...t, role: v }; onChange({ ...c, testimonials: nt })
              }} />
              <Field label="Quote" value={t.quote} onChangeValue={(v) => {
                const nt = [...c.testimonials]; nt[i] = { ...t, quote: v }; onChange({ ...c, testimonials: nt })
              }} type="textarea" />
              <NumberField label="Rating (1-5)" value={t.rating} onChangeValue={(v) => {
                const nt = [...c.testimonials]; nt[i] = { ...t, rating: Math.min(5, Math.max(1, v)) }; onChange({ ...c, testimonials: nt })
              }} />
            </div>
          ))}
        </div>
      )

    case "offer":
      return (
        <div className="space-y-4">
          <Field label="Headline" value={c.headline} onChangeValue={(v) => onChange({ ...c, headline: v })} />
          <Field label="Original Price" value={c.originalPrice} onChangeValue={(v) => onChange({ ...c, originalPrice: v })} />
          <Field label="Price" value={c.price} onChangeValue={(v) => onChange({ ...c, price: v })} />
          <Field label="Guarantee" value={c.guarantee} onChangeValue={(v) => onChange({ ...c, guarantee: v })} />
          <Field label="CTA Text" value={c.ctaText} onChangeValue={(v) => onChange({ ...c, ctaText: v })} />
          <Field label="CTA Link" value={c.ctaLink} onChangeValue={(v) => onChange({ ...c, ctaLink: v })} />
          <ArrayField label="Features" items={c.features} onChangeItems={(v) => onChange({ ...c, features: v })} />
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Background" value={c.bgColor} onChangeValue={(v) => onChange({ ...c, bgColor: v })} />
            <ColorField label="Accent" value={c.accentColor} onChangeValue={(v) => onChange({ ...c, accentColor: v })} />
          </div>
          <ColorField label="Text Color" value={c.textColor} onChangeValue={(v) => onChange({ ...c, textColor: v })} />
        </div>
      )

    case "urgency":
      return (
        <div className="space-y-4">
          <Field label="Headline" value={c.headline} onChangeValue={(v) => onChange({ ...c, headline: v })} />
          <Field label="Subheadline" value={c.subheadline} onChangeValue={(v) => onChange({ ...c, subheadline: v })} type="textarea" />
          <Field label="Deadline Text" value={c.deadlineText} onChangeValue={(v) => onChange({ ...c, deadlineText: v })} />
          <Field label="CTA Text" value={c.ctaText} onChangeValue={(v) => onChange({ ...c, ctaText: v })} />
          <Field label="CTA Link" value={c.ctaLink} onChangeValue={(v) => onChange({ ...c, ctaLink: v })} />
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Spots Left" value={c.spotsLeft} onChangeValue={(v) => onChange({ ...c, spotsLeft: v })} />
            <NumberField label="Total Spots" value={c.totalSpots} onChangeValue={(v) => onChange({ ...c, totalSpots: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Background" value={c.bgColor} onChangeValue={(v) => onChange({ ...c, bgColor: v })} />
            <ColorField label="Accent" value={c.accentColor} onChangeValue={(v) => onChange({ ...c, accentColor: v })} />
          </div>
          <ColorField label="Text Color" value={c.textColor} onChangeValue={(v) => onChange({ ...c, textColor: v })} />
        </div>
      )

    case "ctaForm":
      return (
        <div className="space-y-4">
          <Field label="Headline" value={c.headline} onChangeValue={(v) => onChange({ ...c, headline: v })} />
          <Field label="Subheadline" value={c.subheadline} onChangeValue={(v) => onChange({ ...c, subheadline: v })} type="textarea" />
          <Field label="Submit Button" value={c.submitText} onChangeValue={(v) => onChange({ ...c, submitText: v })} />
          <Field label="Trust Text" value={c.trustText} onChangeValue={(v) => onChange({ ...c, trustText: v })} />
          <ColorField label="Button Color" value={c.buttonColor} onChangeValue={(v) => onChange({ ...c, buttonColor: v })} />
          <ColorField label="Background" value={c.bgColor} onChangeValue={(v) => onChange({ ...c, bgColor: v })} />
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-300 uppercase tracking-wide mb-1.5">Fields</label>
            <div className="flex gap-2">
              {["name", "email", "phone"].map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    const has = c.fields.includes(f)
                    onChange({ ...c, fields: has ? c.fields.filter((x: string) => x !== f) : [...c.fields, f] })
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition capitalize ${
                    c.fields.includes(f) ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 dark:border-gray-700 text-gray-500"
                  }`}
                >
                  {c.fields.includes(f) && <Check className="w-3 h-3 inline mr-1" />}
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      )

    case "vslFooter":
      return (
        <div className="space-y-4">
          <Field label="Company Name" value={c.company} onChangeValue={(v) => onChange({ ...c, company: v })} />
          <Field label="Copyright" value={c.copyright} onChangeValue={(v) => onChange({ ...c, copyright: v })} />
          {c.socials.map((s: SocialLink, i: number) => (
            <div key={i} className="bg-gray-50 dark:bg-black rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500">Social Link {i + 1}</p>
              <Field label="Icon" value={s.icon} onChangeValue={(v) => {
                const ns = [...c.socials]; ns[i] = { ...s, icon: v }; onChange({ ...c, socials: ns })
              }} />
              <Field label="URL" value={s.href} onChangeValue={(v) => {
                const ns = [...c.socials]; ns[i] = { ...s, href: v }; onChange({ ...c, socials: ns })
              }} />
            </div>
          ))}
        </div>
      )

    default:
      return null
  }
}
