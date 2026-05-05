import Link from "next/link"
import { Zap } from "lucide-react"

export default function PublicFooter() {
  return (
    <footer className="bg-[#F5F5F7] border-t border-gray-200/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-[#1d1d1f] mb-4">Product</h3>
            <ul className="space-y-3">
              <li><Link href="/product" className="text-sm text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Overview</Link></li>
              <li><Link href="/features" className="text-sm text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Features</Link></li>
              <li><Link href="/pricing" className="text-sm text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Pricing</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-[#1d1d1f] mb-4">Company</h3>
            <ul className="space-y-3">
              <li><Link href="/contact" className="text-sm text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Contact</Link></li>
              <li><a href="mailto:info@attrsales.net" className="text-sm text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Email</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-[#1d1d1f] mb-4">Legal</h3>
            <ul className="space-y-3">
              <li><Link href="/privacy" className="text-sm text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Privacy Policy</Link></li>
              <li><Link href="/imprint" className="text-sm text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Imprint</Link></li>
              <li><Link href="/agb" className="text-sm text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Terms</Link></li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="text-sm font-semibold text-[#1d1d1f] mb-4">Connect</h3>
            <ul className="space-y-3">
              <li><a href="https://twitter.com/conversio" target="_blank" rel="noopener noreferrer" className="text-sm text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Twitter</a></li>
              <li><a href="https://linkedin.com/company/conversio" target="_blank" rel="noopener noreferrer" className="text-sm text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">LinkedIn</a></li>
              <li><a href="https://github.com/conversio" target="_blank" rel="noopener noreferrer" className="text-sm text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">GitHub</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <span className="text-sm font-semibold text-[#1d1d1f]">Conversio</span>
          </div>
          <p className="text-xs text-[#6e6e73]">© 2026 Conversio. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
