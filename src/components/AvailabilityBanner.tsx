'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AvailabilityBanner() {
  const [vacant, setVacant] = useState<number | null>(null)
  const [total, setTotal] = useState<number | null>(null)

  useEffect(() => {
    supabase
      .from('rooms')
      .select('status')
      .then(({ data }) => {
        if (!data) return
        setTotal(data.length)
        setVacant(data.filter((r) => r.status === 'vacant').length)
      })
  }, [])

  if (vacant === null || total === null) return null

  const urgent = vacant > 0 && vacant <= 3
  const full = vacant === 0

  return (
    <div
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold ${
        full
          ? 'bg-gray-100 text-gray-600'
          : urgent
          ? 'bg-red-500/15 text-red-100 border border-red-400/40'
          : 'bg-white/10 text-white border border-white/30'
      }`}
    >
      {full ? (
        <>🏠 Semua kamar sedang terisi — hubungi kami untuk waiting list</>
      ) : urgent ? (
        <>🔥 Buruan! Hanya tersisa <strong>{vacant}</strong> kamar kosong dari {total}</>
      ) : (
        <>✅ {vacant} dari {total} kamar tersedia sekarang</>
      )}
    </div>
  )
}
