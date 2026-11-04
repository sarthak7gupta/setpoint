/**
 * Spoken umpire lines via `expo-speech`. Language follows the in-app locale.
 * Web uses the Web Speech API in `src/utils/speakScore.ts`.
 */
import * as Speech from 'expo-speech'
import { type LocaleId, speechLang } from '../i18n'

export async function speakScore(args: { text: string; locale: LocaleId; enabled: boolean }) {
  if (!args.enabled) return
  const text = args.text.trim()
  if (!text) return
  try {
    await Speech.stop()
    await new Promise<void>((resolve) => {
      let settled = false
      const failSafe = setTimeout(() => done(), 20000)
      function done() {
        if (settled) return
        settled = true
        clearTimeout(failSafe)
        resolve()
      }
      Speech.speak(text, {
        language: speechLang[args.locale],
        rate: 0.92,
        pitch: 1,
        onDone: done,
        onStopped: done,
        onError: () => done(),
      })
    })
  } catch {
    // Simulator / missing voice
  }
}

export async function stopScoreSpeech() {
  try {
    await Speech.stop()
  } catch {
    // ignore
  }
}
