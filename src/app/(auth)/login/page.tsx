'use client'

import { Suspense, useState, useContext } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { LanguageContext } from '@/lib/LanguageContext'
import { FEATURES } from '@/lib/features'

function LoginForm() {
  const { t } = useContext(LanguageContext)
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    await signIn('credentials', {
      email,
      password,
      callbackUrl: '/dashboard',
    })
  }

  return (
    <div className="max-w-md w-full space-y-6 bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Conversio Login</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{t('auth.signInToContinue')}</p>
      </div>

      {urlError && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm">
          {urlError === 'OAuthAccountNotLinked'
            ? t('auth.googleAccountNotLinked')
            : urlError === 'CredentialsSignin'
            ? t('auth.invalidEmailPassword')
            : urlError === 'AccessDenied'
            ? t('auth.alreadyLinked')
            : t('auth.genericError')}
        </div>
      )}

      <button
        onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
        className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-800 transition font-medium"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {t('auth.continueWithGoogle')}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">{t('auth.or')}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('auth.email')}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder={t('auth.emailPlaceholder')}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('auth.password')}
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? t('auth.signingIn') : t('auth.signIn')}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        {t('auth.forgotPassword')}{' '}
        <a href="mailto:info@attrsales.net?subject=Password%20Reset" className="font-medium text-blue-600 hover:text-blue-500">
          {t('auth.contactSupport')}
        </a>
      </p>

      {FEATURES.publicSignup && (
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          {t('auth.noAccount')}{' '}
          <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
            {t('auth.registerNow')}
          </Link>
        </p>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-800 px-4">
      <Suspense fallback={<div className="max-w-md w-full h-96 bg-white dark:bg-gray-900 rounded-2xl shadow-lg animate-pulse" />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
