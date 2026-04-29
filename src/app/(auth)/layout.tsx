import Footer from "@/components/layout/Footer"

export const metadata = {
  title: 'Conversio',
  description: 'CRM für Versicherungsmakler',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body className="flex flex-col min-h-screen">
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  )
}
