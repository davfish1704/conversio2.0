import { test, expect } from '@playwright/test'
import { cleanupAll, deleteBoard } from './helpers/api'

let createdBoardId: string | null = null
const boardName = `e2e-board-${Date.now()}`

test.afterAll(async ({ request }) => {
  await cleanupAll(request)
})

test.describe('Board CRUD', () => {
  test('create board', async ({ page, request }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Modal öffnen (Text kommt aus t('dashboard.newBoard') = "Neues Board" / "New Board")
    await page.getByRole('button', { name: /neues board|new board/i }).click()

    // Warten bis das Modal sichtbar ist
    const modal = page.locator('.fixed.inset-0')
    await expect(modal).toBeVisible({ timeout: 5_000 })

    // Name-Input ausfüllen
    const nameInput = modal.locator('input[type="text"]').first()
    await expect(nameInput).toBeVisible()
    await nameInput.fill(boardName)

    // Submit via Enter (zuverlässiger als Button-Click bei modalen Formularen)
    await nameInput.press('Enter')

    // Modal schließt sich nach Erfolg
    await expect(modal).toBeHidden({ timeout: 10_000 })

    // Board via API prüfen
    const res = await request.get('/api/boards')
    expect(res.ok()).toBeTruthy()
    const { boards } = await res.json()
    const created = boards.find((b: { name: string; id: string }) => b.name === boardName)
    expect(created).toBeDefined()
    createdBoardId = created?.id ?? null
  })

  test('navigate to board', async ({ page }) => {
    // Braucht createdBoardId aus vorherigem Test
    test.skip(!createdBoardId, 'Board wurde nicht erstellt')

    await page.goto(`/boards/${createdBoardId}`)
    await page.waitForLoadState('networkidle')

    // Kein 404
    const title = await page.title()
    expect(title).not.toContain('404')

    // Keine unbehandelten JS-Fehler in der Console
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.waitForTimeout(1000)
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('ResizeObserver')
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('delete board', async ({ page, request }) => {
    test.skip(!createdBoardId, 'Board wurde nicht erstellt')

    await page.goto(`/boards/${createdBoardId}/settings`)
    await page.waitForLoadState('networkidle')

    // Delete-Button klicken
    await page.getByRole('button', { name: /löschen|delete board/i }).click()
    // Confirm-Dialog erscheint
    await expect(page.locator('text=/löschen|delete/i').last()).toBeVisible()
    await page.getByRole('button', { name: /^löschen$|^delete$/i }).last().click()

    // Redirect zurück zu dashboard
    await page.waitForURL('**/dashboard', { timeout: 10_000 })

    // Board nicht mehr in der API
    const res = await request.get('/api/boards')
    const { boards } = await res.json()
    const stillExists = boards.find((b: { id: string }) => b.id === createdBoardId)
    expect(stillExists).toBeUndefined()
    createdBoardId = null
  })
})
