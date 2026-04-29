export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-lg max-w-md text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">404</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Page not found</p>
        <a 
          href="/dashboard" 
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition inline-block"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  )
}
