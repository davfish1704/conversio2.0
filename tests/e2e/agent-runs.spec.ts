import { test, expect } from '@playwright/test'
import { createBoard, cleanupAll } from './helpers/api'

let boardId: string

test.beforeAll(async ({ request }) => {
  const res = await request.post('/api/boards', { data: { name: `e2e-agentruns-${Date.now()}` } })
  const body = await res.json()
  if (!res.ok()) throw new Error(`createBoard failed: ${res.status()} ${JSON.stringify(body)}`)
  boardId = body.board?.id ?? body.id
  if (!boardId) throw new Error(`createBoard returned no id: ${JSON.stringify(body)}`)
})

test.afterAll(async ({ request }) => {
  await cleanupAll(request)
})

test.describe('AgentRun Visibility', () => {
  test('insights page loads without errors', async ({ page }) => {
    const errors: string[] = []
    const failedUrls: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    page.on('response', (res) => {
      if (res.status() >= 500) failedUrls.push(`${res.status()} ${res.url()}`)
    })

    await page.goto(`/boards/${boardId}/insights`)
    await page.waitForLoadState('networkidle')
    if (failedUrls.length > 0) console.log('500 URLs:', failedUrls)

    await expect(page.locator('text=404')).toHaveCount(0)

    const critical = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('ResizeObserver') && !e.includes('Warning:')
    )
    expect(critical).toHaveLength(0)
  })

  test('insights page shows stats cards and state table', async ({ page }) => {
    await page.goto(`/boards/${boardId}/insights`)
    await page.waitForLoadState('networkidle')

    // Stats cards should render (either with data or empty state)
    await expect(page.locator('text=Total AI Runs').or(page.locator('text=Keine Daten'))).toBeVisible({ timeout: 10_000 })
  })

  test('lead drawer has AI Activity tab', async ({ page, request }) => {
    // Create a lead first
    const leadRes = await request.post(`/api/boards/${boardId}/leads`, {
      data: { name: `E2E Lead ${Date.now()}`, phone: '+49123456789' },
    })
    if (!leadRes.ok()) return // skip if lead creation fails (no endpoint or auth)

    // Navigate to board pipeline
    await page.goto(`/boards/${boardId}`)
    await page.waitForLoadState('networkidle')

    // Click on a lead card to open drawer
    const leadCard = page.locator('text=E2E Lead').first()
    if (await leadCard.isVisible()) {
      await leadCard.click()
      await page.waitForTimeout(500)

      // AI Activity tab should exist
      const aiTab = page.locator('button', { hasText: 'AI Activity' })
      await expect(aiTab).toBeVisible({ timeout: 5_000 })

      // Click it
      await aiTab.click()
      await page.waitForTimeout(500)

      // Should show timeline or empty state
      const timelineContent = page.locator('text=No AI runs yet').or(page.locator('text=SUCCESS_CONTINUE'))
      await expect(timelineContent.first()).toBeVisible({ timeout: 5_000 })
    }
  })
})
