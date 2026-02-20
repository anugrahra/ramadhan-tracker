// app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  // RADAR DEBUGGING: Cek terminal lu setelah nyoba login!
  console.log('===> 1. URL LENGKAP DARI GOOGLE:', request.url)
  console.log('===> 2. KODE SAKTI:', code)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      console.log('===> 3. LOGIN SUKSES! Redirecting ke Beranda...')
      return NextResponse.redirect(requestUrl.origin)
    } else {
      console.error('===> ERROR SUPABASE:', error.message)
    }
  } else {
    console.error('===> KODE TIDAK DITEMUKAN DI URL!')
  }

  return NextResponse.redirect(`${requestUrl.origin}/login?error=auth-failed`)
}