'use client'
import { useEffect, useRef, useState } from 'react'

// Background music widget. Real unmuted autoplay is blocked by every
// modern browser until the visitor interacts with the page — there's no
// way around that from the code side. The trick used here: start the
// track muted (browsers do allow muted autoplay), then unmute on the
// visitor's very first click/tap anywhere on the site, which feels like
// "it just started playing" without violating browser autoplay policy.
export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.volume = 0.35
    audio.muted = true
    audio.play().catch(() => {
      /* even muted autoplay can fail on some browsers — that's fine, the
         click-to-start handler below still works */
    })

    const startOnInteraction = () => {
      if (!audio.muted && !audio.paused) return
      audio.muted = false
      audio.play().then(() => setPlaying(true)).catch(() => {})
    }

    document.addEventListener('click', startOnInteraction, { once: true })
    document.addEventListener('keydown', startOnInteraction, { once: true })
    setReady(true)

    return () => {
      document.removeEventListener('click', startOnInteraction)
      document.removeEventListener('keydown', startOnInteraction)
    }
  }, [])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.muted = false
      audio.play().then(() => setPlaying(true)).catch(() => {})
    }
  }

  return (
    <div className="fixed bottom-5 left-5 z-50">
      <audio ref={audioRef} src="/audio/lofi-background.mp3" loop preload="none" />
      <button
        onClick={toggle}
        aria-label={playing ? 'Jeda musik' : 'Putar musik'}
        title={playing ? 'Jeda musik' : 'Putar musik'}
        className="w-12 h-12 rounded-full bg-white shadow-xl border border-[#b8935f]/30 flex items-center justify-center text-lg hover:scale-105 transition-transform"
      >
        {playing ? '🔊' : '🎵'}
      </button>
    </div>
  )
}
