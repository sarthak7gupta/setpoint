export interface LayoutMetrics {
  width: number
  height: number
  shortest: number
  longest: number
  fontScale: number
  isLandscape: boolean
  isTablet: boolean
  isLargeTablet: boolean
  isWide: boolean
  twoPane: boolean
  padH: number
  contentMaxWidth: number
  statColumns: number
  historyColumns: number
  themeColumns: number
  pointButtonMinHeight: number
  brandSize: number
  titleSize: number
}

/** Android sw600dp-style tablet; also covers unfolded inner displays. */
export const TABLET_SHORTEST = 600
export const LARGE_SHORTEST = 840

/**
 * Pure layout math shared by web and native. Pass viewport size from
 * `useWindowDimensions` / `window` resize observers.
 */
export function computeLayout(args: {
  width: number
  height: number
  fontScale?: number
}): LayoutMetrics {
  const width = Math.max(0, args.width)
  const height = Math.max(0, args.height)
  const fontScale = args.fontScale ?? 1
  const shortest = Math.min(width, height)
  const longest = Math.max(width, height)
  const isLandscape = width > height
  const isTablet = shortest >= TABLET_SHORTEST
  const isLargeTablet = shortest >= LARGE_SHORTEST
  const isWide = width >= 840
  const twoPane = isWide && (isTablet || width >= 960)
  const padH = isTablet ? 28 : isLandscape ? 16 : 18
  const contentMaxWidth = isLandscape
    ? Math.min(width, isTablet || isWide ? 1200 : 920)
    : isTablet
      ? 760
      : 560
  const statColumns = width >= 1100 ? 4 : width >= 720 ? 3 : 2
  const historyColumns = width >= 1100 ? 3 : width >= 720 ? 2 : 1
  const themeColumns = width >= 720 ? 2 : 1
  const pointButtonMinHeight = isTablet ? 72 : isLandscape ? 56 : 64

  return {
    width,
    height,
    shortest,
    longest,
    fontScale,
    isLandscape,
    isTablet,
    isLargeTablet,
    isWide,
    twoPane,
    padH,
    contentMaxWidth,
    statColumns,
    historyColumns,
    themeColumns,
    pointButtonMinHeight,
    brandSize: isTablet ? 72 : 56,
    titleSize: isTablet ? 44 : 38,
  }
}
