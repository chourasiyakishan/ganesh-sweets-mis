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

// --- ITEMS SERVICE ---
export async function fetchItems(): Promise<Item[]> {
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(ITEMS_STORAGE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed)) return parsed
      } catch {
        // ignore
      }
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("items").select("*").order("name")
      if (!error && data) {
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
        id: item.id.length > 20 ? item.id : undefined,
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
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(VENDORS_STORAGE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed)) return parsed
      } catch {
        // ignore
      }
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("vendors").select("*").order("name")
      if (!error && data) {
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

// --- CUSTOMERS SERVICE ---
export async function fetchCustomers(): Promise<Customer[]> {
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(CUSTOMERS_STORAGE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed)) return parsed
      } catch {
        // ignore
      }
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("customers").select("*").order("name")
      if (!error && data) {
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
        if (typeof window !== "undefined") {
          localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(mapped))
        }
        return mapped
      }
    } catch (e) {
      console.warn("Supabase fetchCustomers error:", e)
    }
  }

  return []
}

export async function saveCustomerToDb(customer: Customer): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      await supabase.from("customers").upsert({
        id: customer.id.length > 20 ? customer.id : undefined,
        customer_number: customer.customerNumber,
        name: customer.name,
        mobile: customer.mobile,
        type: customer.type,
        address: customer.address,
        gstin: customer.gstin,
        reference: customer.reference,
        status: customer.status,
      })
    } catch (e) {
      console.warn("Supabase saveCustomer error:", e)
    }
  }
}

// --- PURCHASES SERVICE ---
export async function fetchPurchases(): Promise<PurchaseEntry[]> {
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(PURCHASES_STORAGE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed)) return parsed
      } catch {
        // ignore
      }
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("purchases").select("*").order("purchase_date", { ascending: false })
      if (!error && data) {
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
        month_group: entry.monthGroup || "Active",
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

export async function savePurchasesToDb(entries: PurchaseEntry[]): Promise<void> {
  if (isSupabaseConfigured() && entries.length > 0) {
    try {
      const supabase = createClient()
      const chunkSize = 100
      for (let i = 0; i < entries.length; i += chunkSize) {
        const chunk = entries.slice(i, i + chunkSize).map((entry) => ({
          id: entry.id && entry.id.length > 20 ? entry.id : undefined,
          purchase_date: entry.purchaseDate || entry.date,
          month_group: entry.monthGroup || "Active",
          item_name: entry.itemName,
          lot_number: entry.lotNumber || "",
          vendor_name: entry.vendorName,
          quantity: entry.quantity,
          unit: entry.unit,
          rate: entry.rate,
          total: entry.total,
          remarks: entry.remarks || "",
        }))
        await supabase.from("purchases").upsert(chunk)
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
      await supabase.from("purchases").delete().in("id", ids)
    } catch (e) {
      console.warn("Supabase deletePurchases error:", e)
    }
  }
}

// --- EXPENSES SERVICE ---
export async function fetchExpenses(): Promise<any[]> {
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(EXPENSES_STORAGE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed)) return parsed
      } catch {
        // ignore
      }
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false })
      if (!error && data) {
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

export async function saveExpenseToDb(entry: ExpenseEntry): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      await supabase.from("expenses").upsert({
        id: entry.id && entry.id.length > 20 ? entry.id : undefined,
        voucher_number: entry.voucherNumber || "",
        expense_date: entry.expenseDate || entry.date,
        month_group: entry.monthGroup || "Active",
        category: entry.category,
        title: entry.title,
        payee: entry.payeeName || "",
        amount: entry.amount,
        payment_mode: entry.paymentMode || "Cash",
        status: entry.status || "PAID",
        bill_invoice_no: entry.billInvoiceNo || "",
        description: entry.remarks || "",
      })
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
      for (let i = 0; i < entries.length; i += chunkSize) {
        const chunk = entries.slice(i, i + chunkSize).map((entry) => ({
          id: entry.id && entry.id.length > 20 ? entry.id : undefined,
          voucher_number: entry.voucherNumber || "",
          expense_date: entry.expenseDate || entry.date,
          month_group: entry.monthGroup || "Active",
          category: entry.category,
          title: entry.title,
          payee: entry.payeeName || "",
          amount: entry.amount,
          payment_mode: entry.paymentMode || "Cash",
          status: entry.status || "PAID",
          bill_invoice_no: entry.billInvoiceNo || "",
          description: entry.remarks || "",
        }))
        await supabase.from("expenses").upsert(chunk)
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
      await supabase.from("expenses").delete().in("id", ids)
    } catch (e) {
      console.warn("Supabase deleteExpenses error:", e)
    }
  }
}

// --- RECIPES SERVICE ---
export async function fetchRecipes(): Promise<Recipe[]> {
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(RECIPES_STORAGE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed)) return parsed
      } catch {
        // ignore
      }
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("recipes").select("*").order("name")
      if (!error && data) {
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
        if (typeof window !== "undefined") {
          localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(mapped))
        }
        return mapped
      }
    } catch {
      // recipes table may not exist in user supabase, fallback to local storage
    }
  }

  return []
}

export async function saveRecipeToDb(recipe: Recipe): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      await supabase.from("recipes").upsert({
        id: recipe.id.length > 20 ? recipe.id : undefined,
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
      })
    } catch {
      // ignore if table not created
    }
  }
}

// --- ORDERS SERVICE ---
export async function fetchOrders(): Promise<Order[]> {
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(ORDERS_STORAGE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed)) return parsed
      } catch {
        // ignore
      }
    }
  }

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
        if (typeof window !== "undefined") {
          localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(mapped))
        }
        return mapped
      }
    } catch {
      // ignore if table not created
    }
  }

  return []
}

export async function saveOrderToDb(order: Order): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      await supabase.from("orders").upsert({
        id: order.id.length > 20 ? order.id : undefined,
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
      })
    } catch {
      // ignore if table not created
    }
  }
}
