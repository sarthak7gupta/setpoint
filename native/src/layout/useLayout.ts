import { useWindowDimensions } from 'react-native'
import { computeLayout } from '../../../shared/layout/computeLayout'

export type { LayoutMetrics } from '../../../shared/layout/computeLayout'
export { computeLayout, LARGE_SHORTEST, TABLET_SHORTEST } from '../../../shared/layout/computeLayout'

export function useLayout() {
  const { width, height, fontScale } = useWindowDimensions()
  return computeLayout({ width, height, fontScale })
}
