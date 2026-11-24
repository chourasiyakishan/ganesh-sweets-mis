"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Tag,
  Check,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  History,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { initialCustomers, initialCustomerTypes, initialOrders, Customer, Order } from "@/lib/mockData"
import { CUSTOMERS_STORAGE_KEY } from "@/lib/data-management"
import { formatINR, formatDateDDMMYYYY } from "@/lib/utils"
import { toast } from "sonner"

type SortField = "customerNumber" | "name" | "mobile" | "address"
type SortOrder = "asc" | "desc"

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerTypes, setCustomerTypes] = useState<string[]>(initialCustomerTypes)

  const loadCustomers = () => {
    try {
      const isDemo = localStorage.getItem("ganesh_sweets_demo_mode") === "true"
      const stored = localStorage.getItem(CUSTOMERS_STORAGE_KEY)
      if (stored !== null) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setCustomers(parsed)
          return
        }
      }
      if (isDemo) {
        setCustomers(initialCustomers)
        localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(initialCustomers))
      } else {
        setCustomers([])
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadCustomers()
    window.addEventListener("customers-updated", loadCustomers)
    window.addEventListener("data-cleared", loadCustomers)
    window.addEventListener("data-restored", loadCustomers)
    return () => {
      window.removeEventListener("customers-updated", loadCustomers)
      window.removeEventListener("data-cleared", loadCustomers)
      window.removeEventListener("data-restored", loadCustomers)
    }
  }, [])

  const updateCustomers = (newList: Customer[]) => {
    setCustomers(newList)
    try {
      localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(newList))
      window.dispatchEvent(new Event("customers-updated"))
    } catch (e) {
      console.error(e)
    }
  }

  // Filter States
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState("ALL")

  // Listen for search parameters from URL or Topbar universal search event
  useEffect(() => {
    const handleUrlParams = () => {
      if (typeof window === "undefined") return
      const params = new URLSearchParams(window.location.search)
      const q = params.get("search")
      const t = params.get("type")
      if (q !== null) setSearchQuery(q)
      if (t !== null) setSelectedType(t)
    }

    handleUrlParams()

    const onSearchNavigate = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail) {
        if (customEvent.detail.search !== undefined) setSearchQuery(customEvent.detail.search)
        if (customEvent.detail.type !== undefined) setSelectedType(customEvent.detail.type)
      }
    }

    window.addEventListener("mis-search-navigate", onSearchNavigate)
    window.addEventListener("popstate", handleUrlParams)
    return () => {
      window.removeEventListener("mis-search-navigate", onSearchNavigate)
      window.removeEventListener("popstate", handleUrlParams)
    }
  }, [])

  // Sorting State
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")

  // Modal State
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

  // Customer Specific Order History Modal
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null)

  // Customer Type Manager State inside Modal
  const [newTypeName, setNewTypeName] = useState("")
  const [editingTypeOldName, setEditingTypeOldName] = useState<string | null>(null)
  const [editingTypeNewName, setEditingTypeNewName] = useState("")

  // Form Fields
  const [name, setName] = useState("")
  const [mobile, setMobile] = useState("")
  const [custType, setCustType] = useState("")
  const [address, setAddress] = useState("")
  const [gstin, setGstin] = useState("")
  const [reference, setReference] = useState("")

  // Sorted Customer Types (Ascending Alphabetical)
  const sortedCustomerTypes = useMemo(() => {
    return [...customerTypes].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
  }, [customerTypes])

  // Linked Customer Orders
  const customerOrdersList = useMemo(() => {
    if (!historyCustomer) return []
    return initialOrders.filter(
      (o) => o.customerName.toLowerCase() === historyCustomer.name.toLowerCase()
    )
  }, [historyCustomer])

  // Sorting Toggle Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  // Filter & Universal Sorting for Customers
  const filteredAndSortedCustomers = useMemo(() => {
    return customers
      .filter((c) => {
        const q = searchQuery.toLowerCase()
        const matchesSearch =
          c.name.toLowerCase().includes(q) ||
          c.customerNumber.toLowerCase().includes(q) ||
          c.mobile.includes(q) ||
          c.address.toLowerCase().includes(q)

        const matchesType = selectedType === "ALL" || c.type === selectedType

        return matchesSearch && matchesType
      })
      .sort((a, b) => {
        let valA: string = ""
        let valB: string = ""

        if (sortField === "customerNumber") {
          valA = a.customerNumber
          valB = b.customerNumber
        } else if (sortField === "name") {
          valA = a.name
          valB = b.name
        } else if (sortField === "mobile") {
          valA = a.mobile
          valB = b.mobile
        } else if (sortField === "address") {
          valA = a.address
          valB = b.address
        }

        const comparison = valA.localeCompare(valB, undefined, { sensitivity: "base" })
        return sortOrder === "asc" ? comparison : -comparison
      })
  }, [customers, searchQuery, selectedType, sortField, sortOrder])

  // Open Handlers
  const handleOpenAddModal = () => {
    setName("")
    setMobile("")
    setCustType(sortedCustomerTypes[0] || "Wholesale")
    setAddress("")
    setGstin("")
    setReference("")
    setIsAddOpen(true)
  }

  const handleOpenEditModal = (customer: Customer) => {
    setEditingCustomer(customer)
    setName(customer.name)
    setMobile(customer.mobile)
    setCustType(customer.type)
    setAddress(customer.address)
    setGstin(customer.gstin || "")
    setReference(customer.reference || "")
    setIsEditOpen(true)
  }

  // --- Customer Types Manager Handlers ---
  const handleAddType = () => {
    const trimmed = newTypeName.trim()
    if (!trimmed) {
      toast.error("Customer type cannot be empty")
      return
    }

    if (customerTypes.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`Customer Type "${trimmed}" already exists!`)
      return
    }

    setCustomerTypes((prev) => [...prev, trimmed])
    setNewTypeName("")
    toast.success(`Customer Type "${trimmed}" added!`)
  }

  const handleStartEditType = (typeName: string) => {
    setEditingTypeOldName(typeName)
    setEditingTypeNewName(typeName)
  }

  const handleSaveEditType = () => {
    if (!editingTypeOldName) return
    const trimmed = editingTypeNewName.trim()

    if (!trimmed) {
      toast.error("Customer type cannot be empty")
      return
    }

    if (
      trimmed.toLowerCase() !== editingTypeOldName.toLowerCase() &&
      customerTypes.some((t) => t.toLowerCase() === trimmed.toLowerCase())
    ) {
      toast.error(`Customer Type "${trimmed}" already exists!`)
      return
    }

    setCustomerTypes((prev) =>
      prev.map((t) => (t === editingTypeOldName ? trimmed : t))
    )

    setCustomers((prev) =>
      prev.map((c) => (c.type === editingTypeOldName ? { ...c, type: trimmed } : c))
    )

    if (custType === editingTypeOldName) {
      setCustType(trimmed)
    }

    setEditingTypeOldName(null)
    setEditingTypeNewName("")
    toast.success(`Customer Type updated to "${trimmed}"`)
  }

  const handleDeleteType = (typeName: string) => {
    if (confirm(`Are you sure you want to delete customer type "${typeName}"?`)) {
      setCustomerTypes((prev) => prev.filter((t) => t !== typeName))

      const remainingTypes = customerTypes.filter((t) => t !== typeName)
      const fallbackType = remainingTypes[0] || "Retail"

      setCustomers((prev) =>
        prev.map((c) => (c.type === typeName ? { ...c, type: fallbackType } : c))
      )

      if (selectedType === typeName) {
        setSelectedType("ALL")
      }
      toast.success(`Customer Type "${typeName}" removed`)
    }
  }

  // --- Customer CRUD Handlers ---
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()

    if (!trimmed) {
      toast.error("Customer name is required")
      return
    }

    if (customers.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`Customer "${trimmed}" already exists!`)
      return
    }

    const newCust: Customer = {
      id: `c-${Date.now()}`,
      customerNumber: `GS-${(customers.length + 1).toString().padStart(4, "0")}`,
      name: trimmed,
      mobile: mobile.trim(),
      type: custType || sortedCustomerTypes[0] || "Retail",
      address: address.trim(),
      gstin: gstin.trim() || undefined,
      reference: reference.trim() || undefined,
      status: "ACTIVE",
    }

    setCustomers([...customers, newCust])
    setIsAddOpen(false)
    toast.success(`Customer "${trimmed}" added!`)
  }

  const handleUpdateCustomer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCustomer) return
    const trimmed = name.trim()

    if (!trimmed) {
      toast.error("Customer name is required")
      return
    }

    if (customers.some((c) => c.id !== editingCustomer.id && c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`Customer "${trimmed}" already exists!`)
      return
    }

    const updated = customers.map((c) =>
      c.id === editingCustomer.id
        ? {
            ...c,
            name: trimmed,
            mobile: mobile.trim(),
            type: custType,
            address: address.trim(),
            gstin: gstin.trim() || undefined,
            reference: reference.trim() || undefined,
          }
        : c
    )

    setCustomers(updated)
    setIsEditOpen(false)
    setEditingCustomer(null)
    toast.success(`Customer "${trimmed}" updated!`)
  }

  const handleDeleteCustomer = (id: string, custName: string) => {
    if (confirm(`Delete customer "${custName}"?`)) {
      setCustomers((prev) => prev.filter((c) => c.id !== id))
      toast.success(`Customer "${custName}" deleted`)
    }
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-table-header-text opacity-50 group-hover:opacity-100" />
    return sortOrder === "asc" ? (
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
            <Users className="h-7 w-7 text-deep-green" />
            Customer Directory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage customer accounts, category types & linked order history
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTypeModalOpen(true)}
            className="border-saffron text-saffron hover:bg-saffron/10 font-medium"
          >
            <Tag className="h-4 w-4 mr-2" /> Customer Types Manager
          </Button>
          <Button size="sm" onClick={handleOpenAddModal} className="bg-primary hover:bg-saffron-dark text-white font-semibold">
            <Plus className="h-4 w-4 mr-1.5" /> Add New Customer
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar with Titles */}
      <Card className="border border-border shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-end justify-between gap-4">
            {/* Search Input */}
            <div className="space-y-1 w-full md:w-80">
              <Label className="text-xs font-semibold text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search Customer ID, Name, Mobile, Address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>
            </div>

            {/* Filter Dropdown with Title */}
            <div className="flex flex-wrap items-end gap-3 w-full md:w-auto">
              {/* Customer Category Type Filter */}
              <div className="space-y-1 w-full sm:w-56">
                <Label className="text-xs font-semibold text-muted-foreground">Customer Category</Label>
                <Select value={selectedType} onValueChange={(val) => val && setSelectedType(val)}>
                  <SelectTrigger className="w-full h-9 text-xs">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All ({customers.length})</SelectItem>
                    {sortedCustomerTypes.map((t) => {
                      const count = customers.filter((c) => c.type === t).length
                      return (
                        <SelectItem key={t} value={t}>
                          {t} ({count})
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Reset Filters Button */}
              {(selectedType !== "ALL" || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedType("ALL")
                    setSearchQuery("")
                  }}
                  className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table (Sequence: Customer ID, Name, Contact number, Address, Action) */}
      <Card className="border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-table-header">
              <TableRow className="hover:bg-transparent">
                {/* 1. Customer ID */}
                <TableHead
                  onClick={() => handleSort("customerNumber")}
                  className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    Customer ID {renderSortIcon("customerNumber")}
                  </div>
                </TableHead>

                {/* 2. Name */}
                <TableHead
                  onClick={() => handleSort("name")}
                  className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    Name {renderSortIcon("name")}
                  </div>
                </TableHead>

                {/* 3. Contact number */}
                <TableHead
                  onClick={() => handleSort("mobile")}
                  className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    Contact number {renderSortIcon("mobile")}
                  </div>
                </TableHead>

                {/* 4. Address */}
                <TableHead
                  onClick={() => handleSort("address")}
                  className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    Address {renderSortIcon("address")}
                  </div>
                </TableHead>

                {/* 5. Action */}
                <TableHead className="text-table-header-text font-semibold text-xs text-left">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredAndSortedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-left py-10 text-muted-foreground text-sm">
                    No customers found matching search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedCustomers.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/50 transition-colors">
                    {/* 1. Customer ID */}
                    <TableCell className="font-mono text-xs font-semibold text-muted-foreground text-left">
                      {c.customerNumber}
                    </TableCell>

                    {/* 2. Name */}
                    <TableCell className="text-left py-2.5">
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-bold text-foreground text-sm">{c.name}</span>
                        {c.gstin && (
                          <p className="text-[10px] text-muted-foreground font-mono">
                            GSTIN: {c.gstin}
                          </p>
                        )}
                        <Badge variant="outline" className="bg-deep-green-container text-deep-green text-[10px] border-none">
                          {c.type}
                        </Badge>
                      </div>
                    </TableCell>

                    {/* 3. Contact number */}
                    <TableCell className="text-xs text-foreground font-medium text-left">
                      {c.mobile || "—"}
                    </TableCell>

                    {/* 4. Address */}
                    <TableCell className="text-xs text-muted-foreground text-left max-w-sm">
                      {c.address || "—"}
                      {c.reference && <span className="text-[11px] block text-saffron font-medium">Ref: {c.reference}</span>}
                    </TableCell>

                    {/* 5. Action (View Order History, Edit & Delete) */}
                    <TableCell className="text-left">
                      <div className="flex items-center justify-start gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setHistoryCustomer(c)}
                          className="h-8 w-8 text-saffron hover:text-saffron-dark hover:bg-saffron/10"
                          title="View Order History"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditModal(c)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Edit Customer"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCustomer(c.id, c.name)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Delete Customer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal: Customer Linked Order History */}
      <Dialog open={!!historyCustomer} onOpenChange={(open) => !open && setHistoryCustomer(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <History className="h-5 w-5 text-saffron" /> Pre-Order History for {historyCustomer?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Category: <strong>{historyCustomer?.type}</strong> • Phone: {historyCustomer?.mobile || "N/A"}
            </DialogDescription>
          </DialogHeader>

          <div className="border border-border rounded-lg overflow-hidden my-2">
            <Table>
              <TableHeader className="bg-table-header text-table-header-text">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-table-header-text font-semibold text-xs text-left">Order #</TableHead>
                  <TableHead className="text-table-header-text font-semibold text-xs text-left">Order Date</TableHead>
                  <TableHead className="text-table-header-text font-semibold text-xs text-left">Items Summary</TableHead>
                  <TableHead className="text-table-header-text font-semibold text-xs text-left">Total Bill</TableHead>
                  <TableHead className="text-table-header-text font-semibold text-xs text-left">Advance Paid</TableHead>
                  <TableHead className="text-table-header-text font-semibold text-xs text-left">Balance Due</TableHead>
                  <TableHead className="text-table-header-text font-semibold text-xs text-left">Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {customerOrdersList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-left py-8 text-muted-foreground text-sm">
                      No order records found for {historyCustomer?.name}.
                    </TableCell>
                  </TableRow>
                ) : (
                  customerOrdersList.map((o) => {
                    const balance = o.totalAmount - o.paymentReceived
                    const itemsSummary = o.items.map((i) => `${i.itemName} (${i.quantity} ${i.unit})`).join(", ")

                    return (
                      <TableRow key={o.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-mono text-xs font-bold text-foreground text-left">{o.orderNumber}</TableCell>
                        <TableCell className="text-xs text-foreground font-semibold text-left">{formatDateDDMMYYYY(o.orderDate)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground text-left max-w-xs truncate">{itemsSummary}</TableCell>
                        <TableCell className="text-xs font-bold text-saffron text-left">{formatINR(o.totalAmount)}</TableCell>
                        <TableCell className="text-xs font-semibold text-emerald-600 text-left">{formatINR(o.paymentReceived)}</TableCell>
                        <TableCell className="text-xs text-left">
                          {balance > 0 ? (
                            <span className="font-bold text-destructive">{formatINR(balance)}</span>
                          ) : (
                            <span className="text-emerald-600 font-semibold">Paid</span>
                          )}
                        </TableCell>
                        <TableCell className="text-left">
                          <Badge variant="outline" className="text-[10px]">
                            {o.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setHistoryCustomer(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Add Customer */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCustomer} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Customer / Business Name *</Label>
              <Input placeholder="e.g. Royal Banquet" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Customer Type *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsTypeModalOpen(true)}
                  className="h-6 px-2 text-xs text-saffron hover:text-saffron-dark hover:bg-saffron/10 font-bold"
                >
                  + New Type
                </Button>
              </div>
              <Select value={custType} onValueChange={(val) => val && setCustType(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {sortedCustomerTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Contact Mobile Number</Label>
              <Input placeholder="+91 98765 43210" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Address</Label>
              <Input placeholder="Full address..." value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">GSTIN (Optional)</Label>
              <Input placeholder="24AAAAA0000A1Z5" value={gstin} onChange={(e) => setGstin(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reference / Notes</Label>
              <Input placeholder="e.g. Referred by Mehta Event Planners" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-saffron-dark text-white font-semibold">
                Save Customer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Edit Customer */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateCustomer} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Customer Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Customer Type *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsTypeModalOpen(true)}
                  className="h-6 px-2 text-xs text-saffron hover:text-saffron-dark hover:bg-saffron/10 font-bold"
                >
                  + New Type
                </Button>
              </div>
              <Select value={custType} onValueChange={(val) => val && setCustType(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortedCustomerTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Contact Mobile Number</Label>
              <Input value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">GSTIN</Label>
              <Input value={gstin} onChange={(e) => setGstin(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reference</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} />
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

      {/* Modal: Customer Types Manager */}
      <Dialog open={isTypeModalOpen} onOpenChange={setIsTypeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Customer Types Manager</DialogTitle>
            <DialogDescription>Add, edit, or delete customer categories sorted alphabetically.</DialogDescription>
          </DialogHeader>

          {/* Add Type Input */}
          <div className="flex items-center gap-2 pt-2 pb-4 border-b border-border">
            <Input
              placeholder="Enter new customer type..."
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddType()
              }}
            />
            <Button size="sm" onClick={handleAddType} className="bg-primary hover:bg-saffron-dark text-white font-semibold shrink-0">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>

          {/* Existing Customer Types List */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Available Customer Types ({sortedCustomerTypes.length})
            </Label>
            <div className="space-y-1.5">
              {sortedCustomerTypes.map((t) => {
                const isEditing = editingTypeOldName === t
                return (
                  <div
                    key={t}
                    className="flex items-center justify-between p-2 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 w-full">
                        <Input
                          size={1}
                          value={editingTypeNewName}
                          onChange={(e) => setEditingTypeNewName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEditType()
                          }}
                          className="h-8 text-sm"
                        />
                        <Button variant="ghost" size="icon" onClick={handleSaveEditType} className="h-8 w-8 text-emerald-600">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditingTypeOldName(null)} className="h-8 w-8 text-muted-foreground">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-medium text-foreground">{t}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStartEditType(t)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteType(t)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsTypeModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
