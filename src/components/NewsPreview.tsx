'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function NewsPreview() {
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    supabase
      .from('announcements')
      .select('id, title, body, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => setItems(data || []))
  }, [])

  if (items.length === 0) return null

  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-end mb-10 flex-wrap gap-3">
          <div>
            <span className="uppercase tracking-[0.25em] text-xs text-[#b8935f] font-semibold">Update</span>
            <h2 className="font-display text-3xl md:text-4xl font-medium mt-2 text-[#0f2e1f]">Berita Terbaru</h2>
          </div>
          <Link href="/news" className="text-[#4CAF50] font-semibold text-sm hover:underline">
            Lihat Semua →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item) => (
            <Link key={item.id} href="/news" className="card-luxury p-6 block hover:-translate-y-1 transition-transform">
              <span className="text-xs text-gray-400">
                {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <h3 className="font-semibold text-lg mt-1 mb-2 text-[#0f2e1f]">{item.title}</h3>
              <p className="text-sm text-gray-600 line-clamp-3">{item.body}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
