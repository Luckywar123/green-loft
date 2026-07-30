'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // An explicit `redirect` param (e.g. coming back from the booking
      // flow) always wins — that's an intentional destination.
      const explicitRedirect = searchParams.get('redirect')
      if (explicitRedirect) {
        router.push(explicitRedirect)
        return
      }

      // Otherwise, send admins to the admin dashboard and everyone else
      // to their tenant dashboard.
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profile?.role === 'admin' || profile?.role === 'crypto_admin') {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <h1 className="font-display text-3xl font-medium mb-6 text-center text-[#0f2e1f]">Login</h1>

        {searchParams.get('registered') === 'true' && (
          <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg mb-6 text-sm">
            📧 Registrasi berhasil! Cek email kamu untuk verifikasi, lalu login di sini.
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">{error}</div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-[#4CAF50]"
              placeholder="nama@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-[#4CAF50]"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4CAF50] text-white py-3 rounded-lg font-semibold hover:bg-[#45a049] disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600">
          Belum punya akun? <Link href="/auth/register" className="text-[#4CAF50] hover:underline">Daftar</Link>
        </p>
      </div>
    </div>
  )
}

export default function Login() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
