'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setAccountMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from('users').select('role, name, avatar_url').eq('id', uid).single()
    setProfile(data)
    setIsAdmin(data?.role === 'admin' || data?.role === 'crypto_admin')
  }

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user) await loadProfile(user.id)
    setLoading(false)

    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
        setIsAdmin(false)
      }
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setIsAdmin(false)
    setAccountMenuOpen(false)
    router.push('/')
  }

  if (loading) return null

  const initial = (profile?.name || user?.email || '?')[0]?.toUpperCase()

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
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setAccountMenuOpen((o) => !o)}
                  className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full hover:bg-gray-50 border border-transparent hover:border-gray-200"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-[#4CAF50]/10 flex items-center justify-center text-sm font-semibold text-[#4CAF50] relative">
                    {profile?.avatar_url ? (
                      <Image src={profile.avatar_url} alt="Avatar" fill sizes="32px" className="object-cover" />
                    ) : (
                      initial
                    )}
                  </div>
                  {isAdmin && (
                    <span className="text-xs bg-[#b8935f]/15 text-[#b8935f] px-2 py-0.5 rounded-full font-semibold">ADMIN</span>
                  )}
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {accountMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border overflow-hidden">
                    <div className="px-4 py-3 border-b">
                      <div className="font-semibold text-sm truncate">{profile?.name || 'Tenant'}</div>
                      <div className="text-xs text-gray-500 truncate">{user.email}</div>
                    </div>
                    {isAdmin && (
                      <Link href="/admin" onClick={() => setAccountMenuOpen(false)} className="block px-4 py-2.5 text-sm text-[#b8935f] font-semibold hover:bg-gray-50">
                        Admin Panel
                      </Link>
                    )}
                    <Link href="/dashboard" onClick={() => setAccountMenuOpen(false)} className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      Dashboard
                    </Link>
                    <Link href="/profile" onClick={() => setAccountMenuOpen(false)} className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      Profil
                    </Link>
                    <button onClick={handleLogout} className="block w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 border-t">
                      Logout
                    </button>
                  </div>
                )}
              </div>
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
                <div className="text-xs text-gray-400 flex items-center gap-1.5 pt-2 border-t">
                  {user.email}
                  {isAdmin && <span className="bg-[#b8935f]/15 text-[#b8935f] px-1.5 py-0.5 rounded font-semibold">ADMIN</span>}
                </div>
                {isAdmin && (
                  <Link href="/admin" className="block text-[#b8935f] font-semibold" onClick={() => setMobileMenuOpen(false)}>Admin Panel</Link>
                )}
                <Link href="/dashboard" className="block text-gray-700 hover:text-[#4CAF50]" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                <Link href="/profile" className="block text-gray-700 hover:text-[#4CAF50]" onClick={() => setMobileMenuOpen(false)}>Profil</Link>
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
