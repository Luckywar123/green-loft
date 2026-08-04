'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Row = {
  id: string
  room_id: number
  user_id: string
  start_date: string
  end_date: string
  duration_months: number
  total_amount: number
  payment_status: string
  deposit_required: boolean
  deposit_amount: number
  deposit_status: string
  rooms?: { number: string; type: string }
  users?: { name: string; email: string; ktp_url?: string | null; ktp_verified?: boolean }
  method?: string
  proofUrl?: string | null
}

const STATUS_OPTIONS = ['pending', 'paid', 'failed', 'refunded', 'verified_manual']
const DEPOSIT_OPTIONS = ['pending', 'held', 'returned']
const DEPOSIT_LABEL: Record<string, string> = {
  pending: 'Belum Diterima',
  held: 'Ditahan',
  returned: 'Dikembalikan',
}

export default function AdminReports() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [editingStart, setEditingStart] = useState<Record<string, string>>({})
  const [editingEnd, setEditingEnd] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (userData?.role !== 'admin' && userData?.role !== 'crypto_admin') { router.push('/'); return }
    setChecking(false)
    fetchAll()
  }

  const fetchAll = async () => {
    setLoading(true)
    setFetchError(null)

    const { data: bookings, error: bookingsErr } = await supabase
      .from('bookings')
      .select('*, rooms!room_id(number, type), users(name, email, ktp_url, ktp_verified)')
      .order('created_at', { ascending: false })

    if (bookingsErr) {
      console.error('[admin/reports] bookings query failed:', bookingsErr)
      setFetchError(bookingsErr.message)
      setRows([])
      setLoading(false)
      return
    }

    const { data: payments, error: paymentsErr } = await supabase
      .from('payments')
      .select('booking_id, method, status, proof_url, created_at')
      .order('created_at', { ascending: false })
    if (paymentsErr) console.error('[admin/reports] payments query failed:', paymentsErr)

    const { data: cryptoTxs, error: cryptoErr } = await supabase
      .from('crypto_transactions')
      .select('booking_id, status, proof_url, created_at')
      .order('created_at', { ascending: false })
    if (cryptoErr) console.error('[admin/reports] crypto_transactions query failed:', cryptoErr)

    const merged: Row[] = (bookings || []).map((b: any) => {
      const latestPayment = (payments || []).find((p) => p.booking_id === b.id)
      const latestCrypto = (cryptoTxs || []).find((c) => c.booking_id === b.id)

      let method: string | undefined
      let proofUrl: string | null | undefined

      if (latestPayment && latestCrypto) {
        const usePay = new Date(latestPayment.created_at) > new Date(latestCrypto.created_at)
        method = usePay ? latestPayment.method : 'crypto'
        proofUrl = usePay ? latestPayment.proof_url : latestCrypto.proof_url
      } else if (latestPayment) {
        method = latestPayment.method
        proofUrl = latestPayment.proof_url
      } else if (latestCrypto) {
        method = 'crypto'
        proofUrl = latestCrypto.proof_url
      }

      return { ...b, method, proofUrl }
    })

    setRows(merged)
    setLoading(false)
  }

  const updateStatus = async (row: Row, newStatus: string) => {
    const updates: Record<string, any> = { payment_status: newStatus }
    // Confirming payment also confirms the deposit was actually received.
    if (newStatus === 'paid' && row.deposit_required && row.deposit_status === 'pending') {
      updates.deposit_status = 'held'
    }

    const { error } = await supabase.from('bookings').update(updates).eq('id', row.id)
    if (error) { alert('Gagal update status: ' + error.message); return }

    if (newStatus === 'paid') {
      await supabase.from('rooms').update({ status: 'occupied', current_booking_id: row.id }).eq('id', row.room_id)
      if (row.users?.email) {
        fetch('/api/notify/payment-confirmed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantEmail: row.users.email,
            tenantName: row.users.name,
            roomNumber: row.rooms?.number,
            amount: row.total_amount,
          }),
        }).catch(() => {})
      }
    } else if (newStatus === 'failed' || newStatus === 'refunded') {
      await supabase.from('rooms').update({ status: 'vacant', current_booking_id: null }).eq('id', row.room_id)
    }

    fetchAll()
  }

  const updateDeposit = async (row: Row, newStatus: string) => {
    const { error } = await supabase.from('bookings').update({ deposit_status: newStatus }).eq('id', row.id)
    if (error) { alert('Gagal update deposit: ' + error.message); return }
    fetchAll()
  }

  const viewKtp = async (row: Row) => {
    if (!row.users?.ktp_url) return
    const { data, error } = await supabase.storage.from('ktp-documents').createSignedUrl(row.users.ktp_url, 300)
    if (error || !data) { alert('Gagal membuka KTP: ' + error?.message); return }
    window.open(data.signedUrl, '_blank')
  }

  const toggleKtpVerified = async (row: Row) => {
    const { error } = await supabase
      .from('users')
      .update({ ktp_verified: !row.users?.ktp_verified })
      .eq('id', row.user_id)
    if (error) { alert('Gagal update verifikasi KTP: ' + error.message); return }
    fetchAll()
  }

  const saveDates = async (row: Row) => {
    const newStart = editingStart[row.id] ?? row.start_date
    const newEnd = editingEnd[row.id] ?? row.end_date
    const { error } = await supabase
      .from('bookings')
      .update({ start_date: newStart, end_date: newEnd })
      .eq('id', row.id)
    if (error) { alert('Gagal update tanggal: ' + error.message); return }
    setEditingStart((prev) => { const next = { ...prev }; delete next[row.id]; return next })
    setEditingEnd((prev) => { const next = { ...prev }; delete next[row.id]; return next })
    fetchAll()
  }

  const filteredRows = rows.filter((r) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      r.users?.name?.toLowerCase().includes(q) ||
      r.users?.email?.toLowerCase().includes(q) ||
      r.rooms?.number?.toLowerCase().includes(q)
    )
  })

  const exportCsv = () => {
    const header = ['Tenant', 'Email', 'Kamar', 'Tipe', 'Mulai', 'Selesai', 'Total', 'Metode', 'Status Bayar', 'Deposit']
    const lines = filteredRows.map((r) => [
      r.users?.name, r.users?.email, r.rooms?.number, r.rooms?.type,
      r.start_date, r.end_date, r.total_amount, r.method || '-', r.payment_status, r.deposit_status,
    ].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    const csv = [header.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan-green-loft-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (checking || loading) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h1 className="font-display text-3xl font-medium text-[#0f2e1f]">Laporan Transaksi</h1>
        <div className="flex gap-3 text-sm items-center">
          <a href="/admin" className="text-[#4CAF50] hover:underline">Dashboard</a>
          <a href="/admin/rooms" className="text-[#4CAF50] hover:underline">Kelola Kamar</a>
          <a href="/admin/payments" className="text-[#4CAF50] hover:underline">Antrean Verifikasi</a>
          <a href="/admin/messages" className="text-[#4CAF50] hover:underline">Pesan</a>
        </div>
      </div>

      {fetchError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          <strong>Gagal memuat data:</strong> {fetchError}
          <button onClick={fetchAll} className="ml-3 underline font-semibold">Coba lagi</button>
        </div>
      )}

      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama tenant, email, atau nomor kamar..."
          className="border rounded-lg px-3 py-2 text-sm w-full max-w-xs"
        />
        <button onClick={exportCsv} className="text-sm bg-[#0f2e1f] text-white px-4 py-2 rounded-lg font-semibold">
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Kamar</th>
              <th className="px-4 py-3">Mulai — Selesai</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Metode</th>
              <th className="px-4 py-3">Bukti</th>
              <th className="px-4 py-3">KTP</th>
              <th className="px-4 py-3">Status Bayar</th>
              <th className="px-4 py-3">Deposit</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id} className="border-t align-top">
                <td className="px-4 py-3">
                  <div className="font-medium">{row.users?.name}</div>
                  <div className="text-xs text-gray-500">{row.users?.email}</div>
                </td>
                <td className="px-4 py-3">
                  <div>{row.rooms?.number}</div>
                  <div className="text-xs text-gray-500 capitalize">{row.rooms?.type}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <input
                      type="date"
                      value={editingStart[row.id] ?? row.start_date}
                      onChange={(e) => setEditingStart((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      className="border rounded px-2 py-1 text-xs"
                    />
                    <input
                      type="date"
                      value={editingEnd[row.id] ?? row.end_date}
                      onChange={(e) => setEditingEnd((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      className="border rounded px-2 py-1 text-xs"
                    />
                    {(editingStart[row.id] !== undefined || editingEnd[row.id] !== undefined) && (
                      <button onClick={() => saveDates(row)} className="text-xs text-[#4CAF50] font-semibold text-left">
                        Simpan tanggal
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">Rp {row.total_amount.toLocaleString('id-ID')}</td>
                <td className="px-4 py-3 uppercase text-xs">{row.method || '-'}</td>
                <td className="px-4 py-3">
                  {row.proofUrl ? (
                    <a href={row.proofUrl} target="_blank" rel="noreferrer" className="text-[#4CAF50] underline text-xs">
                      Lihat
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {row.users?.ktp_url ? (
                    <div className="flex flex-col gap-1">
                      <button onClick={() => viewKtp(row)} className="text-[#4CAF50] underline text-xs text-left">Lihat KTP</button>
                      <button onClick={() => toggleKtpVerified(row)} className={`text-xs px-2 py-0.5 rounded-full font-semibold text-left w-fit ${row.users?.ktp_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {row.users?.ktp_verified ? 'Terverifikasi' : 'Belum diverifikasi'}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Belum upload</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={row.payment_status}
                    onChange={(e) => updateStatus(row, e.target.value)}
                    className="border rounded px-2 py-1 text-xs capitalize"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  {!row.deposit_required ? (
                    <span className="text-xs text-gray-400">-</span>
                  ) : (
                    <select
                      value={row.deposit_status}
                      onChange={(e) => updateDeposit(row, e.target.value)}
                      className="border rounded px-2 py-1 text-xs"
                    >
                      {DEPOSIT_OPTIONS.map((s) => (
                        <option key={s} value={s}>{DEPOSIT_LABEL[s]}</option>
                      ))}
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredRows.length === 0 && <p className="p-6 text-center text-gray-500">Tidak ada booking.</p>}
      </div>
    </div>
  )
}
