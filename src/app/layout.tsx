import type { Metadata } from "next"
import "./globals.css"
import { Syne, DM_Sans } from "next/font/google"
import { LanguageProvider } from "@/lib/LanguageContext"
import { ThemeProvider } from "@/lib/ThemeContext"
import { Toaster } from "@/components/ui/toaster"

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Conversio — AI Agents That Sell For You",
  description: "Build your company's AI employee in minutes. No code. Every channel. From first contact to closed deal.",
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
      <body className={`${syne.variable} ${dmSans.variable} bg-white dark:bg-black text-gray-900 dark:text-white transition-colors`}>
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
