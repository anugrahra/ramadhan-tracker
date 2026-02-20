// app/auth/logout/route.ts
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const requestUrl = new URL(request.url)
  const supabase = await createClient()

  // Hapus sesi di Supabase
  await supabase.auth.signOut()

  // Tendang balik ke halaman login
  return NextResponse.redirect(`${requestUrl.origin}/login`, {
    status: 301, // 301 untuk redirect dari POST request
  })
}