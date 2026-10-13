import { useEffect, useState } from 'react'
import { pickGizmoVoice } from '../lib/gizmo'

export const useSpeech = () => {
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    if (!isSupported) return
    // The voice list loads after the page does; the first getVoices() call is often empty.
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices())
    loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
      window.speechSynthesis.cancel()
    }
  }, [isSupported])

  const stop = () => {
    if (!isSupported) return
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }

  const speak = (text: string) => {
    if (!isSupported || !text.trim()) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    const available = voices.length > 0 ? voices : window.speechSynthesis.getVoices()
    const voice = pickGizmoVoice(available)
    if (voice) utterance.voice = voice
    utterance.lang = voice?.lang ?? GIZMO_FALLBACK_LANG
    utterance.rate = 1.05
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
    setIsSpeaking(true)
  }

  return { isSupported, isSpeaking, speak, stop }
}

const GIZMO_FALLBACK_LANG = 'en-GB'
