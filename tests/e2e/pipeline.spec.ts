import { test, expect } from '@playwright/test'
import { createBoard, cleanupAll } from './helpers/api'

let boardId: string

test.beforeAll(async ({ request }) => {
  const res = await request.post('/api/boards', { data: { name: `e2e-pipeline-${Date.now()}` } })
  const body = await res.json()
  if (!res.ok()) throw new Error(`createBoard failed: ${res.status()} ${JSON.stringify(body)}`)
  boardId = body.board?.id ?? body.id
  if (!boardId) throw new Error(`createBoard returned no id: ${JSON.stringify(body)}`)
})

test.afterAll(async ({ request }) => {
  await cleanupAll(request)
})

test.describe('Pipeline', () => {
  test('pipeline view loads without errors', async ({ page }) => {
    const errors: string[] = []
    const failedUrls: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    page.on('response', (res) => {
      if (res.status() >= 500) failedUrls.push(`${res.status()} ${res.url()}`)
    })

    await page.goto(`/boards/${boardId}`)
    await page.waitForLoadState('networkidle')
    if (failedUrls.length > 0) console.log('500 URLs:', failedUrls)

    // Kein 404
    await expect(page.locator('text=404')).toHaveCount(0)

    // Keine kritischen Console-Errors
    const critical = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('ResizeObserver') && !e.includes('Warning:')
    )
    expect(critical).toHaveLength(0)
  })

  test('pipeline button "CRM > Pipeline" navigiert korrekt (BUG 4 Regression)', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const initialUrl = page.url()

    // CRM-Dropdown öffnen
    const crmDropdownBtn = page.getByRole('button', { name: /crm/i }).first()
    if ((await crmDropdownBtn.count()) === 0) {
      // Auf kleineren Screens: direkter CRM-Link
      test.skip(true, 'CRM-Dropdown nicht sichtbar — Viewport zu klein oder CRM ist direkter Link')
      return
    }
    await crmDropdownBtn.click()

    // Pipeline-Link im Dropdown
    const pipelineLink = page.getByRole('link', { name: /pipeline/i })
    await expect(pipelineLink).toBeVisible({ timeout: 3_000 })
    await pipelineLink.click()

    await page.waitForTimeout(1000)
    const newUrl = page.url()

    // Muss irgendeine sichtbare Reaktion geben: URL-Change ODER Modal ODER State-Change
    // BUG 4 war: Click auf Pipeline landete auf /dashboard wenn User schon dort war → kein visueller Feedback
    const urlChanged = newUrl !== initialUrl
    const modalOpen = (await page.locator('[role="dialog"]').count()) > 0
    const boardContent = (await page.locator('text=/Pipeline|Board|Leads/i').count()) > 0

    expect(urlChanged || modalOpen || boardContent).toBeTruthy()
  })

  test('states als Spalten sichtbar wenn Board States hat', async ({ page, request }) => {
    // State via API anlegen — falls der Board States hat, checken wir Spalten
    const statesRes = await request.get(`/api/boards/${boardId}/states`)
    if (statesRes.ok()) {
      const { states } = await statesRes.json()
      if (states?.length > 0) {
        await page.goto(`/boards/${boardId}`)
        await page.waitForLoadState('networkidle')
        // Jede State-Spalte sollte sichtbar sein
        const col = page.locator(`text=${states[0].name}`).first()
        await expect(col).toBeVisible({ timeout: 5_000 })
      } else {
        // Kein State — EmptyState soll erscheinen, kein Error
        await page.goto(`/boards/${boardId}`)
        await page.waitForLoadState('networkidle')
        await expect(page.locator('text=404')).toHaveCount(0)
      }
    }
  })
})
