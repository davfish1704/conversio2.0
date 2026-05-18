"use client"

import { Suspense, useState, useContext, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { LanguageContext } from "@/lib/LanguageContext"
import { FEATURES } from "@/lib/features"
import { Zap, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
)

function SignupForm() {
  const { t } = useContext(LanguageContext)
  const router = useRouter()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!FEATURES.publicSignup) {
      router.replace("/login")
    }
  }, [router])

  if (!FEATURES.publicSignup) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError(t("auth.passwordsDoNotMatch"))
      return
    }
    if (password.length < 6) {
      setError("Passwort muss mindestens 6 Zeichen lang sein")
      return
    }
    if (name.length < 2) {
      setError("Name muss mindestens 2 Zeichen lang sein")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Registrierung fehlgeschlagen")
        setLoading(false)
        return
      }
      setSuccess(true)
      setLoading(false)
    } catch {
      setError("Ein Fehler ist aufgetreten. Bitte versuche es erneut.")
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="text-base font-semibold tracking-tight text-foreground">Conversio</span>
          </Link>
        </div>
        <div className="rounded-lg border border-border bg-bg-elevated p-5 text-center space-y-3">
          <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-5 h-5 text-success" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Registrierung erfolgreich!</h2>
          <p className="text-xs text-text-secondary">Dein Konto wurde erstellt. Du kannst dich jetzt anmelden.</p>
          <Button asChild className="w-full h-9 text-xs">
            <Link href="/login">Zum Login</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm px-4">
      <div className="text-center mb-6">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="text-base font-semibold tracking-tight text-foreground">Conversio</span>
        </Link>
        <h1 className="text-lg font-semibold text-foreground">Konto erstellen</h1>
        <p className="mt-1 text-xs text-text-secondary">Kostenlos loslegen</p>
      </div>

      <div className="rounded-lg border border-border bg-bg-elevated p-5 space-y-4">
        {error && (
          <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-md text-xs border border-destructive/20">
            {error}
          </div>
        )}

        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full flex items-center justify-center gap-2.5 h-9 rounded-lg border border-border bg-transparent text-foreground text-xs font-medium hover:bg-muted transition-colors"
        >
          <GoogleIcon />
          Mit Google registrieren
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-[10px]">
            <span className="px-2 bg-bg-elevated text-text-tertiary">Oder</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="name" className="block text-xs text-text-secondary mb-1">Name</label>
            <Input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Max Mustermann" autoComplete="name" className="h-9" />
          </div>
          <div>
            <label htmlFor="email" className="block text-xs text-text-secondary mb-1">E-Mail-Adresse</label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="max@beispiel.de" autoComplete="email" className="h-9" />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs text-text-secondary mb-1">Passwort</label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mindestens 6 Zeichen" autoComplete="new-password" className="h-9" />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-xs text-text-secondary mb-1">Passwort bestätigen</label>
            <Input id="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Passwort wiederholen" autoComplete="new-password" className="h-9" />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-9 text-xs">
            {loading ? "Registrierung…" : "Kostenloses Konto erstellen"}
          </Button>
        </form>

        <p className="text-center text-[10px] text-text-tertiary">
          Bereits ein Konto?{" "}
          <Link href="/login" className="font-medium text-text-link hover:underline">
            Jetzt anmelden
          </Link>
        </p>
      </div>

      <p className="text-center text-[10px] text-text-tertiary mt-6">
        © 2026 Conversio ·{" "}
        <Link href="/privacy" className="hover:text-text-primary transition-colors">Datenschutz</Link>
        {" · "}
        <Link href="/imprint" className="hover:text-text-primary transition-colors">Impressum</Link>
      </p>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-sm px-4">
        <div className="rounded-lg border border-border bg-bg-elevated p-5 space-y-3 animate-pulse">
          <div className="h-8 bg-muted rounded" />
          <div className="h-8 bg-muted rounded" />
          <div className="h-8 bg-muted rounded" />
          <div className="h-9 bg-muted rounded" />
        </div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}
