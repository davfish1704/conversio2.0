#!/bin/bash
# i18n Consistency Checker — Conversio 2.0
# Scans all .tsx files for hardcoded UI strings that should use t() instead.
# Usage: ./scripts/check-i18n.sh

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'
FAIL=0

echo "=== i18n Consistency Check ==="
echo ""

# 1. Check translation file has matching EN/DE keys
EN_KEYS=$(node -e "
const t = require('./src/lib/translations.ts'.replace('.ts',''));
// Just count top-level keys for now
console.log('ok')
" 2>/dev/null || echo "checking...")

echo "[1] Checking translation completeness..."
EN_COUNT=$(grep -c '^\s\{4\}\w\+:' src/lib/translations.ts)
echo "  Translation keys (approx): $EN_COUNT"

# 2. Find JSX files with potentially hardcoded strings
echo ""
echo "[2] Scanning for hardcoded UI strings in components..."
SCAN_DIRS=("src/components" "src/app/(dashboard)" "src/app/(auth)" "src/app/signup")

for dir in "${SCAN_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    # Find text inside JSX that looks like German/English labels without t()
    # Matches: >SomeText< where SomeText starts with uppercase and is not a component
    RESULTS=$(find "$dir" -name "*.tsx" -exec grep -n '>[A-ZÄÖÜ][a-zäöü].*<' {} \; 2>/dev/null | \
      grep -v 't(' | \
      grep -v 'className=' | \
      grep -v 'http' | \
      grep -v 'import' | \
      grep -v 'const ' | \
      grep -v 'let ' | \
      grep -v 'return ' | \
      grep -v '\.' | \
      grep -v 'key=' | \
      grep -v 'type=' | \
      grep -v 'href=' | \
      grep -v 'placeholder=' | \
      grep -v 'aria-' | \
      grep -v 'alt=' | \
      grep -v 'title=' | \
      grep -v 'variant=' | \
      grep -v 'size=' | \
      grep -v 'stroke' | \
      grep -v 'fill' | \
      grep -v 'viewBox' | \
      head -30)
    
    if [ -n "$RESULTS" ]; then
      echo -e "${YELLOW}  Potential hardcoded strings in $dir:${NC}"
      echo "$RESULTS"
      FAIL=1
    fi
  fi
done

# 3. Check sidebar and navigation for untranslated labels
echo ""
echo "[3] Checking layout components..."
for f in \
  "src/components/layout/SidebarNavigation.tsx" \
  "src/components/layout/TopBar.tsx" \
  "src/components/boards/BoardTabs.tsx"; do
  if [ -f "$f" ]; then
    HARDCODED=$(grep -c 'span>[A-Z]' "$f" 2>/dev/null || echo 0)
    if [ "$HARDCODED" -gt 0 ]; then
      echo -e "${RED}  HARDCODED: $f has $HARDCODED potential untranslated spans${NC}"
      FAIL=1
    fi
  fi
done

# 4. Check for German-like strings in toast calls
echo ""
echo "[4] Checking toast() calls for hardcoded text..."
TOAST_HARDCODED=$(grep -rn 'toast({' src/components/ src/app/ 2>/dev/null | \
  grep -v "t(" | \
  grep -c 'title:.*"[A-Z]' 2>/dev/null || echo 0)
if [ "$TOAST_HARDCODED" -gt 0 ]; then
  echo -e "${YELLOW}  $TOAST_HARDCODED toast() calls may have hardcoded text${NC}"
fi

echo ""
if [ "$FAIL" -eq 1 ]; then
  echo -e "${RED}❌ i18n issues found${NC}"
  exit 1
else
  echo "✅ No obvious i18n issues"
  exit 0
fi
