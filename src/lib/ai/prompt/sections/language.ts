export function buildLanguageEnforcement(language: string): string {
  switch (language) {
    case "en":
      return [
        "LANGUAGE CONSTRAINT (HARD REQUIREMENT)",
        "You MUST respond in English ONLY.",
        "Never respond in German, French, Spanish, or any other language.",
        "Do not mirror or adapt to the user's language.",
        "If the user writes in another language, still reply in English.",
        "This is a hard system requirement — not a suggestion.",
      ].join("\n")

    case "de":
      return [
        "SPRACHVORGABE (HARTE ANF orderUNG)",
        "Du MUSST ausschließlich auf Deutsch antworten.",
        "Antworte niemals auf Englisch oder einer anderen Sprache.",
        "Passe dich nicht an die Sprache des Benutzers an.",
        "Wenn der Benutzer in einer anderen Sprache schreibt, antworte trotzdem auf Deutsch.",
        "Dies ist eine zwingende Systemvorgabe — kein Vorschlag.",
      ].join("\n")

    default:
      return [
        "LANGUAGE CONSTRAINT (HARD REQUIREMENT)",
        `You MUST respond in ${language} ONLY.`,
        "Do not mirror or adapt to the user's language.",
        "This is a hard system requirement — not a suggestion.",
      ].join("\n")
  }
}
