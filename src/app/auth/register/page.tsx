'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function Register() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Password tidak cocok!')
      return
    }

    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter!')
      return
    }

    setLoading(true)

    try {
      const { data: { user }, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            phone: formData.phone,
          }
        }
      })

      if (error) throw error

      if (user) {
        await supabase.from('users').insert([
          {
            id: user.id,
            email: formData.email,
            name: formData.name,
            phone: formData.phone,
            role: 'tenant',
            is_verified: false,
          }
        ])
      }

      setShowSuccessModal(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <h1 className="font-display text-3xl font-medium mb-6 text-center text-[#0f2e1f]">Daftar Akun</h1>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">{error}</div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Nama Lengkap</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-[#4CAF50]"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-[#4CAF50]"
              placeholder="nama@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Nomor HP</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-[#4CAF50]"
              placeholder="081234567890"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-[#4CAF50]"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Konfirmasi Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-[#4CAF50]"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4CAF50] text-white py-3 rounded-lg font-semibold hover:bg-[#45a049] disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Daftar'}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600">
          Sudah punya akun? <Link href="/auth/login" className="text-[#4CAF50] hover:underline">Login</Link>
        </p>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">
            <div className="text-5xl mb-4">📧</div>
            <h2 className="font-display text-2xl font-medium mb-2 text-[#0f2e1f]">Registrasi Berhasil!</h2>
            <p className="text-gray-600 mb-6">
              Silakan cek email kamu (<strong>{formData.email}</strong>) untuk verifikasi akun sebelum login.
            </p>
            <button
              onClick={() => router.push('/auth/login?registered=true')}
              className="w-full bg-[#4CAF50] text-white py-3 rounded-lg font-semibold hover:bg-[#45a049]"
            >
              Ke Halaman Login
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
