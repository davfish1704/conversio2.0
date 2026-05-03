import { APIRequestContext } from '@playwright/test'

export async function createBoard(request: APIRequestContext, name: string) {
  const res = await request.post('/api/boards', {
    data: { name },
  })
  const body = await res.json()
  return body.board ?? body
}

export async function deleteBoard(request: APIRequestContext, id: string) {
  await request.delete(`/api/boards/${id}`)
}

export async function createLead(
  request: APIRequestContext,
  boardId: string,
  data: { name: string; [key: string]: unknown }
) {
  const res = await request.post('/api/leads', {
    data: { boardId, ...data },
  })
  const body = await res.json()
  return body.lead ?? body
}

export async function cleanupAll(request: APIRequestContext) {
  const res = await request.get('/api/boards')
  if (!res.ok()) return
  const { boards } = await res.json()
  await Promise.all(
    (boards as { id: string; name: string }[])
      .filter((b) => b.name.startsWith('e2e-'))
      .map((b) => deleteBoard(request, b.id))
  )
}
