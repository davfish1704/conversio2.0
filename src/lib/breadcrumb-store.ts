/**
 * Module-level breadcrumb store.
 * Connects page components to TopBar without React Context.
 * - Pages call `setBreadcrumb(boardId, boardName)` when data loads
 * - TopBar calls `getBreadcrumb(id)` to resolve a path segment
 * - No extra fetches, no provider, no hydration flicker
 */

const store = new Map<string, string>()

const subscribers = new Set<() => void>()

export function setBreadcrumb(key: string, label: string) {
  if (store.get(key) === label) return
  store.set(key, label)
  subscribers.forEach((fn) => fn())
}

export function getBreadcrumb(key: string): string | undefined {
  return store.get(key)
}

export function getAllBreadcrumbs(): Record<string, string> {
  return Object.fromEntries(store)
}

export function subscribe(fn: () => void) {
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}
