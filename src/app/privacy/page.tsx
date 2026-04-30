import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy — Conversio",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="mt-2 text-sm text-gray-500">Last updated: April 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">1. Data Controller</h2>
          <address className="not-italic text-gray-700 bg-gray-50 rounded-lg p-4 text-sm leading-relaxed">
            <strong>TR Sales LLC</strong><br />
            30 N Gould St Ste R<br />
            Sheridan, WY 82801<br />
            USA<br /><br />
            Email: info@attrsales.net
          </address>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">2. Data We Process</h2>
          <p className="text-gray-700 leading-relaxed text-sm">
            When using Conversio, the following personal data is processed:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2 text-sm">
            <li>Account data (name, email address, encrypted password)</li>
            <li>Customer data entered in the CRM (name, phone number, conversation content)</li>
            <li>WhatsApp messages sent and received through the platform</li>
            <li>Usage data and log files (IP address, timestamps, pages visited)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">3. Purpose and Legal Basis</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-2 text-sm">
            <li>
              <strong>Art. 6(1)(b) GDPR</strong> — Contract performance: operating the CRM platform in accordance with agreed terms of use.
            </li>
            <li>
              <strong>Art. 6(1)(f) GDPR</strong> — Legitimate interests: platform security, abuse prevention, technical operation.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">4. Data Processors and Third Parties</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2 text-sm">
            <li><strong>Vercel Inc.</strong> (Hosting, USA) — Data transfer based on EU Standard Contractual Clauses (SCC).</li>
            <li><strong>Neon Inc. / Supabase</strong> (Database) — Storage of all CRM data.</li>
            <li><strong>Groq Inc.</strong> (AI processing, USA) — Processing of conversation content for AI-generated responses. Data transfer based on SCC.</li>
            <li><strong>Meta Platforms Ireland Ltd.</strong> (WhatsApp Business API) — Processing of WhatsApp messages in accordance with Meta&apos;s terms of use.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">5. Retention Period</h2>
          <p className="text-gray-700 leading-relaxed text-sm">
            Personal data is deleted as soon as it is no longer required for the purposes for which it was collected.
            Account data is deleted after account termination. Conversation data is deleted on request or after the
            agreed usage period expires. Statutory retention obligations remain unaffected.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">6. Your Rights</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2 text-sm">
            <li>Right of access (Art. 15 GDPR)</li>
            <li>Right to rectification (Art. 16 GDPR)</li>
            <li>Right to erasure (Art. 17 GDPR)</li>
            <li>Right to restriction of processing (Art. 18 GDPR)</li>
            <li>Right to data portability (Art. 20 GDPR)</li>
            <li>Right to object (Art. 21 GDPR)</li>
            <li>Right to lodge a complaint with a supervisory authority (Art. 77 GDPR)</li>
          </ul>
          <p className="text-gray-700 text-sm">
            To exercise your rights, please contact: <strong>info@attrsales.net</strong>
          </p>
        </section>

        <div className="pt-4">
          <Link href="/" className="text-sm text-blue-600 hover:underline">← Back to Home</Link>
        </div>
      </div>
    </div>
  )
}
