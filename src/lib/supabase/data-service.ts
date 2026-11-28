import { createClient, isSupabaseConfigured } from "./client"
import {
  Item,
  Vendor,
  Customer,
  PurchaseEntry,
  ExpenseEntry,
  Order,
  Recipe,
} from "@/lib/mockData"
import {
  ITEMS_STORAGE_KEY,
  VENDORS_STORAGE_KEY,
  CUSTOMERS_STORAGE_KEY,
  PURCHASES_STORAGE_KEY,
  EXPENSES_STORAGE_KEY,
  ORDERS_STORAGE_KEY,
  RECIPES_STORAGE_KEY,
} from "@/lib/data-management"

export function isValidUUID(id?: string): boolean {
  if (!id) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

function toISODate(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString().split("T")[0]
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.slice(0, 10)
  const parts = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (parts) {
    return `${parts[3]}-${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}`
  }
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0]
  }
  return new Date().toISOString().split("T")[0]
}

// Helper to get local cache
function getLocalCache<T>(key: string): T[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  return []
}

// Helper to set local cache
function setLocalCache<T>(key: string, data: T[]) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch {}
  }
}

// --- ITEMS SERVICE ---
export async function fetchItems(): Promise<Item[]> {
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
        setLocalCache(ITEMS_STORAGE_KEY, mapped)
        return mapped
      }
    } catch (e) {
      console.warn("Supabase fetchItems error:", e)
    }
  }

  return getLocalCache<Item>(ITEMS_STORAGE_KEY)
}

export async function saveItemToDb(item: Item): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const row = {
        name: item.name,
        category: item.category,
        current_price: item.currentPrice,
        unit: item.unit,
        status: item.status,
        vendor_names: item.vendorNames || [],
        notes: item.notes || "",
      }
      if (isValidUUID(item.id)) {
        await supabase.from("items").upsert({ id: item.id, ...row })
      } else {
        await supabase.from("items").insert(row)
      }
    } catch (e) {
      console.warn("Supabase saveItem error:", e)
    }
  }
}

// --- VENDORS SERVICE ---
export async function fetchVendors(): Promise<Vendor[]> {
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
        setLocalCache(VENDORS_STORAGE_KEY, mapped)
        return mapped
      }
    } catch (e) {
      console.warn("Supabase fetchVendors error:", e)
    }
  }

  return getLocalCache<Vendor>(VENDORS_STORAGE_KEY)
}

export async function saveVendorToDb(vendor: Vendor): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const row = {
        name: vendor.name,
        code: vendor.code || "",
        materials: vendor.materials || [],
        contact_name: vendor.contactName || (vendor.contacts?.[0]?.name ?? ""),
        phone: vendor.phone || (vendor.contacts?.[0]?.phone ?? ""),
        gstin: vendor.gstin || "",
        address: vendor.address || "",
        status: vendor.status || "ACTIVE",
      }
      if (isValidUUID(vendor.id)) {
        await supabase.from("vendors").upsert({ id: vendor.id, ...row })
      } else {
        await supabase.from("vendors").insert(row)
      }
    } catch (e) {
      console.warn("Supabase saveVendor error:", e)
    }
  }
}

// --- CUSTOMERS SERVICE ---
export async function fetchCustomers(): Promise<Customer[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("customers").select("*").order("name")
      if (!error && data && data.length > 0) {
        const mapped: Customer[] = data.map((d) => ({
          id: d.id,
          customerNumber: d.customer_number || "",
          name: d.name,
          mobile: d.mobile || "",
          type: d.type || "Retail",
          address: d.address || "",
          gstin: d.gstin || "",
          reference: d.reference || "",
          status: d.status || "ACTIVE",
        }))
        setLocalCache(CUSTOMERS_STORAGE_KEY, mapped)
        return mapped
      }
    } catch (e) {
      console.warn("Supabase fetchCustomers error:", e)
    }
  }

  return getLocalCache<Customer>(CUSTOMERS_STORAGE_KEY)
}

export async function saveCustomerToDb(customer: Customer): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const row = {
        customer_number: customer.customerNumber,
        name: customer.name,
        mobile: customer.mobile,
        type: customer.type,
        address: customer.address,
        gstin: customer.gstin,
        reference: customer.reference,
        status: customer.status,
      }
      if (isValidUUID(customer.id)) {
        await supabase.from("customers").upsert({ id: customer.id, ...row })
      } else {
        await supabase.from("customers").insert(row)
      }
    } catch (e) {
      console.warn("Supabase saveCustomer error:", e)
    }
  }
}

// --- PURCHASES SERVICE ---
export async function fetchPurchases(): Promise<PurchaseEntry[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const allRows: any[] = []
      let from = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from("purchases")
          .select("*")
          .order("purchase_date", { ascending: false })
          .range(from, from + pageSize - 1)

        if (error || !data) break
        allRows.push(...data)
        if (data.length < pageSize) {
          hasMore = false
        } else {
          from += pageSize
        }
      }

      if (allRows.length > 0) {
        const mapped: PurchaseEntry[] = allRows.map((d) => ({
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
        setLocalCache(PURCHASES_STORAGE_KEY, mapped)
        return mapped
      } else {
        // Cloud returned 0 rows. Check if this browser has local purchases to sync up!
        const local = getLocalCache<PurchaseEntry>(PURCHASES_STORAGE_KEY)
        if (local.length > 0) {
          // Auto push local purchases to Supabase so other devices see them
          savePurchasesToDb(local).catch((err) => console.warn("Auto-sync local purchases error:", err))
          return local
        }
      }
    } catch (e) {
      console.warn("Supabase fetchPurchases error:", e)
    }
  }

  return getLocalCache<PurchaseEntry>(PURCHASES_STORAGE_KEY)
}

export async function savePurchaseToDb(entry: PurchaseEntry): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const row = {
        purchase_date: toISODate(entry.purchaseDate || entry.date),
        month_group: entry.monthGroup || "Active",
        item_name: entry.itemName,
        lot_number: entry.lotNumber || "",
        vendor_name: entry.vendorName,
        quantity: entry.quantity,
        unit: entry.unit,
        rate: entry.rate,
        total: entry.total,
        remarks: entry.remarks || "",
      }
      if (isValidUUID(entry.id)) {
        await supabase.from("purchases").upsert({ id: entry.id, ...row })
      } else {
        await supabase.from("purchases").insert(row)
      }
    } catch (e) {
      console.warn("Supabase savePurchase error:", e)
    }
  }
}

export async function savePurchasesToDb(entries: PurchaseEntry[]): Promise<void> {
  if (isSupabaseConfigured() && entries.length > 0) {
    try {
      const supabase = createClient()
      const chunkSize = 100

      // Split into updates (with valid UUID) and inserts (new records without UUID)
      const withUUID: any[] = []
      const withoutUUID: any[] = []

      entries.forEach((entry) => {
        const payload = {
          purchase_date: toISODate(entry.purchaseDate || entry.date),
          month_group: entry.monthGroup || "Active",
          item_name: entry.itemName,
          lot_number: entry.lotNumber || "",
          vendor_name: entry.vendorName,
          quantity: entry.quantity,
          unit: entry.unit,
          rate: entry.rate,
          total: entry.total,
          remarks: entry.remarks || "",
        }
        if (isValidUUID(entry.id)) {
          withUUID.push({ id: entry.id, ...payload })
        } else {
          withoutUUID.push(payload)
        }
      })

      // Batch upsert existing UUID records
      for (let i = 0; i < withUUID.length; i += chunkSize) {
        const chunk = withUUID.slice(i, i + chunkSize)
        const { error } = await supabase.from("purchases").upsert(chunk)
        if (error) console.warn("Supabase purchases upsert error:", error)
      }

      // Batch insert new records (let Postgres gen_random_uuid() generate ids)
      for (let i = 0; i < withoutUUID.length; i += chunkSize) {
        const chunk = withoutUUID.slice(i, i + chunkSize)
        const { error } = await supabase.from("purchases").insert(chunk)
        if (error) console.warn("Supabase purchases insert error:", error)
      }
    } catch (e) {
      console.warn("Supabase savePurchasesToDb error:", e)
    }
  }
}

export async function deletePurchasesFromDb(ids: string[]): Promise<void> {
  if (isSupabaseConfigured() && ids.length > 0) {
    try {
      const supabase = createClient()
      const validIds = ids.filter(isValidUUID)
      if (validIds.length > 0) {
        await supabase.from("purchases").delete().in("id", validIds)
      }
    } catch (e) {
      console.warn("Supabase deletePurchases error:", e)
    }
  }
}

// --- EXPENSES SERVICE ---
export async function fetchExpenses(): Promise<ExpenseEntry[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const allRows: any[] = []
      let from = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from("expenses")
          .select("*")
          .order("expense_date", { ascending: false })
          .range(from, from + pageSize - 1)

        if (error || !data) break
        allRows.push(...data)
        if (data.length < pageSize) {
          hasMore = false
        } else {
          from += pageSize
        }
      }

      if (allRows.length > 0) {
        const mapped: ExpenseEntry[] = allRows.map((d) => ({
          id: d.id,
          voucherNumber: d.voucher_number || "",
          date: d.expense_date,
          expenseDate: d.expense_date,
          monthGroup: d.month_group,
          category: d.category,
          title: d.title || d.description || "Expense",
          payeeName: d.payee || "",
          amount: parseFloat(d.amount) || 0,
          paymentMode: d.payment_mode || "Cash",
          status: (d.status as any) || "PAID",
          billInvoiceNo: d.bill_invoice_no || "",
          remarks: d.description || "",
        }))
        setLocalCache(EXPENSES_STORAGE_KEY, mapped)
        return mapped
      } else {
        const local = getLocalCache<ExpenseEntry>(EXPENSES_STORAGE_KEY)
        if (local.length > 0) {
          saveExpensesToDb(local).catch((err) => console.warn("Auto-sync local expenses error:", err))
          return local
        }
      }
    } catch (e) {
      console.warn("Supabase fetchExpenses error:", e)
    }
  }

  return getLocalCache<ExpenseEntry>(EXPENSES_STORAGE_KEY)
}

export async function saveExpenseToDb(entry: ExpenseEntry): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const row = {
        voucher_number: entry.voucherNumber || "",
        expense_date: toISODate(entry.expenseDate || entry.date),
        month_group: entry.monthGroup || "Active",
        category: entry.category,
        title: entry.title,
        payee: entry.payeeName || "",
        amount: entry.amount,
        payment_mode: entry.paymentMode || "Cash",
        status: entry.status || "PAID",
        bill_invoice_no: entry.billInvoiceNo || "",
        description: entry.remarks || "",
      }
      if (isValidUUID(entry.id)) {
        await supabase.from("expenses").upsert({ id: entry.id, ...row })
      } else {
        await supabase.from("expenses").insert(row)
      }
    } catch (e) {
      console.warn("Supabase saveExpense error:", e)
    }
  }
}

export async function saveExpensesToDb(entries: ExpenseEntry[]): Promise<void> {
  if (isSupabaseConfigured() && entries.length > 0) {
    try {
      const supabase = createClient()
      const chunkSize = 100

      const withUUID: any[] = []
      const withoutUUID: any[] = []

      entries.forEach((entry) => {
        const payload = {
          voucher_number: entry.voucherNumber || "",
          expense_date: toISODate(entry.expenseDate || entry.date),
          month_group: entry.monthGroup || "Active",
          category: entry.category,
          title: entry.title,
          payee: entry.payeeName || "",
          amount: entry.amount,
          payment_mode: entry.paymentMode || "Cash",
          status: entry.status || "PAID",
          bill_invoice_no: entry.billInvoiceNo || "",
          description: entry.remarks || "",
        }
        if (isValidUUID(entry.id)) {
          withUUID.push({ id: entry.id, ...payload })
        } else {
          withoutUUID.push(payload)
        }
      })

      for (let i = 0; i < withUUID.length; i += chunkSize) {
        const chunk = withUUID.slice(i, i + chunkSize)
        const { error } = await supabase.from("expenses").upsert(chunk)
        if (error) console.warn("Supabase expenses upsert error:", error)
      }

      for (let i = 0; i < withoutUUID.length; i += chunkSize) {
        const chunk = withoutUUID.slice(i, i + chunkSize)
        const { error } = await supabase.from("expenses").insert(chunk)
        if (error) console.warn("Supabase expenses insert error:", error)
      }
    } catch (e) {
      console.warn("Supabase saveExpensesToDb error:", e)
    }
  }
}

export async function deleteExpensesFromDb(ids: string[]): Promise<void> {
  if (isSupabaseConfigured() && ids.length > 0) {
    try {
      const supabase = createClient()
      const validIds = ids.filter(isValidUUID)
      if (validIds.length > 0) {
        await supabase.from("expenses").delete().in("id", validIds)
      }
    } catch (e) {
      console.warn("Supabase deleteExpenses error:", e)
    }
  }
}

// --- RECIPES SERVICE ---
export async function fetchRecipes(): Promise<Recipe[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("recipes").select("*").order("name")
      if (!error && data && data.length > 0) {
        const mapped: Recipe[] = data.map((d) => ({
          id: d.id,
          name: d.name,
          outputYield: parseFloat(d.output_yield) || 0,
          outputUnit: d.output_unit || "Kg",
          additionalExpense: parseFloat(d.additional_expense) || 0,
          additionalCostName: d.additional_cost_name || "",
          calculatedCostPerKg: parseFloat(d.calculated_cost_per_kg) || 0,
          videoUrl: d.video_url || "",
          ingredients: d.ingredients || [],
          processSteps: d.process_steps || [],
          equipment: d.equipment || [],
        }))
        setLocalCache(RECIPES_STORAGE_KEY, mapped)
        return mapped
      }
    } catch {}
  }

  return getLocalCache<Recipe>(RECIPES_STORAGE_KEY)
}

export async function saveRecipeToDb(recipe: Recipe): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const row = {
        name: recipe.name,
        output_yield: recipe.outputYield,
        output_unit: recipe.outputUnit,
        additional_expense: recipe.additionalExpense,
        additional_cost_name: recipe.additionalCostName,
        calculated_cost_per_kg: recipe.calculatedCostPerKg,
        video_url: recipe.videoUrl,
        ingredients: recipe.ingredients,
        process_steps: recipe.processSteps,
        equipment: recipe.equipment,
      }
      if (isValidUUID(recipe.id)) {
        await supabase.from("recipes").upsert({ id: recipe.id, ...row })
      } else {
        await supabase.from("recipes").insert(row)
      }
    } catch {}
  }
}

// --- ORDERS SERVICE ---
export async function fetchOrders(): Promise<Order[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("orders").select("*")
      if (!error && data && data.length > 0) {
        const mapped: Order[] = data.map((d: any) => ({
          id: d.id,
          orderNumber: d.order_number,
          orderDate: d.order_date,
          deliveryDate: d.delivery_date,
          customerName: d.customer_name,
          customerType: d.customer_type || "Retail",
          contactNumber: d.contact_number || "",
          address: d.address || "",
          items: d.items || [],
          additionalChargeName: d.additional_charge_name,
          additionalChargeAmount: d.additional_charge_amount,
          totalAmount: d.total_amount || 0,
          paymentReceived: d.payment_received || 0,
          installments: d.installments || [],
          status: d.status || "Pending",
          notes: d.notes,
        }))
        setLocalCache(ORDERS_STORAGE_KEY, mapped)
        return mapped
      }
    } catch {}
  }

  return getLocalCache<Order>(ORDERS_STORAGE_KEY)
}

export async function saveOrderToDb(order: Order): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const row = {
        order_number: order.orderNumber,
        order_date: order.orderDate,
        delivery_date: order.deliveryDate,
        customer_name: order.customerName,
        customer_type: order.customerType,
        contact_number: order.contactNumber,
        address: order.address,
        items: order.items,
        additional_charge_name: order.additionalChargeName,
        additional_charge_amount: order.additionalChargeAmount,
        total_amount: order.totalAmount,
        payment_received: order.paymentReceived,
        installments: order.installments,
        status: order.status,
        notes: order.notes,
      }
      if (isValidUUID(order.id)) {
        await supabase.from("orders").upsert({ id: order.id, ...row })
      } else {
        await supabase.from("orders").insert(row)
      }
    } catch {}
  }
}
