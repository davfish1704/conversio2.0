"use client"

import { Suspense, useState, useContext } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { LanguageContext } from "@/lib/LanguageContext"
import { FEATURES } from "@/lib/features"
import { Zap, ArrowRight } from "lucide-react"
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

function LoginForm() {
  const { t } = useContext(LanguageContext)
  const searchParams = useSearchParams()
  const urlError = searchParams.get("error")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await signIn("credentials", {
      email,
      password,
      callbackUrl: "/dashboard",
    })
  }

  const errorMessage = urlError === "OAuthAccountNotLinked"
    ? t("auth.googleAccountNotLinked")
    : urlError === "CredentialsSignin"
    ? t("auth.invalidEmailPassword")
    : urlError === "AccessDenied"
    ? t("auth.alreadyLinked")
    : urlError
    ? t("auth.genericError")
    : null

  return (
    <div className="w-full max-w-sm px-4">
      <div className="text-center mb-6">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-5 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="text-base font-semibold tracking-tight text-foreground">Conversio</span>
        </Link>
        <h1 className="text-lg font-semibold text-foreground">Willkommen zurück</h1>
        <p className="mt-1 text-xs text-text-secondary">{t("auth.signInToContinue")}</p>
      </div>

      <div className="rounded-lg border border-border bg-bg-elevated p-5 space-y-4">
        {errorMessage && (
          <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-md text-xs border border-destructive/20">
            {errorMessage}
          </div>
        )}

        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full flex items-center justify-center gap-2.5 h-9 rounded-lg border border-border bg-transparent text-foreground text-xs font-medium hover:bg-muted transition-colors"
        >
          <GoogleIcon />
          {t("auth.continueWithGoogle")}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-[10px]">
            <span className="px-2 bg-bg-elevated text-text-tertiary">{t("auth.or")}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="email" className="block text-xs text-text-secondary mb-1">
              {t("auth.email")}
            </label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.emailPlaceholder")}
              autoComplete="email"
              className="h-9"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs text-text-secondary mb-1">
              {t("auth.password")}
            </label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="h-9"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-9 text-xs">
            {loading ? t("auth.signingIn") : t("auth.signIn")}
            {!loading && <ArrowRight className="w-3 h-3 ml-1" />}
          </Button>
        </form>

        <p className="text-center text-[10px] text-text-tertiary">
          {t("auth.forgotPassword")}{" "}
          <a
            href="mailto:info@attrsales.net?subject=Password%20Reset"
            className="font-medium text-text-link hover:underline"
          >
            {t("auth.contactSupport")}
          </a>
        </p>

        {FEATURES.publicSignup && (
          <p className="text-center text-[10px] text-text-tertiary">
            {t("auth.noAccount")}{" "}
            <Link href="/signup" className="font-medium text-text-link hover:underline">
              {t("auth.registerNow")}
            </Link>
          </p>
        )}
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-sm px-4">
        <div className="rounded-lg border border-border bg-bg-elevated p-5 space-y-3 animate-pulse">
          <div className="h-8 bg-muted rounded" />
          <div className="h-8 bg-muted rounded" />
          <div className="h-9 bg-muted rounded" />
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
