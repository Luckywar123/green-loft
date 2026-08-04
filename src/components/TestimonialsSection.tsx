'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestimonialsSection() {
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    supabase
      .from('testimonials')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => setItems(data || []))
  }, [])

  if (items.length === 0) return null

  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <span className="uppercase tracking-[0.25em] text-xs text-[#b8935f] font-semibold">Testimoni</span>
          <h2 className="font-display text-3xl md:text-4xl font-medium mt-2 text-[#0f2e1f]">
            Apa Kata <span className="text-[#4CAF50]">Tenant Kami</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((t) => (
            <div key={t.id} className="card-luxury p-6">
              <div className="text-[#b8935f] mb-3">{'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}</div>
              <p className="text-gray-700 text-sm mb-4">&ldquo;{t.body}&rdquo;</p>
              <p className="font-semibold text-sm text-[#0f2e1f]">{t.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
