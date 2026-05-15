"use client"

import { useEffect, useState, useContext } from "react"
import { X, Plus, Trash2 } from "lucide-react"
import { LanguageContext } from "@/lib/LanguageContext"

// Local HandoffRule types — mirrors handoff-engine.ts but avoids server-only imports
export type HandoffRuleType = "field_collected" | "custom_data" | "message_count" | "lead_score"
export type HandoffRuleOperator =
  | "exists" | "not_exists" | "eq" | "neq"
  | "gte" | "lte" | "gt" | "lt"
  | "contains" | "not_contains"

export interface HandoffRule {
  type: HandoffRuleType
  field?: string
  operator: HandoffRuleOperator
  value?: string | number
}

export interface StateFormData {
  id?: string
  name: string
  type: string
  rules: string
  orderIndex: number
  nextStateId: string | null
  config: Record<string, unknown> | null
  dataToCollect: string
  completionRule: string
  availableTools: string[]
  behaviorMode: string
  escalateOnLowConfidence: boolean
  escalateOnOffMission: boolean
  escalateOnNoReply: number | null
  maxFollowups: number
  followupAction: string
  allowChannelSwitch: boolean
  // Sub-Agent fields
  agentRole: string
  agentSystemPrompt: string
  agentGoal: string
  handoffMode: string
  handoffRules: HandoffRule[]
  minAgentConfidence: number
  nextStateOnFail: string | null
}

interface StateOption { id: string; name: string }

interface StateFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: StateFormData) => void
  initialData?: StateFormData
  states: StateOption[]
  title: string
  submitLabel: string
}

const aiModels = [
  { value: "conversio", label: "Conversio (Standard)" },
  { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
  { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B (Schnell)" },
  { value: "gemma2-9b-it", label: "Gemma 2 9B" },
]

const stateTypes = [
  { value: "AI", label: "AI", desc: "KI-gestützte Konversation" },
  { value: "MESSAGE", label: "Message", desc: "Feste Textnachricht" },
  { value: "TEMPLATE", label: "Template", desc: "Template aus dem Media Manager" },
  { value: "CONDITION", label: "Condition", desc: "If/Then-Logik" },
  { value: "WAIT", label: "Wait", desc: "Zeitverzögerung" },
]

const ALL_TOOLS = [
  { name: "update_lead_data",      label: "Lead-Daten speichern",         isStub: false, desc: "Schreibt gesammelte Felder ins CRM" },
  { name: "advance_state",         label: "State wechseln",               isStub: false, desc: "Wechselt zum nächsten Funnel-Schritt" },
  { name: "escalate_to_human",     label: "An Mensch eskalieren",         isStub: false, desc: "Pausiert KI, informiert Mitarbeiter" },
  { name: "send_template",         label: "Template senden",              isStub: false, desc: "Sendet ein vorkonfiguriertes Template" },
  { name: "set_lead_score",        label: "Lead bewerten",                isStub: false, desc: "Setzt einen Score 0–100" },
  { name: "send_asset",            label: "Asset senden",                 isStub: false, desc: "Sendet eine Datei/Bild aus BrainLab" },
  { name: "search_assets",         label: "Assets durchsuchen",           isStub: false, desc: "Sucht in BrainLab nach passenden Inhalten" },
  { name: "suggest_channel_switch",label: "Channel-Wechsel vorschlagen",  isStub: false, desc: "Empfiehlt WhatsApp/Telegram-Wechsel" },
  { name: "book_calendar",         label: "Termin buchen",                isStub: true,  desc: "Cal.com-Integration (bald)" },
  { name: "send_email",            label: "E-Mail senden",                isStub: true,  desc: "Resend-Integration (bald)" },
  { name: "trigger_webhook",       label: "Webhook auslösen",             isStub: true,  desc: "Zapier/Make/eigenes Backend (bald)" },
  { name: "create_stripe_link",    label: "Stripe-Link erstellen",        isStub: true,  desc: "Zahlungslink generieren (bald)" },
  { name: "generate_pdf",          label: "PDF generieren",               isStub: true,  desc: "PDF aus Template (bald)" },
]

const DEFAULT_AI_TOOLS = ["update_lead_data", "advance_state", "escalate_to_human"]

const EMPTY_FORM: StateFormData = {
  name: "", type: "MESSAGE", rules: "", orderIndex: 0,
  nextStateId: null, config: {}, dataToCollect: "", completionRule: "",
  availableTools: DEFAULT_AI_TOOLS, behaviorMode: "inherit",
  escalateOnLowConfidence: true, escalateOnOffMission: true,
  escalateOnNoReply: null, maxFollowups: 3, followupAction: "escalate",
  allowChannelSwitch: true,
  agentRole: "", agentSystemPrompt: "", agentGoal: "",
  handoffMode: "HYBRID", handoffRules: [], minAgentConfidence: 0.7, nextStateOnFail: null,
}

const inputClass = "mt-1 w-full px-3 py-2 text-sm border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
const taClass = `${inputClass} resize-none`
const labelClass = "block text-sm font-medium text-foreground"
const hintClass = "text-xs text-muted-foreground mt-0.5"
const sectionClass = "border-t border-border pt-4 space-y-4"

// ── HandoffRule row editor ────────────────────────────────────────────────────

function HandoffRuleRow({
  rule,
  onChange,
  onDelete,
}: {
  rule: HandoffRule
  onChange: (r: HandoffRule) => void
  onDelete: () => void
}) {
  const needsField = rule.type === "field_collected" || rule.type === "custom_data"
  const needsValue = rule.operator !== "exists" && rule.operator !== "not_exists"
  const tinyInput = "text-xs px-2 py-1.5 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-1 focus:ring-ring"

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-2 bg-muted/30 rounded-lg border border-border">
      <select value={rule.type}
        onChange={(e) => onChange({ ...rule, type: e.target.value as HandoffRuleType, field: undefined, value: undefined })}
        className={tinyInput}>
        <option value="field_collected">Feld gesammelt</option>
        <option value="custom_data">Custom Data</option>
        <option value="message_count">Nachrichtenanzahl</option>
        <option value="lead_score">Lead Score</option>
      </select>

      {needsField && (
        <input type="text" value={rule.field || ""} placeholder="feldname"
          onChange={(e) => onChange({ ...rule, field: e.target.value })}
          className={`${tinyInput} w-24`} />
      )}

      <select value={rule.operator}
        onChange={(e) => onChange({ ...rule, operator: e.target.value as HandoffRuleOperator, value: undefined })}
        className={tinyInput}>
        <option value="exists">exists</option>
        <option value="not_exists">not_exists</option>
        <option value="eq">= eq</option>
        <option value="neq">≠ neq</option>
        <option value="gte">≥ gte</option>
        <option value="lte">≤ lte</option>
        <option value="gt">&gt; gt</option>
        <option value="lt">&lt; lt</option>
        <option value="contains">contains</option>
        <option value="not_contains">not_contains</option>
      </select>

      {needsValue && (
        <input type="text" value={String(rule.value ?? "")} placeholder="wert"
          onChange={(e) => onChange({ ...rule, value: e.target.value })}
          className={`${tinyInput} w-20`} />
      )}

      <button type="button" onClick={onDelete}
        className="ml-auto p-1 text-muted-foreground hover:text-destructive transition-colors rounded">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StateForm({
  isOpen, onClose, onSubmit, initialData, states, title, submitLabel,
}: StateFormProps) {
  const [form, setForm] = useState<StateFormData>({ ...EMPTY_FORM, orderIndex: states.length })
  const { t } = useContext(LanguageContext)

  useEffect(() => {
    if (!isOpen) return
    if (initialData) {
      setForm({
        ...initialData,
        config: initialData.config || {},
        dataToCollect: initialData.dataToCollect || "",
        completionRule: initialData.completionRule || "",
        availableTools: initialData.availableTools?.length ? initialData.availableTools : DEFAULT_AI_TOOLS,
        behaviorMode: initialData.behaviorMode || "inherit",
        escalateOnLowConfidence: initialData.escalateOnLowConfidence ?? true,
        escalateOnOffMission: initialData.escalateOnOffMission ?? true,
        escalateOnNoReply: initialData.escalateOnNoReply ?? null,
        maxFollowups: initialData.maxFollowups ?? 3,
        followupAction: initialData.followupAction || "escalate",
        allowChannelSwitch: initialData.allowChannelSwitch ?? true,
        agentRole: initialData.agentRole || "",
        agentSystemPrompt: initialData.agentSystemPrompt || "",
        agentGoal: initialData.agentGoal || "",
        handoffMode: initialData.handoffMode || "HYBRID",
        handoffRules: Array.isArray(initialData.handoffRules) ? initialData.handoffRules : [],
        minAgentConfidence: initialData.minAgentConfidence ?? 0.7,
        nextStateOnFail: initialData.nextStateOnFail ?? null,
      })
    } else {
      setForm({ ...EMPTY_FORM, orderIndex: states.length })
    }
  }, [initialData, isOpen, states.length])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit(form) }
  const updateConfig = (key: string, value: unknown) =>
    setForm((prev) => ({ ...prev, config: { ...(prev.config || {}), [key]: value } }))
  const config = form.config || {}

  const addHandoffRule = () =>
    setForm((prev) => ({
      ...prev,
      handoffRules: [...prev.handoffRules, { type: "field_collected", field: "", operator: "exists" }],
    }))

  const updateHandoffRule = (idx: number, rule: HandoffRule) =>
    setForm((prev) => {
      const updated = [...prev.handoffRules]
      updated[idx] = rule
      return { ...prev, handoffRules: updated }
    })

  const deleteHandoffRule = (idx: number) =>
    setForm((prev) => ({ ...prev, handoffRules: prev.handoffRules.filter((_, i) => i !== idx) }))

  const otherStates = states.filter((s) => s.id !== form.id)

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-card shadow-xl z-50 p-6 overflow-y-auto border-l border-border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Name ── */}
          <div>
            <label className={labelClass}>{t("common.name")}</label>
            <input type="text" value={form.name} required
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass} placeholder={t("stateForm.namePlaceholder")} />
          </div>

          {/* ── Type ── */}
          <div>
            <label className={labelClass}>{t("common.type")}</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass}>
              {stateTypes.map((st) => (
                <option key={st.value} value={st.value}>{st.label} — {st.desc}</option>
              ))}
            </select>
          </div>

          {/* ── Condition Expression (CONDITION states only) ── */}
          {form.type === "CONDITION" && (
            <div>
              <label className={labelClass}>Condition Expression</label>
              <p className={hintClass}>Routing-Logik für diesen CONDITION-State</p>
              <textarea value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })}
                className={taClass} rows={2}
                placeholder="IF leadScore >= 50 THEN advance" />
            </div>
          )}

          {/* ── Next State (all types) ── */}
          <div>
            <label className={labelClass}>{t("stateForm.nextState")}</label>
            <p className={hintClass}>{t("stateForm.nextStateDesc")}</p>
            <select value={form.nextStateId || ""} onChange={(e) => setForm({ ...form, nextStateId: e.target.value || null })} className={inputClass}>
              <option value="">{t("stateForm.noNextState")}</option>
              {otherStates.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              TYPE-SPECIFIC SECTIONS
          ══════════════════════════════════════════════════════════════ */}

          {/* ── AI: Sub-Agent Identity ── */}
          {form.type === "AI" && (
            <div className={sectionClass}>
              <h3 className="text-sm font-semibold text-foreground">Sub-Agent Identity</h3>

              <div>
                <label className={labelClass}>
                  Agent Role <span className="text-destructive text-xs ml-0.5">*</span>
                </label>
                <p className={hintClass}>Kurze Rollenbezeichnung, z.B. Lead Qualifier oder Property Advisor</p>
                <input type="text" value={form.agentRole}
                  onChange={(e) => setForm({ ...form, agentRole: e.target.value })}
                  className={inputClass} placeholder="Lead Qualifier" />
              </div>

              <div>
                <label className={labelClass}>
                  Agent Goal <span className="text-destructive text-xs ml-0.5">*</span>
                </label>
                <p className={hintClass}>Was soll dieser Sub-Agent in diesem State erreichen?</p>
                <textarea value={form.agentGoal}
                  onChange={(e) => setForm({ ...form, agentGoal: e.target.value })}
                  className={taClass} rows={2}
                  placeholder="Qualifiziere Budget, Standort und Timeline innerhalb von 5 Nachrichten" />
              </div>

              <div>
                <label className={labelClass}>
                  System Prompt <span className="text-destructive text-xs ml-0.5">*</span>
                </label>
                <p className={hintClass}>Detaillierte Anweisungen für diesen State. Überschreibt den globalen Board-Prompt.</p>
                <textarea value={form.agentSystemPrompt}
                  onChange={(e) => setForm({ ...form, agentSystemPrompt: e.target.value })}
                  className={taClass} rows={7}
                  placeholder={"Du bist ein freundlicher Immobilienberater bei Vanessa Bali Properties.\n\nDeine Aufgabe in diesem State:\n..."} />
              </div>
            </div>
          )}

          {/* ── AI: Model + Temperature ── */}
          {form.type === "AI" && (
            <div className={sectionClass}>
              <h3 className="text-sm font-semibold text-foreground">{t("stateForm.typeConfig")}</h3>

              <div>
                <label className={labelClass}>{t("stateForm.aiModel")}</label>
                <select value={String(config.model || "conversio")}
                  onChange={(e) => updateConfig("model", e.target.value)} className={inputClass}>
                  {aiModels.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              <div>
                <label className={labelClass}>
                  {t("stateForm.temperature")}: {Number(config.temperature ?? 0.7).toFixed(1)}
                </label>
                <input type="range" min="0" max="2" step="0.1" value={Number(config.temperature ?? 0.7)}
                  onChange={(e) => updateConfig("temperature", parseFloat(e.target.value))}
                  className="mt-2 w-full accent-primary" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{t("stateForm.precise")}</span>
                  <span>{t("stateForm.creative")}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── AI: Data Collection + Behavior ── */}
          {form.type === "AI" && (
            <div className={sectionClass}>
              <h3 className="text-sm font-semibold text-foreground">Verhalten &amp; Datenerfassung</h3>

              <div>
                <label className={labelClass}>Zu sammelnde Felder</label>
                <p className={hintClass}>Kommagetrennte Feldschlüssel (z.B. name,email,budget)</p>
                <textarea value={form.dataToCollect}
                  onChange={(e) => setForm({ ...form, dataToCollect: e.target.value })}
                  className={taClass} rows={2} placeholder="vorname, nachname, email, budget" />
              </div>

              <div>
                <label className={labelClass}>Completion Rule</label>
                <select value={form.completionRule}
                  onChange={(e) => setForm({ ...form, completionRule: e.target.value })} className={inputClass}>
                  <option value="">Standard (nächste Nachricht)</option>
                  <option value="next_on_message">next_on_message — Weiter bei jeder Nachricht</option>
                  <option value="all_collected">all_collected — Weiter wenn alle Felder gesammelt</option>
                  <option value="manual_only">manual_only — Nur manuell weiterschalten</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Verhaltensmodus</label>
                <select value={form.behaviorMode}
                  onChange={(e) => setForm({ ...form, behaviorMode: e.target.value })} className={inputClass}>
                  <option value="inherit">inherit — Vom Board erben</option>
                  <option value="reactive">reactive — Nur auf Nachrichten antworten</option>
                  <option value="proactive">proactive — Selbst nachhaken</option>
                </select>
              </div>
            </div>
          )}

          {/* ── AI: Tools ── */}
          {form.type === "AI" && (
            <div className={sectionClass}>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-0.5">Verfügbare Tools</h3>
                <p className={hintClass}>Welche Aktionen die KI in diesem State ausführen darf</p>
                <p className={`${hintClass} mt-0.5`}>Immer verfügbar: handoff_proposed, escalate_to_supervisor</p>
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {ALL_TOOLS.map((tool) => {
                  const checked = form.availableTools.includes(tool.name)
                  return (
                    <label key={tool.name} className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      tool.isStub
                        ? "border-border opacity-40 cursor-not-allowed"
                        : checked
                        ? "border-primary/30 bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}>
                      <input type="checkbox" checked={checked} disabled={tool.isStub}
                        onChange={(e) => {
                          if (tool.isStub) return
                          setForm((prev) => ({
                            ...prev,
                            availableTools: e.target.checked
                              ? [...prev.availableTools, tool.name]
                              : prev.availableTools.filter((tn) => tn !== tool.name),
                          }))
                        }}
                        className="mt-0.5 w-3.5 h-3.5 accent-primary rounded" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground">{tool.label}</span>
                          {tool.isStub && (
                            <span className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground rounded">Bald</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{tool.desc}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── AI: Handoff Logic ── */}
          {form.type === "AI" && (
            <div className={sectionClass}>
              <h3 className="text-sm font-semibold text-foreground">Handoff Logic</h3>

              <div>
                <label className={labelClass}>Handoff Mode</label>
                <p className={hintClass}>Wann und wie wechselt der Agent zum nächsten State?</p>
                <select value={form.handoffMode}
                  onChange={(e) => setForm({ ...form, handoffMode: e.target.value })} className={inputClass}>
                  <option value="HYBRID">HYBRID — LLM schlägt vor, Regeln bestätigen</option>
                  <option value="LLM_ONLY">LLM_ONLY — Agent entscheidet allein</option>
                  <option value="RULE_ONLY">RULE_ONLY — Nur Regeln, kein LLM-Vorschlag</option>
                </select>
              </div>

              {form.handoffMode !== "RULE_ONLY" && (
                <div>
                  <label className={labelClass}>
                    Min. Konfidenz: <span className="tabular-nums">{form.minAgentConfidence.toFixed(2)}</span>
                  </label>
                  <p className={hintClass}>Agent braucht mindestens diese Konfidenz um Handoff vorzuschlagen</p>
                  <input type="range" min="0" max="1" step="0.05" value={form.minAgentConfidence}
                    onChange={(e) => setForm({ ...form, minAgentConfidence: parseFloat(e.target.value) })}
                    className="mt-2 w-full accent-primary" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0.00 — Immer handoff</span>
                    <span>1.00 — Nur sehr sicher</span>
                  </div>
                </div>
              )}

              <div>
                <label className={labelClass}>Next State on Fail (optional)</label>
                <p className={hintClass}>Fallback wenn Handoff scheitert oder Konfidenz zu niedrig ist</p>
                <select value={form.nextStateOnFail || ""}
                  onChange={(e) => setForm({ ...form, nextStateOnFail: e.target.value || null })} className={inputClass}>
                  <option value="">— kein Fallback —</option>
                  {otherStates.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass + " mb-1"}>Handoff Rules</label>
                <p className={hintClass}>Bedingungen unter denen Handoff zum nächsten State ausgelöst wird</p>
                <div className="space-y-2 mt-2">
                  {form.handoffRules.map((rule, idx) => (
                    <HandoffRuleRow
                      key={idx}
                      rule={rule}
                      onChange={(r) => updateHandoffRule(idx, r)}
                      onDelete={() => deleteHandoffRule(idx)}
                    />
                  ))}
                  <button type="button" onClick={addHandoffRule}
                    className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors mt-1">
                    <Plus className="w-3.5 h-3.5" />
                    Regel hinzufügen
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── AI: Escalation + Channel ── */}
          {form.type === "AI" && (
            <div className={sectionClass}>
              <h3 className="text-sm font-semibold text-foreground">Eskalation &amp; Followup</h3>

              <div className="space-y-2">
                {[
                  { key: "escalateOnLowConfidence" as const, label: "Eskalieren bei niedriger Konfidenz" },
                  { key: "escalateOnOffMission" as const, label: "Eskalieren wenn Lead off-mission ist" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input type="checkbox" checked={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                      className="w-4 h-4 accent-primary rounded" />
                    {label}
                  </label>
                ))}
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input type="checkbox" checked={form.escalateOnNoReply !== null}
                    onChange={(e) => setForm({ ...form, escalateOnNoReply: e.target.checked ? 24 : null })}
                    className="w-4 h-4 accent-primary rounded" />
                  Eskalieren bei ausbleibender Antwort
                </label>
                {form.escalateOnNoReply !== null && (
                  <div className="pl-6">
                    <label className={hintClass}>Nach wie vielen Stunden?</label>
                    <input type="number" min="1" value={form.escalateOnNoReply ?? 24}
                      onChange={(e) => setForm({ ...form, escalateOnNoReply: parseInt(e.target.value) || 24 })}
                      className="mt-1 w-32 px-3 py-1.5 text-sm border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={form.allowChannelSwitch}
                  onChange={(e) => setForm({ ...form, allowChannelSwitch: e.target.checked })}
                  className="w-4 h-4 accent-primary rounded" />
                Channel-Switch erlaubt
              </label>
              <p className="text-xs text-muted-foreground -mt-2 ml-6">
                Lead kann in diesem State auf einen anderen Channel wechseln
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Max. Followups</label>
                  <input type="number" min="0" value={form.maxFollowups}
                    onChange={(e) => setForm({ ...form, maxFollowups: parseInt(e.target.value) || 0 })}
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Followup-Aktion</label>
                  <select value={form.followupAction}
                    onChange={(e) => setForm({ ...form, followupAction: e.target.value })} className={inputClass}>
                    <option value="escalate">escalate — Eskalieren</option>
                    <option value="drop">drop — Aufgeben</option>
                    <option value="advance_to_state">advance_to_state — Weiterschalten</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── MESSAGE: Static text ── */}
          {form.type === "MESSAGE" && (
            <div className={sectionClass}>
              <h3 className="text-sm font-semibold text-foreground">{t("stateForm.typeConfig")}</h3>
              <div>
                <label className={labelClass}>{t("stateForm.fixedMessage")}</label>
                <textarea value={String(config.text || "")}
                  onChange={(e) => updateConfig("text", e.target.value)}
                  className={taClass} rows={5} placeholder={t("stateForm.fixedMessagePlaceholder")} />
              </div>
            </div>
          )}

          {/* ── TEMPLATE ── */}
          {form.type === "TEMPLATE" && (
            <div className={sectionClass}>
              <h3 className="text-sm font-semibold text-foreground">{t("stateForm.typeConfig")}</h3>
              <div>
                <label className={labelClass}>{t("stateForm.templateName")}</label>
                <input type="text" value={String(config.templateName || "")}
                  onChange={(e) => updateConfig("templateName", e.target.value)}
                  className={inputClass} placeholder={t("stateForm.templatePlaceholder")} />
                <p className={hintClass + " mt-1"}>{t("stateForm.templateNote")}</p>
              </div>
            </div>
          )}

          {/* ── CONDITION ── */}
          {form.type === "CONDITION" && (
            <div className={sectionClass}>
              <h3 className="text-sm font-semibold text-foreground">{t("stateForm.typeConfig")}</h3>
              <div>
                <label className={labelClass}>{t("stateForm.ifThenCondition")}</label>
                <textarea value={String(config.condition || "")}
                  onChange={(e) => updateConfig("condition", e.target.value)}
                  className={taClass} rows={3} placeholder={t("stateForm.conditionPlaceholder")} />
              </div>
            </div>
          )}

          {/* ── WAIT ── */}
          {form.type === "WAIT" && (
            <div className={sectionClass}>
              <h3 className="text-sm font-semibold text-foreground">{t("stateForm.typeConfig")}</h3>
              <div>
                <label className={labelClass}>{t("stateForm.waitTimeHours")}</label>
                <input type="number" min="0" step="0.5" value={String(config.duration || "")}
                  onChange={(e) => updateConfig("duration", parseFloat(e.target.value) || 0)}
                  className={inputClass} placeholder={t("stateForm.waitPlaceholder")} />
              </div>
            </div>
          )}

          {/* ── Order Index ── */}
          <div className="border-t border-border pt-4">
            <label className={labelClass}>{t("stateForm.orderIndex")}</label>
            <input type="number" min="0" value={form.orderIndex}
              onChange={(e) => setForm({ ...form, orderIndex: parseInt(e.target.value) || 0 })}
              className={inputClass} />
          </div>

          {/* ── Actions ── */}
          <div className="pt-4 flex gap-3 sticky bottom-0 bg-card pb-2 border-t border-border -mx-6 px-6">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-muted transition-colors">
              {t("stateForm.cancel")}
            </button>
            <button type="submit"
              className="flex-1 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors">
              {submitLabel}
            </button>
          </div>

        </form>
      </div>
    </>
  )
}
