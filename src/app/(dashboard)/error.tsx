"use client"

import { useEffect } from "react"

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-lg max-w-md text-center">
        <h2 className="text-xl font-bold text-red-600 mb-4">Something went wrong!</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{error.message}</p>
        <button
          onClick={reset}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
