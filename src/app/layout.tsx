import type { Metadata } from "next"
import "./globals.css"
import { Inter, Syne } from "next/font/google"
import { LanguageProvider } from "@/lib/LanguageContext"
import { ThemeProvider } from "@/lib/ThemeContext"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  preload: true,
})

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Conversio — KI-Vertrieb für Versicherungsmakler",
  description: "Bauen Sie Ihren KI-Mitarbeiter in Minuten. Kein Code. Jeder Kanal. Vom ersten Kontakt bis zum Abschluss.",
}

const themeScript = `
  (function() {
    try {
      var t = localStorage.getItem('conversio-theme')
      var d = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (t === 'dark' || (!t && d)) document.documentElement.classList.add('dark')
    } catch(e) {}
  })()
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} ${syne.variable} bg-background text-foreground antialiased`}>
        <ThemeProvider>
          <LanguageProvider>
            {children}
            <Toaster />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
