'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

export default function NewsPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('announcements')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setItems(data || [])
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl font-medium mb-2 text-center text-[#0f2e1f]">
        Berita &amp; <span className="text-[#4CAF50]">Update</span>
      </h1>
      <p className="text-gray-500 text-center mb-12">Info terbaru seputar Green Loft</p>

      {items.length === 0 ? (
        <p className="text-center text-gray-500">Belum ada berita.</p>
      ) : (
        <div className="space-y-8">
          {items.map((item) => (
            <article key={item.id} className="bg-white rounded-2xl shadow overflow-hidden">
              {item.image_url && (
                <div className="relative h-64 w-full">
                  <Image src={item.image_url} alt={item.title} fill sizes="(max-width: 768px) 100vw, 768px" className="object-cover" />
                </div>
              )}
              <div className="p-6">
                <span className="text-xs text-gray-400">
                  {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <h2 className="font-display text-2xl font-medium mt-1 mb-3 text-[#0f2e1f]">{item.title}</h2>
                <p className="text-gray-700 whitespace-pre-line">{item.body}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
