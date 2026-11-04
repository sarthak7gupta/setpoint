import { requireOptionalNativeModule } from 'expo'
import { Platform } from 'react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { speechLang, type LocaleId } from '../i18n'
import { VOICE_HINT_PHRASES } from '../utils/voiceCommand'

type SpeechResultEvent = {
  isFinal: boolean
  results: Array<{ transcript?: string }>
}

type SpeechErrorEvent = {
  error: string
}

type SpeechNative = {
  isRecognitionAvailable: () => boolean
  requestPermissionsAsync: () => Promise<{ granted: boolean }>
  start: (options: Record<string, unknown>) => void
  stop: () => void
  abort?: () => void
  addListener: (eventName: string, listener: (event: unknown) => void) => { remove: () => void }
}

/**
 * Never import `expo-speech-recognition` here. Its JS entry calls
 * `requireNativeModule('ExpoSpeechRecognition')`, which throws in Expo Go
 * and takes the whole app down before navigation mounts.
 *
 * Mic only works in a **development build** (`npx expo run:ios` / `run:android`).
 */
function getSpeechNative(): SpeechNative | null {
  try {
    return requireOptionalNativeModule<SpeechNative>('ExpoSpeechRecognition')
  } catch {
    return null
  }
}

function recognitionSupported(): boolean {
  const speech = getSpeechNative()
  if (!speech) return false
  try {
    return Boolean(speech.isRecognitionAvailable())
  } catch {
    return false
  }
}

export function useVoiceScoring(args: {
  enabled: boolean
  locale: LocaleId
  playerNames: string[]
  onFinal: (transcript: string) => void
  stopSpeech: () => void | Promise<void>
}) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(recognitionSupported)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const appliedRef = useRef(false)
  const onFinalRef = useRef(args.onFinal)
  const stopSpeechRef = useRef(args.stopSpeech)
  const argsRef = useRef(args)
  onFinalRef.current = args.onFinal
  stopSpeechRef.current = args.stopSpeech
  argsRef.current = args

  useEffect(() => {
    setSupported(recognitionSupported())
  }, [])

  useEffect(() => {
    const speech = getSpeechNative()
    if (!speech) return

    const startSub = speech.addListener('start', () => setListening(true))
    const endSub = speech.addListener('end', () => {
      setListening(false)
      setInterim('')
    })
    const resultSub = speech.addListener('result', (raw) => {
      const event = raw as SpeechResultEvent
      const text = event.results[0]?.transcript ?? ''
      if (!text.trim()) return
      if (event.isFinal) {
        if (appliedRef.current) return
        appliedRef.current = true
        setInterim('')
        onFinalRef.current(text.trim())
        return
      }
      setInterim(text)
    })
    const errorSub = speech.addListener('error', (raw) => {
      const event = raw as SpeechErrorEvent
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(event.error)
      }
      setListening(false)
    })

    return () => {
      startSub.remove()
      endSub.remove()
      resultSub.remove()
      errorSub.remove()
    }
  }, [])

  const stop = useCallback(() => {
    try {
      getSpeechNative()?.stop()
    } catch {
      // Native module missing (Expo Go) or already idle
    }
    setListening(false)
  }, [])

  const start = useCallback(async () => {
    if (!argsRef.current.enabled) return
    const speech = getSpeechNative()
    if (!speech) {
      setSupported(false)
      setError('service-not-allowed')
      return
    }
    setError(null)
    appliedRef.current = false
    await stopSpeechRef.current()
    // expo-speech leaves the AVAudioSession in playback; give it a beat before record.
    if (Platform.OS === 'ios') {
      await new Promise<void>((resolve) => setTimeout(resolve, 180))
    }
    try {
      const permission = await speech.requestPermissionsAsync()
      if (!permission.granted) {
        setError('not-allowed')
        return
      }
      if (!speech.isRecognitionAvailable()) {
        setSupported(false)
        setError('service-not-allowed')
        return
      }
      speech.start({
        lang: speechLang[argsRef.current.locale],
        interimResults: true,
        continuous: false,
        addsPunctuation: false,
        contextualStrings: [...VOICE_HINT_PHRASES, ...argsRef.current.playerNames],
        // Avoid fighting TTS / callout audio session on iOS.
        ...(Platform.OS === 'ios'
          ? {
              iosCategory: {
                category: 'playAndRecord',
                categoryOptions: ['defaultToSpeaker', 'allowBluetooth'],
                mode: 'measurement',
              },
            }
          : null),
      })
    } catch {
      setError('start-failed')
      setSupported(false)
    }
  }, [])

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
