export const DEMO_MODE_KEY = "ganesh_sweets_demo_mode"
export const PURCHASES_STORAGE_KEY = "ganesh_sweets_purchases"
export const EXPENSES_STORAGE_KEY = "ganesh_sweets_expenses_v1"
export const ITEMS_STORAGE_KEY = "ganesh_sweets_items_v1"
export const VENDORS_STORAGE_KEY = "ganesh_sweets_vendors_v1"
export const CUSTOMERS_STORAGE_KEY = "ganesh_sweets_customers_v1"
export const ORDERS_STORAGE_KEY = "ganesh_sweets_orders_v1"
export const RECIPES_STORAGE_KEY = "ganesh_sweets_recipes_v1"

// Demo mode permanently disabled — app operates strictly with live/fresh business data
export function isDemoMode(): boolean {
  return false
}

export function setDemoMode(enabled: boolean) {
  if (typeof window === "undefined") return
  localStorage.setItem(DEMO_MODE_KEY, "false")
  window.dispatchEvent(new Event("demo-mode-changed"))
}

export function clearAllDemoData() {
  if (typeof window === "undefined") return

  localStorage.setItem(DEMO_MODE_KEY, "false")

  // Set all business ledgers to empty arrays
  localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify([]))
  localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify([]))
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([]))
  localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify([]))
  localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify([]))
  localStorage.setItem(VENDORS_STORAGE_KEY, JSON.stringify([]))
  localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify([]))

  // Broadcast events across components and tabs
  window.dispatchEvent(new Event("data-cleared"))
  window.dispatchEvent(new Event("purchases-updated"))
  window.dispatchEvent(new Event("expenses-updated"))
  window.dispatchEvent(new Event("items-updated"))
  window.dispatchEvent(new Event("vendors-updated"))
  window.dispatchEvent(new Event("customers-updated"))
  window.dispatchEvent(new Event("orders-updated"))
  window.dispatchEvent(new Event("recipes-updated"))
}

export function restoreDemoData() {
  // Permanently disabled
}

export function ensureCleanStore() {
  if (typeof window === "undefined") return
  try {
    const PURGE_FLAG = "ganesh_sweets_mock_purged_v3"
    if (localStorage.getItem(PURGE_FLAG) !== "true") {
      clearAllDemoData()
      localStorage.setItem(PURGE_FLAG, "true")
    }
  } catch {}
}

export function loadData<T>(storageKey: string, initialFallback: T[] = []): T[] {
  if (typeof window === "undefined") return []
  try {
    ensureCleanStore()
    const stored = localStorage.getItem(storageKey)

    if (stored !== null) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        return parsed
      }
    }

    localStorage.setItem(storageKey, JSON.stringify([]))
    return []
  } catch (e) {
    console.error(`Error loading data for ${storageKey}:`, e)
    return []
  }
}
