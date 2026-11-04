/**
 * Optional bridge to Apple Watch / Wear OS via `@rn-libs/react-native-wearables`.
 * Missing native module (Expo Go) → all calls no-op / return false.
 */
import { requireOptionalNativeModule } from 'expo'

type WearableMessage = Record<string, unknown>

type WearablesApi = {
  sendMessage: (message: WearableMessage) => Promise<void>
  updateApplicationContext: (context: WearableMessage) => Promise<void>
  isPaired: () => Promise<boolean>
  isReachable: () => Promise<boolean>
  isWatchAppInstalled: () => Promise<boolean>
  onMessageReceived: (listener: (message: WearableMessage) => void) => () => void
}

let cached: WearablesApi | null | undefined

function loadWearables(): WearablesApi | null {
  if (cached !== undefined) return cached
  try {
    // Module registers as ReactNativeWearables (TurboModule). Probe before import.
    const native = requireOptionalNativeModule('Wearables')
    if (!native) {
      cached = null
      return null
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('@rn-libs/react-native-wearables') as WearablesApi
    return cached
  } catch {
    cached = null
    return null
  }
}

export function wristBridgeAvailable(): boolean {
  return loadWearables() != null
}

export async function pushWristBoard(message: WearableMessage): Promise<boolean> {
  const api = loadWearables()
  if (!api) return false
  try {
    await api.updateApplicationContext(message)
  } catch {
    // Context can fail if unpaired; still try interactive send below.
  }
  try {
    await api.sendMessage(message)
    return true
  } catch {
    return false
  }
}

export function subscribeWristMessages(
  listener: (message: WearableMessage) => void,
): () => void {
  const api = loadWearables()
  if (!api) return () => {}
  return api.onMessageReceived(listener)
}

export async function wristReachable(): Promise<boolean> {
  const api = loadWearables()
  if (!api) return false
  try {
    return await api.isReachable()
  } catch {
    return false
  }
}

export async function wristPaired(): Promise<boolean> {
  const api = loadWearables()
  if (!api) return false
  try {
    return await api.isPaired()
  } catch {
    return false
  }
}
