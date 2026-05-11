export interface ConversationMemory {
  global: GlobalMemory
  state: StateMemory
  temporary: TemporaryMemory
}

export interface GlobalMemory {
  language: string
  customerType: "lead" | "tenant" | "owner" | "unknown"
  customerName: string | null
  phone: string | null
  email: string | null
  preferredChannel: string | null
}

export interface StateMemory {
  currentStateId: string | null
  currentStateName: string | null
  dataCollectionProgress: Record<string, boolean>
  collectedFields: Record<string, string>
  lastTransitionAt: number | null
  previousStateName: string | null
}

export interface TemporaryMemory {
  lastIntent: string | null
  lastIntentConfidence: number
  lastExtractedEntities: Record<string, unknown>
  escalationReason: string | null
  lowConfidence: boolean
}

export const EMPTY_GLOBAL_MEMORY: GlobalMemory = {
  language: "en",
  customerType: "unknown",
  customerName: null,
  phone: null,
  email: null,
  preferredChannel: null,
}

export const EMPTY_STATE_MEMORY: StateMemory = {
  currentStateId: null,
  currentStateName: null,
  dataCollectionProgress: {},
  collectedFields: {},
  lastTransitionAt: null,
  previousStateName: null,
}

export const EMPTY_TEMPORARY_MEMORY: TemporaryMemory = {
  lastIntent: null,
  lastIntentConfidence: 0,
  lastExtractedEntities: {},
  escalationReason: null,
  lowConfidence: false,
}

export const EMPTY_MEMORY: ConversationMemory = {
  global: EMPTY_GLOBAL_MEMORY,
  state: EMPTY_STATE_MEMORY,
  temporary: EMPTY_TEMPORARY_MEMORY,
}
