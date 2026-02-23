// components/HabitTracker.tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'

type Habit = {
  id: string
  name: string
  type: 'wajib' | 'sunnah' | 'rawatib'
  checked: boolean
}

const habitTemplate: Habit[] = [
  { id: 'w4', name: 'Shalat Maghrib', type: 'wajib', checked: false },
  { id: 'w5', name: 'Shalat Isya', type: 'wajib', checked: false },
  { id: 'w1', name: 'Shalat Subuh', type: 'wajib', checked: false },
  { id: 'w2', name: 'Shalat Dzuhur', type: 'wajib', checked: false },
  { id: 'w3', name: 'Shalat Ashar', type: 'wajib', checked: false },
  { id: 'w6', name: 'Puasa Ramadhan', type: 'wajib', checked: false },
  { id: 'w7', name: 'Baca Al-Quran', type: 'wajib', checked: false },
  { id: 'r4', name: 'Ba\'diyah Maghrib (2 Rakaat)', type: 'rawatib', checked: false },
  { id: 'r5', name: 'Ba\'diyah Isya (2 Rakaat)', type: 'rawatib', checked: false },
  { id: 'r1', name: 'Qabliyah Subuh (2 Rakaat)', type: 'rawatib', checked: false },
  { id: 'r2', name: 'Qabliyah Dzuhur (2/4 Rakaat)', type: 'rawatib', checked: false },
  { id: 'r3', name: 'Ba\'diyah Dzuhur (2 Rakaat)', type: 'rawatib', checked: false },
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
  if (now.getHours() >= 18) dayCalculation += 1;
  if (dayCalculation < 1) return 1;
  if (dayCalculation > 30) return 30;
  return dayCalculation;
}

export default function HabitTracker({ user }: { user: any }) {
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<'tracker' | 'stats'>('tracker')
  const [isAdviceOpen, setIsAdviceOpen] = useState(false)
  const [monthlyData, setMonthlyData] = useState<Record<number, Habit[]>>(generateMonthlyData())
  const [currentDay, setCurrentDay] = useState<number>(getIslamicDay())
  const [isFetching, setIsFetching] = useState(true)
  const [lockedDays, setLockedDays] = useState<number[]>([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isLocking, setIsLocking] = useState(false)

  const [coach, setCoach] = useState({ persona: 'tyler', quote: '...' })
  const [isCoachLoading, setIsCoachLoading] = useState(true)

  const isCurrentDayLocked = lockedDays.includes(currentDay)
  const userName = user?.user_metadata?.full_name || 'Hamba Allah'

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

  useEffect(() => {
    if (isFetching) return;

    const dayHabits = monthlyData[currentDay];
    if (!dayHabits) return;

    const detailedHabits = dayHabits.map(h => ({
      name: h.name,
      type: h.type,
      checked: h.checked
    }));

    const chosenPersona = currentDay % 2 === 0 ? 'tyler' : 'keating';
    
    const currentFullDateTime = new Date().toLocaleString('id-ID', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const RAMADHAN_START_DATE = new Date('2026-02-19T00:00:00');
    const targetDate = new Date(RAMADHAN_START_DATE);
    targetDate.setDate(targetDate.getDate() + (currentDay - 1));
    const formattedRecordDate = targetDate.toLocaleDateString('id-ID', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });

    const getCoachAdvice = async () => {
      setIsCoachLoading(true);
      setCoach(prev => ({ ...prev, persona: chosenPersona })); 
      
      try {
        const res = await fetch('/api/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              persona: chosenPersona, 
              habits: detailedHabits, 
              currentDay: currentDay,
              recordDate: formattedRecordDate, 
              time: currentFullDateTime,
              userName 
          }),
        });
        
        const data = await res.json();
        if (data.message) {
          setCoach({ persona: chosenPersona, quote: data.message });
        }
      } catch (error) {
        console.error("Gagal manggil AI:", error);
        setCoach({ 
          persona: chosenPersona, 
          quote: "Koneksi terputus. Tetaplah dalam ketaatan."
        });
      } finally {
        setIsCoachLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      getCoachAdvice();
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [currentDay, monthlyData, isFetching, userName]);


  const toggleHabit = async (id: string) => {
    if (isCurrentDayLocked) return;
    const targetHabit = monthlyData[currentDay].find(h => h.id === id)
    if (!targetHabit) return
    const willBeChecked = !targetHabit.checked

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

  const handleLockDay = async () => {
    setIsLocking(true)
    const { error } = await supabase.from('habit_logs').insert({ user_id: user.id, day: currentDay, habit_id: 'LOCKED' })
    if (!error) {
      setLockedDays(prev => [...prev, currentDay])
      setShowConfirmModal(false)
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
    Object.values(monthlyData).forEach(dayHabits => { completed += dayHabits.filter(h => h.checked).length; });
    return { monthlyProgress: Math.round((completed / totalPossible) * 100) || 0 }
  }, [monthlyData, totalDaily])

  const statsData = useMemo(() => {
    const counts: Record<string, { name: string; completed: number; type: string }> = {}
    habitTemplate.forEach(h => { counts[h.id] = { name: h.name, completed: 0, type: h.type } })
    Object.values(monthlyData).forEach(dayHabits => {
      dayHabits.forEach(h => { if (h.checked) counts[h.id].completed += 1 })
    })
    return Object.values(counts)
      .sort((a, b) => b.completed - a.completed)
      .map(item => ({ ...item, percentage: Math.round((item.completed / TOTAL_DAYS) * 100) }))
  }, [monthlyData])

  return (
    <div className="bg-gray-50 pb-8 relative min-h-screen">
      {isFetching && (
        <div className="absolute inset-0 bg-white/60 z-50 flex justify-center pt-32 backdrop-blur-sm">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Header Profile */}
      <div className="bg-white px-5 pt-8 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm font-medium text-emerald-600 mb-1">Ramadhan Mubarak,</p>
            <h1 className="text-2xl font-bold text-gray-800 line-clamp-1">{userName}</h1>
          </div>
          {user?.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="Avatar" className={`w-14 h-14 rounded-full border-2 border-emerald-500 shadow-sm object-cover transition-all duration-700 ${coach.persona === 'tyler' ? 'grayscale opacity-90' : 'sepia-[.3]'}`} referrerPolicy="no-referrer" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-emerald-500">
              <span className="text-emerald-700 font-bold text-xl">{userName.charAt(0).toUpperCase()}</span>
            </div>
          )}
        </div>

        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 mb-4">
          <div className="flex justify-between text-xs mb-2 font-bold text-indigo-800 uppercase tracking-wider">
            <span>Progres 1 Bulan</span><span>{monthlyProgress}%</span>
          </div>
          <div className="w-full bg-indigo-200 rounded-full h-2.5 overflow-hidden">
            <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${monthlyProgress}%` }}></div>
          </div>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button onClick={() => setActiveTab('tracker')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'tracker' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Ibadah Harian</button>
          <button onClick={() => setActiveTab('stats')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'stats' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Statistik Bulan Ini</button>
        </div>
      </div>

      {/* TAB 1: TRACKER */}
      {activeTab === 'tracker' && (
        <div className="animate-in fade-in duration-300 pb-20"> 
          {/* Tambahan pb-20 biar konten bawah ga ketutup tombol floating */}

          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm shadow-sm rounded-b-3xl pb-4 border-b border-gray-100">
            <div className="flex overflow-x-auto hide-scrollbar gap-2 px-5 py-4 snap-x pt-6">
              {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map((day) => {
                const isOddLastTen = day >= 21 && day % 2 !== 0;
                const isSelected = currentDay === day;
                return (
                  <button key={day} onClick={() => setCurrentDay(day)} className={`snap-center flex-shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-2xl border-2 transition-all relative ${isSelected ? (isOddLastTen ? 'bg-indigo-600 border-indigo-400 text-amber-300 shadow-[0_0_15px_rgba(79,70,229,0.5)] scale-105' : 'bg-emerald-500 border-emerald-500 text-white shadow-md scale-105') : (isOddLastTen ? 'bg-indigo-50 border-indigo-300 text-indigo-700 hover:border-indigo-400 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:border-emerald-300')}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider z-10 ${isOddLastTen && isSelected ? 'text-indigo-200' : 'opacity-80'}`}>Hari</span>
                    <span className={`text-xl font-black leading-none z-10 ${isOddLastTen && !isSelected ? 'drop-shadow-sm' : ''}`}>{day}</span>
                    {isOddLastTen && <span className={`absolute top-1 right-1 text-[10px] ${isSelected ? 'opacity-100' : 'opacity-60'}`}>✨</span>}
                    {lockedDays.includes(day) && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center border-2 border-white shadow-md z-20">
                        <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="px-5">
              <div className="flex justify-between text-sm mb-1.5 font-bold text-gray-700">
                <span>Progres Hari Ke-{currentDay}</span><span className="text-emerald-600">{dailyProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500 ease-out" style={{ width: `${dailyProgress}%` }}></div>
              </div>
            </div>
          </div>

          <div className="px-5 mt-6 space-y-8">
            <section>
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><span className="w-2 h-6 bg-emerald-500 rounded-full"></span>Ibadah Wajib</h2>
              <div className="space-y-3">{activeHabits.filter((h) => h.type === 'wajib').map((habit) => (<HabitCard key={habit.id} habit={habit} onToggle={() => toggleHabit(habit.id)} colorTheme="emerald" isLocked={isCurrentDayLocked} />))}</div>
            </section>
            <section>
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><span className="w-2 h-6 bg-indigo-500 rounded-full"></span>Shalat Rawatib</h2>
              <div className="space-y-3">{activeHabits.filter((h) => h.type === 'rawatib').map((habit) => (<HabitCard key={habit.id} habit={habit} onToggle={() => toggleHabit(habit.id)} colorTheme="indigo" isLocked={isCurrentDayLocked} />))}</div>
            </section>
            <section>
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><span className="w-2 h-6 bg-amber-400 rounded-full"></span>Sunnah Lainnya</h2>
              <div className="space-y-3">{activeHabits.filter((h) => h.type === 'sunnah').map((habit) => (<HabitCard key={habit.id} habit={habit} onToggle={() => toggleHabit(habit.id)} colorTheme="amber" isLocked={isCurrentDayLocked} />))}</div>
            </section>

            <div className="pt-4 border-t border-gray-200 mt-8">
              {!isCurrentDayLocked ? (
                <button onClick={() => setShowConfirmModal(true)} className="w-full py-4 bg-gray-900 hover:bg-gray-800 active:scale-95 text-white font-bold rounded-2xl shadow-lg transition-all flex justify-center items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> Setor & Kunci Hari {currentDay}
                </button>
              ) : (
                <div className="w-full py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl border-2 border-gray-200 flex justify-center items-center gap-2 cursor-not-allowed">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg> Hari {currentDay} Telah Dikunci
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STATS CHART */}
      {activeTab === 'stats' && (
        <div className="px-5 mt-6 animate-in slide-in-from-right-4 duration-300">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800">Leaderboard Ibadah</h2>
            <p className="text-sm text-gray-500">Lihat statistik ibadah yang telah dikerjakan.</p>
          </div>
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
            <div className="h-[750px] w-full"> 
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statsData} layout="vertical" margin={{ top: 10, right: 35, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={110} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4b5563', fontWeight: 600 }} />
                  <Tooltip 
                    cursor={{fill: '#f3f4f6'}}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-gray-900 text-white p-3 rounded-xl shadow-xl text-sm border border-gray-700">
                            <p className="font-bold mb-1">{data.name}</p>
                            <p className="text-gray-300">Dikerjakan: <span className="text-emerald-400 font-bold">{data.completed}</span> hari</p>
                            <p className="text-gray-300">Persentase: <span className="text-amber-400 font-bold">{data.percentage}%</span></p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="completed" 
                    radius={8} 
                    barSize={26} 
                    background={{ fill: '#f1f5f9', radius: 8 }} 
                    isAnimationActive={true} 
                    animationDuration={1500}
                  >
                    {statsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.type === 'wajib' ? '#10b981' : entry.type === 'rawatib' ? '#6366f1' : '#fbbf24'} />
                    ))}
                    <LabelList 
                      dataKey="completed" 
                      position="right" 
                      formatter={(val: string | number | boolean | null | undefined) => 
                        (typeof val === 'number' || typeof val === 'string') ? `${val}x` : ''
                      } 
                      style={{ fill: '#6b7280', fontSize: 12, fontWeight: 'bold' }} 
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 text-xs font-medium text-gray-500 justify-center">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Wajib</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-indigo-500"></span> Rawatib</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400"></span> Sunnah</span>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI KUNCI HARI */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Kunci Ibadah Hari {currentDay}?</h3>
            <p className="text-sm text-center text-gray-600 mb-6">Kalau sudah dikunci, Anda <span className="font-bold text-red-500">tidak bisa mengubah</span> ceklis ibadah di hari ini lagi. Yakin sudah semua?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors" disabled={isLocking}>Batal</button>
              <button onClick={handleLockDay} className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors flex justify-center items-center" disabled={isLocking}>{isLocking ? 'Mengunci...' : 'Ya, Kunci!'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ---> FLOATING AI ASSISTANT (Pojok Kiri Bawah) <--- */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start max-w-[85vw] sm:max-w-sm">
        
        {/* Pesan Popup AI */}
        {isAdviceOpen && (
          <div className={`p-5 rounded-3xl rounded-bl-none relative overflow-hidden transition-all duration-500 shadow-2xl border-2 mb-4 animate-in fade-in slide-in-from-bottom-4 origin-bottom-left ${
            coach.persona === 'tyler' 
              ? 'bg-emerald-950 border-emerald-500/30 shadow-emerald-900/40' 
              : 'bg-slate-900 border-amber-500/30 shadow-amber-900/40'
          }`}>
            
            {/* Tombol Close (X) */}
            <button 
              onClick={() => setIsAdviceOpen(false)}
              className="absolute top-3 right-3 z-20 text-white/40 hover:text-white transition-all hover:rotate-90 duration-300 bg-black/20 rounded-full p-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {/* Ornamen Background */}
            <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L14.85 9.15L22 12L14.85 14.85L12 22L9.15 14.85L2 12L9.15 9.15L12 2Z" fill="currentColor" className={coach.persona === 'tyler' ? 'text-emerald-400' : 'text-amber-400'} />
              </svg>
            </div>

            <div className="flex flex-col mb-2 relative z-10 pr-6">
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${
                coach.persona === 'tyler' ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {coach.persona === 'tyler' ? 'Pengingat' : 'Motivasi'}
              </span>

              <h3 className="text-white font-bold text-[12px] flex items-center gap-2">
                {coach.persona === 'tyler' ? 'Bismillah' : "Bismillah"}
                {isCoachLoading && (
                  <span className="flex gap-1">
                    <span className="w-1 h-1 rounded-full bg-current animate-bounce"></span>
                    <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:-0.3s]"></span>
                  </span>
                )}
              </h3>
            </div>

            <div className={`relative z-10`}>
              <p className={`text-[14px] leading-relaxed w-full ${
                coach.persona === 'tyler' 
                  ? 'text-emerald-50 italic font-serif' 
                  : 'text-amber-50 italic font-serif'
              }`}>
                {isCoachLoading 
                  ? (coach.persona === 'tyler' ? 'Menelaah ...' : 'Menimbang ...')
                  : `"${coach.quote}"`
                }
              </p>
            </div>
            {/* ---> DISCLAIMER AI DI SINI <--- */}
            <div className="relative z-10 mt-3 pt-3 border-t border-white/10">
              <p className="text-[9px] text-white/40 text-center italic tracking-wide">
                Teks ini dihasilkan oleh AI dan bisa saja keliru.
              </p>
            </div>

          </div>
        )}

        {/* Tombol Bulat Pemicu AI (Sang Asisten) */}
        <button 
          onClick={() => setIsAdviceOpen(!isAdviceOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 border-2 hover:scale-110 active:scale-95 ${
            isAdviceOpen 
              ? 'bg-gray-800 border-gray-600 text-white rotate-12' 
              : coach.persona === 'tyler' 
                ? 'bg-emerald-600 border-emerald-400 text-white animate-pulse' 
                : 'bg-amber-500 border-amber-300 text-white animate-pulse'
          }`}
        >
          {isAdviceOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
          ) : (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          )}
        </button>

      </div>

      <style dangerouslySetInnerHTML={{__html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}} />
    </div>
  )
}

function HabitCard({ habit, onToggle, colorTheme, isLocked }: { habit: Habit; onToggle: () => void; colorTheme: 'emerald' | 'indigo' | 'amber'; isLocked: boolean }) {
  const theme = {
    emerald: { bgActive: 'bg-emerald-50', borderActive: 'border-emerald-400', textActive: 'text-emerald-700', iconBg: 'bg-emerald-500', iconBorder: 'border-emerald-500', hoverBorder: 'hover:border-emerald-200' },
    indigo: { bgActive: 'bg-indigo-50', borderActive: 'border-indigo-400', textActive: 'text-indigo-700', iconBg: 'bg-indigo-500', iconBorder: 'border-indigo-500', hoverBorder: 'hover:border-indigo-200' },
    amber: { bgActive: 'bg-amber-50', borderActive: 'border-amber-400', textActive: 'text-amber-700', iconBg: 'bg-amber-500', iconBorder: 'border-amber-500', hoverBorder: 'hover:border-amber-200' }
  }[colorTheme]

  return (
    <div onClick={isLocked ? undefined : onToggle} className={`group flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isLocked ? (habit.checked ? `${theme.bgActive} border-gray-200 opacity-80 cursor-not-allowed` : 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed') : (habit.checked ? `${theme.bgActive} ${theme.borderActive} shadow-sm cursor-pointer` : `bg-white border-gray-100 shadow-sm ${theme.hoverBorder} cursor-pointer`)}`}>
      <span className={`font-medium transition-all ${habit.checked ? `${theme.textActive} line-through opacity-70` : 'text-gray-700'}`}>{habit.name}</span>
      <div className={`flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all duration-300 ${habit.checked ? `${isLocked ? 'bg-gray-400 border-gray-400' : `${theme.iconBg} ${theme.iconBorder}`} scale-110` : 'bg-gray-50 border-gray-300'}`}>
        <svg className={`w-4 h-4 text-white transition-opacity duration-300 ${habit.checked ? 'opacity-100' : 'opacity-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
      </div>
    </div>
  )
}