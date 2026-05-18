export const metadata = {
  title: 'Conversio',
  description: 'KI-Vertrieb für Versicherungsmakler',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" className="dark">
      <body className="min-h-screen bg-bg-primary flex flex-col antialiased">
        <div className="flex-1 flex items-center justify-center">
          {children}
        </div>
      </body>
    </html>
  )
}
