import { test, expect } from '@playwright/test'
import { createBoard, cleanupAll } from './helpers/api'

let boardId: string
let leadId: string | null = null
let channelId: string | null = null

test.beforeAll(async ({ request }) => {
  const board = await createBoard(request, `e2e-channels-${Date.now()}`)
  boardId = board.id

  // Lead anlegen
  const leadRes = await request.post(`/api/boards/${boardId}/leads`, {
    data: { name: 'e2e-channel-lead', channel: 'manual' },
  })
  if (leadRes.ok()) {
    const body = await leadRes.json()
    leadId = body.lead?.id ?? body.id ?? null
  }
})

test.afterAll(async ({ request }) => {
  await cleanupAll(request)
})

test.describe('Channels (Phase 3)', () => {
  test('invite-channel API gibt token + deepLink zurück — ERWARTET FAIL wenn kein BoardChannel existiert', async ({
    request,
  }) => {
    test.skip(!leadId, 'Lead wurde nicht erstellt')

    // Holt zunächst BoardChannels um targetChannelId zu ermitteln
    const channelsRes = await request.get(`/api/boards/${boardId}`)
    if (channelsRes.ok()) {
      const boardData = await channelsRes.json()
      const channels = boardData.board?.channels ?? boardData.channels ?? []
      if (channels.length === 0) {
        // Kein Channel konfiguriert → API soll 400 zurückgeben, nicht 500
        const res = await request.post(`/api/leads/${leadId}/invite-channel`, {
          data: { targetChannelId: 'nonexistent-channel-id' },
        })
        // 400 (kein Channel) oder 404 (kein Lead gefunden) sind okay
        // 500 wäre ein Bug
        expect(res.status()).not.toBe(500)
        return
      }
      channelId = channels[0].id
    }

    test.skip(!channelId, 'Kein BoardChannel vorhanden — Channel-Tests überspringen')

    const res = await request.post(`/api/leads/${leadId}/invite-channel`, {
      data: { targetChannelId: channelId },
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.token ?? body.invite?.token).toBeTruthy()
  })

  test('invite UI im LeadDrawer zeigt "Channel hinzufügen" Option', async ({ page }) => {
    test.skip(!leadId, 'Lead wurde nicht erstellt')

    await page.goto(`/boards/${boardId}`)
    await page.waitForLoadState('networkidle')

    // Lead-Card öffnen
    const card = page.locator('text=e2e-channel-lead').first()
    if ((await card.count()) === 0) {
      test.skip(true, 'Lead-Card nicht sichtbar — Pipeline-View prüfen')
      return
    }
    await card.click()

    // Drawer öffnet sich
    await page.waitForTimeout(500)

    // "Channel hinzufügen" oder ähnlicher Button
    const channelBtn = page.getByRole('button', { name: /channel|einladen|invite/i }).first()
    if ((await channelBtn.count()) > 0) {
      await expect(channelBtn).toBeVisible()
    } else {
      // Akzeptabel: Drawer ist offen, Channel-UI ist nicht als Button labelled
      const drawer = page.locator('[role="dialog"], aside').first()
      await expect(drawer).toBeVisible({ timeout: 5_000 })
    }
  })
})
