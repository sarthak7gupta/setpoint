/**
 * Big-screen landscape on mobile web.
 *
 * `screen.orientation.lock` usually needs fullscreen and a user gesture, and
 * is unavailable on many iOS browsers. Call enter/exit from the tap handler;
 * CSS force-landscape covers devices that stay in portrait.
 */

type OrientationLockApi = {
  lock?: (orientation: string) => Promise<void>
  unlock?: () => void | Promise<void>
}

function orientationApi(): OrientationLockApi | undefined {
  if (typeof screen === 'undefined') return undefined
  return screen.orientation as unknown as OrientationLockApi | undefined
}

export async function enterBigScreenLandscape(
  root: HTMLElement = document.documentElement,
): Promise<void> {
  try {
    if (!document.fullscreenElement && typeof root.requestFullscreen === 'function') {
      await root.requestFullscreen()
    }
  } catch {
    // Safari / unsigned PWAs often reject fullscreen; CSS fallback still helps.
  }

  try {
    await orientationApi()?.lock?.('landscape')
  } catch {
    // Expected on iOS and when the PWA was installed with portrait-only.
  }
}

export async function exitBigScreenLandscape(): Promise<void> {
  try {
    await orientationApi()?.unlock?.()
  } catch {
    /* ignore */
  }

  try {
    if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
      await document.exitFullscreen()
    }
  } catch {
    /* ignore */
  }
}

export function isPortraitOrientation(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia('(orientation: portrait)').matches
}
