import { useSyncExternalStore } from 'react'
import { computeLayout, type LayoutMetrics } from '../../shared/layout/computeLayout'

export type { LayoutMetrics } from '../../shared/layout/computeLayout'
export { computeLayout, LARGE_SHORTEST, TABLET_SHORTEST } from '../../shared/layout/computeLayout'

const SERVER_SNAPSHOT = computeLayout({ width: 390, height: 844 })

let cached: LayoutMetrics = SERVER_SNAPSHOT
let cachedW = -1
let cachedH = -1

function subscribe(onStoreChange: () => void) {
  window.addEventListener('resize', onStoreChange)
  return () => window.removeEventListener('resize', onStoreChange)
}

function getSnapshot() {
  const width = window.innerWidth
  const height = window.innerHeight
  if (cachedW === width && cachedH === height) return cached
  cachedW = width
  cachedH = height
  cached = computeLayout({ width, height })
  return cached
}

function getServerSnapshot() {
  return SERVER_SNAPSHOT
}

export function useLayout() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
