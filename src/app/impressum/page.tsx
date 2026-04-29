// WICHTIG: Pflichtangaben gemäß § 5 TMG müssen vor dem Launch ausgefüllt werden.
// Rechtsprüfung empfohlen.

export const metadata = {
  title: "Impressum — Conversio",
}

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Impressum</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Angaben gemäß § 5 TMG</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Anbieter</h2>
          <address className="not-italic text-gray-700 dark:text-gray-300 leading-relaxed">
            <strong>TR Sales LLC</strong><br />
            30 N Gould St Ste R<br />
            Sheridan, WY 82801<br />
            USA
          </address>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Kontakt</h2>
          <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
            <p>E-Mail: info@trsales.net</p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Haftungsausschluss</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
            Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte
            externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber
            verantwortlich.
          </p>
        </section>
      </div>
    </div>
  )
}
