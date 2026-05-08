# BrainLab Audit — 2026-05-08

## Zusammenfassung

BrainLab ist auf allen vier Hauptfunktionen broken. Kein einziges CRUD-Feature funktioniert vollständig. Die Ursache ist eine klassische UI-API-Drift: das Frontend wurde nach einem Schema-Refactoring nicht synchron gehalten.

---

## Was broken ist (nach Schwere)

### KRITISCH — Vollständig broken, keine Funktion erreichbar

---

#### BUG-1: `savePrompts` schickt `PATCH`, API hat nur `PUT`
- **Datei**: `src/app/(dashboard)/boards/[id]/brain/page.tsx:124`
- **Code**: `method: "PATCH"`
- **API**: `src/app/api/boards/[id]/brain/route.ts` — nur `GET` und `PUT` implementiert
- **Symptom**: Jeder Klick auf "Alle Prompts speichern" → HTTP 405 Method Not Allowed
- **Alle 4 Prompts können nie gespeichert werden**

---

#### BUG-2: Documents — Feldname-Mismatch `title` vs `name`

**Frontend sendet:**
```ts
// page.tsx:147
body: JSON.stringify({ title: newDocTitle, content: newDocContent })
```
**Frontend zeigt an:**
```ts
// page.tsx:435
{doc.title}  // → undefined, weil API "name" zurückgibt
```
**API erwartet:**
```ts
// brain/documents/route.ts:55
const { name, content, category } = await req.json()
// name ist required → Prisma wirft PrismaClientValidationError
```
**Schema**: `BrainDocument.name String` (kein `title` Feld)

- **Symptom Add**: Dokument kann nie erstellt werden (Prisma required-field-Fehler)
- **Symptom List**: Titel der bestehenden Dokumente erscheint leer/undefined

---

#### BUG-3: Rules — Drei Feldname-Mismatches (`title`/`content`/`priority` vs `name`/`rule`/`severity`)

**Frontend sendet:**
```ts
// page.tsx:182
body: JSON.stringify({ title: newRuleTitle, content: newRuleContent, priority: newRulePriority })
```
**Frontend zeigt an:**
```ts
// page.tsx:515,525,509
{rule.title}    // → undefined
{rule.content}  // → undefined
rule.priority   // → undefined (Schema hat kein priority-Feld)
```
**API erwartet:**
```ts
// brain/rules/route.ts:55
const { name, rule, severity = "warning" } = await req.json()
// name und rule sind required → Prisma wirft Error
```
**Schema**: `BrainRule { name, rule, severity, isActive }` — **kein `priority`-Feld**

- **Symptom Add**: Regel kann nie erstellt werden
- **Symptom List**: Alle Felder undefined, Priority-Badges zeigen `P` ohne Zahl
- **Außerdem**: Das UI-Konzept `priority` (1–10) existiert im Schema überhaupt nicht

---

#### BUG-4: DELETE-Endpoints fehlen komplett für Documents, Rules, FAQs

Das Frontend ruft `DELETE` auf:
- `page.tsx:161` → `DELETE /api/boards/${id}/brain/documents`
- `page.tsx:199` → `DELETE /api/boards/${id}/brain/rules`
- `page.tsx:233` → `DELETE /api/boards/${id}/brain/faqs`

Die Routes implementieren nur `GET` und `POST`:
- `src/app/api/boards/[id]/brain/documents/route.ts` — kein `DELETE`
- `src/app/api/boards/[id]/brain/rules/route.ts` — kein `DELETE`
- `src/app/api/boards/[id]/brain/faqs/route.ts` — kein `DELETE`

- **Symptom**: Alle Delete-Buttons → HTTP 405, nichts kann gelöscht werden

---

### HOCH — Broken, aber seltener Pfad

---

#### BUG-5: Simulate-Button sendet keinen Body → JSON-Parse-Error

```ts
// page.tsx:372
fetch(`/api/boards/${id}/brain/simulate`, { method: "POST" })
// kein body, kein Content-Type
```

```ts
// simulate/route.ts:17
const body = await req.json()           // wirft SyntaxError bei leerem Body
const { message, state, mission } = body
```

Der Fehler landet im `catch` von `tool-engine.ts` → Response: `{ error: "KI nicht verfügbar: ..." }` mit Status 503.

- **Symptom**: Test-Simulation im Prompts-Tab schlägt immer fehl

---

#### BUG-6: Upsert bekommt rohen GET-Response inkl. `id`, `boardId`, `createdAt`

Das Frontend macht `setBrainData(data.brain || data)` — bei einem existierenden Board-Brain enthält `brainData` alle Prisma-Felder (`id`, `boardId`, `createdAt`, `updatedAt`). Diese werden beim Speichern mitgeschickt:

```ts
// route.ts:76–79
const brain = await prisma.boardBrain.upsert({
  update: data,        // data kann id, boardId, createdAt enthalten
  create: { ...data, boardId: params.id },
})
```

Prisma-Verhalten: Je nach Version silently ignored oder `PrismaClientValidationError` bei nicht-aktualisierbaren Feldern (`id`). Kann dazu führen, dass auch der PUT-Save (nach BUG-1-Fix) noch fehlschlägt.

---

### NIEDRIG — Inkonsistenz, kein harter Fehler

---

#### BUG-7: `defaultModel` Inkonsistenz

| Ort | Wert |
|-----|------|
| Schema-Default (`schema.prisma:454`) | `"dummy"` |
| GET-Fallback (`route.ts:42`) | `"conversio"` |
| Simulate-Fallback (`simulate/route.ts:35`) | `"dummy"` |

Neues Board ohne Brain bekommt `"conversio"` vom GET, aber das Schema und Simulate kennen nur `"dummy"`.

---

#### BUG-8: `channelSwitchTemplate` fehlt im GET-Fallback

GET-Fallback-Objekt (`route.ts:37–45`) enthält `channelSwitchTemplate` nicht. Für ein Board ohne Brain zeigt der Textarea-Default leer (korrekt), aber es gibt keine explizite `null`-Behandlung. Kein harter Fehler — die Textarea initialisiert mit `""`.

---

## Wo BrainLab korrekt funktioniert

- **FAQs Add + List**: Korrekt — Frontend sendet `{ question, answer }`, API erwartet `{ question, answer }`, Schema hat diese Felder. FAQs **können erstellt und angezeigt werden**.
- **Prompt-Builder Integration** (`src/lib/ai/prompt-builder.ts`, `tool-engine.ts`): Vollständig implementiert — Brain-Felder (`systemPrompt`, `stylePrompt`, `infoPrompt`, `rulePrompt`), Rules, FAQs und Documents fließen korrekt in den AI-Prompt ein.
- **channelSwitchTemplate im Tool** (`suggest-channel-switch.ts:81–89`): Wird korrekt aus der DB gelesen und in der Nachricht verwendet.

---

## Fix-Plan (priorisiert)

### Phase 1: < 30 Minuten — Alles läuft wieder

**Fix 1.1** — `PATCH` → `PUT` in `page.tsx:124`
```diff
- method: "PATCH",
+ method: "PUT",
```
Datei: `src/app/(dashboard)/boards/[id]/brain/page.tsx`

---

**Fix 1.2** — DELETE-Handler in alle 3 Sub-Routes hinzufügen
Je Route ~10 Zeilen:
```ts
// Beispiel für documents/route.ts:
export async function DELETE(req, { params }) {
  // Auth + Board-Check
  const { id: docId } = await req.json()
  await prisma.brainDocument.delete({ where: { id: docId } })
  return NextResponse.json({ ok: true })
}
```
Dateien:
- `src/app/api/boards/[id]/brain/documents/route.ts`
- `src/app/api/boards/[id]/brain/rules/route.ts`
- `src/app/api/boards/[id]/brain/faqs/route.ts`

---

**Fix 1.3** — Documents: Feldnamen im Frontend korrigieren
```diff
// page.tsx:147
- body: JSON.stringify({ title: newDocTitle, content: newDocContent })
+ body: JSON.stringify({ name: newDocTitle, content: newDocContent })

// page.tsx:22  (Interface)
- title: string
+ name: string

// page.tsx:435
- {doc.title}
+ {doc.name}
```

---

**Fix 1.4** — Rules: Feldnamen im Frontend korrigieren + `priority` droppen oder auf `severity` mappen

Einfachste Variante — `priority` entfernen, `severity` aus Name ableiten:
```diff
// page.tsx:182
- body: JSON.stringify({ title: newRuleTitle, content: newRuleContent, priority: newRulePriority })
+ body: JSON.stringify({ name: newRuleTitle, rule: newRuleContent })

// Interface (page.tsx:29–34):
- title: string; content: string; priority: number
+ name: string; rule: string; severity: string

// Display (page.tsx:515, 525):
- {rule.title}
+ {rule.name}
- {rule.content}
+ {rule.rule}
```
Priority-Badge ersetzen durch Severity-Badge (warning/error).

---

**Fix 1.5** — Simulate-Button: Minimal-Body mitschicken
```diff
// page.tsx:372–374
- fetch(`/api/boards/${id}/brain/simulate`, { method: "POST" })
+ fetch(`/api/boards/${id}/brain/simulate`, {
+   method: "POST",
+   headers: { "Content-Type": "application/json" },
+   body: JSON.stringify({ message: "Hallo" }),
+ })
```

---

**Fix 1.6** — Upsert: Nur erlaubte Felder durchlassen (verhindert BUG-6)
```ts
// route.ts PUT — vor dem upsert:
const { systemPrompt, stylePrompt, infoPrompt, rulePrompt, channelSwitchTemplate,
        defaultModel, temperature, maxTokens, language, tone } = await req.json()
const safeData = { systemPrompt, stylePrompt, infoPrompt, rulePrompt,
                   channelSwitchTemplate, defaultModel, temperature, maxTokens, language, tone }
```

---

### Phase 2: > 30 Minuten — Optionale Verbesserungen

**Fix 2.1** — `priority`-Feld zu `BrainRule`-Schema hinzufügen (wenn das UI-Konzept gewünscht ist)
→ Prisma-Migration nötig: `priority Int @default(5)`

**Fix 2.2** — `temperature`, `maxTokens`, `defaultModel`, `language`, `tone` in BrainLab-UI bearbeitbar machen

**Fix 2.3** — `defaultModel`-Wert konsistent setzen (Schema-Default → `"conversio"` oder GET-Fallback → `"dummy"`)

**Fix 2.4** — Bessere Simulate-UI: Modal oder Side-Panel mit echtem Nachrichten-Input statt Toast

---

## Übersicht: Was im UI existiert vs. was gespeichert wird vs. was im Prompt landet

| Feature | UI vorhanden | Speichern funktioniert | Im AI-Prompt |
|---------|-------------|----------------------|-------------|
| systemPrompt | ✅ | ❌ (PATCH statt PUT) | ✅ |
| stylePrompt | ✅ | ❌ (PATCH statt PUT) | ✅ |
| infoPrompt | ✅ | ❌ (PATCH statt PUT) | ✅ |
| rulePrompt | ✅ | ❌ (PATCH statt PUT) | ✅ |
| channelSwitchTemplate | ✅ | ❌ (PATCH statt PUT) | ✅ (im Tool) |
| Documents hinzufügen | ✅ | ❌ (Feldname-Fehler) | ✅ |
| Documents löschen | ✅ | ❌ (kein DELETE) | — |
| Rules hinzufügen | ✅ | ❌ (Feldname-Fehler) | ✅ |
| Rules löschen | ✅ | ❌ (kein DELETE) | — |
| FAQs hinzufügen | ✅ | ✅ | ✅ |
| FAQs löschen | ✅ | ❌ (kein DELETE) | — |
| Test-Simulation | ✅ | ❌ (kein Body) | — |
| priority (Rules) | ✅ | ❌ (Schema-Feld fehlt) | — |
