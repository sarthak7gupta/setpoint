import { useSyncExternalStore } from 'react'
import { AccessibilityInfo } from 'react-native'
let reduced = true
const listeners = new Set<() => void>()
let subscription: { remove: () => void } | undefined
function publish(value: boolean) { reduced = value; listeners.forEach(notify => notify()) }
function subscribe(notify: () => void) {
  listeners.add(notify)
  if (!subscription) {
    subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', publish)
    void AccessibilityInfo.isReduceMotionEnabled().then(publish).catch(() => {})
  }
  return () => {
    listeners.delete(notify)
    if (!listeners.size) { subscription?.remove(); subscription = undefined }
  }
}
export function useReducedMotion() { return useSyncExternalStore(subscribe, () => reduced, () => true) }
