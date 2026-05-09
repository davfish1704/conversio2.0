"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("Kein Token angegeben.")
      return
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus("success")
          setMessage("Deine E-Mail-Adresse wurde erfolgreich bestätigt.")
        } else {
          const data = await res.json()
          setStatus("error")
          setMessage(data.error || "Token ungültig oder abgelaufen.")
        }
      })
      .catch(() => {
        setStatus("error")
        setMessage("Ein Fehler ist aufgetreten. Bitte versuche es erneut.")
      })
  }, [token])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-spin" />
            <p className="text-gray-600">E-Mail wird verifiziert…</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">E-Mail bestätigt</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link
              href="/dashboard"
              className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              Zum Dashboard
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Fehler</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link
              href="/dashboard"
              className="inline-block px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition"
            >
              Zurück zum Dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
