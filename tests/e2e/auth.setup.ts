import { test as setup, expect } from '@playwright/test'

const authFile = 'tests/e2e/.auth/user.json'

setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL ?? 'e2e@test.local'
  const password = process.env.TEST_USER_PASSWORD ?? 'TestPass123!'

  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('input[type="submit"], button[type="submit"]').click()

  await page.waitForURL('**/dashboard', { timeout: 15_000 })
  await expect(page).toHaveURL(/dashboard/)

  await page.context().storageState({ path: authFile })
})
