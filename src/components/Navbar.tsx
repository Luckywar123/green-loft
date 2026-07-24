'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.push('/')
  }

  if (loading) return null

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full overflow-hidden ring-1 ring-[#b8935f]/40 flex-shrink-0">
              <Image src="/images/logo.jpg" alt="Logo Green Loft" width={36} height={36} className="w-full h-full object-contain" />
            </div>
            <div className="text-xl font-bold font-display">
              <span className="text-[#4CAF50]">Green</span>
              <span className="text-[#333333]"> Loft</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-700 hover:text-[#4CAF50]">Beranda</Link>
            <Link href="/rooms" className="text-gray-700 hover:text-[#4CAF50]">Kamar</Link>
            <Link href="/booking" className="text-gray-700 hover:text-[#4CAF50]">Booking</Link>
            {user ? (
              <>
                <Link href="/dashboard" className="text-gray-700 hover:text-[#4CAF50]">Dashboard</Link>
                <button onClick={handleLogout} className="text-red-500">Logout</button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-gray-700 hover:text-[#4CAF50]">Login</Link>
                <Link href="/auth/register" className="btn-primary text-sm">Daftar</Link>
              </>
            )}
          </div>
          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-3">
            <Link href="/" className="block text-gray-700 hover:text-[#4CAF50]" onClick={() => setMobileMenuOpen(false)}>Beranda</Link>
            <Link href="/rooms" className="block text-gray-700 hover:text-[#4CAF50]" onClick={() => setMobileMenuOpen(false)}>Kamar</Link>
            <Link href="/booking" className="block text-gray-700 hover:text-[#4CAF50]" onClick={() => setMobileMenuOpen(false)}>Booking</Link>
            {user ? (
              <>
                <Link href="/dashboard" className="block text-gray-700 hover:text-[#4CAF50]" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                <button onClick={handleLogout} className="block text-red-500">Logout</button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="block text-gray-700 hover:text-[#4CAF50]" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                <Link href="/auth/register" className="inline-block btn-primary text-sm" onClick={() => setMobileMenuOpen(false)}>Daftar</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
