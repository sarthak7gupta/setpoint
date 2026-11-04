import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { expect, test } from '@playwright/test'

// Serve the real production build through an isolated origin, changing only the
// SW bytes to simulate a deployment. No edits to dist or shared test state.
test('a deployed worker waits while a match tab is open', async ({ browser }) => {
  let generation = 1
  const server = createServer(async (request, response) => {
    try {
      const upstream = await fetch(`http://127.0.0.1:4180${request.url}`)
      response.statusCode = upstream.status
      response.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'text/plain')
      response.setHeader('Cache-Control', 'no-store')
      const bytes = Buffer.from(await upstream.arrayBuffer())
      response.end(
        request.url === '/sw.js'
          ? Buffer.concat([bytes, Buffer.from(`\n// deployment ${generation}\n`)])
          : bytes,
      )
    } catch {
      response.writeHead(502).end()
    }
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const context = await browser.newContext()
  try {
    const page = await context.newPage()
    await page.goto(`${origin}/new`)
    await page.getByTestId('quick-start').click()
    await page.getByTestId('overlay-skip').click()
    await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible()
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
    })
    await page.reload()
    await page.getByTestId('point-a').click()
    await expect(page.getByTestId('points-a')).toHaveText('15')
    await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible()
    let navigations = 0
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) navigations++
    })
    generation = 2
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.ready).update()
    })
    await expect
      .poll(() =>
        page.evaluate(
          async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state,
        ),
      )
      .toBe('installed')
    await expect(page.getByTestId('points-a')).toHaveText('15')
    await page.getByTestId('point-b').click()
    await expect(page.getByTestId('points-b')).toHaveText('15')
    await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible()
    expect(navigations).toBe(0)
    const matchUrl = page.url()
    await page.close()
    const next = await context.newPage()
    await next.goto(matchUrl)
    await expect(next.getByTestId('points-a')).toHaveText('15')
    await expect(next.getByTestId('points-b')).toHaveText('15')
    await expect
      .poll(() =>
        next.evaluate(
          async () => (await navigator.serviceWorker.getRegistration())?.waiting ?? null,
        ),
      )
      .toBe(null)
  } finally {
    await context.close()
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
  }
})
