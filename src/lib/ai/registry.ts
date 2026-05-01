import { prisma } from "@/lib/db"
import { decrypt } from "@/lib/crypto/secrets"
import type { AIMessage, AIProvider, AIResponse, ToolDefinition } from "./providers/types"
import { AIProviderUnavailableError } from "./providers/types"
import { GroqProvider } from "./providers/groq"
import { OpenRouterProvider } from "./providers/openrouter"
import { OpenAIProvider } from "./providers/openai"
import { DeepSeekProvider } from "./providers/deepseek"
import { AnthropicProvider } from "./providers/anthropic"

export type AIProviderName = "groq" | "openrouter" | "openai" | "deepseek" | "anthropic"
export type AIPurpose = "main" | "extraction" | "classification" | "summarization"

export interface RegistryExecuteParams {
  boardId: string
  purpose: AIPurpose
  messages: AIMessage[]
  tools?: ToolDefinition[]
  temperature?: number
  maxTokens?: number
}

// ── Provider metadata (for UI) ────────────────────────────────────────────────

export const PROVIDER_MODELS: Record<AIProviderName, { label: string; models: { value: string; label: string }[] }> = {
  groq: {
    label: "Groq",
    models: [
      { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (Empfohlen)" },
      { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B (Schnell)" },
      { value: "gemma2-9b-it", label: "Gemma 2 9B" },
    ],
  },
  openrouter: {
    label: "OpenRouter",
    models: [
      { value: "deepseek/deepseek-chat", label: "DeepSeek Chat (Günstigste)" },
      { value: "anthropic/claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
      { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
      { value: "openai/gpt-4o", label: "GPT-4o" },
      { value: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
      { value: "google/gemini-flash-1.5", label: "Gemini Flash 1.5" },
    ],
  },
  openai: {
    label: "OpenAI",
    models: [
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    ],
  },
  deepseek: {
    label: "DeepSeek",
    models: [
      { value: "deepseek-chat", label: "DeepSeek Chat" },
      { value: "deepseek-reasoner", label: "DeepSeek Reasoner (R1)" },
    ],
  },
  anthropic: {
    label: "Anthropic",
    models: [
      { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
      { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
      { value: "claude-opus-4-7", label: "Claude Opus 4.7" },
    ],
  },
}

// ── Registry ──────────────────────────────────────────────────────────────────

class AIRegistry {
  private providerCache = new Map<string, AIProvider>()
  private keyCache = new Map<string, string>()
  private keyCacheExpiry = new Map<string, number>()
  private readonly KEY_TTL_MS = 60_000

  private async getApiKey(providerName: AIProviderName): Promise<string | null> {
    const now = Date.now()
    const cached = this.keyCache.get(providerName)
    const expiry = this.keyCacheExpiry.get(providerName) ?? 0
    if (cached && now < expiry) return cached

    const record = await prisma.platformAPIKey.findUnique({
      where: { provider: providerName },
      select: { encryptedKey: true, isActive: true },
    })
    if (!record?.isActive) return null

    const key = decrypt(record.encryptedKey)
    this.keyCache.set(providerName, key)
    this.keyCacheExpiry.set(providerName, now + this.KEY_TTL_MS)
    return key
  }

  // Falls back to env vars so development works without DB rows
  private async getApiKeyWithEnvFallback(providerName: AIProviderName): Promise<string> {
    const dbKey = await this.getApiKey(providerName).catch(() => null)
    if (dbKey) return dbKey

    const envMap: Record<AIProviderName, string | undefined> = {
      groq: process.env.GROQ_API_KEY,
      openrouter: process.env.OPENROUTER_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      deepseek: process.env.DEEPSEEK_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
    }
    const envKey = envMap[providerName]
    if (envKey) return envKey

    throw new Error(`No API key configured for provider '${providerName}'`)
  }

  private async buildProvider(providerName: AIProviderName): Promise<AIProvider> {
    const cacheKey = providerName
    if (this.providerCache.has(cacheKey)) return this.providerCache.get(cacheKey)!

    const apiKey = await this.getApiKeyWithEnvFallback(providerName)

    let provider: AIProvider
    switch (providerName) {
      case "groq": provider = new GroqProvider(apiKey); break
      case "openrouter": provider = new OpenRouterProvider(apiKey); break
      case "openai": provider = new OpenAIProvider(apiKey); break
      case "deepseek": provider = new DeepSeekProvider(apiKey); break
      case "anthropic": provider = new AnthropicProvider(apiKey); break
      default: throw new Error(`Unknown provider: ${providerName}`)
    }

    this.providerCache.set(cacheKey, provider)
    return provider
  }

  private async loadConfig(boardId: string): Promise<{
    provider: AIProviderName
    model: string
    fallbackProvider?: AIProviderName
    fallbackModel?: string
    modelOverrides: Record<string, string>
  }> {
    const config = await prisma.aIProviderConfig.findUnique({
      where: { boardId },
      select: {
        defaultProvider: true,
        defaultModel: true,
        fallbackProvider: true,
        fallbackModel: true,
        modelOverrides: true,
      },
    }).catch(() => null)

    return {
      provider: (config?.defaultProvider ?? "groq") as AIProviderName,
      model: config?.defaultModel ?? "llama-3.3-70b-versatile",
      fallbackProvider: config?.fallbackProvider as AIProviderName | undefined,
      fallbackModel: config?.fallbackModel ?? undefined,
      modelOverrides: (config?.modelOverrides as Record<string, string>) ?? {},
    }
  }

  async execute(params: RegistryExecuteParams): Promise<AIResponse> {
    const config = await this.loadConfig(params.boardId)

    // Override model per purpose
    const overrideKey = params.purpose
    const override = config.modelOverrides[overrideKey]
    let providerName = config.provider
    let model = config.model

    if (override) {
      const [overrideProvider, ...modelParts] = override.split("/")
      if (modelParts.length) {
        providerName = overrideProvider as AIProviderName
        model = modelParts.join("/")
      } else {
        model = override
      }
    }

    // Try primary with 3× exponential backoff
    try {
      return await this.executeWithRetry(providerName, model, params)
    } catch (primaryError) {
      console.error(`[AIRegistry] Primary provider '${providerName}' failed:`, primaryError)

      if (config.fallbackProvider && config.fallbackModel) {
        console.log(`[AIRegistry] Trying fallback: ${config.fallbackProvider}/${config.fallbackModel}`)
        try {
          return await this.executeWithRetry(config.fallbackProvider, config.fallbackModel, params)
        } catch (fallbackError) {
          throw new AIProviderUnavailableError(config.fallbackProvider, fallbackError)
        }
      }

      throw new AIProviderUnavailableError(providerName, primaryError)
    }
  }

  private async executeWithRetry(
    providerName: AIProviderName,
    model: string,
    params: RegistryExecuteParams,
    maxRetries = 3
  ): Promise<AIResponse> {
    let lastError: unknown
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Invalidate cached provider on retry so key refresh is possible
        if (attempt > 0) {
          this.providerCache.delete(providerName)
          this.keyCache.delete(providerName)
          await sleep(1000 * Math.pow(2, attempt - 1))
        }
        const provider = await this.buildProvider(providerName)
        return await provider.chat({
          messages: params.messages,
          model,
          tools: params.tools,
          temperature: params.temperature,
          maxTokens: params.maxTokens,
        })
      } catch (err) {
        lastError = err
        console.warn(`[AIRegistry] Attempt ${attempt + 1}/${maxRetries} failed for ${providerName}:`, err)
      }
    }
    throw lastError
  }

  /** Invalidate cached keys (call after updating PlatformAPIKey in DB) */
  invalidateKeyCache(providerName?: AIProviderName) {
    if (providerName) {
      this.keyCache.delete(providerName)
      this.providerCache.delete(providerName)
    } else {
      this.keyCache.clear()
      this.providerCache.clear()
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Singleton — shared across all requests in the same Node.js process
const globalForRegistry = global as typeof global & { aiRegistry?: AIRegistry }
export const aiRegistry = globalForRegistry.aiRegistry ?? new AIRegistry()
if (process.env.NODE_ENV !== "production") globalForRegistry.aiRegistry = aiRegistry
