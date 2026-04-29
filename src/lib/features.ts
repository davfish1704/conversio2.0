/**
 * Feature Flags — gesteuert über NEXT_PUBLIC_ Env-Variablen in Vercel.
 * NEXT_PUBLIC_ Vars werden zur Build-Zeit eingebettet und sind im Client verfügbar.
 *
 * Werte in Vercel setzen:
 *   NEXT_PUBLIC_FEATURE_WHATSAPP=true   → WhatsApp-Bereich aktivieren (nach Meta-Approval)
 *   NEXT_PUBLIC_FEATURE_SIGNUP=true     → Öffentliche Registrierung aktivieren (nach Soft Launch)
 */
export const FEATURES = {
  whatsapp: process.env.NEXT_PUBLIC_FEATURE_WHATSAPP === "true",
  publicSignup: process.env.NEXT_PUBLIC_FEATURE_SIGNUP === "true",
  builder: process.env.NEXT_PUBLIC_FEATURE_BUILDER === "true",
}
