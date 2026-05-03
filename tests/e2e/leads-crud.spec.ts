import { test, expect } from '@playwright/test'
import { createBoard, cleanupAll } from './helpers/api'

let boardId: string
let leadId: string | null = null

test.beforeAll(async ({ request }) => {
  const board = await createBoard(request, `e2e-leads-${Date.now()}`)
  boardId = board.id

  // State anlegen damit Pipeline-View Leads anzeigt (ohne State zeigt EmptyStateCard)
  // StateType enum: AI | MESSAGE | TEMPLATE | CONDITION | WAIT
  await request.post(`/api/boards/${boardId}/states`, {
    data: { name: 'Neu', type: 'MESSAGE', orderIndex: 0 },
  })
})

test.afterAll(async ({ request }) => {
  await cleanupAll(request)
})

test.describe('Leads CRUD', () => {
  test('create lead manually via API (Import-Modal)', async ({ page }) => {
    await page.goto(`/boards/${boardId}`)
    await page.waitForLoadState('networkidle')

    // Import-Button: t('common.import') = "Importieren" (DE) / "Import" (EN)
    const importBtn = page.getByRole('button', { name: /importieren|import/i }).first()
    await expect(importBtn).toBeVisible({ timeout: 8_000 })
    await importBtn.click()

    // Modal erscheint
    const modal = page.locator('.fixed.inset-0')
    await expect(modal).toBeVisible({ timeout: 5_000 })

    // Tab "API / Manuell" (DE) / "API / Manual" (EN) anklicken — dort ist das Name-Input
    await page.getByRole('button', { name: /api.*manuell|api.*manual/i }).click()
    await page.waitForTimeout(300)

    // Name-Input: placeholder="Max Mustermann"
    const nameInput = page.locator('input[placeholder*="Mustermann"]').first()
    await expect(nameInput).toBeVisible({ timeout: 5_000 })
    await nameInput.fill('e2e-Test-Lead')

    // t('leadImport.saveLead') = "Lead speichern" (DE) / "Save Lead" (EN)
    await page.getByRole('button', { name: /lead speichern|save lead/i }).click()
    await page.waitForTimeout(1500)

    // Lead via API prüfen
    const res = await page.request.get(`/api/crm/pipeline?boardId=${boardId}`)
    if (res.ok()) {
      const data = await res.json()
      const allLeads = [
        ...(data.unassignedLeads ?? []),
        ...(data.states ?? []).flatMap((s: { leads: { name: string; id: string }[] }) => s.leads),
      ]
      const found = allLeads.find((l: { name: string }) => l.name === 'e2e-Test-Lead')
      expect(found).toBeDefined()
      leadId = found?.id ?? null
    }
  })

  test('open lead drawer', async ({ page }) => {
    test.skip(!leadId, 'Lead wurde nicht erstellt')

    await page.goto(`/boards/${boardId}`)
    await page.waitForLoadState('networkidle')

    // Lead-Card im PipelineBoard anklicken — sucht nach dem Namen
    const card = page.getByText('e2e-Test-Lead').first()
    await expect(card).toBeVisible({ timeout: 10_000 })
    await card.click()

    // LeadDrawer ist als fixed/overlay implementiert — kein role="dialog"
    // Warten bis der Drawer-Inhalt sichtbar ist (Name des Leads erscheint im Drawer-Header)
    await expect(page.getByText('e2e-Test-Lead').nth(1)).toBeVisible({ timeout: 5_000 })
  })

  test('edit lead notes', async ({ page }) => {
    test.skip(!leadId, 'Lead wurde nicht erstellt')

    await page.goto(`/boards/${boardId}`)
    await page.waitForLoadState('networkidle')

    const card = page.getByText('e2e-Test-Lead').first()
    await expect(card).toBeVisible({ timeout: 10_000 })
    await card.click()

    // Notes-Textarea im Drawer — warten bis Drawer offen
    await page.waitForTimeout(500)
    const notesArea = page.locator('textarea').first()
    await expect(notesArea).toBeVisible({ timeout: 5_000 })
    await notesArea.fill('e2e-notiz-persisted')
    await notesArea.blur()

    // Speicherung abwarten (Debounce)
    await page.waitForTimeout(2000)

    // Page reload und Notes-Persistenz prüfen
    await page.reload()
    await page.waitForLoadState('networkidle')

    const cardAgain = page.getByText('e2e-Test-Lead').first()
    await expect(cardAgain).toBeVisible({ timeout: 10_000 })
    await cardAgain.click()
    await page.waitForTimeout(500)

    const savedNotes = page.locator('textarea').first()
    await expect(savedNotes).toHaveValue(/e2e-notiz-persisted/, { timeout: 5_000 })
  })
})
