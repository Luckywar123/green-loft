'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, useUser } from '@/lib/supabase'

type Thread = { userId: string; name: string; email: string; lastMessage: string; lastAt: string }
type DBMessage = { id: string; user_id: string; sender_role: 'tenant' | 'admin'; body: string; created_at: string }

export default function AdminMessages() {
  const router = useRouter()
  const { user } = useUser()
  const [checking, setChecking] = useState(true)
  const [threads, setThreads] = useState<Thread[]>([])
  const [activeUserId, setActiveUserId] = useState<string | null>(null)
  const [activeName, setActiveName] = useState('')
  const [msgs, setMsgs] = useState<DBMessage[]>([])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (userData?.role !== 'admin' && userData?.role !== 'crypto_admin') { router.push('/'); return }
    setChecking(false)
    fetchThreads()
  }

  const fetchThreads = async () => {
    const { data } = await supabase
      .from('messages')
      .select('user_id, body, created_at, users!messages_user_id_fkey(name, email)')
      .order('created_at', { ascending: false })

    const seen = new Set<string>()
    const list: Thread[] = []
    for (const row of data || []) {
      if (seen.has(row.user_id)) continue
      seen.add(row.user_id)
      const u: any = row.users
      list.push({
        userId: row.user_id,
        name: u?.name || 'Tenant',
        email: u?.email || '',
        lastMessage: row.body,
        lastAt: row.created_at,
      })
    }
    setThreads(list)
  }

  const openThread = async (userId: string, name: string) => {
    setActiveUserId(userId)
    setActiveName(name)
    const { data } = await supabase
      .from('messages')
      .select('id, user_id, sender_role, body, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    setMsgs(data || [])
  }

  useEffect(() => {
    if (!activeUserId) return
    const channel = supabase
      .channel(`admin-messages-${activeUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${activeUserId}` },
        (payload) => setMsgs((prev) => [...prev, payload.new as DBMessage])
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeUserId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs])

  const send = async () => {
    if (!user || !activeUserId || !input.trim()) return
    const body = input.trim()
    setInput('')
    const { error } = await supabase.from('messages').insert([
      { user_id: activeUserId, sender_id: user.id, sender_role: 'admin', body },
    ])
    if (error) alert('Gagal mengirim: ' + error.message)
  }

  if (checking) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-display text-3xl font-medium text-[#0f2e1f]">Pesan Tenant</h1>
        <a href="/admin" className="text-[#4CAF50] hover:underline">← Dashboard</a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white rounded-xl shadow overflow-hidden" style={{ minHeight: 500 }}>
        <div className="md:col-span-1 border-r overflow-y-auto max-h-[600px]">
          {threads.length === 0 && <p className="p-4 text-sm text-gray-500">Belum ada pesan masuk.</p>}
          {threads.map((t) => (
            <button
              key={t.userId}
              onClick={() => openThread(t.userId, t.name)}
              className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 ${activeUserId === t.userId ? 'bg-green-50' : ''}`}
            >
              <div className="font-semibold text-sm">{t.name}</div>
              <div className="text-xs text-gray-500 truncate">{t.lastMessage}</div>
            </button>
          ))}
        </div>

        <div className="md:col-span-2 flex flex-col">
          {!activeUserId ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Pilih tenant di sebelah kiri</div>
          ) : (
            <>
              <div className="px-4 py-3 border-b font-semibold">{activeName}</div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#FAFAF5]">
                {msgs.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.sender_role === 'admin' ? 'bg-[#4CAF50] text-white rounded-br-sm' : 'bg-white border rounded-bl-sm'}`}>
                      {m.body}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); send() }} className="p-3 flex gap-2 border-t">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Balas tenant..."
                  className="flex-1 px-3 py-2 text-sm border rounded-lg"
                />
                <button type="submit" className="bg-[#4CAF50] text-white px-4 py-2 rounded-lg text-sm font-semibold">Kirim</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
