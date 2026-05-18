"use client"

import { useEffect, useState } from "react"
import { X, ChevronDown, ChevronRight, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface ExecutionLog {
  id: string
  action: string
  input: string | null
  output: string | null
  status: string
  errorMessage: string | null
  createdAt: string
}

interface AgentRunDetail {
  id: string
  createdAt: string
  model: string
  provider: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  costCents: number
  latencyMs: number
  outcome: string
  systemPromptUsed: string
  userMessageInput: string
  agentResponse: string | null
  toolCallsMade: unknown
  handoffProposed: boolean
  handoffReason: string | null
  agentConfidence: number | null
  rulesPassed: boolean | null
  ruleEvaluation: unknown
  targetStateId: string | null
  errorMessage: string | null
  state: { id: string; name: string; agentRole: string | null } | null
  conversation: { id: string; channel: string } | null
  lead: { id: string; name: string | null; phone: string | null } | null
  executionLogs: ExecutionLog[]
}

interface Props {
  runId: string | null
  onClose: () => void
}

const OUTCOME_COLORS: Record<string, string> = {
  SUCCESS_CONTINUE: "text-green-500 bg-green-500/10 border-green-500/20",
  SUCCESS_HANDOFF:  "text-blue-500 bg-blue-500/10 border-blue-500/20",
  HANDOFF_BLOCKED:  "text-amber-500 bg-amber-500/10 border-amber-500/20",
  TOOL_EXECUTION_FAILED: "text-red-500 bg-red-500/10 border-red-500/20",
  LLM_ERROR:        "text-red-500 bg-red-500/10 border-red-500/20",
  ESCALATED:        "text-purple-500 bg-purple-500/10 border-purple-500/20",
}

function fmtCost(cents: number) {
  return `$${(cents / 100).toFixed(4)}`
}

function fmtTimestamp(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  })
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="p-1 rounded hover:bg-muted transition-colors shrink-0"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  )
}

function KVRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0 w-28">{label}</span>
      <span className={cn("text-xs text-foreground text-right break-all", mono && "font-mono")}>{value}</span>
    </div>
  )
}

function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors text-xs font-medium text-foreground"
      >
        {title}
        {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 py-3">{children}</div>}
    </div>
  )
}

export default function AgentRunDetailDrawer({ runId, onClose }: Props) {
  const [run, setRun] = useState<AgentRunDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<"overview" | "input" | "output" | "toolCalls" | "handoff">("overview")

  useEffect(() => {
    if (!runId) return
    setLoading(true)
    setError(null)
    fetch(`/api/crm/agent-runs/${runId}`)
      .then((res) => { if (!res.ok) throw new Error("Failed to load"); return res.json() })
      .then((data) => setRun(data.run))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [runId])

  const tabs = [
    { key: "overview" as const, label: "Overview" },
    { key: "input" as const, label: "Input" },
    { key: "output" as const, label: "Output" },
    { key: "toolCalls" as const, label: "Tool Calls" },
    { key: "handoff" as const, label: "Handoff" },
  ]

  return (
    <div className={cn(
      "fixed inset-y-0 right-0 z-50 w-full sm:w-[640px] bg-card border-l border-border shadow-2xl flex flex-col transition-transform duration-300",
      runId ? "translate-x-0" : "translate-x-full"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">AI Run Details</span>
          {run && (
            <span className={cn(
              "px-2 py-0.5 text-[10px] font-medium rounded-full border",
              OUTCOME_COLORS[run.outcome] ?? "text-muted-foreground bg-muted border-border"
            )}>
              {run.outcome}
            </span>
          )}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 gap-2">
            <p className="text-sm text-destructive font-medium">Fehler beim Laden</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        ) : !run ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-xs text-muted-foreground">Kein Run ausgewählt</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-border px-4 gap-1">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "px-3 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-[1px]",
                    tab === t.key
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-4 space-y-4">
              {tab === "overview" && (
                <div className="space-y-0">
                  <KVRow label="Run ID" value={<span className="font-mono text-[11px]">{run.id}</span>} />
                  <KVRow label="Created" value={fmtTimestamp(run.createdAt)} />
                  <KVRow label="Model" value={run.model} />
                  <KVRow label="Provider" value={run.provider} />
                  <KVRow label="State" value={run.state?.name ?? "—"} />
                  <KVRow label="Agent Role" value={run.state?.agentRole ?? "—"} />
                  <KVRow label="Channel" value={run.conversation?.channel ?? "—"} />
                  <KVRow label="Input Tokens" value={run.inputTokens.toLocaleString()} mono />
                  <KVRow label="Output Tokens" value={run.outputTokens.toLocaleString()} mono />
                  <KVRow label="Total Tokens" value={run.totalTokens.toLocaleString()} mono />
                  <KVRow label="Cost" value={fmtCost(run.costCents)} mono />
                  <KVRow label="Latency" value={`${run.latencyMs.toLocaleString()} ms`} mono />
                  {run.errorMessage && (
                    <KVRow label="Error" value={<span className="text-red-500">{run.errorMessage}</span>} />
                  )}
                </div>
              )}

              {tab === "input" && (
                <div className="space-y-3">
                  <CollapsibleSection title="System Prompt" defaultOpen>
                    <div className="relative">
                      <div className="absolute top-0 right-0 z-10"><CopyButton text={run.systemPromptUsed} /></div>
                      <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-words bg-muted/30 rounded p-3 max-h-80 overflow-y-auto pr-8">
                        {run.systemPromptUsed}
                      </pre>
                    </div>
                  </CollapsibleSection>
                  <CollapsibleSection title="User Message" defaultOpen>
                    <div className="relative">
                      <div className="absolute top-0 right-0 z-10"><CopyButton text={run.userMessageInput} /></div>
                      <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-words bg-muted/30 rounded p-3 max-h-40 overflow-y-auto pr-8">
                        {run.userMessageInput}
                      </pre>
                    </div>
                  </CollapsibleSection>
                </div>
              )}

              {tab === "output" && (
                <div>
                  {run.agentResponse ? (
                    <div className="relative">
                      <div className="absolute top-0 right-0 z-10"><CopyButton text={run.agentResponse} /></div>
                      <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-words bg-muted/30 rounded-lg p-4 max-h-[60vh] overflow-y-auto pr-8">
                        {run.agentResponse}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-12">Keine Antwort (Tool-Call only oder Error)</p>
                  )}
                </div>
              )}

              {tab === "toolCalls" && (
                <div className="space-y-2">
                  {Array.isArray(run.toolCallsMade) && run.toolCallsMade.length > 0 ? (
                    (run.toolCallsMade as Array<{ name: string; args: unknown }>).map((tc, i) => (
                      <div key={i} className="border border-border rounded-lg overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border">
                          <span className="text-xs font-mono font-medium text-foreground">{tc.name}</span>
                          <span className="text-[10px] text-muted-foreground">#{i + 1}</span>
                        </div>
                        <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap break-words p-3 max-h-40 overflow-y-auto">
                          {JSON.stringify(tc.args, null, 2)}
                        </pre>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-12">Keine Tool Calls</p>
                  )}

                  {/* Execution Logs */}
                  {run.executionLogs.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold text-foreground mb-2">Execution Logs</h4>
                      <div className="space-y-1">
                        {run.executionLogs.map((log) => (
                          <div key={log.id} className="flex items-start gap-2 px-3 py-2 bg-muted/20 rounded-lg text-xs">
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                              log.status === "SUCCESS" ? "bg-green-500" : "bg-red-500"
                            )} />
                            <div className="min-w-0 flex-1">
                              <span className="font-mono text-foreground">{log.action}</span>
                              {log.errorMessage && <p className="text-red-500 text-[10px] mt-0.5">{log.errorMessage}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === "handoff" && (
                <div className="space-y-3">
                  <div className="space-y-0">
                    <KVRow label="Handoff Proposed" value={run.handoffProposed ? "Yes" : "No"} />
                    <KVRow label="Agent Confidence" value={run.agentConfidence != null ? `${(run.agentConfidence * 100).toFixed(1)}%` : "—"} />
                    <KVRow label="Rules Passed" value={run.rulesPassed === true ? "Yes" : run.rulesPassed === false ? "No" : "—"} />
                    <KVRow label="Target State" value={
                      run.targetStateId
                        ? <span className="font-mono text-[11px]">{run.targetStateId}</span>
                        : "—"
                    } />
                  </div>
                  {run.handoffReason && (
                    <CollapsibleSection title="LLM Reasoning" defaultOpen>
                      <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                        {run.handoffReason}
                      </pre>
                    </CollapsibleSection>
                  )}
                  {run.ruleEvaluation != null && (
                    <CollapsibleSection title="Rule Evaluation">
                      <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                        {JSON.stringify(run.ruleEvaluation, null, 2)}
                      </pre>
                    </CollapsibleSection>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
