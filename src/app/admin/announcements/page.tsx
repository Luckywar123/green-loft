'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminAnnouncements() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [adminId, setAdminId] = useState<string | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [notifyTenants, setNotifyTenants] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login?redirect=/admin/announcements'); return }
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (userData?.role !== 'admin' && userData?.role !== 'crypto_admin') { router.push('/'); return }
    setAdminId(user.id)
    setChecking(false)
    fetchItems()
  }

  const fetchItems = async () => {
    setLoading(true)
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  const publish = async () => {
    if (!title.trim() || !body.trim()) { alert('Judul dan isi wajib diisi'); return }
    setSaving(true)

    let imageUrl: string | null = null
    if (image) {
      const path = `${Date.now()}-${image.name}`
      const { error: upErr } = await supabase.storage.from('announcement-images').upload(path, image)
      if (upErr) { alert('Gagal upload gambar: ' + upErr.message); setSaving(false); return }
      const { data } = supabase.storage.from('announcement-images').getPublicUrl(path)
      imageUrl = data.publicUrl
    }

    const { data: created, error } = await supabase
      .from('announcements')
      .insert([{ title, body, image_url: imageUrl, is_published: true, created_by: adminId }])
      .select('id')
      .single()

    if (error) { alert('Gagal publish: ' + error.message); setSaving(false); return }

    if (notifyTenants) {
      const { data: tenants } = await supabase.from('users').select('id').eq('role', 'tenant')
      if (tenants && tenants.length > 0) {
        const rows = tenants.map((t) => ({
          user_id: t.id,
          type: 'general' as const,
          title: `Update Baru: ${title}`,
          message: body.slice(0, 140),
          action_url: '/news',
        }))
        await supabase.from('notifications').insert(rows)
      }
    }

    setTitle('')
    setBody('')
    setImage(null)
    setSaving(false)
    fetchItems()
  }

  const togglePublish = async (item: any) => {
    await supabase.from('announcements').update({ is_published: !item.is_published }).eq('id', item.id)
    fetchItems()
  }

  const remove = async (id: string) => {
    if (!confirm('Hapus berita ini?')) return
    await supabase.from('announcements').delete().eq('id', id)
    fetchItems()
  }

  if (checking) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-3">
        <h1 className="font-display text-3xl font-medium text-[#0f2e1f]">Kelola Berita</h1>
        <a href="/admin" className="text-[#4CAF50] hover:underline text-sm">Dashboard</a>
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="font-semibold mb-4">Tulis Berita Baru</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Judul"
          className="w-full px-4 py-3 border rounded-lg mb-3"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Isi berita..."
          rows={5}
          className="w-full px-4 py-3 border rounded-lg mb-3"
        />
        <label className="block text-sm font-semibold mb-2">Gambar (opsional)</label>
        <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} className="text-sm mb-4" />

        <label className="flex items-center gap-2 mb-4 text-sm">
          <input type="checkbox" checked={notifyTenants} onChange={(e) => setNotifyTenants(e.target.checked)} />
          Kirim notifikasi ke semua tenant
        </label>

        <button onClick={publish} disabled={saving} className="bg-[#4CAF50] text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50">
          {saving ? 'Mempublikasikan...' : 'Publikasikan'}
        </button>
      </div>

      <h2 className="font-semibold mb-4">Semua Berita</h2>
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">Belum ada berita.</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow p-5 flex justify-between items-start gap-4">
              <div>
                <div className="font-semibold">{item.title}</div>
                <p className="text-sm text-gray-500 line-clamp-2">{item.body}</p>
                <span className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString('id-ID')}</span>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => togglePublish(item)} className="text-xs border px-3 py-1.5 rounded-lg font-semibold">
                  {item.is_published ? 'Sembunyikan' : 'Publikasikan'}
                </button>
                <button onClick={() => remove(item.id)} className="text-xs border border-red-300 text-red-600 px-3 py-1.5 rounded-lg font-semibold">
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
