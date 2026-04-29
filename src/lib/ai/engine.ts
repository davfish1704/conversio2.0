import { BoardBrain, BoardAsset } from "@prisma/client"

export interface AIContext {
  brain: BoardBrain
  assets: BoardAsset[]
  conversationHistory: { role: string; content: string }[]
  currentState: string
  userMessage: string
  mission: string
}

export interface AIResponse {
  text: string
  suggestedAction?: string
  confidence: number
  usedAssets: string[]
}

export class SmartDummyAI {
  async generateResponse(context: AIContext): Promise<AIResponse> {
    const { brain, assets, currentState, userMessage, mission } = context

    const userIntent = this.analyzeIntent(userMessage)
    const relevantAssets = this.findRelevantAssets(assets, userMessage, mission)

    let responseText = ""
    let suggestedAction = "wait_for_reply"
    let confidence = 0.8

    if (currentState === "New Lead" || currentState.toLowerCase().includes("welcome") || currentState.toLowerCase().includes("neuer lead")) {
      responseText = this.generateWelcomeResponse(brain, userMessage, mission)
      suggestedAction = "transition_to:Qualification"
    }
    else if (currentState.toLowerCase().includes("beratung") || currentState.toLowerCase().includes("consultation") || currentState.toLowerCase().includes("qualification")) {
      responseText = this.generateConsultationResponse(brain, userMessage, mission, relevantAssets)
      if (userIntent === "interested") suggestedAction = "transition_to:Offer"
      else if (userIntent === "question") suggestedAction = "wait_for_reply"
    }
    else if (currentState.toLowerCase().includes("angebot") || currentState.toLowerCase().includes("offer")) {
      responseText = this.generateOfferResponse(brain, userMessage, mission)
      if (userIntent === "interested") suggestedAction = "transition_to:Closing"
    }
    else {
      responseText = this.generateGenericResponse(brain, userMessage, mission)
    }

    responseText = this.applyStyle(responseText, brain.stylePrompt)
    responseText = this.applyRules(responseText, brain.rulePrompt)

    return {
      text: responseText,
      suggestedAction,
      confidence,
      usedAssets: relevantAssets.map(a => a.name),
    }
  }

  private analyzeIntent(message: string): string {
    const lower = message.toLowerCase()
    if (lower.includes("ja") || lower.includes("interesse") || lower.includes("wie viel") || lower.includes("gern") || lower.includes("yes") || lower.includes("interested") || lower.includes("how much")) return "interested"
    if (lower.includes("nein") || lower.includes("nicht") || lower.includes("teuer") || lower.includes("ne") || lower.includes("no") || lower.includes("not") || lower.includes("expensive")) return "rejecting"
    if (lower.includes("?") || lower.includes("was") || lower.includes("wie") || lower.includes("warum") || lower.includes("what") || lower.includes("how") || lower.includes("why")) return "question"
    return "neutral"
  }

  private findRelevantAssets(assets: BoardAsset[], message: string, mission: string): BoardAsset[] {
    return assets.filter(asset => {
      if (!asset.isActive) return false
      const searchText = (message + " " + mission).toLowerCase()
      return asset.tags.some(tag => searchText.includes(tag.toLowerCase())) ||
             asset.name.toLowerCase().includes(searchText.split(" ")[0])
    }).slice(0, 3)
  }

  private generateWelcomeResponse(brain: BoardBrain, userMsg: string, mission: string): string {
    const name = this.extractName(userMsg) || "there"
    if (mission && mission.length > 10) {
      return `Hello ${name}! ${mission} How can I help you today?`
    }
    if (brain.systemPrompt.includes("Versicherung") || brain.systemPrompt.toLowerCase().includes("insurance")) {
      return `Good day ${name}! I'm your insurance broker assistant. I'm happy to help you find the right protection for your needs. What's on your mind today?`
    }
    return `Welcome ${name}! I'm here to help you. What can I do for you today?`
  }

  private generateConsultationResponse(brain: BoardBrain, userMsg: string, mission: string, assets: BoardAsset[]): string {
    let base = mission || "I understand your concern. Let me help you find the best solution."
    if (assets.length > 0) {
      const assetNames = assets.map(a => `"${a.name}"`).join(", ")
      base += ` I have the following information for you: ${assetNames}.`
    }
    if (brain.infoPrompt && brain.infoPrompt.length > 20) {
      const knowledge = brain.infoPrompt.substring(0, 200)
      base += ` Based on my expertise: ${knowledge}...`
    }
    return base + " Do you have any specific questions about this?"
  }

  private generateOfferResponse(brain: BoardBrain, userMsg: string, mission: string): string {
    return `Based on our conversation, I have prepared a suitable offer for you. ${mission || ""} Would you like to receive the details via email or WhatsApp?`
  }

  private generateGenericResponse(brain: BoardBrain, userMsg: string, mission: string): string {
    return `Thank you for your message. ${mission || "I'm here to help."} Could you give me more details so I can assist you optimally?`
  }

  private applyStyle(text: string, stylePrompt: string): string {
    if (stylePrompt.includes("kurz") || stylePrompt.includes("short")) {
      return text.split(". ").slice(0, 2).join(". ") + "."
    }
    if (stylePrompt.includes("freundlich") || stylePrompt.includes("friendly")) {
      return text.replace(/Good day/, "Hi").replace(/there/g, "you")
    }
    return text
  }

  private applyRules(text: string, rulePrompt: string): string {
    const forbidden = ["garantiere", "Garantie", "100%", "verspreche", "unmöglich", "guarantee", "promise", "impossible"]
    let filtered = text
    forbidden.forEach(word => {
      filtered = filtered.replace(new RegExp(word, "gi"), "[FILTERED]")
    })
    return filtered
  }

  private extractName(message: string): string | null {
    const match = message.match(/ich bin (\w+)/i) || message.match(/mein name ist (\w+)/i) || message.match(/i am (\w+)/i) || message.match(/my name is (\w+)/i)
    return match ? match[1] : null
  }
}
