const store = new Map<string, string>()
const subscribers = new Set<() => void>()
let cached: Record<string, string> | null = null

export function setBreadcrumb(key: string, label: string) {
  if (store.get(key) === label) return
  store.set(key, label)
  cached = null // invalidate cache
  subscribers.forEach((fn) => fn())
}

export function getAllBreadcrumbs(): Record<string, string> {
  if (!cached) {
    cached = Object.fromEntries(store)
  }
  return cached
}

export function subscribe(fn: () => void) {
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}
