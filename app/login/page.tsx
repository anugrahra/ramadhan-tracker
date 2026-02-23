// app/login/page.tsx
'use client'

import { createClient } from '@/utils/supabase/client'
import { useState } from 'react'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    setIsLoading(true)

    // Fungsi sakti biar gak nyasar ke localhost pas di Vercel
    const getURL = () => {
      let url =
        process?.env?.NEXT_PUBLIC_SITE_URL ?? // Utamakan URL dari env
        process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // URL otomatis dari Vercel
        window.location.origin; // Fallback ke origin browser
      
      // Pastikan formatnya bener (pake https dan akhiri dengan slash)
      url = url.includes('http') ? url : `https://${url}`
      url = url.endsWith('/') ? url : `${url}/`
      return url
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Balik ke auth/callback sesuai domain tempat aplikasi jalan
        redirectTo: `${getURL()}auth/callback`, 
      },
    })

    if (error) {
      console.error('Gagal login bro:', error.message)
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-lg text-center">
        
        {/* Header Title */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-emerald-600">
            Ramadhan Tracker
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Pantau ibadah harianmu biar makin asoy
          </p>
        </div>

        {/* Login Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="group relative flex w-full justify-center rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 transition-all active:scale-95"
        >
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          </span>
          {isLoading ? 'Loading...' : 'Masuk dengan Google'}
        </button>

      </div>
    </div>
  )
}