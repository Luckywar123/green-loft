'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase, useUser } from '@/lib/supabase'
import { ADMIN_WALLET, getCryptoPaymentInfo, idrToUsdt } from '@/lib/crypto'
import { connectWallet as connectWeb3Wallet, sendUsdtToTreasury } from '@/lib/web3'

type Tab = 'qris' | 'bank' | 'crypto'

// Edit these with your real bank account details.
const BANK_ACCOUNT = {
  bankName: 'BCA',
  accountNumber: '1234567890',
  accountHolder: 'Nama Pemilik Green Loft',
}

const QRIS_FEE_RATE = 0.007 // 0.7%

async function uploadProof(file: File, bookingId: string, method: string): Promise<string | null> {
  const path = `${bookingId}/${method}-${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from('payment-proofs').upload(path, file)
  if (error) {
    alert('Gagal upload bukti transfer: ' + error.message)
    return null
  }
  const { data } = supabase.storage.from('payment-proofs').getPublicUrl(path)
  return data.publicUrl
}

async function notifyAdmin(payload: Record<string, any>) {
  try {
    await fetch('/api/notify/payment-submitted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // Notification is best-effort — never block the payment flow on it.
  }
}

export default function PaymentPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const bookingId = params.bookingId as string

  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('qris')

  // QRIS state
  const [qrisProof, setQrisProof] = useState<File | null>(null)
  const [qrisSubmitting, setQrisSubmitting] = useState(false)
  const [qrisSubmitted, setQrisSubmitted] = useState(false)

  // Bank transfer state
  const [bankProof, setBankProof] = useState<File | null>(null)
  const [bankSubmitting, setBankSubmitting] = useState(false)
  const [bankSubmitted, setBankSubmitted] = useState(false)

  // Crypto state
  const [walletAddress, setWalletAddress] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [sendingTx, setSendingTx] = useState<'idle' | 'confirming' | 'mining' | 'saving'>('idle')
  const [cryptoSubmitted, setCryptoSubmitted] = useState(false)
  const [cryptoError, setCryptoError] = useState('')

  useEffect(() => {
    if (userLoading) return
    if (!user) {
      router.push(`/auth/login?redirect=${encodeURIComponent(`/payment/${bookingId}`)}`)
      return
    }
    fetchBooking()
  }, [userLoading, user, bookingId])

  const fetchBooking = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, rooms(number, type, price_per_month)')
      .eq('id', bookingId)
      .single()

    if (error || !data) {
      setLoading(false)
      return
    }
    setBooking(data)
    setLoading(false)
  }

  const qrisTotal = booking ? Math.ceil(booking.total_amount * (1 + QRIS_FEE_RATE)) : 0
  const qrisFee = booking ? qrisTotal - booking.total_amount : 0

  const handleQrisConfirm = async () => {
    if (!booking) return
    if (!qrisProof) { alert('Upload bukti transfer dulu ya'); return }
    setQrisSubmitting(true)

    const proofUrl = await uploadProof(qrisProof, booking.id, 'qris')
    if (!proofUrl) { setQrisSubmitting(false); return }

    const { error } = await supabase.from('payments').insert([
      {
        booking_id: booking.id,
        amount: qrisTotal,
        method: 'qris',
        status: 'pending',
        qr_code_url: '/images/payment/qris-static.png',
        proof_url: proofUrl,
      },
    ])

    setQrisSubmitting(false)
    if (error) {
      alert('Gagal mengirim konfirmasi: ' + error.message)
      return
    }
    setQrisSubmitted(true)
    notifyAdmin({
      bookingId: booking.id,
      roomNumber: booking.rooms?.number,
      method: 'QRIS',
      amount: qrisTotal,
    })
  }

  const handleBankConfirm = async () => {
    if (!booking) return
    if (!bankProof) { alert('Upload bukti transfer dulu ya'); return }
    setBankSubmitting(true)

    const proofUrl = await uploadProof(bankProof, booking.id, 'bank')
    if (!proofUrl) { setBankSubmitting(false); return }

    const { error } = await supabase.from('payments').insert([
      {
        booking_id: booking.id,
        amount: booking.total_amount,
        method: 'bank_transfer',
        status: 'pending',
        proof_url: proofUrl,
      },
    ])

    setBankSubmitting(false)
    if (error) {
      alert('Gagal mengirim konfirmasi: ' + error.message)
      return
    }
    setBankSubmitted(true)
    notifyAdmin({
      bookingId: booking.id,
      roomNumber: booking.rooms?.number,
      method: 'Transfer Bank',
      amount: booking.total_amount,
    })
  }

  const handleConnectWallet = async () => {
    setCryptoError('')
    setConnecting(true)
    try {
      const address = await connectWeb3Wallet()
      setWalletAddress(address)
    } catch (e: any) {
      setCryptoError(e.message || 'Gagal menghubungkan wallet.')
    } finally {
      setConnecting(false)
    }
  }

  const handleSendCrypto = async () => {
    if (!booking) return
    setCryptoError('')
    const usdtAmount = idrToUsdt(booking.total_amount)

    try {
      setSendingTx('confirming')
      const txHash = await sendUsdtToTreasury(usdtAmount, (phase) => setSendingTx(phase))
      setSendingTx('saving')

      const { error } = await supabase.from('crypto_transactions').insert([
        {
          booking_id: booking.id,
          tx_hash: txHash,
          network: 'BEP20',
          from_address: walletAddress,
          to_address: ADMIN_WALLET,
          amount_raw: usdtAmount,
          amount_usdt: usdtAmount,
          status: 'pending',
        },
      ])

      if (error) throw error

      setCryptoSubmitted(true)
      setSendingTx('idle')
      notifyAdmin({
        bookingId: booking.id,
        roomNumber: booking.rooms?.number,
        method: 'Crypto (USDT BNB)',
        amount: usdtAmount,
      })
    } catch (e: any) {
      setSendingTx('idle')
      setCryptoError(e?.reason || e?.message || 'Transaksi gagal atau dibatalkan.')
    }
  }

  if (loading || userLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-600 mb-4">Booking tidak ditemukan.</p>
        <Link href="/dashboard" className="bg-[#4CAF50] text-white px-6 py-3 rounded-lg font-semibold">
          Ke Dashboard
        </Link>
      </div>
    )
  }

  const usdtAmount = idrToUsdt(booking.total_amount)
  const cryptoInfo = getCryptoPaymentInfo(usdtAmount)

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="font-display text-3xl md:text-4xl font-medium mb-2 text-[#0f2e1f]">Pembayaran</h1>
      <p className="text-gray-500 mb-8">
        Room {booking.rooms?.number} · <span className="capitalize">{booking.rooms?.type}</span>
      </p>

      <div className="bg-white p-6 rounded-xl shadow mb-6 flex justify-between items-center">
        <span className="text-gray-600">Total yang harus dibayar</span>
        <span className="text-2xl font-bold text-[#4CAF50]">Rp {booking.total_amount.toLocaleString('id-ID')}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('qris')}
          className={`flex-1 py-3 rounded-lg font-semibold text-sm ${tab === 'qris' ? 'bg-[#4CAF50] text-white' : 'bg-white border text-gray-700'}`}
        >
          QRIS
        </button>
        <button
          onClick={() => setTab('bank')}
          className={`flex-1 py-3 rounded-lg font-semibold text-sm ${tab === 'bank' ? 'bg-[#4CAF50] text-white' : 'bg-white border text-gray-700'}`}
        >
          Transfer Bank
        </button>
        <button
          onClick={() => setTab('crypto')}
          className={`flex-1 py-3 rounded-lg font-semibold text-sm ${tab === 'crypto' ? 'bg-[#4CAF50] text-white' : 'bg-white border text-gray-700'}`}
        >
          Crypto
        </button>
      </div>

      {tab === 'qris' && (
        <div className="bg-white p-6 rounded-xl shadow">
          {!qrisSubmitted ? (
            <>
              <h2 className="text-xl font-semibold mb-1">Scan QRIS untuk Bayar</h2>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 inline-block mb-4">
                + biaya QRIS 0.7%
              </p>
              <div className="flex justify-center mb-4">
                <div className="relative w-64 h-72">
                  <Image src="/images/payment/qris-static.png" alt="QRIS D' Green Loft Kost" fill sizes="256px" className="object-contain" />
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>Rp {booking.total_amount.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between text-gray-500"><span>Biaya QRIS (0.7%)</span><span>Rp {qrisFee.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between font-bold text-base pt-2 border-t"><span>Total Transfer</span><span className="text-[#4CAF50]">Rp {qrisTotal.toLocaleString('id-ID')}</span></div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Scan pakai aplikasi e-wallet / m-banking apa saja yang mendukung QRIS, masukkan nominal di atas secara manual.
              </p>

              <label className="block text-sm font-semibold mb-2">Upload Bukti Transfer</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setQrisProof(e.target.files?.[0] || null)}
                className="w-full mb-4 text-sm"
              />

              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-3 mb-4">
                QRIS ini statis, jadi konfirmasi pembayaran dilakukan <strong>manual oleh admin</strong> —
                bukan otomatis. Setelah transfer & upload bukti, klik tombol di bawah.
              </div>
              <button
                onClick={handleQrisConfirm}
                disabled={qrisSubmitting}
                className="w-full bg-[#4CAF50] text-white py-4 rounded-lg font-semibold hover:bg-[#45a049] disabled:opacity-50"
              >
                {qrisSubmitting ? 'Mengirim...' : 'Saya Sudah Transfer'}
              </button>
            </>
          ) : (
            <PendingNotice />
          )}
        </div>
      )}

      {tab === 'bank' && (
        <div className="bg-white p-6 rounded-xl shadow">
          {!bankSubmitted ? (
            <>
              <h2 className="text-xl font-semibold mb-4">Transfer Bank</h2>
              <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2 text-sm">
                <div><span className="text-gray-600">Bank:</span> <strong>{BANK_ACCOUNT.bankName}</strong></div>
                <div><span className="text-gray-600">No. Rekening:</span> <strong className="font-mono">{BANK_ACCOUNT.accountNumber}</strong></div>
                <div><span className="text-gray-600">Atas Nama:</span> <strong>{BANK_ACCOUNT.accountHolder}</strong></div>
                <div><span className="text-gray-600">Jumlah:</span> <strong className="text-[#4CAF50]">Rp {booking.total_amount.toLocaleString('id-ID')}</strong></div>
              </div>

              <label className="block text-sm font-semibold mb-2">Upload Bukti Transfer</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setBankProof(e.target.files?.[0] || null)}
                className="w-full mb-4 text-sm"
              />

              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-3 mb-4">
                Transfer bank diverifikasi <strong>manual oleh admin</strong> setelah kamu upload bukti.
              </div>
              <button
                onClick={handleBankConfirm}
                disabled={bankSubmitting}
                className="w-full bg-[#4CAF50] text-white py-4 rounded-lg font-semibold hover:bg-[#45a049] disabled:opacity-50"
              >
                {bankSubmitting ? 'Mengirim...' : 'Saya Sudah Transfer'}
              </button>
            </>
          ) : (
            <PendingNotice />
          )}
        </div>
      )}

      {tab === 'crypto' && (
        <div className="bg-white p-6 rounded-xl shadow">
          {!cryptoSubmitted ? (
            <>
              {!walletAddress ? (
                <div className="text-center py-6">
                  <h2 className="text-xl font-semibold mb-2">Hubungkan Wallet</h2>
                  <p className="text-gray-600 mb-6">
                    Sambungkan wallet BEP20 kamu (MetaMask / Trust Wallet) — pembayaran dikirim
                    langsung dari wallet kamu ke wallet treasury Green Loft, TX hash-nya tersimpan otomatis.
                  </p>
                  <button
                    onClick={handleConnectWallet}
                    disabled={connecting}
                    className="bg-[#4CAF50] text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
                  >
                    {connecting ? 'Menghubungkan...' : 'Connect Wallet'}
                  </button>
                  {cryptoError && <p className="text-red-600 text-sm mt-4">{cryptoError}</p>}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-xl font-semibold">Bayar dengan USDT (BEP20)</h2>
                    <span className="text-xs bg-green-100 text-green-700 font-semibold px-2.5 py-1 rounded-full">Gratis Biaya Admin</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4 break-all">Wallet kamu: {walletAddress}</p>

                  <div className="space-y-3 mb-4">
                    <div><span className="text-gray-600">Network:</span> <strong>{cryptoInfo.network}</strong></div>
                    <div><span className="text-gray-600">Treasury Wallet:</span> <span className="font-mono text-sm break-all">{cryptoInfo.adminWallet}</span></div>
                    <div><span className="text-gray-600">Jumlah:</span> <strong>{cryptoInfo.amount} USDT</strong></div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg p-3 mb-4">
                    Klik tombol di bawah, konfirmasi transaksinya di popup wallet kamu. Setelah dikonfirmasi
                    di blockchain, TX hash-nya otomatis tersimpan — tidak perlu copy-paste apa pun.
                  </div>

                  {cryptoError && <p className="text-red-600 text-sm mb-4">{cryptoError}</p>}

                  <button
                    onClick={handleSendCrypto}
                    disabled={sendingTx !== 'idle'}
                    className="w-full bg-[#4CAF50] text-white py-4 rounded-lg font-semibold hover:bg-[#45a049] disabled:opacity-50"
                  >
                    {sendingTx === 'confirming' && 'Menunggu konfirmasi di wallet...'}
                    {sendingTx === 'mining' && 'Menunggu transaksi di blockchain...'}
                    {sendingTx === 'saving' && 'Menyimpan...'}
                    {sendingTx === 'idle' && `Kirim ${cryptoInfo.amount} USDT`}
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-semibold mb-2">Pembayaran Terkirim!</h2>
              <p className="text-gray-600 mb-6">
                Transaksi kamu sudah tercatat di blockchain dan otomatis tersimpan di sistem kami.
                Admin akan mengecek di block explorer lalu memverifikasi.
              </p>
              <Link href="/dashboard" className="inline-block bg-[#4CAF50] text-white px-6 py-3 rounded-lg font-semibold">
                Ke Dashboard
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PendingNotice() {
  return (
    <div className="text-center py-6">
      <div className="text-5xl mb-4">🕓</div>
      <h2 className="text-xl font-semibold mb-2">Menunggu Verifikasi Admin</h2>
      <p className="text-gray-600 mb-6">
        Konfirmasi & bukti kamu sudah kami terima. Admin akan mengecek lalu memverifikasi pembayaran ini
        secara manual — biasanya tidak lama. Status booking kamu akan berubah jadi <strong>PAID</strong> di
        dashboard begitu diverifikasi.
      </p>
      <Link href="/dashboard" className="inline-block bg-[#4CAF50] text-white px-6 py-3 rounded-lg font-semibold">
        Ke Dashboard
      </Link>
    </div>
  )
}
