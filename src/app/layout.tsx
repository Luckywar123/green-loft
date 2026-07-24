import './globals.css'
import { Inter, Fraunces } from 'next/font/google'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
})

export const metadata = {
  title: 'Green Loft - Premium Kost dengan Kolam Renang & Gym',
  description: 'Kosan premium full furnish dengan fasilitas kolam renang, gym, security 24 jam, dan parkir luas.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${inter.className} ${inter.variable} ${fraunces.variable}`}>
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
