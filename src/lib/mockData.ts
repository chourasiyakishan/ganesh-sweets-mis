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

// Initial Categories
export const initialCategories = [
  "Raw Materials",
  "Sweets",
  "Dairy",
  "Dry Fruits",
  "Spices",
  "Packaging",
  "Grocery",
]

// Initial Items
export const initialItems: Item[] = [
  { id: "1", name: "Kaju (Cashew W320)", category: "Dry Fruits", currentPrice: 680.00, unit: "Kg", status: "ACTIVE", vendorNames: ["Shreeji Dry Fruits"], notes: "Premium grade cashew" },
  { id: "2", name: "Pure Cow Ghee", category: "Dairy", currentPrice: 850.00, unit: "Litre", status: "ACTIVE", vendorNames: ["Mahi Dairy Farms"], notes: "A2 Pure Ghee" },
  { id: "3", name: "Besan (Gram Flour)", category: "Raw Materials", currentPrice: 90.00, unit: "Kg", status: "ACTIVE", vendorNames: ["Gujarat Sugar Mills"], notes: "Fine ground chana dal" },
  { id: "4", name: "Refined Sugar (M-30)", category: "Raw Materials", currentPrice: 38.50, unit: "Kg", status: "ACTIVE", vendorNames: ["Gujarat Sugar Mills"] },
  { id: "5", name: "Cardamom (Elaichi)", category: "Spices", currentPrice: 2400.00, unit: "Kg", status: "ACTIVE", vendorNames: ["Kerala Spices Co."] },
  { id: "6", name: "Fresh Milk", category: "Dairy", currentPrice: 60.00, unit: "Litre", status: "ACTIVE", vendorNames: ["Mahi Dairy Farms"] },
  { id: "7", name: "Mawa (Khoa)", category: "Dairy", currentPrice: 320.00, unit: "Kg", status: "ACTIVE", vendorNames: ["Mahi Dairy Farms"] },
  { id: "8", name: "Maida (Wheat Flour)", category: "Raw Materials", currentPrice: 35.00, unit: "Kg", status: "ACTIVE", vendorNames: [] },
  { id: "9", name: "Premium Sweet Box 1kg", category: "Packaging", currentPrice: 25.00, unit: "Piece", status: "ACTIVE", vendorNames: ["PrintPack Solutions"] },
  { id: "10", name: "Pistachio (Pista)", category: "Dry Fruits", currentPrice: 1800.00, unit: "Kg", status: "ACTIVE", vendorNames: ["Shreeji Dry Fruits"] },
  { id: "11", name: "Almonds (Badam)", category: "Dry Fruits", currentPrice: 750.00, unit: "Kg", status: "ACTIVE", vendorNames: ["Shreeji Dry Fruits"] },
  { id: "12", name: "Jaggery (Gur)", category: "Raw Materials", currentPrice: 50.00, unit: "Kg", status: "INACTIVE", vendorNames: ["Gujarat Sugar Mills"] },
]

// Initial Vendors
export const initialVendors: Vendor[] = [
  {
    id: "v1",
    name: "Mahi Dairy Farms",
    code: "V-001",
    materials: ["Fresh Milk", "Pure Cow Ghee", "Mawa (Khoa)"],
    contacts: [
      { id: "c1-1", name: "Rajesh Kumar", phone: "+91 98765 43210", designation: "Sales Manager" },
      { id: "c1-2", name: "Mahesh Bhai", phone: "+91 98765 43211", designation: "Dispatch Incharge" },
    ],
    contactName: "Rajesh Kumar",
    phone: "+91 98765 43210",
    gstin: "27AADCM1234E1Z5",
    address: "Plot 12, Anand Dairy Zone, Gujarat",
    status: "ACTIVE",
  },
  {
    id: "v2",
    name: "Shreeji Dry Fruits",
    code: "V-002",
    materials: ["Kaju (Cashew W320)", "Almonds (Badam)", "Pistachio (Pista)"],
    contacts: [
      { id: "c2-1", name: "Amit Patel", phone: "+91 99887 76655", designation: "Owner" },
    ],
    contactName: "Amit Patel",
    phone: "+91 99887 76655",
    gstin: "24AABCS4321D2Z1",
    address: "APMC Market, Unjha, Gujarat",
    status: "ACTIVE",
  },
  {
    id: "v3",
    name: "PrintPack Solutions",
    code: "V-003",
    materials: ["Premium Sweet Box 1kg"],
    contacts: [
      { id: "c3-1", name: "Sunita Sharma", phone: "+91 91234 56789", designation: "Accounts Head" },
    ],
    contactName: "Sunita Sharma",
    phone: "+91 91234 56789",
    gstin: "27ZZXYZ9876A1Z9",
    address: "Industrial Estate, Thane, Maharashtra",
    status: "INACTIVE",
  },
  {
    id: "v4",
    name: "Gujarat Sugar Mills",
    code: "V-004",
    materials: ["Refined Sugar (M-30)", "Jaggery (Gur)"],
    contacts: [
      { id: "c4-1", name: "Dinesh Bhai", phone: "+91 94321 09876", designation: "Factory Manager" },
      { id: "c4-2", name: "Suresh Shah", phone: "+91 94321 09877", designation: "Billing Executive" },
    ],
    contactName: "Dinesh Bhai",
    phone: "+91 94321 09876",
    gstin: "24BBDDD4567F8Z2",
    address: "Sugar Complex, Bardoli, Gujarat",
    status: "ACTIVE",
  },
  {
    id: "v5",
    name: "Kerala Spices Co.",
    code: "V-005",
    materials: ["Cardamom (Elaichi)"],
    contacts: [
      { id: "c5-1", name: "Venkatesh Nair", phone: "+91 98450 12345", designation: "Proprietor" },
    ],
    contactName: "Venkatesh Nair",
    phone: "+91 98450 12345",
    gstin: "32AAACK1122B1Z4",
    address: "Spices Market, Idukki, Kerala",
    status: "ACTIVE",
  },
]

// Initial Customers
export const initialCustomers: Customer[] = [
  {
    id: "c1",
    customerNumber: "GS-0001",
    name: "Sharma Sweets",
    mobile: "+91 98200 11223",
    type: "Wholesale",
    address: "Main Market, Station Road, Ahmedabad",
    gstin: "24AAAAA0000A1Z5",
    reference: "Sharma Retail Chain",
    status: "ACTIVE",
  },
  {
    id: "c2",
    customerNumber: "GS-0002",
    name: "Royal Banquet",
    mobile: "+91 98980 44556",
    type: "Event Catering",
    address: "SG Highway, Bodakdev, Ahmedabad",
    reference: "Mr. Mehta (Event Planner)",
    status: "ACTIVE",
  },
  {
    id: "c3",
    customerNumber: "GS-0003",
    name: "Apex Corporate",
    mobile: "+91 97123 88990",
    type: "Corporate Gifting",
    address: "Gift City Tower B, Gandhinagar",
    gstin: "24BBBCC1111B1Z2",
    reference: "Diwali Bulk Gifting",
    status: "ACTIVE",
  },
  {
    id: "c4",
    customerNumber: "GS-0004",
    name: "Prajapati Caterers",
    mobile: "+91 99090 33221",
    type: "Event Catering",
    address: "Satellite Ring Road, Ahmedabad",
    status: "ACTIVE",
  },
]

// Initial Purchases
export const initialPurchases: PurchaseEntry[] = [
  {
    id: "p1",
    date: "15 Mar, 08:30",
    purchaseDate: "2026-03-15",
    monthGroup: "March 2026",
    itemName: "Pure Cow Ghee",
    lotNumber: "Lot #4421",
    vendorName: "Mahi Dairy Farms",
    quantity: 150,
    unit: "Litre",
    rate: 850.00,
    total: 127500.00,
    remarks: "Fresh A2 lot",
  },
  {
    id: "p2",
    date: "14 Mar, 14:15",
    purchaseDate: "2026-03-14",
    monthGroup: "March 2026",
    itemName: "Kaju (Cashew W320)",
    lotNumber: "W320 Grade",
    vendorName: "Shreeji Dry Fruits",
    quantity: 50,
    unit: "Kg",
    rate: 680.00,
    total: 34000.00,
  },
  {
    id: "p3",
    date: "12 Mar, 09:00",
    purchaseDate: "2026-03-12",
    monthGroup: "March 2026",
    itemName: "Refined Sugar (M-30)",
    lotNumber: "M-30",
    vendorName: "Gujarat Sugar Mills",
    quantity: 500,
    unit: "Kg",
    rate: 38.50,
    total: 19250.00,
  },
  {
    id: "p4",
    date: "28 Feb, 11:20",
    purchaseDate: "2026-02-28",
    monthGroup: "February 2026",
    itemName: "Cardamom (Elaichi)",
    vendorName: "Kerala Spices Co.",
    quantity: 5,
    unit: "Kg",
    rate: 2400.00,
    total: 12000.00,
  },
  {
    id: "p5",
    date: "20 Feb, 16:45",
    purchaseDate: "2026-02-20",
    monthGroup: "February 2026",
    itemName: "Besan (Gram Flour)",
    vendorName: "Gujarat Sugar Mills",
    quantity: 200,
    unit: "Kg",
    rate: 90.00,
    total: 18000.00,
  },
]

// Initial Recipes
export const initialRecipes: Recipe[] = [
  {
    id: "r1",
    name: "Kaju Katli",
    outputYield: 10,
    outputUnit: "Kg",
    additionalExpense: 300.00,
    additionalCostName: "Labor & Fuel",
    calculatedCostPerKg: 604.00,
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    ingredients: [
      { id: "ri1", itemId: "1", itemName: "Kaju (Cashew W320)", quantity: 8, unit: "Kg", currentRate: 680.00, cost: 5440.00, contributionPct: 90.0 },
      { id: "ri2", itemId: "4", itemName: "Refined Sugar (M-30)", quantity: 2.5, unit: "Kg", currentRate: 38.50, cost: 96.25, contributionPct: 1.6 },
      { id: "ri3", itemId: "2", itemName: "Pure Cow Ghee", quantity: 0.2, unit: "Litre", currentRate: 850.00, cost: 170.00, contributionPct: 2.8 },
      { id: "ri4", itemId: "5", itemName: "Cardamom (Elaichi)", quantity: 0.01, unit: "Kg", currentRate: 2400.00, cost: 24.00, contributionPct: 0.4 },
    ],
    processSteps: [
      { stepNumber: 1, description: "Grind cashews into fine powder without making it paste.", estimatedTime: "15 mins", estimatedMinutes: 15 },
      { stepNumber: 2, description: "Prepare 1-string sugar syrup in kadhai.", estimatedTime: "20 mins", estimatedMinutes: 20 },
      { stepNumber: 3, description: "Mix cashew powder into syrup and stir continuously on low flame.", estimatedTime: "25 mins", estimatedMinutes: 25 },
      { stepNumber: 4, description: "Knead smooth dough, roll flat to 5mm thickness and apply silver vark.", estimatedTime: "20 mins", estimatedMinutes: 20 },
      { stepNumber: 5, description: "Cut into diamond shapes once cooled.", estimatedTime: "15 mins", estimatedMinutes: 15 },
    ],
    equipment: [
      { name: "Heavy Copper Kadhai", quantity: 1, role: "Syrup cooking" },
      { name: "Dough Rolling Table", quantity: 1, role: "Flattening" },
      { name: "Diamond Cutter", quantity: 2, role: "Cutting" },
    ],
  },
  {
    id: "r2",
    name: "Motichoor Laddu",
    outputYield: 15,
    outputUnit: "Kg",
    additionalExpense: 400.00,
    additionalCostName: "Labor & Fuel",
    calculatedCostPerKg: 355.00,
    ingredients: [
      { id: "ri5", itemId: "3", itemName: "Besan (Gram Flour)", quantity: 6, unit: "Kg", currentRate: 90.00, cost: 540.00, contributionPct: 10.1 },
      { id: "ri6", itemId: "2", itemName: "Pure Cow Ghee", quantity: 4, unit: "Litre", currentRate: 850.00, cost: 3400.00, contributionPct: 63.8 },
      { id: "ri7", itemId: "4", itemName: "Refined Sugar (M-30)", quantity: 7, unit: "Kg", currentRate: 38.50, cost: 269.50, contributionPct: 5.1 },
      { id: "ri8", itemId: "5", itemName: "Cardamom (Elaichi)", quantity: 0.05, unit: "Kg", currentRate: 2400.00, cost: 120.00, contributionPct: 2.2 },
    ],
    processSteps: [
      { stepNumber: 1, description: "Make thin batter with besan and water.", estimatedTime: "10 mins", estimatedMinutes: 10 },
      { stepNumber: 2, description: "Pass batter through fine jhara into hot ghee to fry boondi.", estimatedTime: "40 mins", estimatedMinutes: 40 },
      { stepNumber: 3, description: "Soak fried boondi in hot cardamom sugar syrup.", estimatedTime: "30 mins", estimatedMinutes: 30 },
      { stepNumber: 4, description: "Shape into round laddus once cool enough to handle.", estimatedTime: "30 mins", estimatedMinutes: 30 },
    ],
    equipment: [
      { name: "Frying Kadhai", quantity: 1, role: "Frying boondi" },
      { name: "Boondi Jhara (No. 0)", quantity: 2, role: "Boondi making" },
    ],
  },
]

// Initial Orders
export const initialOrders: Order[] = [
  {
    id: "o1",
    orderNumber: "ORD-1001",
    orderDate: "2026-03-14",
    deliveryDate: "2026-03-20", // Tomorrow relative in mock display
    customerName: "Sharma Sweets",
    customerType: "Wholesale",
    contactNumber: "+91 98200 11223",
    address: "Main Market, Station Road, Ahmedabad",
    items: [
      { id: "oi1", itemName: "Kaju Katli", quantity: 50, unit: "Kg", price: 850, total: 42500 },
      { id: "oi2", itemName: "Motichoor Laddu", quantity: 20, unit: "Kg", price: 400, total: 8000 },
    ],
    totalAmount: 50500,
    paymentReceived: 25000,
    installments: [
      { id: "pi-1", date: "2026-03-14", amount: 15000, paymentMode: "UPI / GPay / PhonePe", paidBy: "Mr. Sharma", notes: "Advance payment via UPI" },
      { id: "pi-2", date: "2026-03-16", amount: 10000, paymentMode: "Cash", paidBy: "Store Manager", notes: "2nd Installment in cash" },
    ],
    status: "Packed",
    notes: "Deliver early morning by 7 AM.",
  },
  {
    id: "o2",
    orderNumber: "ORD-1002",
    orderDate: "2026-03-15",
    deliveryDate: "2026-03-20",
    customerName: "Royal Banquet",
    customerType: "Event Catering",
    contactNumber: "+91 98980 44556",
    address: "SG Highway, Bodakdev, Ahmedabad",
    items: [
      { id: "oi3", itemName: "Gulab Jamun", quantity: 1000, unit: "Piece", price: 15, total: 15000 },
    ],
    totalAmount: 15000,
    paymentReceived: 15000,
    installments: [
      { id: "pi-3", date: "2026-03-15", amount: 15000, paymentMode: "Bank Transfer / NEFT", paidBy: "Mehta Catering", notes: "Full advance payment via NEFT" },
    ],
    status: "Prep",
    notes: "Special brass container packing required.",
  },
  {
    id: "o3",
    orderNumber: "ORD-1003",
    orderDate: "2026-03-10",
    deliveryDate: "2026-03-26",
    customerName: "Apex Corporate",
    customerType: "Corporate Gifting",
    contactNumber: "+91 97123 88990",
    address: "Gift City Tower B, Gandhinagar",
    items: [
      { id: "oi4", itemName: "Assorted Dry Fruits Box", quantity: 50, unit: "Piece", price: 1200, total: 60000 },
    ],
    totalAmount: 60000,
    paymentReceived: 30000,
    installments: [
      { id: "pi-4", date: "2026-03-10", amount: 30000, paymentMode: "Cheque", paidBy: "Finance Dept (Chq #440912)", notes: "50% advance cheque clearance" },
    ],
    status: "Pending",
    notes: "Custom corporate logo sticker on box.",
  },
]

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

export const initialExpenses: ExpenseEntry[] = [
  // --- March 2026 (Current Month) ---
  {
    id: "exp-mar-01",
    voucherNumber: "EXP-2026-001",
    date: "05 Mar 2026, 11:30",
    expenseDate: "2026-03-05",
    monthGroup: "March 2026",
    category: "Salaries & Wages",
    title: "Kitchen Staff & Halwai Monthly Salaries",
    payeeName: "Ramesh Sharma & Kitchen Team (5 Staff)",
    amount: 65000,
    paymentMode: "Bank Transfer / NEFT",
    status: "PAID",
    billInvoiceNo: "SAL-MAR-2026",
    remarks: "Full monthly salary payout for sweet kitchen halwais and assistants",
  },
  {
    id: "exp-mar-02",
    voucherNumber: "EXP-2026-002",
    date: "07 Mar 2026, 14:00",
    expenseDate: "2026-03-07",
    monthGroup: "March 2026",
    category: "Shop & Godown Rent",
    title: "Main Sweet Shop & Retail Counter Rent",
    payeeName: "Shreeji Real Estate Trust",
    amount: 35000,
    paymentMode: "Cheque",
    status: "PAID",
    billInvoiceNo: "RENT-MAR-2026",
    remarks: "Ashram Road retail showroom and front counter monthly rent",
  },
  {
    id: "exp-mar-03",
    voucherNumber: "EXP-2026-003",
    date: "10 Mar 2026, 12:15",
    expenseDate: "2026-03-10",
    monthGroup: "March 2026",
    category: "Electricity & Water Bills",
    title: "Commercial Power Bill - Production Unit",
    payeeName: "Torrent Power Ltd.",
    amount: 18450,
    paymentMode: "UPI / GPay / PhonePe",
    status: "PAID",
    billInvoiceNo: "TOR-9872134",
    remarks: "Heavy commercial 3-phase connection for deep freezers and mawa roasters",
  },
  {
    id: "exp-mar-04",
    voucherNumber: "EXP-2026-004",
    date: "12 Mar 2026, 10:45",
    expenseDate: "2026-03-12",
    monthGroup: "March 2026",
    category: "LPG & Commercial Gas",
    title: "Commercial Gas Cylinders (4 x 19kg)",
    payeeName: "Bharat Gas Agency",
    amount: 7600,
    paymentMode: "Cash",
    status: "PAID",
    billInvoiceNo: "BG-55412",
    remarks: "19kg commercial red cylinders for sweet furnaces",
  },
  {
    id: "exp-mar-05",
    voucherNumber: "EXP-2026-005",
    date: "14 Mar 2026, 16:30",
    expenseDate: "2026-03-14",
    monthGroup: "March 2026",
    category: "Repairing & Maintenance",
    title: "Deep Freezer & Display Chiller Servicing",
    payeeName: "Cool Tech Refrigeration",
    amount: 4800,
    paymentMode: "UPI / GPay / PhonePe",
    status: "PAID",
    billInvoiceNo: "CT-INV-89",
    remarks: "Refrigerant gas refill and compressor coil cleaning",
  },
  {
    id: "exp-mar-06",
    voucherNumber: "EXP-2026-006",
    date: "16 Mar 2026, 13:00",
    expenseDate: "2026-03-16",
    monthGroup: "March 2026",
    category: "Packaging & Printing",
    title: "Embossed Mithai Boxes & Carry Bags",
    payeeName: "Gujarat Packaging Works",
    amount: 14500,
    paymentMode: "Bank Transfer / NEFT",
    status: "PAID",
    billInvoiceNo: "GPW-3319",
    remarks: "1000 Kaju Katli boxes and butter paper sheets",
  },
  {
    id: "exp-mar-07",
    voucherNumber: "EXP-2026-007",
    date: "17 Mar 2026, 18:20",
    expenseDate: "2026-03-17",
    monthGroup: "March 2026",
    category: "Transportation & Fuel",
    title: "Delivery Van Fuel & Tempo Freight",
    payeeName: "Indian Oil Petrol Pump",
    amount: 3200,
    paymentMode: "Cash",
    status: "PAID",
    billInvoiceNo: "IOCL-8821",
    remarks: "Diesel for catering and corporate pre-order deliveries",
  },
  {
    id: "exp-mar-08",
    voucherNumber: "EXP-2026-008",
    date: "18 Mar 2026, 15:00",
    expenseDate: "2026-03-18",
    monthGroup: "March 2026",
    category: "Staff Welfare & Tea",
    title: "Staff Tea, Snacks & Kitchen Refreshments",
    payeeName: "Chai Point & Local Baker",
    amount: 2400,
    paymentMode: "Cash",
    status: "PAID",
    billInvoiceNo: "PETTY-12",
    remarks: "Bi-weekly staff refreshments and evening tea",
  },
  {
    id: "exp-mar-09",
    voucherNumber: "EXP-2026-009",
    date: "19 Mar 2026, 11:00",
    expenseDate: "2026-03-19",
    monthGroup: "March 2026",
    category: "Repairing & Maintenance",
    title: "Commercial Mawa Roaster Overhaul",
    payeeName: "Shree Ram Machine Works",
    amount: 6500,
    paymentMode: "UPI / GPay / PhonePe",
    status: "PENDING",
    billInvoiceNo: "SRM-4412",
    remarks: "Motor bearing replacement & heavy copper winding (Payment pending delivery)",
  },
  {
    id: "exp-mar-10",
    voucherNumber: "EXP-2026-010",
    date: "19 Mar 2026, 17:40",
    expenseDate: "2026-03-19",
    monthGroup: "March 2026",
    category: "Miscellaneous Expenses",
    title: "Kitchen Sanitation & Pest Control Service",
    payeeName: "SafeGuard Pest Management",
    amount: 2800,
    paymentMode: "Cash",
    status: "PAID",
    billInvoiceNo: "SG-1092",
    remarks: "Monthly herbal pest control and food safety disinfection",
  },

  // --- February 2026 ---
  {
    id: "exp-feb-01",
    voucherNumber: "EXP-2026-011",
    date: "05 Feb 2026, 11:30",
    expenseDate: "2026-02-05",
    monthGroup: "February 2026",
    category: "Salaries & Wages",
    title: "Kitchen Staff Monthly Salaries",
    payeeName: "Ramesh Sharma & Kitchen Team",
    amount: 65000,
    paymentMode: "Bank Transfer / NEFT",
    status: "PAID",
    billInvoiceNo: "SAL-FEB-2026",
    remarks: "February monthly salary payout",
  },
  {
    id: "exp-feb-02",
    voucherNumber: "EXP-2026-012",
    date: "07 Feb 2026, 14:00",
    expenseDate: "2026-02-07",
    monthGroup: "February 2026",
    category: "Shop & Godown Rent",
    title: "Main Sweet Shop Rent",
    payeeName: "Shreeji Real Estate Trust",
    amount: 35000,
    paymentMode: "Cheque",
    status: "PAID",
    billInvoiceNo: "RENT-FEB-2026",
    remarks: "February shop rent",
  },
  {
    id: "exp-feb-03",
    voucherNumber: "EXP-2026-013",
    date: "10 Feb 2026, 12:15",
    expenseDate: "2026-02-10",
    monthGroup: "February 2026",
    category: "Electricity & Water Bills",
    title: "Commercial Electricity Bill",
    payeeName: "Torrent Power Ltd.",
    amount: 16800,
    paymentMode: "UPI / GPay / PhonePe",
    status: "PAID",
    billInvoiceNo: "TOR-980194",
    remarks: "January billing cycle",
  },
  {
    id: "exp-feb-04",
    voucherNumber: "EXP-2026-014",
    date: "13 Feb 2026, 10:30",
    expenseDate: "2026-02-13",
    monthGroup: "February 2026",
    category: "LPG & Commercial Gas",
    title: "Commercial Gas Cylinders (4 x 19kg)",
    payeeName: "Bharat Gas Agency",
    amount: 7600,
    paymentMode: "Cash",
    status: "PAID",
    billInvoiceNo: "BG-53012",
  },
  {
    id: "exp-feb-05",
    voucherNumber: "EXP-2026-015",
    date: "17 Feb 2026, 15:45",
    expenseDate: "2026-02-17",
    monthGroup: "February 2026",
    category: "Repairing & Maintenance",
    title: "Exhaust Chimney Cleaning & Duct Service",
    payeeName: "Shreenath Electricals",
    amount: 3400,
    paymentMode: "Cash",
    status: "PAID",
    remarks: "Kitchen exhaust fan duct de-greasing",
  },
  {
    id: "exp-feb-06",
    voucherNumber: "EXP-2026-016",
    date: "22 Feb 2026, 16:00",
    expenseDate: "2026-02-22",
    monthGroup: "February 2026",
    category: "Packaging & Printing",
    title: "Mithai Wrapping Foil & Butter Paper",
    payeeName: "Gujarat Packaging Works",
    amount: 12000,
    paymentMode: "Bank Transfer / NEFT",
    status: "PAID",
  },
  {
    id: "exp-feb-07",
    voucherNumber: "EXP-2026-017",
    date: "25 Feb 2026, 17:30",
    expenseDate: "2026-02-25",
    monthGroup: "February 2026",
    category: "Transportation & Fuel",
    title: "Monthly Local Delivery Diesel",
    payeeName: "Indian Oil Petrol Pump",
    amount: 4100,
    paymentMode: "Cash",
    status: "PAID",
  },

  // --- January 2026 ---
  {
    id: "exp-jan-01",
    voucherNumber: "EXP-2026-018",
    date: "05 Jan 2026, 11:30",
    expenseDate: "2026-01-05",
    monthGroup: "January 2026",
    category: "Salaries & Wages",
    title: "Kitchen Staff Monthly Salaries",
    payeeName: "Ramesh Sharma & Kitchen Team",
    amount: 65000,
    paymentMode: "Bank Transfer / NEFT",
    status: "PAID",
  },
  {
    id: "exp-jan-02",
    voucherNumber: "EXP-2026-019",
    date: "07 Jan 2026, 14:00",
    expenseDate: "2026-01-07",
    monthGroup: "January 2026",
    category: "Shop & Godown Rent",
    title: "Main Sweet Shop Rent",
    payeeName: "Shreeji Real Estate Trust",
    amount: 35000,
    paymentMode: "Cheque",
    status: "PAID",
  },
  {
    id: "exp-jan-03",
    voucherNumber: "EXP-2026-020",
    date: "11 Jan 2026, 12:15",
    expenseDate: "2026-01-11",
    monthGroup: "January 2026",
    category: "Electricity & Water Bills",
    title: "Commercial Electricity Bill",
    payeeName: "Torrent Power Ltd.",
    amount: 17200,
    paymentMode: "UPI / GPay / PhonePe",
    status: "PAID",
  },
  {
    id: "exp-jan-04",
    voucherNumber: "EXP-2026-021",
    date: "14 Jan 2026, 10:30",
    expenseDate: "2026-01-14",
    monthGroup: "January 2026",
    category: "LPG & Commercial Gas",
    title: "Commercial Gas Cylinders (5 x 19kg)",
    payeeName: "Bharat Gas Agency",
    amount: 9500,
    paymentMode: "Cash",
    status: "PAID",
    remarks: "Makar Sankranti sweet peak furnace refills",
  },
  {
    id: "exp-jan-05",
    voucherNumber: "EXP-2026-022",
    date: "20 Jan 2026, 15:45",
    expenseDate: "2026-01-20",
    monthGroup: "January 2026",
    category: "Repairing & Maintenance",
    title: "Stainless Steel Kadai & Burner Servicing",
    payeeName: "Shree Ram Machine Works",
    amount: 5200,
    paymentMode: "Cash",
    status: "PAID",
  },

  // --- December 2025 ---
  {
    id: "exp-dec-01",
    voucherNumber: "EXP-2025-023",
    date: "05 Dec 2025, 11:30",
    expenseDate: "2025-12-05",
    monthGroup: "December 2025",
    category: "Salaries & Wages",
    title: "Kitchen Staff Monthly Salaries",
    payeeName: "Ramesh Sharma & Kitchen Team",
    amount: 62000,
    paymentMode: "Bank Transfer / NEFT",
    status: "PAID",
  },
  {
    id: "exp-dec-02",
    voucherNumber: "EXP-2025-024",
    date: "07 Dec 2025, 14:00",
    expenseDate: "2025-12-07",
    monthGroup: "December 2025",
    category: "Shop & Godown Rent",
    title: "Main Sweet Shop Rent",
    payeeName: "Shreeji Real Estate Trust",
    amount: 35000,
    paymentMode: "Cheque",
    status: "PAID",
  },
  {
    id: "exp-dec-03",
    voucherNumber: "EXP-2025-025",
    date: "10 Dec 2025, 12:15",
    expenseDate: "2025-12-10",
    monthGroup: "December 2025",
    category: "Electricity & Water Bills",
    title: "Commercial Electricity Bill",
    payeeName: "Torrent Power Ltd.",
    amount: 15900,
    paymentMode: "UPI / GPay / PhonePe",
    status: "PAID",
  },
  {
    id: "exp-dec-04",
    voucherNumber: "EXP-2025-026",
    date: "15 Dec 2025, 10:30",
    expenseDate: "2025-12-15",
    monthGroup: "December 2025",
    category: "LPG & Commercial Gas",
    title: "Commercial Gas Cylinders (4 x 19kg)",
    payeeName: "Bharat Gas Agency",
    amount: 7600,
    paymentMode: "Cash",
    status: "PAID",
  },
  {
    id: "exp-dec-05",
    voucherNumber: "EXP-2025-027",
    date: "22 Dec 2025, 16:00",
    expenseDate: "2025-12-22",
    monthGroup: "December 2025",
    category: "Packaging & Printing",
    title: "Festive Sweet Box Sleeves & Carry Bags",
    payeeName: "Gujarat Packaging Works",
    amount: 9800,
    paymentMode: "Bank Transfer / NEFT",
    status: "PAID",
  },

  // --- October 2025 (Diwali Peak Season) ---
  {
    id: "exp-oct-01",
    voucherNumber: "EXP-2025-028",
    date: "05 Oct 2025, 11:30",
    expenseDate: "2025-10-05",
    monthGroup: "October 2025",
    category: "Salaries & Wages",
    title: "Salaries & Festival Bonus to Kitchen Halwais",
    payeeName: "Ramesh Sharma & Kitchen Team (7 Staff)",
    amount: 85000,
    paymentMode: "Bank Transfer / NEFT",
    status: "PAID",
    remarks: "Includes annual Diwali festival bonus payout",
  },
  {
    id: "exp-oct-02",
    voucherNumber: "EXP-2025-029",
    date: "07 Oct 2025, 14:00",
    expenseDate: "2025-10-07",
    monthGroup: "October 2025",
    category: "Shop & Godown Rent",
    title: "Main Sweet Shop & Extended Counter Rent",
    payeeName: "Shreeji Real Estate Trust",
    amount: 35000,
    paymentMode: "Cheque",
    status: "PAID",
  },
  {
    id: "exp-oct-03",
    voucherNumber: "EXP-2025-030",
    date: "12 Oct 2025, 12:15",
    expenseDate: "2025-10-12",
    monthGroup: "October 2025",
    category: "Electricity & Water Bills",
    title: "Commercial Electricity Bill (Peak 24/7 Production)",
    payeeName: "Torrent Power Ltd.",
    amount: 24800,
    paymentMode: "UPI / GPay / PhonePe",
    status: "PAID",
  },
  {
    id: "exp-oct-04",
    voucherNumber: "EXP-2025-031",
    date: "14 Oct 2025, 10:30",
    expenseDate: "2025-10-14",
    monthGroup: "October 2025",
    category: "LPG & Commercial Gas",
    title: "Bulk Commercial LPG Cylinders (10 x 19kg)",
    payeeName: "Bharat Gas Agency",
    amount: 18500,
    paymentMode: "Cash",
    status: "PAID",
    remarks: "Peak Diwali sweet production cylinder supply",
  },
  {
    id: "exp-oct-05",
    voucherNumber: "EXP-2025-032",
    date: "16 Oct 2025, 16:00",
    expenseDate: "2025-10-16",
    monthGroup: "October 2025",
    category: "Packaging & Printing",
    title: "Diwali Special Hamper Boxes & Gold Tin Cans",
    payeeName: "Gujarat Packaging Works",
    amount: 32000,
    paymentMode: "Bank Transfer / NEFT",
    status: "PAID",
  },
  {
    id: "exp-oct-06",
    voucherNumber: "EXP-2025-033",
    date: "18 Oct 2025, 15:45",
    expenseDate: "2025-10-18",
    monthGroup: "October 2025",
    category: "Repairing & Maintenance",
    title: "Extra Bhatti Setup & Exhaust Duct Servicing",
    payeeName: "Shree Ram Machine Works",
    amount: 8400,
    paymentMode: "Cash",
    status: "PAID",
  },
  {
    id: "exp-oct-07",
    voucherNumber: "EXP-2025-034",
    date: "22 Oct 2025, 17:30",
    expenseDate: "2025-10-22",
    monthGroup: "October 2025",
    category: "Transportation & Fuel",
    title: "Bulk Delivery Vans & Tempo Hire",
    payeeName: "Gujarat Roadlines & Fuel",
    amount: 8200,
    paymentMode: "UPI / GPay / PhonePe",
    status: "PAID",
  },
  {
    id: "exp-oct-08",
    voucherNumber: "EXP-2025-035",
    date: "24 Oct 2025, 18:00",
    expenseDate: "2025-10-24",
    monthGroup: "October 2025",
    category: "Miscellaneous Expenses",
    title: "Shop Illumination & Diwali Pooja Decor",
    payeeName: "Om Electric & Decorators",
    amount: 6500,
    paymentMode: "Cash",
    status: "PAID",
  },
]
