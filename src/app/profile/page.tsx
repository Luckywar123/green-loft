'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [ktpFile, setKtpFile] = useState<File | null>(null)
  const [ktpUrl, setKtpUrl] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login?redirect=/profile'); return }
    setUserId(user.id)

    const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
    setProfile(data)
    setName(data?.name || '')
    setPhone(data?.phone || '')
    setAvatarPreview(data?.avatar_url || null)

    if (data?.ktp_url) {
      const { data: signed } = await supabase.storage.from('ktp-documents').createSignedUrl(data.ktp_url, 3600)
      setKtpUrl(signed?.signedUrl || null)
    }

    setLoading(false)
  }

  const onAvatarChange = (file: File | null) => {
    setAvatarFile(file)
    if (file) setAvatarPreview(URL.createObjectURL(file))
  }

  const save = async () => {
    if (!userId) return
    setSaving(true)

    const updates: Record<string, any> = { name, phone }

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${userId}/avatar-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
      if (upErr) { alert('Gagal upload foto profil: ' + upErr.message); setSaving(false); return }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      updates.avatar_url = data.publicUrl
    }

    if (ktpFile) {
      const ext = ktpFile.name.split('.').pop()
      const path = `${userId}/ktp-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('ktp-documents').upload(path, ktpFile, { upsert: true })
      if (upErr) { alert('Gagal upload KTP: ' + upErr.message); setSaving(false); return }
      updates.ktp_url = path
      updates.ktp_verified = false // re-upload resets verification
    }

    const { error } = await supabase.from('users').update(updates).eq('id', userId)
    setSaving(false)
    if (error) { alert('Gagal menyimpan: ' + error.message); return }

    alert('Profil tersimpan!')
    setAvatarFile(null)
    setKtpFile(null)
    load()
  }

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="font-display text-3xl font-medium mb-2 text-[#0f2e1f]">Profil Saya</h1>
      <p className="text-gray-500 mb-8">{profile?.email}</p>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="font-semibold mb-4">Foto Profil</h2>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 relative">
            {avatarPreview ? (
              <Image src={avatarPreview} alt="Avatar" fill sizes="96px" className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300">
                {name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
          </div>
          <input type="file" accept="image/*" onChange={(e) => onAvatarChange(e.target.files?.[0] || null)} className="text-sm" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-6 space-y-4">
        <h2 className="font-semibold">Data Diri</h2>
        <div>
          <label className="block text-sm font-semibold mb-2">Nama Lengkap</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">Nomor HP</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 border rounded-lg" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="font-semibold mb-1">Upload KTP</h2>
        <p className="text-sm text-gray-500 mb-4">
          Dipakai admin untuk memastikan identitas penghuni. Hanya kamu dan admin yang bisa melihat file ini.
        </p>
        {ktpUrl && !ktpFile && (
          <div className="mb-4">
            <a href={ktpUrl} target="_blank" rel="noreferrer" className="text-[#4CAF50] underline text-sm">
              Lihat KTP yang sudah diupload
            </a>
            {profile?.ktp_verified ? (
              <span className="ml-3 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">Terverifikasi</span>
            ) : (
              <span className="ml-3 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-semibold">Menunggu verifikasi</span>
            )}
          </div>
        )}
        <input type="file" accept="image/*" onChange={(e) => setKtpFile(e.target.files?.[0] || null)} className="text-sm" />
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-[#4CAF50] text-white py-4 rounded-lg font-semibold hover:bg-[#45a049] disabled:opacity-50"
      >
        {saving ? 'Menyimpan...' : 'Simpan Profil'}
      </button>
    </div>
  )
}
