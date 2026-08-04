'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminTestimonials() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login?redirect=/admin/testimonials'); return }
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (userData?.role !== 'admin' && userData?.role !== 'crypto_admin') { router.push('/'); return }
    setChecking(false)
    fetchItems()
  }

  const fetchItems = async () => {
    setLoading(true)
    const { data } = await supabase.from('testimonials').select('*').order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  const togglePublish = async (item: any) => {
    await supabase.from('testimonials').update({ is_published: !item.is_published }).eq('id', item.id)
    fetchItems()
  }

  const remove = async (id: string) => {
    if (!confirm('Hapus testimoni ini?')) return
    await supabase.from('testimonials').delete().eq('id', id)
    fetchItems()
  }

  if (checking || loading) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-3">
        <h1 className="font-display text-3xl font-medium text-[#0f2e1f]">Kelola Testimoni</h1>
        <a href="/admin" className="text-[#4CAF50] hover:underline text-sm">Dashboard</a>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Testimoni dari tenant tidak langsung tampil di beranda — approve dulu di sini biar terhindar dari review palsu/spam.
      </p>

      {items.length === 0 ? (
        <p className="text-gray-500">Belum ada testimoni masuk.</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow p-5">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div>
                  <div className="text-[#b8935f] text-sm mb-1">{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</div>
                  <p className="text-sm text-gray-700 mb-2">&ldquo;{item.body}&rdquo;</p>
                  <span className="text-xs font-semibold">{item.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{new Date(item.created_at).toLocaleDateString('id-ID')}</span>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => togglePublish(item)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${item.is_published ? 'border' : 'bg-[#4CAF50] text-white'}`}
                  >
                    {item.is_published ? 'Sembunyikan' : 'Tampilkan'}
                  </button>
                  <button onClick={() => remove(item.id)} className="text-xs border border-red-300 text-red-600 px-3 py-1.5 rounded-lg font-semibold">
                    Hapus
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
