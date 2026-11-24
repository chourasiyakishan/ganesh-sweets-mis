"use client"

import { useState, useMemo, useEffect } from "react"
import {
  FileText,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  Truck,
  Trash2,
  Edit,
  User,
  Phone,
  MapPin,
  History,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Coins,
  CreditCard,
  Receipt,
  UserCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatINR, formatDateDDMMYYYY } from "@/lib/utils"
import { initialOrders, initialCustomers, initialCustomerTypes, Order, OrderItem, PaymentInstallment, Customer } from "@/lib/mockData"
import { ORDERS_STORAGE_KEY, CUSTOMERS_STORAGE_KEY } from "@/lib/data-management"
import { toast } from "sonner"

type SortField = "orderNumber" | "orderDate" | "customerName" | "totalAmount" | "paymentReceived" | "status"
type SortOrder = "asc" | "desc"

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [customersList, setCustomersList] = useState<Customer[]>([])

  const loadOrdersAndCustomers = () => {
    try {
      const isDemo = localStorage.getItem("ganesh_sweets_demo_mode") === "true"

      const storedOrders = localStorage.getItem(ORDERS_STORAGE_KEY)
      if (storedOrders !== null) {
        const parsed = JSON.parse(storedOrders)
        if (Array.isArray(parsed)) setOrders(parsed)
      } else if (isDemo) {
        setOrders(initialOrders)
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(initialOrders))
      } else {
        setOrders([])
      }

      const storedCustomers = localStorage.getItem(CUSTOMERS_STORAGE_KEY)
      if (storedCustomers !== null) {
        const parsed = JSON.parse(storedCustomers)
        if (Array.isArray(parsed)) setCustomersList(parsed)
      } else if (isDemo) {
        setCustomersList(initialCustomers)
      } else {
        setCustomersList([])
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadOrdersAndCustomers()
    window.addEventListener("orders-updated", loadOrdersAndCustomers)
    window.addEventListener("customers-updated", loadOrdersAndCustomers)
    window.addEventListener("data-cleared", loadOrdersAndCustomers)
    window.addEventListener("data-restored", loadOrdersAndCustomers)
    return () => {
      window.removeEventListener("orders-updated", loadOrdersAndCustomers)
      window.removeEventListener("customers-updated", loadOrdersAndCustomers)
      window.removeEventListener("data-cleared", loadOrdersAndCustomers)
      window.removeEventListener("data-restored", loadOrdersAndCustomers)
    }
  }, [])

  const updateOrders = (newList: Order[]) => {
    setOrders(newList)
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(newList))
      window.dispatchEvent(new Event("orders-updated"))
    } catch (e) {
      console.error(e)
    }
  }

  // Filter States for Main Grid & History Modal
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL")
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<string>("ALL")
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("ALL")

  // Listen for search parameters from URL or Topbar universal search event
  useEffect(() => {
    const handleUrlParams = () => {
      if (typeof window === "undefined") return
      const params = new URLSearchParams(window.location.search)
      const q = params.get("search")
      const cust = params.get("customer")
      const st = params.get("status")
      if (q !== null) setSearchQuery(q)
      if (cust !== null) setSelectedCustomerFilter(cust)
      if (st !== null) setSelectedStatus(st)
    }

    handleUrlParams()

    const onSearchNavigate = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail) {
        if (customEvent.detail.search !== undefined) setSearchQuery(customEvent.detail.search)
        if (customEvent.detail.customer !== undefined) setSelectedCustomerFilter(customEvent.detail.customer)
        if (customEvent.detail.status !== undefined) setSelectedStatus(customEvent.detail.status)
      }
    }

    window.addEventListener("mis-search-navigate", onSearchNavigate)
    window.addEventListener("popstate", handleUrlParams)
    return () => {
      window.removeEventListener("mis-search-navigate", onSearchNavigate)
      window.removeEventListener("popstate", handleUrlParams)
    }
  }, [])

  // Order History Modal State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [historySortField, setHistorySortField] = useState<SortField>("orderDate")
  const [historySortOrder, setHistorySortOrder] = useState<SortOrder>("desc")

  // Add / Edit Order Modal State
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)

  // Payment Installment Management Modal State
  const [installmentOrder, setInstallmentOrder] = useState<Order | null>(null)
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false)
  const [instDate, setInstDate] = useState(new Date().toISOString().split("T")[0])
  const [instAmount, setInstAmount] = useState("")
  const [instMode, setInstMode] = useState<"Cash" | "UPI / GPay / PhonePe" | "Bank Transfer / NEFT" | "Cheque" | "Card">("UPI / GPay / PhonePe")
  const [instPaidBy, setInstPaidBy] = useState("")
  const [instNotes, setInstNotes] = useState("")

  // Form Fields State
  const [customerName, setCustomerName] = useState("")
  const [customerType, setCustomerType] = useState("Retail")
  const [contactNumber, setContactNumber] = useState("")
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0])
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split("T")[0])
  const [address, setAddress] = useState("")

  // Additional Charges State (Description + Amount)
  const [additionalChargeName, setAdditionalChargeName] = useState("Delivery / Packing Charge")
  const [additionalChargeAmount, setAdditionalChargeAmount] = useState("0")

  // Initial Advance Payment Field (for New Order creation)
  const [initialAdvanceAmount, setInitialAdvanceAmount] = useState("0")
  const [initialAdvanceMode, setInitialAdvanceMode] = useState<"Cash" | "UPI / GPay / PhonePe" | "Bank Transfer / NEFT" | "Cheque" | "Card">("UPI / GPay / PhonePe")
  const [initialAdvancePaidBy, setInitialAdvancePaidBy] = useState("")

  const [notes, setNotes] = useState("")

  // Free-text Order Items State
  const [orderItems, setOrderItems] = useState<{ itemName: string; quantity: string; unit: string; price: string }[]>([
    { itemName: "Kaju Katli", quantity: "10", unit: "Kg", price: "850" },
  ])

  // Unique Month Groups from Orders
  const uniqueMonthsList = useMemo(() => {
    const months = new Set<string>()
    orders.forEach((o) => {
      const d = new Date(o.orderDate)
      if (!isNaN(d.getTime())) {
        months.add(d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }))
      }
    })
    return Array.from(months)
  }, [orders])

  // Unique Customers from Orders & Directory
  const uniqueCustomersList = useMemo(() => {
    const custSet = new Set<string>()
    customersList.forEach((c) => custSet.add(c.name))
    orders.forEach((o) => custSet.add(o.customerName))
    return Array.from(custSet).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
  }, [customersList, orders])

  // Subtotal & Total Bill Computations
  const itemsSubtotal = useMemo(() => {
    return orderItems.reduce((acc, curr) => {
      const q = parseFloat(curr.quantity) || 0
      const p = parseFloat(curr.price) || 0
      return acc + q * p
    }, 0)
  }, [orderItems])

  const calculatedOrderTotal = useMemo(() => {
    const addCharge = parseFloat(additionalChargeAmount) || 0
    return itemsSubtotal + addCharge
  }, [itemsSubtotal, additionalChargeAmount])

  // Dynamic Customer Selection Handler -> Auto-populates Customer Type, Contact & Address
  const handleSelectCustomerName = (val: string) => {
    setCustomerName(val)
    const existing = customersList.find((c) => c.name.toLowerCase() === val.toLowerCase())
    if (existing) {
      setCustomerType(existing.type)
      setContactNumber(existing.mobile || "")
      setAddress(existing.address || "")
    }
  }

  // Add / Remove / Update Order Item Handlers
  const handleAddOrderItemRow = () => {
    setOrderItems([...orderItems, { itemName: "", quantity: "1", unit: "Kg", price: "0" }])
  }

  const handleRemoveOrderItemRow = (index: number) => {
    if (orderItems.length <= 1) {
      toast.error("At least one order item row is required.")
      return
    }
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

  const handleUpdateOrderItem = (index: number, field: string, value: string) => {
    const updated = [...orderItems]
    updated[index] = { ...updated[index], [field]: value }
    setOrderItems(updated)
  }

  // Open Handlers
  const handleOpenAddModal = () => {
    setCustomerName("")
    setCustomerType("Retail")
    setContactNumber("")
    setOrderDate(new Date().toISOString().split("T")[0])
    setDeliveryDate(new Date().toISOString().split("T")[0])
    setAddress("")
    setOrderItems([{ itemName: "", quantity: "1", unit: "Kg", price: "0" }])
    setAdditionalChargeName("Delivery / Packing Charge")
    setAdditionalChargeAmount("0")
    setInitialAdvanceAmount("0")
    setInitialAdvanceMode("UPI / GPay / PhonePe")
    setInitialAdvancePaidBy("")
    setNotes("")
    setIsAddOpen(true)
  }

  const handleOpenEditModal = (order: Order) => {
    setEditingOrder(order)
    setCustomerName(order.customerName)
    setCustomerType(order.customerType)
    setContactNumber(order.contactNumber)
    setOrderDate(order.orderDate || new Date().toISOString().split("T")[0])
    setDeliveryDate(order.deliveryDate || new Date().toISOString().split("T")[0])
    setAddress(order.address)

    if (order.items && order.items.length > 0) {
      setOrderItems(
        order.items.map((i) => ({
          itemName: i.itemName,
          quantity: i.quantity.toString(),
          unit: i.unit,
          price: i.price.toString(),
        }))
      )
    } else {
      setOrderItems([{ itemName: "", quantity: "1", unit: "Kg", price: "0" }])
    }

    setAdditionalChargeName(order.additionalChargeName || "Delivery / Packing Charge")
    setAdditionalChargeAmount((order.additionalChargeAmount || 0).toString())
    setNotes(order.notes || "")
    setIsEditOpen(true)
  }

  // Open Payment Installment Ledger Modal
  const handleOpenInstallmentModal = (order: Order) => {
    setInstallmentOrder(order)
    setInstDate(new Date().toISOString().split("T")[0])
    setInstAmount("")
    setInstMode("UPI / GPay / PhonePe")
    setInstPaidBy(order.customerName)
    setInstNotes("")
    setIsInstallmentModalOpen(true)
  }

  // Add Installment Payment Handler
  const handleAddInstallment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!installmentOrder) return
    const amt = parseFloat(instAmount)
    if (!amt || amt <= 0) {
      toast.error("Please enter a valid payment amount")
      return
    }

    const newInst: PaymentInstallment = {
      id: `pi-${Date.now()}`,
      date: instDate,
      amount: amt,
      paymentMode: instMode,
      paidBy: instPaidBy.trim() || undefined,
      notes: instNotes.trim() || undefined,
    }

    const currentInstallments = installmentOrder.installments || []
    const updatedInstallments = [...currentInstallments, newInst]
    const updatedTotalPayment = updatedInstallments.reduce((acc, curr) => acc + curr.amount, 0)

    const updatedOrders = orders.map((o) =>
      o.id === installmentOrder.id
        ? {
            ...o,
            installments: updatedInstallments,
            paymentReceived: updatedTotalPayment,
          }
        : o
    )

    setOrders(updatedOrders)
    setInstallmentOrder({
      ...installmentOrder,
      installments: updatedInstallments,
      paymentReceived: updatedTotalPayment,
    })

    setInstAmount("")
    setInstNotes("")
    toast.success(`Recorded installment of ${formatINR(amt)} for ${installmentOrder.orderNumber}`)
  }

  // Delete Installment Payment Handler
  const handleDeleteInstallment = (instId: string) => {
    if (!installmentOrder) return
    if (confirm("Delete this payment installment record?")) {
      const updatedInstallments = (installmentOrder.installments || []).filter((i) => i.id !== instId)
      const updatedTotalPayment = updatedInstallments.reduce((acc, curr) => acc + curr.amount, 0)

      const updatedOrders = orders.map((o) =>
        o.id === installmentOrder.id
          ? {
              ...o,
              installments: updatedInstallments,
              paymentReceived: updatedTotalPayment,
            }
          : o
      )

      setOrders(updatedOrders)
      setInstallmentOrder({
        ...installmentOrder,
        installments: updatedInstallments,
        paymentReceived: updatedTotalPayment,
      })

      toast.success("Installment payment record removed")
    }
  }

  // Create Order Handler with Auto-Customer Addition
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedCustomer = customerName.trim()
    if (!trimmedCustomer || orderItems.length === 0) {
      toast.error("Customer name and at least one order item are required")
      return
    }

    // Auto-Add Customer to Directory if not already existing!
    const customerExists = customersList.some((c) => c.name.toLowerCase() === trimmedCustomer.toLowerCase())
    if (!customerExists) {
      const newCustEntry: Customer = {
        id: `c-${Date.now()}`,
        customerNumber: `GS-${(customersList.length + 1).toString().padStart(4, "0")}`,
        name: trimmedCustomer,
        mobile: contactNumber.trim(),
        type: customerType || "Retail",
        address: address.trim(),
        status: "ACTIVE",
      }
      setCustomersList((prev) => [...prev, newCustEntry])
      toast.info(`New customer "${trimmedCustomer}" added to Customer Directory!`)
    }

    const formattedItems: OrderItem[] = orderItems.map((item, idx) => {
      const q = parseFloat(item.quantity) || 0
      const p = parseFloat(item.price) || 0
      return {
        id: `oi-${Date.now()}-${idx}`,
        itemName: item.itemName.trim() || "Finished Item",
        quantity: q,
        unit: item.unit,
        price: p,
        total: q * p,
      }
    })

    const addChargeVal = parseFloat(additionalChargeAmount) || 0
    const initAdvanceVal = parseFloat(initialAdvanceAmount) || 0

    const initialInstallments: PaymentInstallment[] =
      initAdvanceVal > 0
        ? [
            {
              id: `pi-${Date.now()}`,
              date: orderDate,
              amount: initAdvanceVal,
              paymentMode: initialAdvanceMode,
              paidBy: initialAdvancePaidBy.trim() || trimmedCustomer,
              notes: "Initial advance payment",
            },
          ]
        : []

    const newOrder: Order = {
      id: `o-${Date.now()}`,
      orderNumber: `ORD-${1000 + orders.length + 1}`,
      orderDate: orderDate,
      deliveryDate: deliveryDate,
      customerName: trimmedCustomer,
      customerType: customerType,
      contactNumber: contactNumber.trim(),
      address: address.trim(),
      items: formattedItems,
      additionalChargeName: addChargeVal > 0 ? additionalChargeName.trim() : undefined,
      additionalChargeAmount: addChargeVal,
      totalAmount: calculatedOrderTotal,
      paymentReceived: initAdvanceVal,
      installments: initialInstallments,
      status: "Pending",
      notes: notes.trim() || undefined,
    }

    setOrders([newOrder, ...orders])
    setIsAddOpen(false)
    toast.success(`Created order ${newOrder.orderNumber} for ${trimmedCustomer} (${formatINR(calculatedOrderTotal)})`)
  }

  // Update Order Handler
  const handleUpdateOrder = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingOrder) return
    const trimmedCustomer = customerName.trim()
    if (!trimmedCustomer || orderItems.length === 0) {
      toast.error("Customer name and at least one order item are required")
      return
    }

    // Auto-Add Customer to Directory if not already existing!
    const customerExists = customersList.some((c) => c.name.toLowerCase() === trimmedCustomer.toLowerCase())
    if (!customerExists) {
      const newCustEntry: Customer = {
        id: `c-${Date.now()}`,
        customerNumber: `GS-${(customersList.length + 1).toString().padStart(4, "0")}`,
        name: trimmedCustomer,
        mobile: contactNumber.trim(),
        type: customerType || "Retail",
        address: address.trim(),
        status: "ACTIVE",
      }
      setCustomersList((prev) => [...prev, newCustEntry])
      toast.info(`Customer "${trimmedCustomer}" added to Customer Directory!`)
    }

    const formattedItems: OrderItem[] = orderItems.map((item, idx) => {
      const q = parseFloat(item.quantity) || 0
      const p = parseFloat(item.price) || 0
      return {
        id: `oi-${editingOrder.id}-${idx}`,
        itemName: item.itemName.trim() || "Finished Item",
        quantity: q,
        unit: item.unit,
        price: p,
        total: q * p,
      }
    })

    const addChargeVal = parseFloat(additionalChargeAmount) || 0

    const updated = orders.map((o) =>
      o.id === editingOrder.id
        ? {
            ...o,
            customerName: trimmedCustomer,
            customerType: customerType,
            contactNumber: contactNumber.trim(),
            orderDate: orderDate,
            deliveryDate: deliveryDate,
            address: address.trim(),
            items: formattedItems,
            additionalChargeName: addChargeVal > 0 ? additionalChargeName.trim() : undefined,
            additionalChargeAmount: addChargeVal,
            totalAmount: calculatedOrderTotal,
            notes: notes.trim() || undefined,
          }
        : o
    )

    setOrders(updated)
    setIsEditOpen(false)
    setEditingOrder(null)
    toast.success(`Updated order ${editingOrder.orderNumber}!`)
  }

  const handleUpdateOrderStatus = (id: string, newStatus: "Packed" | "Prep" | "Pending" | "Completed" | "Cancelled") => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)))
    toast.success(`Order status updated to ${newStatus}`)
  }

  const handleDeleteOrder = (id: string, orderNum: string) => {
    if (confirm(`Are you sure you want to cancel/delete ${orderNum}?`)) {
      setOrders((prev) => prev.filter((o) => o.id !== id))
      toast.success(`${orderNum} removed`)
    }
  }

  // Filtered Orders for Main Card Grid
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.items.some((i) => i.itemName.toLowerCase().includes(q))
      const matchesStatus = selectedStatus === "ALL" || o.status === selectedStatus
      const matchesCustomer = selectedCustomerFilter === "ALL" || o.customerName === selectedCustomerFilter

      let matchesMonth = true
      if (selectedMonthFilter !== "ALL") {
        const d = new Date(o.orderDate)
        const monthGroup = !isNaN(d.getTime()) ? d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : ""
        matchesMonth = monthGroup === selectedMonthFilter
      }

      return matchesSearch && matchesStatus && matchesCustomer && matchesMonth
    })
  }, [orders, searchQuery, selectedStatus, selectedCustomerFilter, selectedMonthFilter])

  // Sorting Toggle Handler for History Table
  const handleHistorySort = (field: SortField) => {
    if (historySortField === field) {
      setHistorySortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setHistorySortField(field)
      setHistorySortOrder("asc")
    }
  }

  // Chronological Order History List with Multi-Filters
  const historyOrdersList = useMemo(() => {
    return orders
      .filter((o) => {
        const q = searchQuery.toLowerCase()
        const matchesSearch =
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.items.some((i) => i.itemName.toLowerCase().includes(q))

        const matchesStatus = selectedStatus === "ALL" || o.status === selectedStatus
        const matchesCustomer = selectedCustomerFilter === "ALL" || o.customerName === selectedCustomerFilter

        let matchesMonth = true
        if (selectedMonthFilter !== "ALL") {
          const d = new Date(o.orderDate)
          const monthGroup = !isNaN(d.getTime()) ? d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : ""
          matchesMonth = monthGroup === selectedMonthFilter
        }

        return matchesSearch && matchesStatus && matchesCustomer && matchesMonth
      })
      .sort((a, b) => {
        let valA: string | number = ""
        let valB: string | number = ""

        if (historySortField === "orderNumber") {
          valA = a.orderNumber
          valB = b.orderNumber
        } else if (historySortField === "orderDate") {
          valA = a.orderDate || ""
          valB = b.orderDate || ""
        } else if (historySortField === "customerName") {
          valA = a.customerName
          valB = b.customerName
        } else if (historySortField === "totalAmount") {
          valA = a.totalAmount
          valB = b.totalAmount
        } else if (historySortField === "paymentReceived") {
          valA = a.paymentReceived
          valB = b.paymentReceived
        } else if (historySortField === "status") {
          valA = a.status
          valB = b.status
        }

        let comparison = 0
        if (typeof valA === "number" && typeof valB === "number") {
          comparison = valA - valB
        } else {
          comparison = String(valA).localeCompare(String(valB), undefined, { sensitivity: "base" })
        }

        return historySortOrder === "asc" ? comparison : -comparison
      })
  }, [orders, searchQuery, selectedStatus, selectedCustomerFilter, selectedMonthFilter, historySortField, historySortOrder])

  const renderHistorySortIcon = (field: SortField) => {
    if (historySortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-table-header-text opacity-50 group-hover:opacity-100" />
    return historySortOrder === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-table-header-text font-bold" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-table-header-text font-bold" />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border shadow-xs">
        <div>
          <h1 className="text-headline text-foreground font-bold tracking-tight flex items-center gap-2.5">
            <FileText className="h-7 w-7 text-saffron" />
            Customer Pre-Orders & Delivery Book
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Retail & wholesale pre-orders with installment payments ledger, customer auto-linking & history
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryOpen(true)}
            className="border-saffron text-saffron hover:bg-saffron/10 font-semibold"
          >
            <History className="h-4 w-4 mr-1.5" /> Order History Ledger
          </Button>
          <Button size="sm" onClick={handleOpenAddModal} className="bg-primary hover:bg-saffron-dark text-white font-semibold">
            <Plus className="h-4 w-4 mr-1.5" /> Create New Order
          </Button>
        </div>
      </div>

      {/* Labeled Multi-Filter Card (Search, Customer, Month, Status) */}
      <Card className="border border-border shadow-card">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            {/* Search Input */}
            <div className="space-y-1 w-full sm:w-64">
              <Label className="text-xs font-semibold text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search Order #, Customer, Item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>
            </div>

            {/* Filter by Customer */}
            <div className="space-y-1 w-full sm:w-48">
              <Label className="text-xs font-semibold text-muted-foreground">Filter by Customer</Label>
              <Select value={selectedCustomerFilter} onValueChange={(val) => val && setSelectedCustomerFilter(val)}>
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Customers ({orders.length})</SelectItem>
                  {uniqueCustomersList.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter by Month */}
            <div className="space-y-1 w-full sm:w-44">
              <Label className="text-xs font-semibold text-muted-foreground">Filter by Month</Label>
              <Select value={selectedMonthFilter} onValueChange={(val) => val && setSelectedMonthFilter(val)}>
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Months</SelectItem>
                  {uniqueMonthsList.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reset Filters */}
            {(selectedCustomerFilter !== "ALL" || selectedMonthFilter !== "ALL" || selectedStatus !== "ALL" || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCustomerFilter("ALL")
                  setSelectedMonthFilter("ALL")
                  setSelectedStatus("ALL")
                  setSearchQuery("")
                }}
                className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Reset Filters
              </Button>
            )}
          </div>

          {/* Status Tabs Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-border">
            {["ALL", "Pending", "Prep", "Packed", "Completed", "Cancelled"].map((st) => (
              <Button
                key={st}
                variant={selectedStatus === st ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus(st)}
                className={`text-xs h-8 ${selectedStatus === st ? "bg-deep-green text-white" : ""}`}
              >
                {st}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOrders.map((order) => {
          const balance = order.totalAmount - order.paymentReceived
          const instCount = order.installments ? order.installments.length : 0

          return (
            <Card key={order.id} className="border border-border shadow-card flex flex-col justify-between">
              <div>
                <CardHeader className="bg-muted/30 pb-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground font-mono">{order.orderNumber}</span>
                    <Badge
                      className={
                        order.status === "Packed"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : order.status === "Prep"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : order.status === "Completed"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          : order.status === "Cancelled"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }
                    >
                      {order.status}
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <h3 className="font-bold text-base text-foreground">{order.customerName}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" /> {order.contactNumber || "No phone"} • {order.customerType}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3">
                  {/* Dates Row */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 p-2 rounded-md border border-border">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Order Date</span>
                      <span className="font-semibold text-foreground">{formatDateDDMMYYYY(order.orderDate)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">Delivery Date</span>
                      <span className="font-semibold text-foreground">{formatDateDDMMYYYY(order.deliveryDate)}</span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Order Items</span>
                    <div className="space-y-1 bg-muted/20 p-2 rounded-lg border border-border">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground">{item.itemName}</span>
                          <span className="text-muted-foreground">
                            {item.quantity} {item.unit} × ₹{item.price} = <strong className="text-saffron">{formatINR(item.total)}</strong>
                          </span>
                        </div>
                      ))}

                      {/* Render Additional Charge if present */}
                      {order.additionalChargeAmount && order.additionalChargeAmount > 0 ? (
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-dashed border-border text-saffron font-semibold">
                          <span>+ {order.additionalChargeName || "Additional Charge"}</span>
                          <span>{formatINR(order.additionalChargeAmount)}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Installments & Payment Info */}
                  <div className="space-y-1.5 text-xs pt-1 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total Bill Amount:</span>
                      <span className="font-bold text-saffron text-sm">{formatINR(order.totalAmount)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        Total Paid ({instCount} inst):
                      </span>
                      <span className="font-semibold text-emerald-600">{formatINR(order.paymentReceived)}</span>
                    </div>

                    {balance > 0 ? (
                      <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-dashed border-border">
                        <span className="text-destructive">Remaining Balance Due:</span>
                        <span className="text-destructive">{formatINR(balance)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 pt-1 border-t border-dashed border-border">
                        <span>Payment Status:</span>
                        <span>Fully Paid</span>
                      </div>
                    )}

                    {/* Installments Button */}
                    <div className="pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenInstallmentModal(order)}
                        className="w-full text-xs h-7 border-saffron/40 dark:border-saffron/60 text-saffron hover:bg-saffron/10 font-semibold"
                      >
                        <Receipt className="h-3.5 w-3.5 mr-1.5" /> Manage Installments ({instCount})
                      </Button>
                    </div>
                  </div>

                  {order.notes && (
                    <p className="text-[11px] text-muted-foreground italic bg-muted/40 p-2 rounded">
                      "{order.notes}"
                    </p>
                  )}
                </CardContent>
              </div>

              {/* Card Footer Actions (Status Dropdown + Edit + Delete) */}
              <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-2">
                <Select value={order.status} onValueChange={(val) => val && handleUpdateOrderStatus(order.id, val as any)}>
                  <SelectTrigger className="h-8 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Prep">In Prep</SelectItem>
                    <SelectItem value="Packed">Packed</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEditModal(order)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Edit Order"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteOrder(order.id, order.orderNumber)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    title="Delete Order"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Modal: Order History Ledger (Chronological Overview with Multi-Filters) */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-saffron" /> Order History Ledger Overview
            </DialogTitle>
            <DialogDescription className="text-xs">
              Chronological overview of all customer pre-orders with search, customer & month filters.
            </DialogDescription>
          </DialogHeader>

          {/* History Multi-Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-2">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search Order #, Customer, Item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">Filter by Customer</Label>
              <Select value={selectedCustomerFilter} onValueChange={(val) => val && setSelectedCustomerFilter(val)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Customers</SelectItem>
                  {uniqueCustomersList.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">Filter by Month</Label>
              <Select value={selectedMonthFilter} onValueChange={(val) => val && setSelectedMonthFilter(val)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Months</SelectItem>
                  {uniqueMonthsList.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* History Table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-table-header">
                <TableRow className="hover:bg-transparent">
                  <TableHead
                    onClick={() => handleHistorySort("orderNumber")}
                    className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
                  >
                    <div className="flex items-center gap-1.5">
                      Order # {renderHistorySortIcon("orderNumber")}
                    </div>
                  </TableHead>

                  <TableHead
                    onClick={() => handleHistorySort("orderDate")}
                    className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
                  >
                    <div className="flex items-center gap-1.5">
                      Order Date {renderHistorySortIcon("orderDate")}
                    </div>
                  </TableHead>

                  <TableHead
                    onClick={() => handleHistorySort("customerName")}
                    className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
                  >
                    <div className="flex items-center gap-1.5">
                      Customer & Type {renderHistorySortIcon("customerName")}
                    </div>
                  </TableHead>

                  <TableHead className="text-table-header-text font-semibold text-xs text-left">
                    Ordered Items Summary
                  </TableHead>

                  <TableHead
                    onClick={() => handleHistorySort("totalAmount")}
                    className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
                  >
                    <div className="flex items-center gap-1.5">
                      Total Bill {renderHistorySortIcon("totalAmount")}
                    </div>
                  </TableHead>

                  <TableHead
                    onClick={() => handleHistorySort("paymentReceived")}
                    className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
                  >
                    <div className="flex items-center gap-1.5">
                      Total Paid {renderHistorySortIcon("paymentReceived")}
                    </div>
                  </TableHead>

                  <TableHead className="text-table-header-text font-semibold text-xs text-left">
                    Balance Due
                  </TableHead>

                  <TableHead
                    onClick={() => handleHistorySort("status")}
                    className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
                  >
                    <div className="flex items-center gap-1.5">
                      Status {renderHistorySortIcon("status")}
                    </div>
                  </TableHead>

                  <TableHead className="text-table-header-text font-semibold text-xs text-left">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {historyOrdersList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-left py-10 text-muted-foreground text-sm">
                      No order records found in history matching filter criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  historyOrdersList.map((o) => {
                    const balance = o.totalAmount - o.paymentReceived
                    const itemsSummary = o.items.map((i) => `${i.itemName} (${i.quantity} ${i.unit})`).join(", ")

                    return (
                      <TableRow key={o.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-mono text-xs font-bold text-foreground text-left whitespace-nowrap">
                          {o.orderNumber}
                        </TableCell>
                        <TableCell className="text-xs text-foreground font-semibold text-left whitespace-nowrap">
                          {formatDateDDMMYYYY(o.orderDate)}
                        </TableCell>
                        <TableCell className="text-xs text-left">
                          <span className="font-bold text-foreground block">{o.customerName}</span>
                          <span className="text-[10px] text-muted-foreground">{o.customerType}</span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground text-left max-w-xs truncate">
                          {itemsSummary}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-saffron text-left whitespace-nowrap">
                          {formatINR(o.totalAmount)}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-emerald-600 text-left whitespace-nowrap">
                          {formatINR(o.paymentReceived)}
                        </TableCell>
                        <TableCell className="text-xs text-left whitespace-nowrap">
                          {balance > 0 ? (
                            <span className="font-bold text-destructive">{formatINR(balance)}</span>
                          ) : (
                            <span className="text-emerald-600 font-semibold">Paid</span>
                          )}
                        </TableCell>
                        <TableCell className="text-left">
                          <Badge
                            className={
                              o.status === "Packed"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : o.status === "Prep"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : o.status === "Completed"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                : o.status === "Cancelled"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }
                          >
                            {o.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex items-center justify-start gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setIsHistoryOpen(false)
                                handleOpenInstallmentModal(o)
                              }}
                              className="h-7 w-7 text-saffron hover:text-saffron-dark"
                              title="Payment Installments"
                            >
                              <Receipt className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setIsHistoryOpen(false)
                                handleOpenEditModal(o)
                              }}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="Edit Order"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteOrder(o.id, o.orderNumber)}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              title="Delete Order"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setIsHistoryOpen(false)}>
              Close History
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Payment Installment Ledger Management */}
      <Dialog open={isInstallmentModalOpen} onOpenChange={setIsInstallmentModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-5 w-5 text-saffron" /> Payment Installments Ledger ({installmentOrder?.orderNumber})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Customer: <strong>{installmentOrder?.customerName}</strong> • Total Bill:{" "}
              <strong className="text-saffron">{formatINR(installmentOrder?.totalAmount)}</strong>
            </DialogDescription>
          </DialogHeader>

          {/* Add Installment Form */}
          <form onSubmit={handleAddInstallment} className="p-3 border border-border rounded-lg bg-muted/20 space-y-3">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-saffron" /> Add New Payment Installment
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">Payment Date *</Label>
                <Input type="date" value={instDate} onChange={(e) => setInstDate(e.target.value)} required className="h-8 text-xs" />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">Amount Paid (₹) *</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. 5000"
                  value={instAmount}
                  onChange={(e) => setInstAmount(e.target.value)}
                  required
                  className="h-8 text-xs font-bold text-saffron"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">Payment Mode *</Label>
                <Select value={instMode} onValueChange={(val: any) => setInstMode(val)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="UPI / GPay / PhonePe">UPI / GPay / PhonePe</SelectItem>
                    <SelectItem value="Bank Transfer / NEFT">Bank Transfer / NEFT</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">Paid By (Person Name)</Label>
                <Input
                  placeholder="e.g. Mr. Sharma"
                  value={instPaidBy}
                  onChange={(e) => setInstPaidBy(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">Remarks / Reference Notes</Label>
              <Input
                placeholder="e.g. UPI Ref # 9920192301 or Chq # 440912"
                value={instNotes}
                onChange={(e) => setInstNotes(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <Button type="submit" size="sm" className="w-full bg-primary hover:bg-saffron-dark text-white font-semibold h-8 text-xs">
              + Save Installment Payment
            </Button>
          </form>

          {/* Installment History Table */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs">
              <Label className="font-bold text-foreground">Recorded Installments</Label>
              <span className="text-muted-foreground">
                Total Received: <strong className="text-emerald-600">{formatINR(installmentOrder?.paymentReceived)}</strong> | Balance:{" "}
                <strong className="text-destructive">{formatINR((installmentOrder?.totalAmount || 0) - (installmentOrder?.paymentReceived || 0))}</strong>
              </span>
            </div>

            <div className="border border-border rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-muted text-[11px]">
                  <TableRow>
                    <TableHead className="p-2">Date</TableHead>
                    <TableHead className="p-2">Mode</TableHead>
                    <TableHead className="p-2">Paid By & Notes</TableHead>
                    <TableHead className="p-2 text-right">Amount (₹)</TableHead>
                    <TableHead className="p-2 text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!installmentOrder?.installments || installmentOrder.installments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-xs text-muted-foreground">
                        No installment payments recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    installmentOrder.installments.map((inst) => (
                      <TableRow key={inst.id} className="text-xs">
                        <TableCell className="p-2 font-mono font-semibold">{formatDateDDMMYYYY(inst.date)}</TableCell>
                        <TableCell className="p-2">
                          <Badge variant="outline" className="text-[10px]">
                            {inst.paymentMode}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-2">
                          <span className="font-medium text-foreground block">{inst.paidBy || "—"}</span>
                          {inst.notes && <span className="text-[10px] text-muted-foreground italic">{inst.notes}</span>}
                        </TableCell>
                        <TableCell className="p-2 font-bold text-emerald-600 text-right">{formatINR(inst.amount)}</TableCell>
                        <TableCell className="p-2 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteInstallment(inst.id)}
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button size="sm" variant="outline" onClick={() => setIsInstallmentModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Create New Order (With Searchable Customer Dropdown & Auto-Creation) */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Customer Pre-Order</DialogTitle>
            <DialogDescription>
              Select existing customer or type new name (auto-adds to Customer Directory).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateOrder} className="space-y-4 py-2">
            {/* 1. Customer Name (Searchable Input/Datalist with Auto-Fill) */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Customer Name *</Label>
                <Input
                  list="existing-customers-list"
                  placeholder="Select or type customer name..."
                  value={customerName}
                  onChange={(e) => handleSelectCustomerName(e.target.value)}
                  required
                  className="text-xs"
                />
                <datalist id="existing-customers-list">
                  {uniqueCustomersList.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Customer Type *</Label>
                <Select value={customerType} onValueChange={(val) => val && setCustomerType(val)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {initialCustomerTypes.map((ct) => (
                      <SelectItem key={ct} value={ct}>
                        {ct}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Contact Phone</Label>
                <Input placeholder="+91 98765 43210" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} className="text-xs" />
              </div>
            </div>

            {/* 2. Order Date & Delivery Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Order Date *</Label>
                <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required className="text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Delivery Date *</Label>
                <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} required className="text-xs" />
              </div>
            </div>

            {/* 3. Order Items Section (Free-Text Finished Items) */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">Order Items (Finished Products) *</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddOrderItemRow} className="text-xs text-saffron">
                  + Add Item
                </Button>
              </div>

              {orderItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg border border-border">
                  <Input
                    placeholder="Item Name (e.g. Kaju Katli)"
                    value={item.itemName}
                    onChange={(e) => handleUpdateOrderItem(idx, "itemName", e.target.value)}
                    className="flex-1 text-xs"
                    required
                  />

                  <Input
                    type="number"
                    step="any"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleUpdateOrderItem(idx, "quantity", e.target.value)}
                    className="w-20 text-xs"
                  />

                  <Select value={item.unit} onValueChange={(val) => val && handleUpdateOrderItem(idx, "unit", val)}>
                    <SelectTrigger className="w-20 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kg">Kg</SelectItem>
                      <SelectItem value="Piece">Piece</SelectItem>
                      <SelectItem value="Box">Box</SelectItem>
                      <SelectItem value="Tray">Tray</SelectItem>
                      <SelectItem value="Packet">Packet</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    step="any"
                    placeholder="Rate ₹"
                    value={item.price}
                    onChange={(e) => handleUpdateOrderItem(idx, "price", e.target.value)}
                    className="w-24 text-xs"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveOrderItemRow(idx)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* 4. Additional Charges Section */}
            <div className="p-3 border border-border rounded-lg bg-muted/20 space-y-2">
              <Label className="text-xs font-bold text-foreground">Additional Charges (Optional)</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Charge Description / Reason</Label>
                  <Input
                    placeholder="e.g. Delivery Charge, Packing Charge..."
                    value={additionalChargeName}
                    onChange={(e) => setAdditionalChargeName(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Amount (₹)</Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={additionalChargeAmount}
                    onChange={(e) => setAdditionalChargeAmount(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>
            </div>

            {/* 5. Subtotal, Advance Payment & Total Bill */}
            <div className="p-3 bg-muted/40 rounded-lg space-y-2 border border-border">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Items Subtotal:</span>
                <span className="font-semibold text-foreground">{formatINR(itemsSubtotal)}</span>
              </div>
              {parseFloat(additionalChargeAmount) > 0 && (
                <div className="flex items-center justify-between text-xs text-saffron">
                  <span>+ {additionalChargeName || "Additional Charge"}:</span>
                  <span className="font-semibold">{formatINR(parseFloat(additionalChargeAmount))}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm font-bold pt-1 border-t border-border">
                <span>Total Bill Amount:</span>
                <span className="text-saffron">{formatINR(calculatedOrderTotal)}</span>
              </div>

              {/* Initial Advance Payment Received (Records 1st Installment) */}
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-dashed border-border">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-foreground">Initial Advance (₹)</Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={initialAdvanceAmount}
                    onChange={(e) => setInitialAdvanceAmount(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Payment Mode</Label>
                  <Select value={initialAdvanceMode} onValueChange={(val: any) => setInitialAdvanceMode(val)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="UPI / GPay / PhonePe">UPI / GPay</SelectItem>
                      <SelectItem value="Bank Transfer / NEFT">NEFT</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Paid By</Label>
                  <Input
                    placeholder="Person Name"
                    value={initialAdvancePaidBy}
                    onChange={(e) => setInitialAdvancePaidBy(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Delivery Address</Label>
              <Input placeholder="Full delivery address..." value={address} onChange={(e) => setAddress(e.target.value)} className="text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Special Packing / Delivery Notes</Label>
              <Input placeholder="e.g. Deliver by 8 AM, brass container packing..." value={notes} onChange={(e) => setNotes(e.target.value)} className="text-xs" />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-saffron-dark text-white font-semibold">
                Create Order Entry
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Edit Existing Order */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer Pre-Order ({editingOrder?.orderNumber})</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateOrder} className="space-y-4 py-2">
            {/* 1. Customer Details */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Customer Name *</Label>
                <Input
                  list="existing-customers-list-edit"
                  value={customerName}
                  onChange={(e) => handleSelectCustomerName(e.target.value)}
                  required
                  className="text-xs"
                />
                <datalist id="existing-customers-list-edit">
                  {uniqueCustomersList.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Customer Type *</Label>
                <Select value={customerType} onValueChange={(val) => val && setCustomerType(val)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {initialCustomerTypes.map((ct) => (
                      <SelectItem key={ct} value={ct}>
                        {ct}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Contact Phone</Label>
                <Input value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} className="text-xs" />
              </div>
            </div>

            {/* 2. Order Date & Delivery Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Order Date *</Label>
                <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required className="text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Delivery Date *</Label>
                <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} required className="text-xs" />
              </div>
            </div>

            {/* 3. Order Items Section */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">Order Items (Finished Products) *</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddOrderItemRow} className="text-xs text-saffron">
                  + Add Item
                </Button>
              </div>

              {orderItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg border border-border">
                  <Input
                    placeholder="Item Name"
                    value={item.itemName}
                    onChange={(e) => handleUpdateOrderItem(idx, "itemName", e.target.value)}
                    className="flex-1 text-xs"
                    required
                  />

                  <Input
                    type="number"
                    step="any"
                    value={item.quantity}
                    onChange={(e) => handleUpdateOrderItem(idx, "quantity", e.target.value)}
                    className="w-20 text-xs"
                  />

                  <Select value={item.unit} onValueChange={(val) => val && handleUpdateOrderItem(idx, "unit", val)}>
                    <SelectTrigger className="w-20 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kg">Kg</SelectItem>
                      <SelectItem value="Piece">Piece</SelectItem>
                      <SelectItem value="Box">Box</SelectItem>
                      <SelectItem value="Tray">Tray</SelectItem>
                      <SelectItem value="Packet">Packet</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    step="any"
                    value={item.price}
                    onChange={(e) => handleUpdateOrderItem(idx, "price", e.target.value)}
                    className="w-24 text-xs"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveOrderItemRow(idx)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* 4. Additional Charges Section */}
            <div className="p-3 border border-border rounded-lg bg-muted/20 space-y-2">
              <Label className="text-xs font-bold text-foreground">Additional Charges</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Charge Description / Reason</Label>
                  <Input
                    placeholder="e.g. Delivery Charge, Packing..."
                    value={additionalChargeName}
                    onChange={(e) => setAdditionalChargeName(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Amount (₹)</Label>
                  <Input
                    type="number"
                    step="any"
                    value={additionalChargeAmount}
                    onChange={(e) => setAdditionalChargeAmount(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>
            </div>

            {/* 5. Subtotal & Total Bill */}
            <div className="p-3 bg-muted/40 rounded-lg space-y-2 border border-border">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Items Subtotal:</span>
                <span className="font-semibold text-foreground">{formatINR(itemsSubtotal)}</span>
              </div>
              {parseFloat(additionalChargeAmount) > 0 && (
                <div className="flex items-center justify-between text-xs text-saffron">
                  <span>+ {additionalChargeName || "Additional Charge"}:</span>
                  <span className="font-semibold">{formatINR(parseFloat(additionalChargeAmount))}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm font-bold pt-1 border-t border-border">
                <span>Total Bill Amount:</span>
                <span className="text-saffron">{formatINR(calculatedOrderTotal)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Delivery Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} className="text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Special Packing / Delivery Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="text-xs" />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-saffron-dark text-white font-semibold">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
