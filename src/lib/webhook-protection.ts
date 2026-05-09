export function isSpamMessage(text: string): boolean {
  if (text.length > 2000) return true
  const urlCount = (text.match(/https?:\/\//g) ?? []).length
  if (urlCount > 5) return true
  return false
}
