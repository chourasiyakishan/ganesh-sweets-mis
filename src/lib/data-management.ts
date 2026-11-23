import {
  initialItems,
  initialVendors,
  initialCustomers,
  initialPurchases,
  initialExpenses,
  initialOrders,
  initialRecipes,
} from "./mockData"

export const DEMO_MODE_KEY = "ganesh_sweets_demo_mode"
export const PURCHASES_STORAGE_KEY = "ganesh_sweets_purchases"
export const EXPENSES_STORAGE_KEY = "ganesh_sweets_expenses_v1"
export const ITEMS_STORAGE_KEY = "ganesh_sweets_items_v1"
export const VENDORS_STORAGE_KEY = "ganesh_sweets_vendors_v1"
export const CUSTOMERS_STORAGE_KEY = "ganesh_sweets_customers_v1"
export const ORDERS_STORAGE_KEY = "ganesh_sweets_orders_v1"
export const RECIPES_STORAGE_KEY = "ganesh_sweets_recipes_v1"

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return true
  const stored = localStorage.getItem(DEMO_MODE_KEY)
  if (stored === null) return true // Default to true until user clicks 'Start Fresh'
  return stored === "true"
}

export function setDemoMode(enabled: boolean) {
  if (typeof window === "undefined") return
  localStorage.setItem(DEMO_MODE_KEY, enabled ? "true" : "false")
  window.dispatchEvent(new Event("demo-mode-changed"))
}

export function clearAllDemoData() {
  if (typeof window === "undefined") return

  // Set Demo mode to OFF (Live Real Business Data Mode)
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
  if (typeof window === "undefined") return

  localStorage.setItem(DEMO_MODE_KEY, "true")

  localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(initialPurchases))
  localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(initialExpenses))
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(initialOrders))
  localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(initialCustomers))
  localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(initialItems))
  localStorage.setItem(VENDORS_STORAGE_KEY, JSON.stringify(initialVendors))
  localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(initialRecipes))

  window.dispatchEvent(new Event("data-restored"))
  window.dispatchEvent(new Event("purchases-updated"))
  window.dispatchEvent(new Event("expenses-updated"))
  window.dispatchEvent(new Event("items-updated"))
  window.dispatchEvent(new Event("vendors-updated"))
  window.dispatchEvent(new Event("customers-updated"))
  window.dispatchEvent(new Event("orders-updated"))
  window.dispatchEvent(new Event("recipes-updated"))
}

export function loadData<T>(storageKey: string, initialFallback: T[]): T[] {
  if (typeof window === "undefined") return initialFallback
  try {
    const demo = isDemoMode()
    const stored = localStorage.getItem(storageKey)

    if (stored !== null) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        return parsed
      }
    }

    // If no stored value exists yet:
    if (demo) {
      localStorage.setItem(storageKey, JSON.stringify(initialFallback))
      return initialFallback
    } else {
      localStorage.setItem(storageKey, JSON.stringify([]))
      return []
    }
  } catch (e) {
    console.error(`Error loading data for ${storageKey}:`, e)
    return isDemoMode() ? initialFallback : []
  }
}
