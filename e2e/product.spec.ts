import { expect, type Page, test } from '@playwright/test'

async function startMatch(page: Page) {
  await page.goto('/new')
  await page.getByTestId('player-name-0').fill('Alex')
  await page.getByTestId('player-name-1').fill('Jamie')
  await page.getByTestId('quick-start').click()
  await expect(page).toHaveURL(/\/match\//)
  await page.getByTestId('overlay-skip').click()
  await expect(page.getByTestId('point-a')).toBeEnabled()
}

async function saved(page: Page) {
  await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible()
}

async function noHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
}

test('scores, undoes, restores offline, and contains keyboard focus in dialogs', async ({
  page,
  context,
}) => {
  await startMatch(page)
  await page.getByTestId('point-a').click()
  await expect(page.getByTestId('points-a')).toHaveText('15')
  await saved(page)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByTestId('points-a')).toHaveText('0')
  await page.getByTestId('point-b').click()
  await saved(page)
  await page.getByTestId('pause-match').click()
  const dialog = page.getByRole('dialog', { name: 'Paused', exact: true })
  await expect(dialog).toBeVisible()
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press(i % 2 ? 'Shift+Tab' : 'Tab')
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByTestId('pause-match')).toBeFocused()
  await saved(page)
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  // The shell and route assets must actually be available without a network.
  await page.reload()
  await expect(page.getByTestId('points-b')).toHaveText('15')
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByTestId('points-b')).toHaveText('15')
  await page.getByTestId('point-a').click()
  await saved(page)
  await page.reload()
  await expect(page.getByTestId('points-a')).toHaveText('15')
  await noHorizontalOverflow(page)
  // Lazy route chunks must be precached even if never visited online.
  await page.goto('/profiles')
  await expect(page.getByRole('heading', { name: /Player Profiles|Profiles/ })).toBeVisible()
  await page.goto('/settings')
  await expect(page.getByRole('button', { name: 'Wimbledon', exact: true })).toBeVisible()
})

test('theme changes persist and fit the viewport', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Tactical Clipboard', exact: true }).click()
  await page.getByRole('button', { name: 'Roland Garros', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'rolandGarros')
  await noHorizontalOverflow(page)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'rolandGarros')
  await expect(page.locator('html')).toHaveAttribute('data-style', 'clipboard')
  await noHorizontalOverflow(page)
  await page.goto('/new')
  await expect(page.getByTestId('quick-start')).toBeVisible()
  await noHorizontalOverflow(page)
})

test('a failed route chunk offers a recoverable reload', async ({ page }) => {
  await page.route('**/assets/NewMatch-*.js', (route) => route.abort())
  await page.goto('/new')
  await expect(page.getByRole('alert')).toContainText('Could not load this screen')
  await page.unroute('**/assets/NewMatch-*.js')
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.getByTestId('quick-start')).toBeVisible()
})
