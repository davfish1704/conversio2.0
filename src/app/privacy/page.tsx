import type { Metadata } from "next"
import Link from "next/link"
import PublicNav from "@/components/layout/PublicNav"
import PublicFooter from "@/components/layout/PublicFooter"

export const metadata: Metadata = {
  title: "Privacy Policy — Conversio",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-[#1d1d1f] antialiased">
      <PublicNav />

      <div className="pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1d1d1f] mb-2">
              Privacy Policy
            </h1>
            <p className="text-sm text-[#6e6e73]">Last updated: April 2026</p>
          </div>

          <div className="space-y-10">
            <section>
              <h2 className="text-lg font-semibold text-[#1d1d1f] mb-3">1. Data Controller</h2>
              <address className="not-italic text-[#6e6e73] bg-[#F5F5F7] rounded-xl p-5 text-sm leading-relaxed border border-gray-100">
                <strong className="text-[#1d1d1f]">TR Sales LLC</strong><br />
                30 N Gould St Ste R<br />
                Sheridan, WY 82801<br />
                USA<br /><br />
                Email: info@attrsales.net
              </address>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1d1d1f] mb-3">2. Data We Process</h2>
              <p className="text-[#6e6e73] leading-relaxed text-sm mb-3">
                When using Conversio, the following personal data is processed:
              </p>
              <ul className="list-disc list-inside text-[#6e6e73] space-y-1 ml-2 text-sm">
                <li>Account data (name, email address, encrypted password)</li>
                <li>Customer data entered in the CRM (name, phone number, conversation content)</li>
                <li>WhatsApp messages sent and received through the platform</li>
                <li>Usage data and log files (IP address, timestamps, pages visited)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1d1d1f] mb-3">3. Purpose and Legal Basis</h2>
              <ul className="list-disc list-inside text-[#6e6e73] space-y-2 ml-2 text-sm">
                <li>
                  <strong className="text-[#1d1d1f]">Art. 6(1)(b) GDPR</strong> — Contract performance: operating the CRM platform in accordance with agreed terms of use.
                </li>
                <li>
                  <strong className="text-[#1d1d1f]">Art. 6(1)(f) GDPR</strong> — Legitimate interests: platform security, abuse prevention, technical operation.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1d1d1f] mb-3">4. Data Processors and Third Parties</h2>
              <ul className="list-disc list-inside text-[#6e6e73] space-y-1 ml-2 text-sm">
                <li><strong className="text-[#1d1d1f]">Vercel Inc.</strong> (Hosting, USA) — Data transfer based on EU Standard Contractual Clauses (SCC).</li>
                <li><strong className="text-[#1d1d1f]">Neon Inc. / Supabase</strong> (Database) — Storage of all CRM data.</li>
                <li><strong className="text-[#1d1d1f]">Groq Inc.</strong> (AI processing, USA) — Processing of conversation content for AI-generated responses. Data transfer based on SCC.</li>
                <li><strong className="text-[#1d1d1f]">Meta Platforms Ireland Ltd.</strong> (WhatsApp Business API) — Processing of WhatsApp messages in accordance with Meta&apos;s terms of use.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1d1d1f] mb-3">5. Retention Period</h2>
              <p className="text-[#6e6e73] leading-relaxed text-sm">
                Personal data is deleted as soon as it is no longer required for the purposes for which it was collected.
                Account data is deleted after account termination. Conversation data is deleted on request or after the
                agreed usage period expires. Statutory retention obligations remain unaffected.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1d1d1f] mb-3">6. Your Rights</h2>
              <ul className="list-disc list-inside text-[#6e6e73] space-y-1 ml-2 text-sm">
                <li>Right of access (Art. 15 GDPR)</li>
                <li>Right to rectification (Art. 16 GDPR)</li>
                <li>Right to erasure (Art. 17 GDPR)</li>
                <li>Right to restriction of processing (Art. 18 GDPR)</li>
                <li>Right to data portability (Art. 20 GDPR)</li>
                <li>Right to object (Art. 21 GDPR)</li>
                <li>Right to lodge a complaint with a supervisory authority (Art. 77 GDPR)</li>
              </ul>
              <p className="text-[#6e6e73] text-sm mt-3">
                To exercise your rights, please contact: <strong className="text-[#1d1d1f]">info@attrsales.net</strong>
              </p>
            </section>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  )
}
