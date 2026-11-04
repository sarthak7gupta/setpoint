/**
 * Web Speech Recognition for tap-to-talk scoring (Chrome / Edge / Safari).
 * Parsed transcripts go through `shared/utils/voiceCommand`.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { type LocaleId, speechLang } from '../i18n'

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<{
    isFinal: boolean
    0: { transcript: string }
  }>
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const fromWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return fromWindow.SpeechRecognition ?? fromWindow.webkitSpeechRecognition ?? null
}

export function speechRecognitionSupported(): boolean {
  return getSpeechRecognition() != null
}

export function useVoiceScoring(args: {
  enabled: boolean
  locale?: LocaleId
  onFinal: (transcript: string) => void
  stopSpeech: () => void | Promise<void>
}) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const interimRef = useRef('')
  const appliedRef = useRef(false)
  const onFinalRef = useRef(args.onFinal)
  const stopSpeechRef = useRef(args.stopSpeech)
  onFinalRef.current = args.onFinal
  stopSpeechRef.current = args.stopSpeech

  useEffect(() => {
    setSupported(speechRecognitionSupported())
  }, [])

  const emit = useCallback((transcript: string) => {
    const text = transcript.trim()
    if (!text || appliedRef.current) return
    appliedRef.current = true
    onFinalRef.current(text)
  }, [])

  const stop = useCallback(() => {
    const rec = recRef.current
    recRef.current = null
    try {
      rec?.stop()
    } catch {
      try {
        rec?.abort()
      } catch {
        // ignore
      }
    }
    setListening(false)
  }, [])

  const start = useCallback(async () => {
    const Ctor = getSpeechRecognition()
    if (!Ctor || !args.enabled) return
    await stopSpeechRef.current()
    setError(null)
    setInterim('')
    interimRef.current = ''
    appliedRef.current = false
    const rec = new Ctor()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = speechLang[args.locale ?? 'en']
    rec.onresult = (event) => {
      let finalText = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) finalText += result[0].transcript
        else interimText += result[0].transcript
      }
      if (interimText) {
        interimRef.current = interimText
        setInterim(interimText)
      }
      if (finalText.trim()) {
        interimRef.current = ''
        setInterim('')
        emit(finalText)
      }
    }
    rec.onerror = (event) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(event.error)
      }
      setListening(false)
    }
    rec.onend = () => {
      const leftover = interimRef.current
      interimRef.current = ''
      setInterim('')
      emit(leftover)
      recRef.current = null
      setListening(false)
    }
    recRef.current = rec
    setListening(true)
    try {
      rec.start()
    } catch {
      setListening(false)
      setError('start-failed')
    }
  }, [args.enabled, args.locale, emit])

  const toggle = useCallback(() => {
    if (listening) stop()
    else void start()
  }, [listening, start, stop])

  useEffect(() => {
    if (!args.enabled && listening) stop()
  }, [args.enabled, listening, stop])

  useEffect(() => () => stop(), [stop])

  return { listening, supported, interim, error, toggle }
}
