'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type MonthStat = { key: string; label: string; bookings: number; revenue: number }

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthLabel(d: Date) {
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

export default function AdminAnalytics() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(true)
  const [months, setMonths] = useState<MonthStat[]>([])
  const [archive, setArchive] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [sheetsConfigured, setSheetsConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login?redirect=/admin/analytics'); return }
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (userData?.role !== 'admin' && userData?.role !== 'crypto_admin') { router.push('/'); return }
    setChecking(false)
    fetchData()
  }

  const fetchData = async () => {
    setLoading(true)
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
    twelveMonthsAgo.setDate(1)

    const { data: bookings } = await supabase
      .from('bookings')
      .select('created_at, total_amount, payment_status')
      .gte('created_at', twelveMonthsAgo.toISOString())

    const buckets = new Map<string, MonthStat>()
    for (let i = 0; i < 12; i++) {
      const d = new Date(twelveMonthsAgo)
      d.setMonth(d.getMonth() + i)
      const key = monthKey(d)
      buckets.set(key, { key, label: monthLabel(d), bookings: 0, revenue: 0 })
    }

    for (const b of bookings || []) {
      const key = monthKey(new Date(b.created_at))
      const bucket = buckets.get(key)
      if (!bucket) continue
      bucket.bookings += 1
      if (b.payment_status === 'paid') bucket.revenue += b.total_amount
    }

    setMonths(Array.from(buckets.values()))

    const { data: archiveData } = await supabase
      .from('monthly_reports')
      .select('*')
      .order('month', { ascending: false })
      .limit(12)
    setArchive(archiveData || [])

    setLoading(false)
  }

  const saveThisMonth = async () => {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/cron/monthly-report', {
        method: 'GET',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal generate laporan')
      setSheetsConfigured(json.sheetsConfigured ?? null)
      alert(
        json.sheetUrl
          ? `Laporan bulan ini tersimpan & terupload ke Google Sheets!`
          : `Laporan bulan ini tersimpan di database. Google Sheets belum di-setup (lihat README) — data tetap aman di tabel monthly_reports.`
      )
      fetchData()
    } catch (e: any) {
      alert('Gagal: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (checking || loading) return <div className="flex items-center justify-center h-screen">Loading...</div>

  const maxBookings = Math.max(1, ...months.map((m) => m.bookings))

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-3">
        <h1 className="font-display text-3xl font-medium text-[#0f2e1f]">Analitik Bulanan</h1>
        <div className="flex gap-3 text-sm items-center">
          <a href="/admin" className="text-[#4CAF50] hover:underline">Dashboard</a>
          <a href="/admin/reports" className="text-[#4CAF50] hover:underline">Laporan</a>
          <button onClick={saveThisMonth} disabled={saving} className="bg-[#0f2e1f] text-white px-4 py-2 rounded-lg font-semibold text-sm disabled:opacity-50">
            {saving ? 'Menyimpan...' : 'Simpan / Export Bulan Ini'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="font-semibold mb-6">Booking per Bulan (12 bulan terakhir)</h2>
        <div className="flex items-end gap-2 h-48">
          {months.map((m) => (
            <div key={m.key} className="flex-1 flex flex-col items-center justify-end gap-1">
              <span className="text-xs font-semibold text-gray-600">{m.bookings}</span>
              <div
                className="w-full bg-[#4CAF50] rounded-t"
                style={{ height: `${Math.max(4, (m.bookings / maxBookings) * 160)}px` }}
              />
              <span className="text-[10px] text-gray-400 -rotate-45 origin-top-left translate-y-2 whitespace-nowrap">
                {m.label.split(' ')[0].slice(0, 3)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3">Bulan</th>
              <th className="px-4 py-3">Jumlah Booking</th>
              <th className="px-4 py-3">Revenue (paid)</th>
            </tr>
          </thead>
          <tbody>
            {[...months].reverse().map((m) => (
              <tr key={m.key} className="border-t">
                <td className="px-4 py-3">{m.label}</td>
                <td className="px-4 py-3">{m.bookings}</td>
                <td className="px-4 py-3">Rp {m.revenue.toLocaleString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="font-semibold mb-4">Arsip Laporan Tersimpan</h2>
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3">Bulan</th>
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">Revenue</th>
              <th className="px-4 py-3">Disimpan</th>
              <th className="px-4 py-3">Google Sheet</th>
            </tr>
          </thead>
          <tbody>
            {archive.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="px-4 py-3">{new Date(a.month).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</td>
                <td className="px-4 py-3">{a.total_bookings}</td>
                <td className="px-4 py-3">Rp {Number(a.total_revenue).toLocaleString('id-ID')}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{new Date(a.generated_at).toLocaleString('id-ID')}</td>
                <td className="px-4 py-3">
                  {a.sheet_url ? (
                    <a href={a.sheet_url} target="_blank" rel="noreferrer" className="text-[#4CAF50] underline text-xs">Buka</a>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
            {archive.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Belum ada laporan tersimpan.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
