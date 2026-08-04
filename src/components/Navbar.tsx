'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Notif = { id: string; title: string; message: string; action_url: string | null; read: boolean; created_at: string }

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [bookingHref, setBookingHref] = useState('/rooms')
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setAccountMenuOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from('users').select('role, name, avatar_url').eq('id', uid).single()
    setProfile(data)
    setIsAdmin(data?.role === 'admin' || data?.role === 'crypto_admin')
  }

  // "Booking" in the nav is smarter than a static link: send the tenant
  // wherever's actually useful given their current state, instead of just
  // duplicating "Kamar" every time.
  const loadBookingHref = async (uid: string) => {
    const { data } = await supabase
      .from('bookings')
      .select('id, payment_status')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data?.payment_status === 'pending') setBookingHref(`/payment/${data.id}`)
    else if (data?.payment_status === 'paid') setBookingHref('/dashboard')
    else setBookingHref('/rooms')
  }

  const loadNotifs = async (uid: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('id, title, message, action_url, read, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(10)
    setNotifs(data || [])
  }

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user) {
      await loadProfile(user.id)
      await loadBookingHref(user.id)
      await loadNotifs(user.id)

      const channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => setNotifs((prev) => [payload.new as Notif, ...prev])
        )
        .subscribe()
    }
    setLoading(false)

    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
        loadBookingHref(session.user.id)
        loadNotifs(session.user.id)
      } else {
        setProfile(null)
        setIsAdmin(false)
        setBookingHref('/rooms')
        setNotifs([])
      }
    })
  }

  const markNotifRead = async (notif: Notif) => {
    if (!notif.read) {
      setNotifs((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)))
      await supabase.from('notifications').update({ read: true, read_at: new Date().toISOString() }).eq('id', notif.id)
    }
    setNotifOpen(false)
    if (notif.action_url) router.push(notif.action_url)
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
  const unreadCount = notifs.filter((n) => !n.read).length

  const NotifBell = () => (
    <div className="relative" ref={notifRef}>
      <button onClick={() => setNotifOpen((o) => !o)} className="relative p-2 rounded-full hover:bg-gray-50" aria-label="Notifikasi">
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {notifOpen && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-xl shadow-xl border overflow-hidden max-h-96 overflow-y-auto">
          <div className="px-4 py-3 border-b font-semibold text-sm">Notifikasi</div>
          {notifs.length === 0 && <p className="px-4 py-6 text-sm text-gray-500 text-center">Belum ada notifikasi.</p>}
          {notifs.map((n) => (
            <button
              key={n.id}
              onClick={() => markNotifRead(n)}
              className={`block w-full text-left px-4 py-3 border-b hover:bg-gray-50 ${!n.read ? 'bg-green-50/50' : ''}`}
            >
              <div className="font-semibold text-sm">{n.title}</div>
              <div className="text-xs text-gray-500 mt-0.5">{n.message}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )

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
            <Link href={bookingHref} className="text-gray-700 hover:text-[#4CAF50]">Booking</Link>
            <Link href="/news" className="text-gray-700 hover:text-[#4CAF50]">Berita</Link>
            {user && <NotifBell />}
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
            <Link href={bookingHref} className="block text-gray-700 hover:text-[#4CAF50]" onClick={() => setMobileMenuOpen(false)}>Booking</Link>
            <Link href="/news" className="block text-gray-700 hover:text-[#4CAF50]" onClick={() => setMobileMenuOpen(false)}>Berita</Link>
            {user ? (
              <>
                <div className="text-xs text-gray-400 flex items-center gap-1.5 pt-2 border-t">
                  {user.email}
                  {isAdmin && <span className="bg-[#b8935f]/15 text-[#b8935f] px-1.5 py-0.5 rounded font-semibold">ADMIN</span>}
                  {unreadCount > 0 && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full font-semibold">{unreadCount} notif baru</span>}
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
