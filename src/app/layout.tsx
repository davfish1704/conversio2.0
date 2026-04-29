import type { Metadata } from "next"
import "./globals.css"
import { LanguageProvider } from "@/lib/LanguageContext"
import { ThemeProvider } from "@/lib/ThemeContext"
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: "Conversio Corp",
  description: "WhatsApp Business Automation Platform",
}

const themeScript = `
  (function() {
    const theme = localStorage.getItem('conversio-theme')
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (theme === 'dark' || (!theme && systemDark)) {
      document.documentElement.classList.add('dark')
    }
  })()
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-white dark:bg-black text-gray-900 dark:text-white transition-colors">
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
