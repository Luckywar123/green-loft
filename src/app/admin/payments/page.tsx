'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminPayments() {
  const router = useRouter()
  const [adminId, setAdminId] = useState<string | null>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [cryptoTxs, setCryptoTxs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (userData?.role !== 'admin' && userData?.role !== 'crypto_admin') {
      router.push('/')
      return
    }

    setAdminId(user.id)
    fetchPending()
  }

  const fetchPending = async () => {
    const { data: paymentData } = await supabase
      .from('payments')
      .select('*, bookings(id, room_id, total_amount, start_date, end_date, deposit_required, deposit_status, rooms!room_id(number, type), users(name, email))')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setPayments(paymentData || [])

    const { data: cryptoData } = await supabase
      .from('crypto_transactions')
      .select('*, bookings(id, room_id, total_amount, start_date, end_date, deposit_required, deposit_status, rooms!room_id(number, type), users(name, email))')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setCryptoTxs(cryptoData || [])

    setLoading(false)
  }

  const notifyTenant = (endpoint: string, body: Record<string, any>) => {
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {})
  }

  const verifyPayment = async (payment: any) => {
    if (!adminId) return
    setBusyId(payment.id)
    const { error: payErr } = await supabase
      .from('payments')
      .update({ status: 'verified_manual', verified_by: adminId, verified_at: new Date().toISOString(), paid_at: new Date().toISOString() })
      .eq('id', payment.id)

    if (payErr) { alert('Gagal verifikasi: ' + payErr.message); setBusyId(null); return }

    if (payment.booking_id) {
      const bookingUpdates: Record<string, any> = { payment_status: 'paid' }
      if (payment.bookings?.deposit_required && payment.bookings?.deposit_status === 'pending') {
        bookingUpdates.deposit_status = 'held'
      }
      await supabase.from('bookings').update(bookingUpdates).eq('id', payment.booking_id)
      if (payment.bookings?.room_id) {
        await supabase.from('rooms').update({ status: 'occupied', current_booking_id: payment.booking_id }).eq('id', payment.bookings.room_id)
      }
    }

    if (payment.bookings?.users?.email) {
      notifyTenant('/api/notify/payment-confirmed', {
        tenantEmail: payment.bookings.users.email,
        tenantName: payment.bookings.users.name,
        roomNumber: payment.bookings.rooms?.number,
        amount: payment.amount,
      })
    }
    setBusyId(null)
    fetchPending()
  }

  const rejectPayment = async (payment: any) => {
    const reason = prompt('Kenapa ditolak? (contoh: bukti transfer tidak valid / nominal tidak sesuai)')
    if (reason === null) return // cancelled
    setBusyId(payment.id)

    const { error } = await supabase
      .from('payments')
      .update({ status: 'failed', rejection_reason: reason || 'Tidak ada alasan diisi' })
      .eq('id', payment.id)

    if (error) { alert('Gagal menolak: ' + error.message); setBusyId(null); return }

    // Booking goes back to pending so the tenant can submit a real payment.
    if (payment.booking_id) {
      await supabase.from('bookings').update({ payment_status: 'pending' }).eq('id', payment.booking_id)
    }

    if (payment.bookings?.users?.email) {
      notifyTenant('/api/notify/payment-rejected', {
        tenantEmail: payment.bookings.users.email,
        tenantName: payment.bookings.users.name,
        roomNumber: payment.bookings.rooms?.number,
        bookingId: payment.booking_id,
        reason: reason || 'Tidak ada alasan diisi',
      })
    }
    setBusyId(null)
    fetchPending()
  }

  const verifyCrypto = async (tx: any) => {
    if (!adminId) return
    setBusyId(tx.id)
    const { error: txErr } = await supabase
      .from('crypto_transactions')
      .update({ status: 'verified', verified_by: adminId, verified_at: new Date().toISOString() })
      .eq('id', tx.id)

    if (txErr) { alert('Gagal verifikasi: ' + txErr.message); setBusyId(null); return }

    if (tx.booking_id) {
      const bookingUpdates: Record<string, any> = { payment_status: 'paid' }
      if (tx.bookings?.deposit_required && tx.bookings?.deposit_status === 'pending') {
        bookingUpdates.deposit_status = 'held'
      }
      await supabase.from('bookings').update(bookingUpdates).eq('id', tx.booking_id)
      if (tx.bookings?.room_id) {
        await supabase.from('rooms').update({ status: 'occupied', current_booking_id: tx.booking_id }).eq('id', tx.bookings.room_id)
      }
    }

    if (tx.bookings?.users?.email) {
      notifyTenant('/api/notify/payment-confirmed', {
        tenantEmail: tx.bookings.users.email,
        tenantName: tx.bookings.users.name,
        roomNumber: tx.bookings.rooms?.number,
        amount: tx.bookings.total_amount,
      })
    }
    setBusyId(null)
    fetchPending()
  }

  const rejectCrypto = async (tx: any) => {
    const reason = prompt('Kenapa ditolak? (contoh: TX hash tidak valid / tidak ditemukan di blockchain)')
    if (reason === null) return
    setBusyId(tx.id)

    const { error } = await supabase
      .from('crypto_transactions')
      .update({ status: 'failed', rejection_reason: reason || 'Tidak ada alasan diisi' })
      .eq('id', tx.id)

    if (error) { alert('Gagal menolak: ' + error.message); setBusyId(null); return }

    if (tx.booking_id) {
      await supabase.from('bookings').update({ payment_status: 'pending' }).eq('id', tx.booking_id)
    }

    if (tx.bookings?.users?.email) {
      notifyTenant('/api/notify/payment-rejected', {
        tenantEmail: tx.bookings.users.email,
        tenantName: tx.bookings.users.name,
        roomNumber: tx.bookings.rooms?.number,
        bookingId: tx.booking_id,
        reason: reason || 'Tidak ada alasan diisi',
      })
    }
    setBusyId(null)
    fetchPending()
  }

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-3">
        <h1 className="font-display text-3xl font-medium text-[#0f2e1f]">Antrean Verifikasi</h1>
        <div className="flex gap-3 text-sm">
          <a href="/admin" className="text-[#4CAF50] hover:underline">Dashboard</a>
          <a href="/admin/reports" className="text-[#4CAF50] hover:underline">Laporan Lengkap</a>
          <a href="/admin/messages" className="text-[#4CAF50] hover:underline">Pesan</a>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4">QRIS &amp; Transfer Bank — Menunggu Verifikasi</h2>
      {payments.length === 0 ? (
        <div className="card text-center py-8 mb-10">
          <p className="text-gray-600">Tidak ada payment pending</p>
        </div>
      ) : (
        <div className="space-y-4 mb-10">
          {payments.map((payment) => (
            <div key={payment.id} className="card">
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                  <div className="font-semibold text-lg">Rp {payment.amount.toLocaleString('id-ID')}</div>
                  <div className="text-sm text-gray-600">{payment.bookings?.users?.name} · {payment.bookings?.users?.email}</div>
                  <div className="text-sm text-gray-600">
                    Room {payment.bookings?.rooms?.number} · <span className="capitalize">{payment.bookings?.rooms?.type}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Metode: {payment.method?.toUpperCase()}</div>
                  {payment.proof_url && (
                    <a href={payment.proof_url} target="_blank" rel="noreferrer" className="text-sm text-[#4CAF50] underline">
                      Lihat bukti transfer
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => rejectPayment(payment)}
                    disabled={busyId === payment.id}
                    className="border border-red-300 text-red-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-red-50 disabled:opacity-50"
                  >
                    Tolak
                  </button>
                  <button onClick={() => verifyPayment(payment)} disabled={busyId === payment.id} className="btn-primary disabled:opacity-50">
                    Verify & Approve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-xl font-semibold mb-4">Crypto (USDT BNB) — Menunggu Verifikasi</h2>
      {cryptoTxs.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-600">Tidak ada transaksi crypto pending</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cryptoTxs.map((tx) => (
            <div key={tx.id} className="card">
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                  <div className="font-semibold text-lg">{tx.amount_usdt} USDT</div>
                  <div className="text-sm text-gray-600">{tx.bookings?.users?.name} · {tx.bookings?.users?.email}</div>
                  <div className="text-sm text-gray-600">
                    Room {tx.bookings?.rooms?.number} · <span className="capitalize">{tx.bookings?.rooms?.type}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1 break-all">TX Hash: {tx.tx_hash}</div>
                  <div className="text-sm text-gray-600 break-all">Dari: {tx.from_address}</div>
                  {tx.proof_url && (
                    <a href={tx.proof_url} target="_blank" rel="noreferrer" className="text-sm text-[#4CAF50] underline">
                      Lihat bukti transaksi
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => rejectCrypto(tx)}
                    disabled={busyId === tx.id}
                    className="border border-red-300 text-red-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-red-50 disabled:opacity-50"
                  >
                    Tolak
                  </button>
                  <button onClick={() => verifyCrypto(tx)} disabled={busyId === tx.id} className="btn-primary disabled:opacity-50">
                    Verify & Approve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
