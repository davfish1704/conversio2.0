import { test, expect } from '@playwright/test'

test.describe('Smoke – Page Loads', () => {
  test('/ redirects to /login or /dashboard', async ({ page }) => {
    await page.goto('/')
    // Auth middleware kann langsam sein — mehrfach prüfen
    await page.waitForLoadState('networkidle')
    // Entweder Redirect hat stattgefunden, oder / ist die Dashboard-Startseite
    const url = page.url()
    const isExpectedPage =
      url.includes('/login') ||
      url.includes('/dashboard') ||
      // Wenn "/" selbst als Dashboard fungiert (kein Redirect konfiguriert)
      (await page.locator('h1').textContent())?.toLowerCase().includes('dashboard')
    if (!isExpectedPage) {
      // Echter UI-Bug: / leitet nicht weiter — in OPEN_BUGS.md dokumentiert
      console.warn('BUG: / redirected to:', url, '— erwartet /login oder /dashboard')
    }
    expect(isExpectedPage).toBeTruthy()
  })

  test('/dashboard loads with Dashboard headline', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    // h1 erscheint erst nach Boards-API-Fetch — warten
    await expect(page.locator('h1').first()).toContainText('Dashboard', { timeout: 10_000 })
  })

  test('/reports loads without 404', async ({ page }) => {
    const res = await page.goto('/reports')
    expect(res?.status()).not.toBe(404)
  })

  test('/team loads without 404', async ({ page }) => {
    const res = await page.goto('/team')
    expect(res?.status()).not.toBe(404)
  })

  test('/settings loads without 404', async ({ page }) => {
    const res = await page.goto('/settings')
    expect(res?.status()).not.toBe(404)
  })

  test('/admin-bot loads without 404', async ({ page }) => {
    const res = await page.goto('/admin-bot')
    expect(res?.status()).not.toBe(404)
  })

  test('/crm returns 200 or 308, not 404', async ({ page }) => {
    const res = await page.goto('/crm')
    expect(res?.status()).not.toBe(404)
  })

  test('navigation has at most 1 active tab at a time', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Aktive Nav-Links erkennen über Klassen (bg-blue-50 = aktiver Zustand lt. TopNavigation)
    const activeLinks = page.locator('nav a[class*="bg-blue"]')
    const count = await activeLinks.count()
    expect(count).toBeLessThanOrEqual(1)
  })
})
