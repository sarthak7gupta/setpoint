import { expect, test } from '@playwright/test'

// Diagnostic evidence, not a hardware-dependent timing gate in shared CI.
test('records a cold scorer launch', async ({ page }, testInfo) => {
  await page.goto('/app')
  await expect(page.getByTestId('guided-tour')).toBeVisible()
  const measurement = await page.evaluate(() => ({
    readyMs: Math.round(performance.now()),
    scriptBytes: performance
      .getEntriesByType('resource')
      .filter((entry) => (entry as PerformanceResourceTiming).initiatorType === 'script')
      .reduce((sum, entry) => sum + (entry as PerformanceResourceTiming).decodedBodySize, 0),
  }))
  console.info(`Cold launch (${testInfo.project.name}): ${JSON.stringify(measurement)}`)
  await testInfo.attach('cold-launch', {
    body: JSON.stringify(measurement),
    contentType: 'application/json',
  })
})
