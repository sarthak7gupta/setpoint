import { expect, it } from 'vitest'
import { commonSettings, createSettingsStore } from './settings'

it('serializes disjoint edits without dropping either setting', async () => {
  let disk = { ...commonSettings }
  const store = createSettingsStore(
    commonSettings,
    async () => ({ ...disk }),
    async (next) => {
      disk = next
    },
  )
  await Promise.all([
    store.saveSettings({ theme: 'usOpen' }),
    store.saveSettings({ defaultWeather: 'Sunny' }),
  ])
  expect(disk.theme).toBe('usOpen')
  expect(disk.defaultWeather).toBe('Sunny')
  await expect(store.saveSettings({ defaultTiebreakPoints: -1 })).rejects.toThrow()
  await store.saveSettings({ quietScoring: true })
  expect(disk.quietScoring).toBe(true)
})
