// app/page.tsx
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import HabitTracker from '@/components/HabitTracker'

export default async function Home() {
  // Wajib pakai await karena Next.js 16+ dan Supabase SSR terbaru
  const supabase = await createClient()

  // Ambil data user dari sesi yang aktif
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  // Proteksi rute: kalau nggak ada user atau error token, kembalikan ke login
  if (error || !user) {
    redirect('/login')
  }

  return (
    // Container utama dibikin ukuran HP (max-w-md) biar rapi walau dibuka di laptop
    <main className="mx-auto max-w-md min-h-screen bg-gray-50 relative shadow-2xl overflow-hidden flex flex-col">
      
      {/* Area Utama: Komponen interaktif untuk checklist ibadah */}
      <div className="flex-1">
        <HabitTracker user={user} />
      </div>
      
      {/* Area Bawah: Tombol Logout yang nempel dengan estetik */}
      <div className="p-5 bg-white border-t border-gray-200">
        <form action="/auth/logout" method="post">
          <button 
            type="submit" 
            className="w-full py-3.5 text-red-600 font-semibold bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition-all flex justify-center items-center gap-2 active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Keluar Aplikasi
          </button>
        </form>
      </div>
      
    </main>
  )
}