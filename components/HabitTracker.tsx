// components/HabitTracker.tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

type Habit = {
  id: string
  name: string
  type: 'wajib' | 'sunnah' | 'rawatib'
  checked: boolean
}

// URUTAN SUDAH DIGANTI DIMULAI DARI MAGHRIB
const habitTemplate: Habit[] = [
  // Wajib
  { id: 'w4', name: 'Shalat Maghrib', type: 'wajib', checked: false },
  { id: 'w5', name: 'Shalat Isya', type: 'wajib', checked: false },
  { id: 'w1', name: 'Shalat Subuh', type: 'wajib', checked: false },
  { id: 'w2', name: 'Shalat Dzuhur', type: 'wajib', checked: false },
  { id: 'w3', name: 'Shalat Ashar', type: 'wajib', checked: false },
  { id: 'w6', name: 'Puasa Ramadhan', type: 'wajib', checked: false },
  { id: 'w7', name: 'Baca Al-Quran', type: 'wajib', checked: false },
  
  // Rawatib
  { id: 'r4', name: 'Ba\'diyah Maghrib (2 Rakaat)', type: 'rawatib', checked: false },
  { id: 'r5', name: 'Ba\'diyah Isya (2 Rakaat)', type: 'rawatib', checked: false },
  { id: 'r1', name: 'Qabliyah Subuh (2 Rakaat)', type: 'rawatib', checked: false },
  { id: 'r2', name: 'Qabliyah Dzuhur (2/4 Rakaat)', type: 'rawatib', checked: false },
  { id: 'r3', name: 'Ba\'diyah Dzuhur (2 Rakaat)', type: 'rawatib', checked: false },

  // Sunnah Lainnya
  { id: 's1', name: 'Tarawih + Witir', type: 'sunnah', checked: false },
  { id: 's2', name: 'Sedekah Subuh', type: 'sunnah', checked: false },
  { id: 's3', name: 'Shalat Dhuha', type: 'sunnah', checked: false },
]

const TOTAL_DAYS = 30;
const generateMonthlyData = () => {
  const data: Record<number, Habit[]> = {};
  for (let i = 1; i <= TOTAL_DAYS; i++) {
    data[i] = JSON.parse(JSON.stringify(habitTemplate));
  }
  return data;
}

const getIslamicDay = () => {
  const RAMADHAN_START_DATE = new Date('2026-02-19T00:00:00'); 
  const now = new Date();
  const diffTime = now.getTime() - RAMADHAN_START_DATE.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  let dayCalculation = diffDays + 1;
  if (now.getHours() >= 18) {
    dayCalculation += 1;
  }

  if (dayCalculation < 1) return 1;
  if (dayCalculation > 30) return 30;
  return dayCalculation;
}

export default function HabitTracker({ user }: { user: any }) {
  const supabase = createClient()

  const [monthlyData, setMonthlyData] = useState<Record<number, Habit[]>>(generateMonthlyData())
  const [currentDay, setCurrentDay] = useState<number>(getIslamicDay())
  const [isFetching, setIsFetching] = useState(true)

  // ---> INI STATE BARU BUAT FITUR LOCK (Di kodemu tadi ini nggak ada!) <---
  const [lockedDays, setLockedDays] = useState<number[]>([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isLocking, setIsLocking] = useState(false)

  const isCurrentDayLocked = lockedDays.includes(currentDay)

  useEffect(() => {
    const fetchHabitLogs = async () => {
      setIsFetching(true)
      const { data, error } = await supabase
        .from('habit_logs')
        .select('day, habit_id')
        .eq('user_id', user.id)

      if (!error && data) {
        const fetchedLockedDays: number[] = []
        
        setMonthlyData(prev => {
          const newData = generateMonthlyData()
          data.forEach(log => {
            // Deteksi kalau nemu kuncian dari database
            if (log.habit_id === 'LOCKED') {
              if (!fetchedLockedDays.includes(log.day)) fetchedLockedDays.push(log.day)
            } else {
              const dayHabits = newData[log.day]
              if (dayHabits) {
                const habit = dayHabits.find(h => h.id === log.habit_id)
                if (habit) habit.checked = true
              }
            }
          })
          return newData
        })
        setLockedDays(fetchedLockedDays)
      }
      setIsFetching(false)
    }

    fetchHabitLogs()
  }, [user.id, supabase])

  const toggleHabit = async (id: string) => {
    // Kalau udah dikunci, ga bisa diklik lagi
    if (isCurrentDayLocked) return;

    const targetHabit = monthlyData[currentDay].find(h => h.id === id)
    if (!targetHabit) return
    const isCurrentlyChecked = targetHabit.checked
    const willBeChecked = !isCurrentlyChecked

    setMonthlyData((prev) => ({
      ...prev,
      [currentDay]: prev[currentDay].map((habit) =>
        habit.id === id ? { ...habit, checked: willBeChecked } : habit
      )
    }))

    if (willBeChecked) {
      await supabase.from('habit_logs').insert({ user_id: user.id, day: currentDay, habit_id: id })
    } else {
      await supabase.from('habit_logs').delete().match({ user_id: user.id, day: currentDay, habit_id: id })
    }
  }

  // ---> FUNGSI KLIK KUNCI <---
  const handleLockDay = async () => {
    setIsLocking(true)
    const { error } = await supabase
      .from('habit_logs')
      .insert({ user_id: user.id, day: currentDay, habit_id: 'LOCKED' })

    if (!error) {
      setLockedDays(prev => [...prev, currentDay])
      setShowConfirmModal(false)
    } else {
      console.error('Gagal ngunci:', error.message)
    }
    setIsLocking(false)
  }

  const activeHabits = monthlyData[currentDay]
  const totalDaily = activeHabits.length
  const completedDaily = activeHabits.filter((h) => h.checked).length
  const dailyProgress = Math.round((completedDaily / totalDaily) * 100) || 0

  const { monthlyProgress } = useMemo(() => {
    let completed = 0;
    const totalPossible = totalDaily * TOTAL_DAYS;
    Object.values(monthlyData).forEach(dayHabits => {
      completed += dayHabits.filter(h => h.checked).length;
    });
    return {
      monthlyProgress: Math.round((completed / totalPossible) * 100) || 0,
    }
  }, [monthlyData, totalDaily])

  return (
    <div className="bg-gray-50 pb-8 relative">
      {isFetching && (
        <div className="absolute inset-0 bg-white/60 z-50 flex justify-center pt-32 backdrop-blur-sm">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Header Profile & Progress Bulanan */}
      <div className="bg-white px-5 pt-8 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm font-medium text-emerald-600 mb-1">Ramadhan Mubarak,</p>
            <h1 className="text-2xl font-bold text-gray-800 line-clamp-1">
              {user?.user_metadata?.full_name || 'Hamba Allah'}
            </h1>
          </div>
          {user?.user_metadata?.avatar_url ? (
            <img 
              src={user.user_metadata.avatar_url} 
              alt="Avatar" 
              className="w-14 h-14 rounded-full border-2 border-emerald-500 shadow-sm object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-emerald-500">
              <span className="text-emerald-700 font-bold text-xl">U</span>
            </div>
          )}
        </div>

        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 mb-2">
          <div className="flex justify-between text-xs mb-2 font-bold text-indigo-800 uppercase tracking-wider">
            <span>Progres 1 Bulan</span>
            <span>{monthlyProgress}%</span>
          </div>
          <div className="w-full bg-indigo-200 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${monthlyProgress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* STICKY SECTION: Navigasi Hari */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm shadow-sm rounded-b-3xl pb-4 border-b border-gray-100">
        <div className="flex overflow-x-auto hide-scrollbar gap-2 px-5 py-4 snap-x">
          {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map((day) => (
            <button
              key={day}
              onClick={() => setCurrentDay(day)}
              className={`snap-center flex-shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-2xl border-2 transition-all relative ${
                currentDay === day 
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-md transform scale-105' 
                  : 'bg-white border-gray-200 text-gray-500 hover:border-emerald-300'
              }`}
            >
              <span className="text-xs font-medium opacity-80">Hari</span>
              <span className="text-lg font-bold">{day}</span>
              {/* ---> IKON GEMBOK DI SLIDER HARI <--- */}
              {lockedDays.includes(day) && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="px-5">
          <div className="flex justify-between text-sm mb-1.5 font-bold text-gray-700">
            <span>Progres Hari Ke-{currentDay}</span>
            <span className="text-emerald-600">{dailyProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${dailyProgress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* LIST HABIT */}
      <div className="px-5 mt-6 space-y-8">
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
            Ibadah Wajib
          </h2>
          <div className="space-y-3">
            {activeHabits.filter((h) => h.type === 'wajib').map((habit) => (
              <HabitCard key={habit.id} habit={habit} onToggle={() => toggleHabit(habit.id)} colorTheme="emerald" isLocked={isCurrentDayLocked} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
            Shalat Rawatib
          </h2>
          <div className="space-y-3">
            {activeHabits.filter((h) => h.type === 'rawatib').map((habit) => (
              <HabitCard key={habit.id} habit={habit} onToggle={() => toggleHabit(habit.id)} colorTheme="indigo" isLocked={isCurrentDayLocked} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-amber-400 rounded-full"></span>
            Sunnah Lainnya
          </h2>
          <div className="space-y-3">
            {activeHabits.filter((h) => h.type === 'sunnah').map((habit) => (
              <HabitCard key={habit.id} habit={habit} onToggle={() => toggleHabit(habit.id)} colorTheme="amber" isLocked={isCurrentDayLocked} />
            ))}
          </div>
        </section>

        {/* ---> INI DIA TOMBOL KUNCINYA BRO! <--- */}
        <div className="pt-4 border-t border-gray-200 mt-8">
          {!isCurrentDayLocked ? (
            <button
              onClick={() => setShowConfirmModal(true)}
              className="w-full py-4 bg-gray-900 hover:bg-gray-800 active:scale-95 text-white font-bold rounded-2xl shadow-lg transition-all flex justify-center items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Setor & Kunci Hari {currentDay}
            </button>
          ) : (
            <div className="w-full py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl border-2 border-gray-200 flex justify-center items-center gap-2 cursor-not-allowed">
              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
              Hari {currentDay} Telah Dikunci
            </div>
          )}
        </div>
      </div>
      
      {/* ---> MODAL POP UP BUAT KONFIRMASI <--- */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Kunci Ibadah Hari {currentDay}?</h3>
            <p className="text-sm text-center text-gray-600 mb-6">
              Kalau sudah dikunci, lu <span className="font-bold text-red-500">tidak bisa mengubah</span> ceklis ibadah di hari ini lagi lho. Yakin udah semua?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                disabled={isLocking}
              >
                Batal
              </button>
              <button 
                onClick={handleLockDay}
                className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors flex justify-center items-center"
                disabled={isLocking}
              >
                {isLocking ? 'Ngunci...' : 'Ya, Kunci!'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  )
}

// ---> Komponen Card ini juga udah update nerima prop isLocked <---
function HabitCard({ habit, onToggle, colorTheme, isLocked }: { habit: Habit; onToggle: () => void; colorTheme: 'emerald' | 'indigo' | 'amber'; isLocked: boolean }) {
  const theme = {
    emerald: { bgActive: 'bg-emerald-50', borderActive: 'border-emerald-400', textActive: 'text-emerald-700', iconBg: 'bg-emerald-500', iconBorder: 'border-emerald-500', hoverBorder: 'hover:border-emerald-200' },
    indigo: { bgActive: 'bg-indigo-50', borderActive: 'border-indigo-400', textActive: 'text-indigo-700', iconBg: 'bg-indigo-500', iconBorder: 'border-indigo-500', hoverBorder: 'hover:border-indigo-200' },
    amber: { bgActive: 'bg-amber-50', borderActive: 'border-amber-400', textActive: 'text-amber-700', iconBg: 'bg-amber-500', iconBorder: 'border-amber-500', hoverBorder: 'hover:border-amber-200' }
  }[colorTheme]

  return (
    <div
      onClick={isLocked ? undefined : onToggle}
      className={`group flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
        isLocked ? (habit.checked ? `${theme.bgActive} border-gray-200 opacity-80 cursor-not-allowed` : 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed')
        : (habit.checked ? `${theme.bgActive} ${theme.borderActive} shadow-sm cursor-pointer` : `bg-white border-gray-100 shadow-sm ${theme.hoverBorder} cursor-pointer`)
      }`}
    >
      <span className={`font-medium transition-all ${habit.checked ? `${theme.textActive} line-through opacity-70` : 'text-gray-700'}`}>
        {habit.name}
      </span>
      <div className={`flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all duration-300 ${
        habit.checked 
          ? `${isLocked ? 'bg-gray-400 border-gray-400' : `${theme.iconBg} ${theme.iconBorder}`} scale-110` 
          : 'bg-gray-50 border-gray-300'
      }`}>
        <svg className={`w-4 h-4 text-white transition-opacity duration-300 ${habit.checked ? 'opacity-100' : 'opacity-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>
  )
}