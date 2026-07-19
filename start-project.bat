@echo off
setlocal enabledelayedexpansion

echo ============================================================
echo   GREEN LOFT - Auto Project Generator
echo ============================================================
echo.

REM ========================================
REM STEP 1: CREATE FOLDER STRUCTURE
REM ========================================
echo [1/5] Creating folder structure...

mkdir green-loft
cd green-loft

mkdir .vscode
mkdir public
mkdir supabase\migrations
mkdir src\app\admin\rooms
mkdir src\app\admin\bookings
mkdir src\app\admin\payments
mkdir src\app\api\midtrans\webhook
mkdir src\app\api\crypto\verify-tx
mkdir src\app\auth\login
mkdir src\app\auth\register
mkdir src\app\crypto\wallet
mkdir src\app\crypto\settings
mkdir src\app\booking
mkdir src\app\dashboard
mkdir src\app\rooms
mkdir src\components\ui
mkdir src\lib
mkdir src\hooks
mkdir src\styles

echo Done!
echo.

REM ========================================
REM STEP 2: CREATE PACKAGE.JSON
REM ========================================
echo [2/5] Creating package.json...

(
echo {
echo   "name": "green-loft",
echo   "version": "1.0.0",
echo   "private": true,
echo   "scripts": {
echo     "dev": "next dev",
echo     "build": "next build",
echo     "start": "next start",
echo     "lint": "next lint"
echo   },
echo   "dependencies": {
echo     "@supabase/supabase-js": "^2.39.0",
echo     "@supabase/ssr": "^0.1.0",
echo     "next": "14.0.4",
echo     "react": "^18.2.0",
echo     "react-dom": "^18.2.0",
echo     "midtrans-snap-sdk": "^1.3.4",
echo     "ethers": "^6.9.0",
echo     "resend": "^3.1.0",
echo     "bcryptjs": "^2.4.3",
echo     "date-fns": "^3.2.0",
echo     "qrcode.react": "^3.1.0",
echo     "zustand": "^4.4.7",
echo     "lucide-react": "^0.303.0"
echo   },
echo   "devDependencies": {
echo     "@types/node": "^20.10.6",
echo     "@types/react": "^18.2.46",
echo     "@types/react-dom": "^18.2.18",
echo     "autoprefixer": "^10.4.16",
echo     "postcss": "^8.4.32",
echo     "tailwindcss": "^3.4.0",
echo     "typescript": "^5.3.3"
echo   }
echo }
) > package.json

echo Done!
echo.

REM ========================================
REM STEP 3: CREATE ENV FILE
REM ========================================
echo [3/5] Creating .env.local...

(
echo # SUPABASE
echo NEXT_PUBLIC_SUPABASE_URL=https://tdsopxfnfzutroorssci.supabase.co
echo NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_L4Br1_J5GHDe_xpjBWG7Ew_ZoDJstka
echo SUPABASE_SERVICE_ROLE_KEY=PASTE_YOUR_SERVICE_ROLE_KEY_HERE
echo.
echo # MIDTRANS
echo NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=PASTE_YOUR_CLIENT_KEY_HERE
echo MIDTRANS_SERVER_KEY=PASTE_YOUR_SERVER_KEY_HERE
echo MIDTRANS_IS_PRODUCTION=false
echo MIDTRANS_IS_SANDBOX=true
echo.
echo # RESEND (Email API)
echo RESEND_API_KEY=PASTE_RESEND_API_KEY_HERE
echo.
echo # CRYPTO WALLET ADMIN
echo ADMIN_WALLET_ADDRESS=0x7a4273dcf9a9A272fac0115ffF3B77D941bAC8C4
echo.
echo # GENERAL
echo JWT_SECRET=change-this-to-random-secret-string-12345
echo NEXTAUTH_SECRET=change-this-to-random-secret-string-67890
echo NEXTAUTH_URL=http://localhost:3000
echo.
echo # SITE
echo NEXT_PUBLIC_SITE_URL=http://localhost:3000
echo NEXT_PUBLIC_CRYPTO_CONFIRMATIONS=12
echo NEXT_PUBLIC_USDT_BEP20_ADDRESS=0x55d398326f99059fF775485246999027B3197955
) > .env.local

echo Done!
echo.

REM ========================================
REM STEP 4: CREATE NEXT.JS CONFIG
REM ========================================
echo [4/5] Creating Next.js config files...

(
echo /** @type {import('next').NextConfig} */
echo const nextConfig = {
echo   reactStrictMode: true,
echo   images: {
echo     domains: ['tdsopxfnfzutroorssci.supabase.co', 'picsum.photos']
echo   }
echo }
echo.
echo module.exports = nextConfig
) > next.config.js

(
echo import { defineConfig } from 'tailwindcss'
echo.
echo export default defineConfig({
echo   content: [
echo     './src/pages/**/*.{js,ts,jsx,tsx}',
echo     './src/components/**/*.{js,ts,jsx,tsx}',
echo     './src/app/**/*.{js,ts,jsx,tsx}'
echo   ],
echo   theme: {
echo     extend: {
echo       colors: {
echo         primary: '#4CAF50',
echo         secondary: '#333333',
echo         accent: '#2E86DE',
echo         warmWhite: '#FAFAF5'
echo       },
echo       fontFamily: {
echo         sans: ['Inter', 'sans-serif']
echo       }
echo     }
echo   },
echo   plugins: []
echo })
) > tailwind.config.js

(
echo module.exports = {
echo   plugins: {
echo     tailwindcss: {},
echo     autoprefixer: {}
echo   }
echo }
) > postcss.config.js

(
echo {
echo   "compilerOptions": {
echo     "target": "ES2020",
echo     "lib": ["dom", "dom.iterable", "esnext"],
echo     "allowJs": true,
echo     "skipLibCheck": true,
echo     "strict": true,
echo     "noEmit": true,
echo     "esModuleInterop": true,
echo     "module": "esnext",
echo     "moduleResolution": "bundler",
echo     "resolveJsonModule": true,
echo     "isolatedModules": true,
echo     "jsx": "preserve",
echo     "incremental": true,
echo     "plugins": [{"name": "next"}],
echo     "paths": {"@/*": ["./src/*"]}
echo   },
echo   "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
echo   "exclude": ["node_modules"]
echo }
) > tsconfig.json

echo Done!
echo.

REM ========================================
REM STEP 5: CREATE SOURCE FILES
REM ========================================
echo [5/5] Creating source files...

REM ===== SRC/APP/LAYOUT.TSX =====
(
echo import './globals.css'
echo import { Inter } from 'next/font/google'
echo import Navbar from '@/components/Navbar'
echo import Footer from '@/components/Footer'
echo.
echo const inter = Inter({ subsets: ['latin'] })
echo.
echo export const metadata = {
echo   title: 'Green Loft - Premium Kost dengan Kolam Renang & Gym',
echo   description: 'Kosan premium full furnish dengan fasilitas kolam renang, gym, security 24 jam, dan parkir luas.',
echo }
echo.
echo export default function RootLayout({ children }) {
echo   return (
echo     <html lang="id">
echo       <body className={^\(inter.className)^}^>
echo         <Navbar />
echo         <main className="min-h-screen">{children}</main>
echo         <Footer />
echo       </body>
echo     </html>
echo   )
echo }
) > src\app\layout.tsx

REM ===== SRC/APP/GLOBALS.CSS =====
(
echo @tailwind base;
echo @tailwind components;
echo @tailwind utilities;
echo.
echo :root {
echo   --primary-green: #4CAF50;
echo   --secondary-dark: #333333;
echo   --accent-blue: #2E86DE;
echo   --warm-white: #FAFAF5;
echo   --text-muted: #888888;
echo }
echo.
echo body {
echo   background: var(--warm-white);
echo   color: var(--secondary-dark);
echo }
echo.
echo .btn-primary {
echo   @apply bg-[#4CAF50] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#45a049] transition-colors;
echo }
echo.
echo .btn-secondary {
echo   @apply bg-white text-[#333333] border border-[#333333] px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors;
echo }
echo.
echo .card {
echo   @apply bg-white rounded-xl shadow-sm border border-gray-100 p-6;
echo }
echo.
echo .input-field {
echo   @apply w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent outline-none;
echo }
echo.
echo .label {
echo   @apply block text-sm font-medium text-gray-700 mb-2;
echo }
echo.
echo html {
echo   scroll-behavior: smooth;
echo }
) > src\app\globals.css

REM ===== SRC/LIB/SUPABASE.TS =====
(
echo 'use client'
echo import { createClient } from '@supabase/supabase-js'
echo import { useEffect, useState } from 'react'
echo.
echo const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
echo const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
echo.
echo export const supabase = createClient(supabaseUrl, supabaseAnonKey)
echo.
echo export function useUser() {
echo   const [user, setUser] = useState(null)
echo   const [loading, setLoading] = useState(true)
echo.
echo   useEffect(() => {
echo     supabase.auth.getUser().then(({ data: { user } }) => {
echo       setUser(user)
echo       setLoading(false)
echo     })
echo.
echo     const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
echo       setUser(session?.user ?? null)
echo       setLoading(false)
echo     })
echo.
echo     return () => listener.subscription.unsubscribe()
echo   }, [])
echo.
echo   return { user, loading }
echo }
) > src\lib\supabase.ts

REM ===== SRC/LIB/MIDTRANS.TS =====
(
echo 'use client'
echo.
echo let snapInitialized = false
echo.
echo export function loadSnap() {
echo   if (typeof window === 'undefined') return null
echo.
echo   if (!(window as any).Snap) {
echo     const script = document.createElement('script')
echo     script.src = 'https://app.sandbox.midtrans.com/snap/snap.js'
echo     script.setAttribute('data-client-key', process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '')
echo     document.body.appendChild(script)
echo     snapInitialized = true
echo   }
echo.
echo   return (window as any).Snap
echo }
echo.
echo export async function createTransaction(orderId, amount, paymentType = 'qris') {
echo   const res = await fetch('/api/midtrans/create-transaction', {
echo     method: 'POST',
echo     headers: { 'Content-Type': 'application/json' },
echo     body: JSON.stringify({ order_id: orderId, gross_amount: amount, payment_type: paymentType })
echo   })
echo.
echo   if (!res.ok) throw new Error('Failed to create transaction')
echo   return res.json()
echo }
echo.
echo export function payWithSnap(token, callbacks) {
echo   const snap = loadSnap()
echo   if (!snap) throw new Error('Snap not initialized')
echo.
echo   snap.pay(token, callbacks)
echo }
) > src\lib\midtrans.ts

REM ===== SRC/LIB/CRYPTO.TS =====
(
echo 'use client'
echo import { ethers } from 'ethers'
echo.
echo // Admin wallet BEP20
echo export const ADMIN_WALLET = process.env.ADMIN_WALLET_ADDRESS || '0x7a4273dcf9a9A272fac0115ffF3B77D941bAC8C4'
echo export const REQUIRED_CONFIRMATIONS = parseInt(process.env.NEXT_PUBLIC_CRYPTO_CONFIRMATIONS || '12')
echo export const BSC_RPC_URL = 'https://bsc-dataseed.binance.org/'
echo export const USDT_BEP20_ADDRESS = process.env.NEXT_PUBLIC_USDT_BEP20_ADDRESS || '0x55d398326f99059fF775485246999027B3197955'
echo.
echo // Convert IDR to USDT (approximate rate)
echo export function idrToUsdt(amount: number): number {
echo   const rate = 15000 // 1 USDT = 15000 IDR (adjust as needed)
echo   return amount / rate
echo }
echo.
echo // Generate payment info
echo export function getCryptoPaymentInfo(usdtAmount: number) {
echo   return {
echo     network: 'BEP20 (BNB Smart Chain)',
echo     adminWallet: ADMIN_WALLET,
echo     usdtContract: USDT_BEP20_ADDRESS,
echo     amount: usdtAmount.toFixed(2),
echo     instructions: [
echo       `1. Buka wallet crypto Anda (Trust Wallet, MetaMask, dll)`,
echo       `2. Pilih USDT on BNB Chain (BEP20)`,
echo       `3. Klik Send/Transfer`,
echo       `4. Paste address: ${ADMIN_WALLET}`,
echo       `5. Masukkan amount: ${usdtAmount.toFixed(2)} USDT`,
echo       `6. Pastikan network: BNB Smart Chain (BEP20)`,
echo       `7. Submit dan simpan Transaction Hash`,
echo       `8. Upload TX hash di halaman dashboard`
echo     ]
echo   }
echo }
echo.
echo // Verify transaction status
echo export async function verifyTransaction(txHash: string) {
echo   try {
echo     const provider = new ethers.JsonRpcProvider(BSC_RPC_URL)
echo     const tx = await provider.getTransaction(txHash)
echo     const receipt = await tx?.getReceipt()
echo.
echo     return {
echo       exists: !!tx,
echo       confirmations: receipt?.confirmations || 0,
echo       status: tx?.isFinalized ? 'confirmed' : 'pending',
echo       amount: receipt?.logs?.length || 0
echo     }
echo   } catch (error) {
echo     return { exists: false, error: (error as Error).message }
echo   }
echo }
) > src\lib\crypto.ts

REM ===== COMPONENTS/NAVBAR.TSX =====
(
echo 'use client'
echo import { useState } from 'react'
echo import Link from 'next/link'
echo import { useRouter } from 'next/navigation'
echo import { supabase } from '@/lib/supabase'
echo import { useUser } from '@/lib/supabase'
echo.
echo export default function Navbar() {
echo   const router = useRouter()
echo   const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
echo   const { user, loading } = useUser()
echo.
echo   const handleLogout = async () => {
echo     await supabase.auth.signOut()
echo     router.push('/')
echo   }
echo.
echo   return (
echo     <nav className="bg-white shadow-md sticky top-0 z-50">
echo       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
echo         <div className="flex justify-between h-16 items-center">
echo           <Link href="/" className="flex items-center space-x-2">
echo             <div className="text-xl font-bold">
echo               <span className="text-[#4CAF50]">GREEN</span>
echo               <span className="text-[#333333]"> LOFT</span>
echo             </div>
echo           </Link>
echo.
echo           <div className="hidden md:flex items-center space-x-8">
echo             <Link href="/" className="text-gray-700 hover:text-[#4CAF50]">Beranda</Link>
echo             <Link href="/rooms" className="text-gray-700 hover:text-[#4CAF50]">Kamar</Link>
echo             <Link href="/booking" className="text-gray-700 hover:text-[#4CAF50]">Booking</Link>
echo             {user ? (
echo               <>
echo                 <Link href="/dashboard" className="text-gray-700 hover:text-[#4CAF50]">Dashboard</Link>
echo                 <button onClick={handleLogout} className="text-red-500 hover:text-red-700">Logout</button>
echo               </>
echo             ) : (
echo               <>
echo                 <Link href="/auth/login" className="text-gray-700 hover:text-[#4CAF50]">Login</Link>
echo                 <Link href="/auth/register" className="btn-primary text-sm">Daftar</Link>
echo               </>
echo             )}
echo           </div>
echo.
echo           <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
echo             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
echo               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
echo             </svg>
echo           </button>
echo         </div>
echo       </div>
echo     </nav>
echo   )
echo }
) > src\components\Navbar.tsx

REM ===== COMPONENTS/FOOTER.TSX =====
(
echo export default function Footer() {
echo   return (
echo     <footer className="bg-[#333333] text-white py-8">
echo       <div className="max-w-7xl mx-auto px-4 text-center">
echo         <p>&copy; 2024 Green Loft. All rights reserved.</p>
echo         <p className="text-sm text-gray-400 mt-2">Premium Kost dengan Fasilitas Lengkap</p>
echo       </div>
echo     </footer>
echo   )
echo }
) > src\components\Footer.tsx

REM ===== SRC/APP/PAGE.TSX (HOME) =====
(
echo import Link from 'next/link'
echo.
echo export default function Home() {
echo   const facilities = [
echo     { icon: '🏊', name: 'Kolam Renang', desc: 'Khusus penghuni' },
echo     { icon: '💪', name: 'Gym', desc: 'Fasilitas lengkap' },
echo     { icon: '🅿️', name: 'Parkir Basement', desc: 'Luas & aman' },
echo     { icon: '👮', name: 'Security 24 Jam', desc: 'Keamanan maksimal' },
echo     { icon: '🍳', name: 'Dapur Umum', desc: 'Masak sendiri' },
echo     { icon: '📶', name: 'WiFi High Speed', desc: 'Internet cepat' },
echo     { icon: '❄️', name: 'AC Split', desc: 'Setiap kamar' },
echo     { icon: '💧', name: 'Dispenser', desc: 'Panas & dingin' },
echo   ]
echo.
echo   return (
echo     <div>
echo       <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
echo         <div className="absolute inset-0 bg-gradient-to-r from-green-800 to-green-600">
echo           <div className="absolute inset-0 bg-black/30"></div>
echo         </div>
echo         <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
echo           <h1 className="text-5xl md:text-6xl font-bold mb-6">
echo             <span className="text-[#4CAF50]">Green</span> Loft
echo           </h1>
echo           <p className="text-xl md:text-2xl mb-8">Premium Kost dengan Kolam Renang & Gym</p>
echo           <div className="flex flex-col sm:flex-row gap-4 justify-center">
echo             <Link href="/booking" className="btn-primary text-lg px-8 py-4">Booking Sekarang</Link>
echo             <Link href="/rooms" className="btn-secondary text-lg px-8 py-4 bg-white/10 backdrop-blur border-white text-white hover:bg-white/20">Lihat Kamar</Link>
echo           </div>
echo         </div>
echo       </section>
echo.
echo       <section className="py-16 bg-white">
echo         <div className="max-w-7xl mx-auto px-4">
echo           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
echo             <div className="p-6"><div className="text-4xl font-bold text-[#4CAF50] mb-2">15</div><div className="text-gray-600">Kamar Tersedia</div></div>
echo             <div className="p-6"><div className="text-4xl font-bold text-[#4CAF50] mb-2">Rp 2.5Jt</div><div className="text-gray-600">Mulai per Bulan</div></div>
echo             <div className="p-6"><div className="text-4xl font-bold text-[#4CAF50] mb-2">15%</div><div className="text-gray-600">Diskon Tahunan</div></div>
echo           </div>
echo         </div>
echo       </section>
echo.
echo       <section className="py-20 bg-[#FAFAF5]">
echo         <div className="max-w-7xl mx-auto px-4">
echo           <h2 className="text-4xl font-bold text-center mb-4">Fasilitas <span className="text-[#4CAF50]">Premium</span></h2>
echo           <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
echo             {facilities.map((f, i) => (
echo               <div key={i} className="card hover:shadow-lg transition-shadow"><div className="text-4xl mb-4">{f.icon}</div><h3 className="font-semibold text-lg mb-2">{f.name}</h3><p className="text-gray-600 text-sm">{f.desc}</p></div>
echo             ))}
echo           </div>
echo         </div>
echo       </section>
echo.
echo       <section className="py-20 bg-gradient-to-r from-[#4CAF50] to-[#45a049]">
echo         <div className="max-w-4xl mx-auto px-4 text-center text-white">
echo           <h2 className="text-4xl font-bold mb-6">Siap untuk Tinggal?</h2>
echo           <Link href="/booking" className="inline-block bg-white text-[#4CAF50] px-10 py-4 rounded-lg font-bold text-lg hover:bg-gray-100">Booking Sekarang</Link>
echo         </div>
echo       </section>
echo     </div>
echo   )
echo }
) > src\app\page.tsx

REM ===== AUTH LOGIN PAGE =====
(
echo 'use client'
echo import { useState } from 'react'
echo import { useRouter } from 'next/navigation'
echo import Link from 'next/link'
echo import { supabase } from '@/lib/supabase'
echo.
echo export default function LoginPage() {
echo   const router = useRouter()
echo   const [email, setEmail] = useState('')
echo   const [password, setPassword] = useState('')
echo   const [error, setError] = useState('')
echo   const [loading, setLoading] = useState(false)
echo.
echo   const handleLogin = async (e) => {
echo     e.preventDefault()
echo     setLoading(true)
echo     setError('')
echo     try {
echo       const { data, error } = await supabase.auth.signInWithPassword({ email, password })
echo       if (error) throw error
echo       const { data: userData } = await supabase.from('users').select('role').eq('id', data.user.id).single()
echo       if (userData?.role === 'admin' || userData?.role === 'crypto_admin') router.push('/admin')
echo       else router.push('/dashboard')
echo     } catch (err) { setError(err.message) } finally { setLoading(false) }
echo   }
echo.
echo   return (
echo     <div className="min-h-screen flex items-center justify-center bg-[#FAFAF5] py-12 px-4">
echo       <div className="max-w-md w-full card">
echo         <div className="text-center mb-8">
echo           <h1 className="text-3xl font-bold mb-2"><span className="text-[#4CAF50]">Green</span> Loft</h1>
echo           <p className="text-gray-600">Login ke akun Anda</p>
echo         </div>
echo         {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg">{error}</div>}
echo         <form onSubmit={handleLogin} className="space-y-6">
echo           <div><label className="label">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="nama@email.com" required /></div>
echo           <div><label className="label">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" placeholder="••••••••" required /></div>
echo           <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Loading...' : 'Login'}</button>
echo         </form>
echo         <div className="mt-6 text-center text-sm text-gray-600">Belum punya akun? <Link href="/auth/register" className="text-[#4CAF50] hover:underline">Daftar disini</Link></div>
echo         <div className="mt-4 pt-4 border-t border-gray-200">
echo           <p className="text-xs text-center text-gray-500 mb-2">Atau login dengan crypto wallet</p>
echo           <Link href="/crypto/wallet" className="block btn-secondary text-center">Connect Wallet</Link>
echo         </div>
echo       </div>
echo     </div>
echo   )
echo }
) > src\app\auth\login\page.tsx

REM ===== AUTH REGISTER PAGE =====
(
echo 'use client'
echo import { useState } from 'react'
echo import { useRouter } from 'next/navigation'
echo import Link from 'next/link'
echo import { supabase } from '@/lib/supabase'
echo.
echo export default function RegisterPage() {
echo   const router = useRouter()
echo   const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
echo   const [error, setError] = useState('')
echo   const [loading, setLoading] = useState(false)
echo.
echo   const handleRegister = async (e) => {
echo     e.preventDefault()
echo     setLoading(true)
echo     setError('')
echo     if (formData.password !== formData.confirmPassword) { setError('Password tidak cocok'); setLoading(false); return }
echo     if (formData.password.length < 6) { setError('Password minimal 6 karakter'); setLoading(false); return }
echo     try {
echo       const { data: authData, error: authError } = await supabase.auth.signUp({ email: formData.email, password: formData.password })
echo       if (authError) throw authError
echo       const { error: profileError } = await supabase.from('users').insert([{ id: authData.user.id, email: formData.email, name: formData.name, phone: formData.phone, role: 'tenant', is_verified: false }])
echo       if (profileError) throw profileError
echo       alert('Registrasi berhasil! Silakan cek email untuk verifikasi.')
echo       router.push('/auth/login')
echo     } catch (err) { setError(err.message) } finally { setLoading(false) }
echo   }
echo.
echo   return (
echo     <div className="min-h-screen flex items-center justify-center bg-[#FAFAF5] py-12 px-4">
echo       <div className="max-w-md w-full card">
echo         <div className="text-center mb-8">
echo           <h1 className="text-3xl font-bold mb-2"><span className="text-[#4CAF50]">Green</span> Loft</h1>
echo           <p className="text-gray-600">Daftar akun baru</p>
echo         </div>
echo         {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg">{error}</div>}
echo         <form onSubmit={handleRegister} className="space-y-4">
echo           <div><label className="label">Nama Lengkap</label><input name="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="input-field" required /></div>
echo           <div><label className="label">Email</label><input type="email" name="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="input-field" required /></div>
echo           <div><label className="label">Nomor HP</label><input name="phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="input-field" placeholder="08xx-xxxx-xxxx" /></div>
echo           <div><label className="label">Password</label><input type="password" name="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="input-field" required /></div>
echo           <div><label className="label">Konfirmasi Password</label><input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} className="input-field" required /></div>
echo           <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Loading...' : 'Daftar'}</button>
echo         </form>
echo         <div className="mt-6 text-center text-sm text-gray-600">Sudah punya akun? <Link href="/auth/login" className="text-[#4CAF50] hover:underline">Login disini</Link></div>
echo       </div>
echo     </div>
echo   )
echo }
) > src\app\auth\register\page.tsx

REM ===== DASHBOARD PAGE =====
(
echo 'use client'
echo import { useEffect, useState } from 'react'
echo import { useRouter } from 'next/navigation'
echo import Link from 'next/link'
echo import { supabase } from '@/lib/supabase'
echo.
echo export default function DashboardPage() {
echo   const router = useRouter()
echo   const [user, setUser] = useState(null)
echo   const [bookings, setBookings] = useState([])
echo   const [rooms, setRooms] = useState([])
echo.
echo   useEffect(() => {
echo     checkUser()
echo   }, [])
echo.
echo   const checkUser = async () => {
echo     const { data: { user } } = await supabase.auth.getUser()
echo     if (!user) { router.push('/auth/login?redirect=/dashboard'); return }
echo     setUser(user)
echo     fetchBookings(user.id)
echo   }
echo.
echo   const fetchBookings = async (userId) => {
echo     const { data } = await supabase.from('bookings').select('*, rooms(number, price_per_month)').eq('user_id', userId)
echo     setBookings(data || [])
echo   }
echo.
echo   if (!user) return <div className="flex items-center justify-center h-screen">Loading...</div>
echo.
echo   return (
echo     <div className="max-w-7xl mx-auto px-4 py-12">
echo       <h1 className="text-4xl font-bold mb-8">Dashboard</h1>
echo       <div className="mb-8">
echo         <h2 className="text-2xl font-bold mb-4">Booking Aktif ({bookings.length})</h2>
echo         {bookings.length === 0 ? (
echo           <div className="card text-center py-8">
echo             <p className="text-gray-600 mb-4">Belum ada booking aktif</p>
echo             <Link href="/booking" className="btn-primary">Booking Sekarang</Link>
echo           </div>
echo         ) : (
echo           <div className="space-y-4">
echo             {bookings.map((booking) => (
echo               <div key={booking.id} className="card">
echo                 <div className="flex justify-between items-start">
echo                   <div>
echo                     <h3 className="font-bold text-xl">Room {booking.rooms?.number || 'N/A'}</h3>
echo                     <p className="text-gray-600">Durasi: {booking.duration_months} bulan</p>
echo                     <p className="text-gray-600">Mulai: {booking.start_date}</p>
echo                     <p className="text-gray-600">Selesai: {booking.end_date}</p>
echo                   </div>
echo                   <div className="text-right">
echo                     <div className={`px-4 py-2 rounded-lg ${booking.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
echo                       {booking.payment_status.toUpperCase()}
echo                     </div>
echo                   </div>
echo                 </div>
echo                 {booking.payment_status === 'paid' && (
echo                   <div className="mt-4 pt-4 border-t">
echo                     <Link href="/dashboard/renewal" className="text-[#4CAF50] hover:underline">Perpanjang Kontrak →</Link>
echo                   </div>
echo                 )}
echo               </div>
echo             ))}
echo           </div>
echo         )}
echo       </div>
echo     </div>
echo   )
echo }
) > src\app\dashboard\page.tsx

REM ===== CRYPTO WALLET PAGE =====
(
echo 'use client'
echo import { useState, useEffect } from 'react'
echo import { useRouter } from 'next/navigation'
echo import { QRCodeSVG } from 'qrcode.react'
echo import { supabase } from '@/lib/supabase'
echo import { getCryptoPaymentInfo, idrToUsdt, ADMIN_WALLET } from '@/lib/crypto'
echo.
echo export default function CryptoWalletPage() {
echo   const router = useRouter()
echo   const [user, setUser] = useState(null)
echo   const [connected, setConnected] = useState(false)
echo   const [walletAddress, setWalletAddress] = useState('')
echo   const [paymentInfo, setPaymentInfo] = useState(null)
echo   const [txHash, setTxHash] = useState('')
echo   const [submitting, setSubmitting] = useState(false)
echo.
echo   useEffect(() => {
echo     checkUser()
echo   }, [])
echo.
echo   const checkUser = async () => {
echo     const { data: { user } } = await supabase.auth.getUser()
echo     if (!user) { router.push('/auth/login?redirect=/crypto/wallet'); return }
echo     setUser(user)
echo   }
echo.
echo   const connectWallet = () => {
echo     const mockAddress = '0x' + Math.random().toString(16).substr(2, 40)
echo     setWalletAddress(mockAddress)
echo     setConnected(true)
echo   }
echo.
echo   const generatePayment = async (amountIDR) => {
echo     const usdtAmount = idrToUsdt(amountIDR)
echo     const info = getCryptoPaymentInfo(usdtAmount)
echo     setPaymentInfo(info)
echo   }
echo.
echo   const submitTransaction = async () => {
echo     if (!txHash.trim()) { alert('Masukkan Transaction Hash'); return }
echo     setSubmitting(true)
echo     try {
echo       await supabase.from('crypto_transactions').insert([{
echo         booking_id: null,
echo         tx_hash: txHash.trim(),
echo         from_address: walletAddress,
echo         to_address: ADMIN_WALLET,
echo         status: 'pending',
echo         confirmations: 0
echo       }])
echo       alert('TX Hash submitted! Admin akan memverifikasi.')
echo       router.push('/dashboard')
echo     } catch (error) {
echo       alert('Error: ' + error.message)
echo     } finally {
echo       setSubmitting(false)
echo     }
echo   }
echo.
echo   if (!user) return <div className="flex items-center justify-center h-screen">Loading...</div>
echo.
echo   return (
echo     <div className="max-w-4xl mx-auto px-4 py-12">
echo       <h1 className="text-4xl font-bold mb-8">Crypto Wallet Payment</h1>
echo.
echo       {!connected ? (
echo         <div className="card text-center py-12">
echo           <h2 className="text-2xl font-bold mb-4">Connect Crypto Wallet</h2>
echo           <p className="text-gray-600 mb-6">Connect your wallet to pay with USDT (BEP20)</p>
echo           <div className="flex justify-center gap-4">
echo             <button onClick={connectWallet} className="btn-primary">Connect Wallet (Demo)</button>
echo             <a href="https://trustwallet.com" target="_blank" className="btn-secondary">Download Trust Wallet</a>
echo           </div>
echo         </div>
echo       ) : (
echo         <div className="space-y-8">
echo           <div className="card">
echo             <h2 className="text-2xl font-bold mb-4">Wallet Connected</h2>
echo             <p className="text-sm bg-gray-100 p-3 rounded break-all">{walletAddress}</p>
echo             <button onClick={() => setConnected(false)} className="mt-4 text-red-500">Disconnect</button>
echo           </div>
echo.
echo           {paymentInfo ? (
echo             <div className="card">
echo               <h2 className="text-2xl font-bold mb-4">Payment Details</h2>
echo               <div className="flex flex-col md:flex-row gap-8">
echo                 <div className="flex-1 text-center">
echo                   <QRCodeSVG value={paymentInfo.adminWallet} size={200} level="H" />
echo                   <p className="text-sm text-gray-600 mt-4">Scan QR Code</p>
echo                 </div>
echo                 <div className="flex-1 space-y-4">
echo                   <div><label className="label">Network</label><p className="font-semibold">{paymentInfo.network}</p></div>
echo                   <div><label className="label">Amount (USDT)</label><p className="font-semibold text-xl">{paymentInfo.amount}</p></div>
echo                   <div><label className="label">Send To</label><p className="text-sm break-all bg-gray-100 p-2 rounded">{paymentInfo.adminWallet}</p></div>
echo                   <div><label className="label">Instructions</label><ul className="text-sm space-y-1 list-decimal ml-5">{paymentInfo.instructions.map((inst, i) => <li key={i}>{inst}</li>)}</ul></div>
echo                 </div>
echo               </div>
echo             </div>
echo           ) : (
echo             <div className="card text-center py-8">
echo               <p className="text-gray-600 mb-4">Generate payment to view QR code</p>
echo               <button onClick={() => generatePayment(2750000)} className="btn-primary">Generate Payment (Rp 2.75M)</button>
echo             </div>
echo           )}
echo.
echo           {paymentInfo && (
echo             <div className="card">
echo               <h2 className="text-2xl font-bold mb-4">Submit Transaction Hash</h2>
echo               <div>
echo                 <label className="label">Transaction Hash (TX Hash)</label>
echo                 <input type="text" value={txHash} onChange={(e) => setTxHash(e.target.value)} className="input-field" placeholder="0x..." />
echo               </div>
echo               <button onClick={submitTransaction} disabled={submitting} className="btn-primary mt-4 w-full">
echo                 {submitting ? 'Submitting...' : 'Submit for Verification'}
echo               </button>
echo             </div>
echo           )}
echo         </div>
echo       )}
echo     </div>
echo   )
echo }
) > src\app\crypto\wallet\page.tsx

REM ===== BOOKING PAGE =====
(
echo 'use client'
echo import { useState, useEffect } from 'react'
echo import { useRouter } from 'next/navigation'
echo import { supabase } from '@/lib/supabase'
echo import { createTransaction, loadSnap, payWithSnap } from '@/lib/