import { prisma } from "@/lib/db"
import type { HandoffMode } from "@prisma/client"

// ── Rule Schema ───────────────────────────────────────────────────────────────

export type RuleOperator =
  | "exists"
  | "not_exists"
  | "eq"
  | "neq"
  | "gte"
  | "lte"
  | "gt"
  | "lt"
  | "contains"
  | "not_contains"

export type RuleType =
  | "field_collected"   // lead.customData has this key
  | "custom_data"       // lead.customData[field] satisfies operator/value
  | "message_count"     // total messages in conversation
  | "lead_score"        // lead.leadScore

export interface HandoffRule {
  type: RuleType
  field?: string
  operator: RuleOperator
  value?: string | number | boolean
}

export interface RuleEvaluationResult {
  rule: HandoffRule
  passed: boolean
  reason: string
  actual?: unknown
}

export interface HandoffRulesEvaluation {
  allPassed: boolean
  passedCount: number
  totalCount: number
  results: RuleEvaluationResult[]
}

// ── Context loader ─────────────────────────────────────────────────────────────

export interface HandoffContext {
  leadCustomData: Record<string, unknown>
  leadScore: number
  messageCount: number
}

export async function loadHandoffContext(conversationId: string): Promise<HandoffContext> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      lead: { select: { customData: true, leadScore: true } },
      _count: { select: { messages: true } },
    },
  })

  return {
    leadCustomData: (conversation?.lead?.customData as Record<string, unknown>) ?? {},
    leadScore:      conversation?.lead?.leadScore ?? 0,
    messageCount:   conversation?._count?.messages ?? 0,
  }
}

// ── Rule Evaluator ─────────────────────────────────────────────────────────────

export function evaluateRule(rule: HandoffRule, ctx: HandoffContext): RuleEvaluationResult {
  let actual: unknown
  let passed: boolean
  let reason: string

  switch (rule.type) {
    case "field_collected": {
      if (!rule.field) {
        return { rule, passed: false, reason: "Kein Feld angegeben" }
      }
      actual = ctx.leadCustomData[rule.field]
      const exists = actual !== undefined && actual !== null && actual !== ""
      if (rule.operator === "exists") {
        passed = exists
        reason = exists
          ? `Feld '${rule.field}' ist vorhanden`
          : `Feld '${rule.field}' fehlt noch`
      } else if (rule.operator === "not_exists") {
        passed = !exists
        reason = !exists
          ? `Feld '${rule.field}' ist nicht gesetzt (erwartet)`
          : `Feld '${rule.field}' ist gesetzt (unerwartet)`
      } else {
        passed = false
        reason = `Operator '${rule.operator}' ist für field_collected nicht unterstützt. Nutze 'exists' oder 'not_exists'.`
      }
      break
    }

    case "custom_data": {
      if (!rule.field) {
        return { rule, passed: false, reason: "Kein Feld angegeben" }
      }
      actual = ctx.leadCustomData[rule.field]
      ;({ passed, reason } = applyOperator(rule.operator, actual, rule.value, `customData.${rule.field}`))
      break
    }

    case "message_count": {
      actual = ctx.messageCount
      ;({ passed, reason } = applyOperator(rule.operator, actual, rule.value, "Nachrichtenanzahl"))
      break
    }

    case "lead_score": {
      actual = ctx.leadScore
      ;({ passed, reason } = applyOperator(rule.operator, actual, rule.value, "Lead-Score"))
      break
    }

    default:
      return { rule, passed: false, reason: `Unbekannter Regel-Typ: ${(rule as HandoffRule).type}` }
  }

  return { rule, passed, reason, actual }
}

export function evaluateHandoffRules(
  rawRules: unknown,
  ctx: HandoffContext,
): HandoffRulesEvaluation {
  const rules = parseRules(rawRules)

  if (rules.length === 0) {
    return { allPassed: true, passedCount: 0, totalCount: 0, results: [] }
  }

  const results = rules.map((rule) => evaluateRule(rule, ctx))
  const passedCount = results.filter((r) => r.passed).length

  return {
    allPassed:  passedCount === rules.length,
    passedCount,
    totalCount: rules.length,
    results,
  }
}

// ── Handoff Decision ───────────────────────────────────────────────────────────

export interface HandoffDecisionInput {
  mode:           HandoffMode
  agentProposed:  boolean
  agentConfidence: number | null
  minConfidence:  number
  rulesEval:      HandoffRulesEvaluation
}

export interface HandoffDecision {
  approved:         boolean
  reason:           string
  rulesPassed:      boolean | null
  confidencePassed: boolean | null
}

export function decideHandoff(input: HandoffDecisionInput): HandoffDecision {
  const {
    mode,
    agentProposed,
    agentConfidence,
    minConfidence,
    rulesEval,
  } = input

  const confidencePassed =
    agentConfidence !== null ? agentConfidence >= minConfidence : null

  switch (mode) {
    case "LLM_ONLY": {
      if (!agentProposed) {
        return { approved: false, reason: "Agent hat keinen Handoff vorgeschlagen", rulesPassed: null, confidencePassed }
      }
      const confOk = confidencePassed ?? true
      return {
        approved:         confOk,
        reason:           confOk
          ? `Agent-Handoff genehmigt (Konfidenz: ${agentConfidence ?? "n/a"})`
          : `Agent-Konfidenz zu niedrig: ${agentConfidence} < ${minConfidence}`,
        rulesPassed:      null,
        confidencePassed: confidencePassed ?? null,
      }
    }

    case "RULE_ONLY": {
      return {
        approved:         rulesEval.allPassed,
        reason:           rulesEval.allPassed
          ? `Alle ${rulesEval.totalCount} Regeln erfüllt`
          : `${rulesEval.totalCount - rulesEval.passedCount} von ${rulesEval.totalCount} Regeln nicht erfüllt`,
        rulesPassed:      rulesEval.allPassed,
        confidencePassed: null,
      }
    }

    case "HYBRID":
    default: {
      if (!agentProposed) {
        return { approved: false, reason: "Agent hat keinen Handoff vorgeschlagen", rulesPassed: rulesEval.allPassed, confidencePassed }
      }
      const confOk = confidencePassed ?? true
      const rulesOk = rulesEval.allPassed

      if (!confOk) {
        return {
          approved: false,
          reason: `Konfidenz zu niedrig: ${agentConfidence} < ${minConfidence}`,
          rulesPassed: rulesOk,
          confidencePassed,
        }
      }
      if (!rulesOk) {
        const failed = rulesEval.results.filter((r) => !r.passed).map((r) => r.reason)
        return {
          approved: false,
          reason: `Regeln nicht erfüllt: ${failed.join("; ")}`,
          rulesPassed: false,
          confidencePassed,
        }
      }
      return {
        approved:         true,
        reason:           `Hybrid-Handoff genehmigt (Konfidenz: ${agentConfidence}, Regeln: ${rulesEval.passedCount}/${rulesEval.totalCount})`,
        rulesPassed:      true,
        confidencePassed: true,
      }
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseRules(raw: unknown): HandoffRule[] {
  if (!raw || !Array.isArray(raw)) return []
  return raw.filter(isHandoffRule)
}

function isHandoffRule(r: unknown): r is HandoffRule {
  return (
    typeof r === "object" &&
    r !== null &&
    "type" in r &&
    "operator" in r &&
    typeof (r as HandoffRule).type === "string" &&
    typeof (r as HandoffRule).operator === "string"
  )
}

function applyOperator(
  operator: RuleOperator,
  actual: unknown,
  expected: string | number | boolean | undefined,
  label: string,
): { passed: boolean; reason: string } {
  const numActual = typeof actual === "number" ? actual : Number(actual)
  const numExpected = typeof expected === "number" ? expected : Number(expected)

  switch (operator) {
    case "exists":
      return {
        passed: actual !== undefined && actual !== null && actual !== "",
        reason: actual !== undefined && actual !== null && actual !== ""
          ? `${label} ist vorhanden`
          : `${label} fehlt`,
      }
    case "not_exists":
      return {
        passed: actual === undefined || actual === null || actual === "",
        reason: actual === undefined || actual === null || actual === ""
          ? `${label} ist nicht gesetzt (erwartet)`
          : `${label} ist gesetzt (unerwartet): ${actual}`,
      }
    case "eq":
      return {
        passed: String(actual) === String(expected),
        reason: String(actual) === String(expected)
          ? `${label} = ${expected}`
          : `${label}: erwartet ${expected}, ist ${actual}`,
      }
    case "neq":
      return {
        passed: String(actual) !== String(expected),
        reason: String(actual) !== String(expected)
          ? `${label} ≠ ${expected}`
          : `${label} ist ${actual} (sollte nicht sein)`,
      }
    case "gte":
      return {
        passed: numActual >= numExpected,
        reason: numActual >= numExpected
          ? `${label} ${numActual} ≥ ${numExpected}`
          : `${label} ${numActual} < ${numExpected} (Minimum: ${numExpected})`,
      }
    case "lte":
      return {
        passed: numActual <= numExpected,
        reason: numActual <= numExpected
          ? `${label} ${numActual} ≤ ${numExpected}`
          : `${label} ${numActual} > ${numExpected} (Maximum: ${numExpected})`,
      }
    case "gt":
      return {
        passed: numActual > numExpected,
        reason: numActual > numExpected
          ? `${label} ${numActual} > ${numExpected}`
          : `${label} ${numActual} ≤ ${numExpected}`,
      }
    case "lt":
      return {
        passed: numActual < numExpected,
        reason: numActual < numExpected
          ? `${label} ${numActual} < ${numExpected}`
          : `${label} ${numActual} ≥ ${numExpected}`,
      }
    case "contains":
      return {
        passed: String(actual).includes(String(expected)),
        reason: String(actual).includes(String(expected))
          ? `${label} enthält '${expected}'`
          : `${label} enthält '${expected}' nicht (Wert: ${actual})`,
      }
    case "not_contains":
      return {
        passed: !String(actual).includes(String(expected)),
        reason: !String(actual).includes(String(expected))
          ? `${label} enthält '${expected}' nicht (erwartet)`
          : `${label} enthält '${expected}' (unerwartet)`,
      }
    default:
      return { passed: false, reason: `Unbekannter Operator: ${operator}` }
  }
}
