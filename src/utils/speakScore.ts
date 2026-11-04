/**
 * Web Speech Synthesis for live umpire lines (game, set, score, fault).
 * Native uses `expo-speech` via `native/src/utils/speakScore.ts`.
 */
import { type LocaleId, speechLang } from '../i18n'

export async function speakScore(args: { text: string; locale: LocaleId; enabled: boolean }) {
  if (!args.enabled) return
  const text = args.text.trim()
  if (!text) return
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
  if (!synth) return
  try {
    synth.cancel()
    await new Promise<void>((resolve) => {
      let settled = false
      const failSafe = window.setTimeout(() => done(), 20000)
      function done() {
        if (settled) return
        settled = true
        window.clearTimeout(failSafe)
        resolve()
      }
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = speechLang[args.locale]
      utterance.rate = 0.92
      utterance.pitch = 1
      utterance.onend = done
      utterance.onerror = () => done()
      synth.speak(utterance)
    })
  } catch {
    // Browser without voices / autoplay restrictions
  }
}

export async function stopScoreSpeech() {
  try {
    window.speechSynthesis?.cancel()
  } catch {
    // ignore
  }
}
