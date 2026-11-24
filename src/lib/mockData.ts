export interface Item {
  id: string
  name: string
  category: string
  currentPrice: number
  unit: string
  status: "ACTIVE" | "INACTIVE"
  vendorNames?: string[]
  notes?: string
}

export interface ContactPerson {
  id: string
  name: string
  phone: string
  designation?: string
}

export interface Vendor {
  id: string
  name: string
  code: string
  materials: string[]
  contacts: ContactPerson[]
  contactName?: string
  phone?: string
  gstin: string
  address: string
  status: "ACTIVE" | "INACTIVE"
}

export interface Customer {
  id: string
  customerNumber: string
  name: string
  mobile: string
  type: string
  address: string
  gstin?: string
  reference?: string
  status: "ACTIVE" | "INACTIVE"
}

export const initialCustomerTypes = [
  "Retail",
  "Wholesale",
  "Event Catering",
  "Corporate Gifting",
]

export interface PurchaseEntry {
  id: string
  date: string // ISO string or DD/MM/YYYY hh:mm
  purchaseDate: string // YYYY-MM-DD
  monthGroup: string // "March 2026"
  itemName: string
  lotNumber?: string
  vendorName: string
  quantity: number
  unit: string
  rate: number
  total: number
  remarks?: string
}

export interface RecipeIngredient {
  id: string
  itemId: string
  itemName: string
  quantity: number
  unit: string
  currentRate: number
  cost: number
  contributionPct?: number
}

export interface RecipeProcessStep {
  stepNumber: number
  description: string
  estimatedTime?: string
  estimatedMinutes: number
}

export interface RecipeEquipment {
  name: string
  quantity: number
  role: string
}

export interface Recipe {
  id: string
  name: string
  outputYield: number
  outputUnit: string
  additionalExpense: number
  additionalCostName?: string
  calculatedCostPerKg: number
  photoUrl?: string
  videoUrl?: string
  ingredients: RecipeIngredient[]
  processSteps: RecipeProcessStep[]
  equipment: RecipeEquipment[]
}

export interface OrderItem {
  id: string
  itemName: string
  quantity: number
  unit: string
  price: number
  total: number
}

export interface PaymentInstallment {
  id: string
  date: string
  amount: number
  paymentMode: "Cash" | "UPI / GPay / PhonePe" | "Bank Transfer / NEFT" | "Cheque" | "Card"
  paidBy?: string
  notes?: string
}

export interface Order {
  id: string
  orderNumber: string
  orderDate: string
  deliveryDate: string
  customerName: string
  customerType: string
  contactNumber: string
  address: string
  items: OrderItem[]
  additionalChargeName?: string
  additionalChargeAmount?: number
  totalAmount: number
  paymentReceived: number
  installments?: PaymentInstallment[]
  status: "Packed" | "Prep" | "Pending" | "Completed" | "Cancelled"
  notes?: string
}

export const initialStandardUnits = [
  "Kg",
  "Litre",
  "Gram",
  "Piece",
  "Bag",
  "Packet",
  "Box",
  "Tin",
  "Quintal",
]

// Standard Categories
export const initialCategories = [
  "Raw Materials",
  "Sweets",
  "Dairy",
  "Dry Fruits",
  "Spices",
  "Packaging",
  "Grocery",
]

// Initial Items (Empty by default for real store data)
export const initialItems: Item[] = []

// Initial Vendors (Empty by default for real store data)
export const initialVendors: Vendor[] = []

// Initial Customers (Empty by default for real store data)
export const initialCustomers: Customer[] = []

// Initial Purchases (Empty by default for real store data)
export const initialPurchases: PurchaseEntry[] = []

// Initial Recipes (Empty by default for real store data)
export const initialRecipes: Recipe[] = []

// Initial Orders (Empty by default for real store data)
export const initialOrders: Order[] = []

export type ExpenseCategory =
  | "Salaries & Wages"
  | "Shop & Godown Rent"
  | "Electricity & Water Bills"
  | "Repairing & Maintenance"
  | "LPG & Commercial Gas"
  | "Packaging & Printing"
  | "Transportation & Fuel"
  | "Staff Welfare & Tea"
  | "Licensing & Compliance"
  | "Miscellaneous Expenses"

export const initialExpenseCategories: ExpenseCategory[] = [
  "Salaries & Wages",
  "Shop & Godown Rent",
  "Electricity & Water Bills",
  "Repairing & Maintenance",
  "LPG & Commercial Gas",
  "Packaging & Printing",
  "Transportation & Fuel",
  "Staff Welfare & Tea",
  "Licensing & Compliance",
  "Miscellaneous Expenses",
]

export interface ExpenseEntry {
  id: string
  voucherNumber: string
  date: string
  expenseDate: string
  monthGroup: string
  category: ExpenseCategory
  title: string
  payeeName: string
  amount: number
  paymentMode: "Cash" | "Bank Transfer / NEFT" | "UPI / GPay / PhonePe" | "Cheque"
  status: "PAID" | "PENDING"
  billInvoiceNo?: string
  remarks?: string
}

// Initial Expenses (Empty by default for real store data)
export const initialExpenses: ExpenseEntry[] = []
