import Link from "next/link"

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 mt-auto py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
        <span>© {new Date().getFullYear()} Conversio</span>
        <Link href="/privacy" className="hover:text-gray-700 dark:hover:text-gray-200 transition">
          Privacy Policy
        </Link>
        <Link href="/imprint" className="hover:text-gray-700 dark:hover:text-gray-200 transition">
          Imprint
        </Link>
      </div>
    </footer>
  )
}
