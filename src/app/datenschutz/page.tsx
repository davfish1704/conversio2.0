// WICHTIG: Vor dem Launch von einem Rechtsanwalt prüfen lassen.
// Diese Seite enthält Platzhalter, die durch echte Angaben ersetzt werden müssen.

export const metadata = {
  title: "Datenschutzerklärung — Conversio",
}

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Datenschutzerklärung</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Stand: April 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">1. Verantwortlicher</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
          </p>
          <address className="not-italic text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm leading-relaxed">
            <strong>TR Sales LLC</strong><br />
            30 N Gould St Ste R<br />
            Sheridan, WY 82801<br />
            USA<br /><br />
            E-Mail: info@trsales.net
          </address>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">2. Welche Daten wir verarbeiten</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Im Rahmen der Nutzung von Conversio werden folgende personenbezogene Daten verarbeitet:
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1 ml-2">
            <li>Kontodaten der Nutzer (Name, E-Mail-Adresse, verschlüsseltes Passwort)</li>
            <li>Kundendaten, die Nutzer im CRM erfassen (Name, Telefonnummer, Gesprächsinhalte)</li>
            <li>WhatsApp-Nachrichten, die über die Plattform gesendet und empfangen werden</li>
            <li>Nutzungsdaten und Log-Dateien (IP-Adresse, Zeitstempel, aufgerufene Seiten)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">3. Zwecke und Rechtsgrundlagen</h2>
          <div className="text-gray-700 dark:text-gray-300 leading-relaxed space-y-2">
            <p>
              Die Verarbeitung erfolgt auf Basis folgender Rechtsgrundlagen gemäß DSGVO:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong>Art. 6 Abs. 1 lit. b DSGVO</strong> — Vertragserfüllung: Betrieb der CRM-Plattform
                für Versicherungsmakler gemäß den vereinbarten Nutzungsbedingungen.
              </li>
              <li>
                <strong>Art. 6 Abs. 1 lit. f DSGVO</strong> — Berechtigte Interessen: Sicherheit der
                Plattform, Missbrauchsprävention, technischer Betrieb.
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">4. Auftragsverarbeiter und Drittanbieter</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Wir setzen folgende Auftragsverarbeiter ein, mit denen Verträge zur Auftragsverarbeitung
            gemäß Art. 28 DSGVO geschlossen wurden oder werden:
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1 ml-2">
            <li>
              <strong>Vercel Inc.</strong> (Hosting, USA) — Datenübermittlung auf Basis von
              EU-Standardvertragsklauseln (SCC).
            </li>
            <li>
              <strong>Neon Inc. / Supabase</strong> (Datenbank, EU-Region sofern konfiguriert) —
              Speicherung aller CRM-Daten.
            </li>
            <li>
              <strong>Groq Inc.</strong> (KI-Verarbeitung, USA) — Verarbeitung von Gesprächsinhalten
              für KI-generierte Antworten. Datenübermittlung auf Basis von SCC.
            </li>
            <li>
              <strong>Meta Platforms Ireland Ltd.</strong> (WhatsApp Business API, EU/USA) —
              Verarbeitung von WhatsApp-Nachrichten gemäß den Meta-Nutzungsbedingungen.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">5. Speicherdauer</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Personenbezogene Daten werden gelöscht, sobald sie für die Zwecke, für die sie erhoben
            wurden, nicht mehr erforderlich sind. Kontodaten werden nach Kündigung des Nutzerkontos
            gelöscht. Gesprächsdaten werden auf Anfrage oder nach Ablauf der vereinbarten
            Nutzungsdauer gelöscht. Gesetzliche Aufbewahrungsfristen bleiben unberührt.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">6. Ihre Rechte</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Sie haben gegenüber uns folgende Rechte hinsichtlich Ihrer personenbezogenen Daten:
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1 ml-2">
            <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
            <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
            <li>Recht auf Löschung (Art. 17 DSGVO)</li>
            <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Recht auf Widerspruch (Art. 21 DSGVO)</li>
            <li>Beschwerderecht bei einer Aufsichtsbehörde (Art. 77 DSGVO)</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Zur Ausübung Ihrer Rechte wenden Sie sich bitte an: <strong>info@trsales.net</strong>.
          </p>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Zuständige Aufsichtsbehörde: Landesbeauftragter für den Datenschutz und die
            Informationsfreiheit des jeweiligen Bundeslandes.
          </p>
        </section>
      </div>
    </div>
  )
}
