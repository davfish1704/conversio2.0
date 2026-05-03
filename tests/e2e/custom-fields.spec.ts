import { test, expect } from '@playwright/test'
import { createBoard, deleteBoard, cleanupAll } from './helpers/api'

let boardId: string

test.beforeAll(async ({ request }) => {
  const board = await createBoard(request, `e2e-fields-${Date.now()}`)
  boardId = board.id
})

test.afterAll(async ({ request }) => {
  await cleanupAll(request)
})

test.describe('Custom Fields', () => {
  test('add text field', async ({ page }) => {
    await page.goto(`/boards/${boardId}/settings`)
    await page.waitForLoadState('networkidle')

    // "Feld hinzufügen" Sektion ist am Ende der Seite — scrollen
    const labelInput = page.locator('input[placeholder*="Label"]').first()
    await labelInput.scrollIntoViewIfNeeded()
    await expect(labelInput).toBeVisible({ timeout: 8_000 })
    await labelInput.fill('company')

    // Typ ist schon "text" per default — "+ Hinzufügen" Button (neben dem input)
    await page.getByRole('button', { name: /hinzufügen/i }).click()
    await page.waitForTimeout(1000)

    // Feld in der Liste (kann mehrfach auftauchen — erstes Element reicht)
    await expect(page.getByText('company').first()).toBeVisible()
  })

  test('add select field with options', async ({ page }) => {
    await page.goto(`/boards/${boardId}/settings`)
    await page.waitForLoadState('networkidle')

    // Wenn customFields > 0: "+ Feld hinzufügen" Sektion ist ausgeblendet (nur bei 0 Felder sichtbar)
    // Wir löschen erst alle Felder via API, dann fügen neu hinzu
    await page.request.put(`/api/boards/${boardId}/custom-fields`, {
      data: { fields: [] },
    })
    await page.reload()
    await page.waitForLoadState('networkidle')

    const labelInput = page.locator('input[placeholder*="Label"]').first()
    await labelInput.scrollIntoViewIfNeeded()
    await expect(labelInput).toBeVisible({ timeout: 8_000 })
    await labelInput.fill('status')

    const typeSelect = page.locator('select').first()
    await typeSelect.selectOption('select')

    await page.getByRole('button', { name: /hinzufügen/i }).click()
    await page.waitForTimeout(1000)

    await expect(page.getByText('status').first()).toBeVisible()
  })

  test('delete field', async ({ page }) => {
    await page.goto(`/boards/${boardId}/settings`)
    await page.waitForLoadState('networkidle')

    // "Entfernen"-Button neben einem bestehenden Feld (nur vorhanden wenn Felder existieren)
    const entfernenBtn = page.getByRole('button', { name: /entfernen/i }).first()
    const entfernenCount = await entfernenBtn.count()
    if (entfernenCount === 0) {
      test.skip(true, 'Keine Custom Fields vorhanden — Test übersprungen')
      return
    }

    await entfernenBtn.scrollIntoViewIfNeeded()
    await entfernenBtn.click()
    await page.waitForTimeout(1000)

    // Gespeichert — die Anzahl der Felder hat sich reduziert
    const remainingEntfernen = await page.getByRole('button', { name: /entfernen/i }).count()
    expect(remainingEntfernen).toBeLessThan(entfernenCount)
  })
})
