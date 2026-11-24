import { createClient, isSupabaseConfigured } from "./client"
import {
  Item,
  Vendor,
  Customer,
  PurchaseEntry,
  Order,
  initialItems,
  initialVendors,
  initialCustomers,
  initialPurchases,
  initialExpenses,
  initialOrders,
} from "@/lib/mockData"
import {
  isDemoMode,
  ITEMS_STORAGE_KEY,
  VENDORS_STORAGE_KEY,
  CUSTOMERS_STORAGE_KEY,
  PURCHASES_STORAGE_KEY,
  EXPENSES_STORAGE_KEY,
  ORDERS_STORAGE_KEY,
} from "@/lib/data-management"

// --- ITEMS SERVICE ---
export async function fetchItems(): Promise<Item[]> {
  const isDemo = isDemoMode()
  if (isDemo) return initialItems

  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(ITEMS_STORAGE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch {
        // ignore
      }
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("items").select("*").order("name")
      if (!error && data && data.length > 0) {
        const mapped: Item[] = data.map((d) => ({
          id: d.id,
          name: d.name,
          category: d.category,
          currentPrice: parseFloat(d.current_price) || 0,
          unit: d.unit,
          status: d.status || "ACTIVE",
          vendorNames: d.vendor_names || [],
          notes: d.notes || "",
        }))
        if (typeof window !== "undefined") {
          localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(mapped))
        }
        return mapped
      }
    } catch (e) {
      console.warn("Supabase fetchItems error:", e)
    }
  }

  return []
}

export async function saveItemToDb(item: Item): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      await supabase.from("items").upsert({
        id: item.id.length > 20 ? item.id : undefined, // only pass if valid uuid
        name: item.name,
        category: item.category,
        current_price: item.currentPrice,
        unit: item.unit,
        status: item.status,
        vendor_names: item.vendorNames || [],
        notes: item.notes || "",
      })
    } catch (e) {
      console.warn("Supabase saveItem error:", e)
    }
  }
}

// --- VENDORS SERVICE ---
export async function fetchVendors(): Promise<Vendor[]> {
  const isDemo = isDemoMode()
  if (isDemo) return initialVendors

  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(VENDORS_STORAGE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch {
        // ignore
      }
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("vendors").select("*").order("name")
      if (!error && data && data.length > 0) {
        const mapped: Vendor[] = data.map((d) => ({
          id: d.id,
          name: d.name,
          code: d.code || "",
          materials: d.materials || [],
          contactName: d.contact_name || "",
          phone: d.phone || "",
          gstin: d.gstin || "",
          address: d.address || "",
          status: d.status || "ACTIVE",
          contacts: [],
        }))
        if (typeof window !== "undefined") {
          localStorage.setItem(VENDORS_STORAGE_KEY, JSON.stringify(mapped))
        }
        return mapped
      }
    } catch (e) {
      console.warn("Supabase fetchVendors error:", e)
    }
  }

  return []
}

export async function saveVendorToDb(vendor: Vendor): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      await supabase.from("vendors").upsert({
        id: vendor.id.length > 20 ? vendor.id : undefined,
        name: vendor.name,
        code: vendor.code || "",
        materials: vendor.materials || [],
        contact_name: vendor.contactName || (vendor.contacts?.[0]?.name ?? ""),
        phone: vendor.phone || (vendor.contacts?.[0]?.phone ?? ""),
        gstin: vendor.gstin || "",
        address: vendor.address || "",
        status: vendor.status || "ACTIVE",
      })
    } catch (e) {
      console.warn("Supabase saveVendor error:", e)
    }
  }
}

// --- PURCHASES SERVICE ---
export async function fetchPurchases(): Promise<PurchaseEntry[]> {
  const isDemo = isDemoMode()
  if (isDemo) return initialPurchases

  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(PURCHASES_STORAGE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch {
        // ignore
      }
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("purchases").select("*").order("purchase_date", { ascending: false })
      if (!error && data && data.length > 0) {
        const mapped: PurchaseEntry[] = data.map((d) => ({
          id: d.id,
          date: d.purchase_date,
          purchaseDate: d.purchase_date,
          monthGroup: d.month_group,
          itemName: d.item_name,
          lotNumber: d.lot_number || "",
          vendorName: d.vendor_name,
          quantity: parseFloat(d.quantity) || 0,
          unit: d.unit,
          rate: parseFloat(d.rate) || 0,
          total: parseFloat(d.total) || 0,
          remarks: d.remarks || "",
        }))
        if (typeof window !== "undefined") {
          localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(mapped))
        }
        return mapped
      }
    } catch (e) {
      console.warn("Supabase fetchPurchases error:", e)
    }
  }

  return []
}

export async function savePurchaseToDb(entry: PurchaseEntry): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      await supabase.from("purchases").upsert({
        id: entry.id.length > 20 ? entry.id : undefined,
        purchase_date: entry.purchaseDate || entry.date,
        month_group: entry.monthGroup || "March 2026",
        item_name: entry.itemName,
        lot_number: entry.lotNumber || "",
        vendor_name: entry.vendorName,
        quantity: entry.quantity,
        unit: entry.unit,
        rate: entry.rate,
        total: entry.total,
        remarks: entry.remarks || "",
      })
    } catch (e) {
      console.warn("Supabase savePurchase error:", e)
    }
  }
}

// --- EXPENSES SERVICE ---
export async function fetchExpenses(): Promise<any[]> {
  const isDemo = isDemoMode()
  if (isDemo) return initialExpenses

  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(EXPENSES_STORAGE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch {
        // ignore
      }
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false })
      if (!error && data && data.length > 0) {
        const mapped = data.map((d) => ({
          id: d.id,
          date: d.expense_date,
          expenseDate: d.expense_date,
          monthGroup: d.month_group,
          category: d.category,
          amount: parseFloat(d.amount) || 0,
          paymentMode: d.payment_mode || "Cash",
          payee: d.payee || "",
          description: d.description || "",
        }))
        if (typeof window !== "undefined") {
          localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(mapped))
        }
        return mapped
      }
    } catch (e) {
      console.warn("Supabase fetchExpenses error:", e)
    }
  }

  return []
}
