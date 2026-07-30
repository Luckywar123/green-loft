'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { supabase, useUser } from '@/lib/supabase'

type Message = { role: 'bot' | 'user'; text: string }
type DBMessage = { id: string; sender_role: 'tenant' | 'admin'; body: string; created_at: string }

const FAQ: { keywords: string[]; answer: string }[] = [
  {
    keywords: ['harga', 'biaya', 'sewa', 'bayar berapa', 'price'],
    answer:
      'Ada 2 tipe kamar: Premium Rp1.750.000/bulan (tanpa water heater) dan Presidential Rp1.850.000/bulan (dengan water heater). Harga flat, tidak ada diskon durasi.',
  },
  {
    keywords: ['premium', 'presidential', 'water heater', 'beda', 'perbedaan', 'tipe kamar'],
    answer:
      'Bedanya cuma satu: Presidential ada water heater, Premium tidak. Fasilitas lain (AC, WiFi, furniture, akses kolam & gym) sama untuk kedua tipe.',
  },
  {
    keywords: ['fasilitas', 'kolam', 'gym', 'wifi', 'parkir', 'security', 'ac'],
    answer:
      'Fasilitas Green Loft: kolam renang, gym, parkir basement, security 24 jam, dapur umum, WiFi cepat, AC split tiap kamar, dan dispenser panas/dingin.',
  },
  {
    keywords: ['booking', 'cara pesan', 'cara sewa', 'reservasi'],
    answer:
      'Pilih kamar di halaman Kamar → isi tanggal mulai & durasi di halaman Booking. Kamu belum perlu login di tahap ini — login hanya diminta pas mau lanjut ke pembayaran.',
  },
  {
    keywords: ['bayar', 'pembayaran', 'qris', 'transfer', 'crypto', 'usdt', 'kripto', 'bank'],
    answer:
      'Setelah booking, kamu bisa bayar via QRIS (+biaya 0.7%), Transfer Bank, atau Crypto USDT BNB (gratis biaya admin). Semua metode perlu upload bukti dan diverifikasi manual oleh admin.',
  },
  {
    keywords: ['deposit', 'jaminan'],
    answer:
      'Deposit Rp250.000 hanya dikenakan sekali di booking pertama kamu untuk kamar tersebut. Kalau kamu perpanjang sewa di kamar yang sama, deposit tidak muncul lagi.',
  },
  {
    keywords: ['verifikasi', 'lama', 'berapa lama', 'diproses'],
    answer:
      'Verifikasi pembayaran dilakukan manual oleh admin (bukan otomatis), biasanya tidak lama. Kamu bisa pantau statusnya di halaman Dashboard.',
  },
  {
    keywords: ['alamat', 'lokasi', 'dimana'],
    answer: 'Untuk alamat lengkap dan cara ke lokasi, hubungi admin Green Loft langsung ya — kontaknya ada di halaman Beranda/Footer.',
  },
  {
    keywords: ['kontak', 'cs', 'hubungi', 'whatsapp', 'wa'],
    answer: 'Untuk pertanyaan yang belum kejawab bot ini, coba pindah ke tab "Chat Admin" di atas buat ngobrol langsung.',
  },
]

const FALLBACK =
  'Maaf, aku belum ada jawabannya untuk itu. Coba tanya soal harga, tipe kamar, fasilitas, cara booking, atau cara bayar — atau pindah ke tab "Chat Admin" buat ngobrol langsung.'

function findAnswer(input: string): string {
  const text = input.toLowerCase()
  for (const item of FAQ) {
    if (item.keywords.some((k) => text.includes(k))) return item.answer
  }
  return FALLBACK
}

const QUICK_REPLIES = ['Harga kamar?', 'Bedanya Premium & Presidential?', 'Cara booking?', 'Cara bayar?']

function FaqPanel() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: 'Halo! Ada yang bisa aku bantu soal Green Loft — harga kamar, fasilitas, cara booking, atau cara bayar?' },
  ])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const answer = findAnswer(trimmed)
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }, { role: 'bot', text: answer }])
    setInput('')
  }

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#FAFAF5]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                m.role === 'user' ? 'bg-[#4CAF50] text-white rounded-br-sm' : 'bg-white border text-gray-700 rounded-bl-sm'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="px-3 pt-2 flex flex-wrap gap-2 bg-[#FAFAF5]">
        {QUICK_REPLIES.map((q) => (
          <button
            key={q}
            onClick={() => send(q)}
            className="text-xs bg-white border border-[#b8935f]/40 text-[#0f2e1f] px-3 py-1.5 rounded-full hover:bg-[#b8935f]/10"
          >
            {q}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="p-3 flex gap-2 bg-[#FAFAF5] border-t"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tulis pertanyaan..."
          className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-[#4CAF50]"
        />
        <button type="submit" className="bg-[#4CAF50] text-white px-4 py-2 rounded-lg text-sm font-semibold">
          Kirim
        </button>
      </form>
    </>
  )
}

function AdminChatPanel() {
  const { user, loading: userLoading } = useUser()
  const [msgs, setMsgs] = useState<DBMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return

    let active = true
    supabase
      .from('messages')
      .select('id, sender_role, body, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (active) setMsgs(data || [])
      })

    const channel = supabase
      .channel(`messages-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setMsgs((prev) => [...prev, payload.new as DBMessage])
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [user])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs])

  const send = async () => {
    if (!user || !input.trim()) return
    setSending(true)
    const body = input.trim()
    setInput('')
    const { error } = await supabase.from('messages').insert([
      { user_id: user.id, sender_id: user.id, sender_role: 'tenant', body },
    ])
    setSending(false)
    if (error) alert('Gagal mengirim pesan: ' + error.message)
  }

  if (userLoading) {
    return <div className="flex-1 flex items-center justify-center text-sm text-gray-500">Loading...</div>
  }

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 bg-[#FAFAF5]">
        <p className="text-sm text-gray-600 mb-4">Login dulu untuk chat langsung sama admin.</p>
        <Link href="/auth/login" className="bg-[#4CAF50] text-white px-4 py-2 rounded-lg text-sm font-semibold">
          Login
        </Link>
      </div>
    )
  }

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#FAFAF5]">
        {msgs.length === 0 && (
          <p className="text-sm text-gray-500 text-center mt-4">Belum ada pesan. Tulis pertanyaan kamu ke admin di bawah.</p>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.sender_role === 'tenant' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                m.sender_role === 'tenant' ? 'bg-[#4CAF50] text-white rounded-br-sm' : 'bg-white border text-gray-700 rounded-bl-sm'
              }`}
            >
              {m.body}
            </div>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
        className="p-3 flex gap-2 bg-[#FAFAF5] border-t"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tulis pesan ke admin..."
          className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-[#4CAF50]"
        />
        <button type="submit" disabled={sending} className="bg-[#4CAF50] text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
          Kirim
        </button>
      </form>
    </>
  )
}

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'faq' | 'admin'>('faq')

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-80 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col" style={{ height: 460 }}>
          <div className="bg-[#0f2e1f] text-white px-4 py-3 flex items-center justify-between">
            <span className="font-display font-medium">Green Loft</span>
            <button onClick={() => setOpen(false)} aria-label="Tutup chat" className="text-white/70 hover:text-white">✕</button>
          </div>

          <div className="flex bg-[#0f2e1f]">
            <button
              onClick={() => setMode('faq')}
              className={`flex-1 py-2 text-sm font-semibold ${mode === 'faq' ? 'bg-[#FAFAF5] text-[#0f2e1f]' : 'text-white/70'}`}
            >
              FAQ
            </button>
            <button
              onClick={() => setMode('admin')}
              className={`flex-1 py-2 text-sm font-semibold ${mode === 'admin' ? 'bg-[#FAFAF5] text-[#0f2e1f]' : 'text-white/70'}`}
            >
              Chat Admin
            </button>
          </div>

          {mode === 'faq' ? <FaqPanel /> : <AdminChatPanel />}
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Buka chat bantuan"
        className="w-14 h-14 rounded-full btn-gold shadow-2xl flex items-center justify-center text-2xl"
      >
        {open ? '✕' : '💬'}
      </button>
    </div>
  )
}
