# Open Bugs

Discovered during E2E test setup (2026-05-02). Tests are intentionally left **RED** for these bugs — expectations are not softened.

---

## BUG-1: DELETE /api/boards/[id] — P2011 Null constraint violation

**Status:** Fix written, migration pending  
**Severity:** Critical — board deletion always fails  
**Test:** `board-crud.spec.ts` → "delete board"

**Root cause:**  
`0_init` migration created `conversations_boardId_fkey` as `ON DELETE SET NULL`.  
`v3_finalize` made `conversations.boardId` NOT NULL but never updated the FK action.  
When deleting a board, Postgres attempts to SET NULL on a NOT NULL column → P2011.

**Fix:**  
- Schema: `prisma/schema.prisma` line 297 — added `onDelete: Cascade` to `Conversation.board`  
- Migration: `prisma/migrations/20260502130000_fix_conversation_board_cascade/migration.sql`

**To apply:**
```bash
npx prisma migrate deploy
# or apply the SQL directly on Supabase
```

---

## BUG-2: / root — no redirect for authenticated users

**Status:** Open  
**Severity:** Low — UX only  
**Test:** `smoke.spec.ts` → "/ redirects to /login or /dashboard" (soft check, logs warning)

**Root cause:**  
`middleware.ts` does not redirect authenticated users from `/` to `/dashboard`.  
Unauthenticated users are redirected to `/login`, but authenticated users land on `/` which renders nothing useful.

**Repro:** Log in, navigate to `/`. Page renders without a redirect.

**Expected:** Redirect to `/dashboard`.

---

## BUG-3: POST /api/leads/:id/invite-channel — 500 on invalid channelId

**Status:** Open  
**Severity:** Medium — missing input validation  
**Test:** `channels.spec.ts` → "invite-channel API rejects invalid channel gracefully"

**Root cause:**  
`POST /api/leads/[id]/invite-channel` does not validate that the `channelId` belongs to the board or exists at all.  
Passing a non-existent `channelId` causes an unhandled Prisma error → 500.

**Expected:** 400 or 404 with a clear error message.

---

## BUG-4 (REGRESSION): CRM › Pipeline button — navigation on same-page click

**Status:** Mitigated in UI, regression test present  
**Severity:** Low  
**Test:** `pipeline.spec.ts` → "pipeline button 'CRM > Pipeline' navigiert korrekt (BUG 4 Regression)"

**Context:**  
Prior to commit `604acfb`, clicking the Pipeline button in the CRM dropdown while already on `/dashboard` caused no visible reaction — URL didn't change, no modal appeared.  
The test asserts that at least one of: URL change, modal open, or board content is visible.  
If this regression reappears, the test will fail.
