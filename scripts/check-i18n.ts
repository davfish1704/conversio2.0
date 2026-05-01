#!/usr/bin/env npx ts-node
/**
 * Build-time i18n key checker.
 * Scans *.tsx and *.ts under src/ for t('x.y') or t("x.y") calls,
 * then verifies each key exists in both translations.en and translations.de.
 * Exits 1 if any key is missing.
 *
 * Usage: npx ts-node scripts/check-i18n.ts
 */

import * as fs from "fs"
import * as path from "path"
import { execSync } from "child_process"

// Collect all t('...') and t("...") calls across src/
const srcDir = path.join(__dirname, "..", "src")

function walkFiles(dir: string, exts: string[]): string[] {
  const results: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory() && !entry.name.startsWith(".")) {
      results.push(...walkFiles(full, exts))
    } else if (entry.isFile() && exts.some(e => entry.name.endsWith(e))) {
      results.push(full)
    }
  }
  return results
}

const KEY_RE = /\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]\s*\)/g

const files = walkFiles(srcDir, [".tsx", ".ts"])
const usedKeys = new Set<string>()

for (const file of files) {
  const content = fs.readFileSync(file, "utf8")
  for (const match of content.matchAll(KEY_RE)) {
    usedKeys.add(match[1])
  }
}

// Dynamically load translations to avoid circular imports
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { translations } = require(path.join(__dirname, "..", "src", "lib", "translations"))

function getNestedValue(obj: Record<string, unknown>, keyPath: string): boolean {
  const parts = keyPath.split(".")
  let current: unknown = obj
  for (const part of parts) {
    if (current == null || typeof current !== "object") return false
    current = (current as Record<string, unknown>)[part]
  }
  return current !== undefined
}

let missing = 0
for (const key of Array.from(usedKeys).sort()) {
  const inEn = getNestedValue(translations.en, key)
  const inDe = getNestedValue(translations.de, key)
  if (!inEn || !inDe) {
    console.error(`MISSING i18n key: "${key}"${!inEn ? " [en]" : ""}${!inDe ? " [de]" : ""}`)
    missing++
  }
}

if (missing > 0) {
  console.error(`\n${missing} missing i18n key(s). Add them to src/lib/translations.ts`)
  process.exit(1)
} else {
  console.log(`✓ All ${usedKeys.size} i18n keys present in both en and de.`)
}
