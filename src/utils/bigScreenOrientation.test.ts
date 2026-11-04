import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  enterBigScreenLandscape,
  exitBigScreenLandscape,
  isPortraitOrientation,
} from './bigScreenOrientation'

describe('bigScreenOrientation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('requests fullscreen then locks landscape', async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    const lock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => null,
    })
    const root = { requestFullscreen } as unknown as HTMLElement
    vi.stubGlobal('screen', { orientation: { lock, unlock: vi.fn() } })

    await enterBigScreenLandscape(root)

    expect(requestFullscreen).toHaveBeenCalled()
    expect(lock).toHaveBeenCalledWith('landscape')
  })

  it('swallows fullscreen and lock failures', async () => {
    const requestFullscreen = vi.fn().mockRejectedValue(new Error('denied'))
    const lock = vi.fn().mockRejectedValue(new Error('unsupported'))
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => null,
    })
    vi.stubGlobal('screen', { orientation: { lock } })

    await expect(
      enterBigScreenLandscape({ requestFullscreen } as unknown as HTMLElement),
    ).resolves.toBeUndefined()
  })

  it('unlocks orientation and exits fullscreen', async () => {
    const unlock = vi.fn().mockResolvedValue(undefined)
    const exitFullscreen = vi.fn().mockResolvedValue(undefined)
    const fakeFs = document.createElement('div')
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fakeFs,
    })
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: exitFullscreen,
    })
    vi.stubGlobal('screen', { orientation: { unlock } })

    await exitBigScreenLandscape()

    expect(unlock).toHaveBeenCalled()
    expect(exitFullscreen).toHaveBeenCalled()
  })

  it('isPortraitOrientation follows matchMedia', () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true })
    vi.stubGlobal('matchMedia', matchMedia)
    // isPortraitOrientation uses window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: matchMedia,
    })
    expect(isPortraitOrientation()).toBe(true)
  })
})
