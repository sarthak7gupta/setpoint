/** Point / overlay haptic feedback. No-ops when the setting is off. */
import * as Haptics from 'expo-haptics'

export async function hapticImpact(enabled: boolean, style: 'light' | 'medium' | 'heavy' = 'medium') {
  if (!enabled) return
  const map = {
    light: Haptics.ImpactFeedbackStyle.Light,
    medium: Haptics.ImpactFeedbackStyle.Medium,
    heavy: Haptics.ImpactFeedbackStyle.Heavy,
  }
  try {
    await Haptics.impactAsync(map[style])
  } catch {
    // Simulator / unsupported hardware
  }
}

export async function hapticSuccess(enabled: boolean) {
  if (!enabled) return
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  } catch {
    // ignore
  }
}

export async function hapticWarning(enabled: boolean) {
  if (!enabled) return
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
  } catch {
    // ignore
  }
}

export async function hapticSelection(enabled: boolean) {
  if (!enabled) return
  try {
    await Haptics.selectionAsync()
  } catch {
    // ignore
  }
}
