// WICHTIG: Rechtlichen Inhalt vor dem Launch durch einen Anwalt prüfen und ausfüllen lassen.

export const metadata = {
  title: "AGB — Conversio",
}

export default function AgbPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Allgemeine Geschäftsbedingungen (AGB)
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Stand: Mai 2026
          </p>
        </div>

        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded p-2">
          ⚠️ Diese AGB sind noch nicht finalisiert. Bitte vor dem öffentlichen Launch durch einen Rechtsanwalt prüfen lassen.
        </p>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">§ 1 Geltungsbereich</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
            Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge zwischen Conversio
            und seinen Kunden über die Nutzung der Conversio-Plattform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">§ 2 Vertragsgegenstand</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
            Conversio stellt eine cloudbasierte CRM-Software für Versicherungsmakler bereit,
            die die Verwaltung von Leads, automatisierte Kommunikation via WhatsApp sowie
            KI-gestützte Funktionen umfasst.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">§ 3 Nutzungsbedingungen</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
            Der Nutzer verpflichtet sich, die Plattform ausschließlich für rechtmäßige Zwecke zu nutzen
            und keine Daten Dritter ohne deren Einwilligung zu verarbeiten.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">§ 4 Datenschutz</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
            Die Verarbeitung personenbezogener Daten erfolgt gemäß unserer{" "}
            <a href="/datenschutz" className="text-blue-500 hover:underline">
              Datenschutzerklärung
            </a>{" "}
            und den Vorschriften der DSGVO.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">§ 5 Haftungsbeschränkung</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
            Conversio haftet nur für Schäden, die auf vorsätzlichem oder grob fahrlässigem Verhalten
            beruhen. Die Haftung für leichte Fahrlässigkeit ist, soweit gesetzlich zulässig, ausgeschlossen.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">§ 6 Anwendbares Recht</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
            Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist der Sitz des Anbieters.
          </p>
        </section>
      </div>
    </div>
  )
}
