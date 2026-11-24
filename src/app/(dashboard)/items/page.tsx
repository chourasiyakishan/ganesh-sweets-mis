"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Tag,
  Check,
  X,
  Package,
  Scale,
  Factory,
  StickyNote,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatINR } from "@/lib/utils"
import { initialItems, initialCategories, initialStandardUnits, initialVendors, Item } from "@/lib/mockData"
import { ITEMS_STORAGE_KEY } from "@/lib/data-management"
import { fetchItems, saveItemToDb } from "@/lib/supabase/data-service"
import { toast } from "sonner"

type SortField = "name" | "category" | "vendors" | "price" | "unit" | "notes"
type SortOrder = "asc" | "desc"

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<string[]>(initialCategories)
  const [standardUnits, setStandardUnits] = useState<string[]>(initialStandardUnits)
  const [vendors, setVendors] = useState<any[]>([])

  // Load items from localStorage & Supabase
  const loadItems = () => {
    try {
      const isDemo = localStorage.getItem("ganesh_sweets_demo_mode") === "true"
      const stored = localStorage.getItem(ITEMS_STORAGE_KEY)
      if (stored !== null) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setItems(parsed)
          return
        }
      }
      if (isDemo) {
        setItems(initialItems)
        localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(initialItems))
      } else {
        setItems([])
        fetchItems().then((dbItems) => {
          if (dbItems && dbItems.length > 0) setItems(dbItems)
        })
      }
    } catch (e) {
      console.error("Failed to load items:", e)
    }
  }

  useEffect(() => {
    loadItems()
    window.addEventListener("items-updated", loadItems)
    window.addEventListener("data-cleared", loadItems)
    window.addEventListener("data-restored", loadItems)
    return () => {
      window.removeEventListener("items-updated", loadItems)
      window.removeEventListener("data-cleared", loadItems)
      window.removeEventListener("data-restored", loadItems)
    }
  }, [])

  const updateItems = (newList: Item[]) => {
    setItems(newList)
    try {
      localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(newList))
      window.dispatchEvent(new Event("items-updated"))
    } catch (e) {
      console.error("Failed to save items:", e)
    }
  }

  // Filter States
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("ALL")
  const [selectedVendor, setSelectedVendor] = useState("ALL")

  // Listen for search parameters from URL or Topbar universal search event
  useEffect(() => {
    const handleUrlParams = () => {
      if (typeof window === "undefined") return
      const params = new URLSearchParams(window.location.search)
      const q = params.get("search")
      const cat = params.get("category")
      const v = params.get("vendor")
      if (q !== null) setSearchQuery(q)
      if (cat !== null) setSelectedCategory(cat)
      if (v !== null) setSelectedVendor(v)
    }

    handleUrlParams()

    const onSearchNavigate = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail) {
        if (customEvent.detail.search !== undefined) setSearchQuery(customEvent.detail.search)
        if (customEvent.detail.category !== undefined) setSelectedCategory(customEvent.detail.category)
        if (customEvent.detail.vendor !== undefined) setSelectedVendor(customEvent.detail.vendor)
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

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)

  // Note Viewer Modal State
  const [noteItem, setNoteItem] = useState<Item | null>(null)

  // Category Edit State inside Category Modal
  const [editingCategoryOldName, setEditingCategoryOldName] = useState<string | null>(null)
  const [editingCategoryNewName, setEditingCategoryNewName] = useState("")
  const [newCategoryName, setNewCategoryName] = useState("")

  // Unit Manager State inside Unit Modal
  const [newUnitName, setNewUnitName] = useState("")

  // Item Form Fields State
  const [itemName, setItemName] = useState("")
  const [itemCategory, setItemCategory] = useState("")
  const [itemPrice, setItemPrice] = useState("")
  const [itemUnit, setItemUnit] = useState("Kg")
  const [selectedVendors, setSelectedVendors] = useState<string[]>([])
  const [itemNotes, setItemNotes] = useState("")

  // Sorted Categories (Ascending Order)
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
  }, [categories])

  // Sorting Toggle Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  // Filter & Universal Sorting for Items
  const filteredAndSortedItems = useMemo(() => {
    return items
      .filter((item) => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = selectedCategory === "ALL" || item.category === selectedCategory
        const matchesVendor =
          selectedVendor === "ALL" ||
          (item.vendorNames && item.vendorNames.includes(selectedVendor))
        return matchesSearch && matchesCategory && matchesVendor
      })
      .sort((a, b) => {
        let valA: string | number = ""
        let valB: string | number = ""

        if (sortField === "name") {
          valA = a.name
          valB = b.name
        } else if (sortField === "category") {
          valA = a.category
          valB = b.category
        } else if (sortField === "vendors") {
          valA = (a.vendorNames || []).join(", ")
          valB = (b.vendorNames || []).join(", ")
        } else if (sortField === "price") {
          valA = a.currentPrice
          valB = b.currentPrice
        } else if (sortField === "unit") {
          valA = a.unit
          valB = b.unit
        } else if (sortField === "notes") {
          valA = a.notes || ""
          valB = b.notes || ""
        }

        let comparison = 0
        if (typeof valA === "number" && typeof valB === "number") {
          comparison = valA - valB
        } else {
          comparison = String(valA).localeCompare(String(valB), undefined, { sensitivity: "base" })
        }

        return sortOrder === "asc" ? comparison : -comparison
      })
  }, [items, searchQuery, selectedCategory, selectedVendor, sortField, sortOrder])

  // Open Handlers
  const handleOpenAddModal = () => {
    setItemName("")
    setItemCategory(sortedCategories[0] || "Raw Materials")
    setItemPrice("")
    setItemUnit(standardUnits[0] || "Kg")
    setSelectedVendors([])
    setItemNotes("")
    setIsAddOpen(true)
  }

  const handleOpenEditModal = (item: Item) => {
    setEditingItem(item)
    setItemName(item.name)
    setItemCategory(item.category)
    setItemPrice(item.currentPrice.toString())
    setItemUnit(item.unit)
    setSelectedVendors(item.vendorNames || [])
    setItemNotes(item.notes || "")
    setIsEditOpen(true)
  }

  // --- Category Management Handlers ---
  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim()
    if (!trimmed) {
      toast.error("Category name cannot be empty")
      return
    }

    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`Category "${trimmed}" already exists!`)
      return
    }

    setCategories((prev) => [...prev, trimmed])
    setNewCategoryName("")
    toast.success(`Category "${trimmed}" added successfully`)
  }

  const handleStartEditCategory = (catName: string) => {
    setEditingCategoryOldName(catName)
    setEditingCategoryNewName(catName)
  }

  const handleSaveEditCategory = () => {
    if (!editingCategoryOldName) return
    const trimmed = editingCategoryNewName.trim()

    if (!trimmed) {
      toast.error("Category name cannot be empty")
      return
    }

    if (
      trimmed.toLowerCase() !== editingCategoryOldName.toLowerCase() &&
      categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())
    ) {
      toast.error(`Category "${trimmed}" already exists!`)
      return
    }

    setCategories((prev) =>
      prev.map((c) => (c === editingCategoryOldName ? trimmed : c))
    )

    setItems((prev) =>
      prev.map((item) =>
        item.category === editingCategoryOldName ? { ...item, category: trimmed } : item
      )
    )

    if (itemCategory === editingCategoryOldName) {
      setItemCategory(trimmed)
    }

    setEditingCategoryOldName(null)
    setEditingCategoryNewName("")
    toast.success(`Category updated to "${trimmed}"`)
  }

  const handleDeleteCategory = (catName: string) => {
    if (confirm(`Are you sure you want to delete category "${catName}"?`)) {
      setCategories((prev) => prev.filter((c) => c !== catName))

      const remainingCats = categories.filter((c) => c !== catName)
      const fallbackCat = remainingCats[0] || "Uncategorized"

      setItems((prev) =>
        prev.map((item) =>
          item.category === catName ? { ...item, category: fallbackCat } : item
        )
      )

      if (selectedCategory === catName) {
        setSelectedCategory("ALL")
      }
      toast.success(`Category "${catName}" removed`)
    }
  }

  // --- Standard Unit Management Handlers ---
  const handleAddUnit = () => {
    const trimmed = newUnitName.trim()
    if (!trimmed) {
      toast.error("Unit name cannot be empty")
      return
    }

    if (standardUnits.some((u) => u.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`Unit "${trimmed}" already exists!`)
      return
    }

    setStandardUnits((prev) => [...prev, trimmed])
    setNewUnitName("")
    toast.success(`Standard Unit "${trimmed}" added`)
  }

  const handleDeleteUnit = (unitName: string) => {
    if (standardUnits.length <= 1) {
      toast.error("At least one standard unit must remain.")
      return
    }
    if (confirm(`Are you sure you want to remove unit "${unitName}"?`)) {
      setStandardUnits((prev) => prev.filter((u) => u !== unitName))
      if (itemUnit === unitName) {
        setItemUnit(standardUnits.find((u) => u !== unitName) || "Kg")
      }
      toast.success(`Unit "${unitName}" removed`)
    }
  }

  // --- Item CRUD Handlers ---
  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = itemName.trim()

    if (!trimmedName) {
      toast.error("Item name is required")
      return
    }

    if (items.some((i) => i.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error(`An item named "${trimmedName}" already exists!`)
      return
    }

    const newItem: Item = {
      id: `item-${Date.now()}`,
      name: trimmedName,
      category: itemCategory || sortedCategories[0] || "Raw Materials",
      currentPrice: parseFloat(itemPrice) || 0,
      unit: itemUnit,
      status: "ACTIVE",
      vendorNames: selectedVendors,
      notes: itemNotes.trim() || undefined,
    }

    updateItems([...items, newItem])
    saveItemToDb(newItem)
    setIsAddOpen(false)
    toast.success(`Item "${trimmedName}" created successfully!`)
  }

  const handleUpdateItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return
    const trimmedName = itemName.trim()

    if (!trimmedName) {
      toast.error("Item name is required")
      return
    }

    if (items.some((i) => i.id !== editingItem.id && i.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error(`An item named "${trimmedName}" already exists!`)
      return
    }

    const updated = items.map((i) =>
      i.id === editingItem.id
        ? {
            ...i,
            name: trimmedName,
            category: itemCategory,
            currentPrice: parseFloat(itemPrice) || 0,
            unit: itemUnit,
            vendorNames: selectedVendors,
            notes: itemNotes.trim() || undefined,
          }
        : i
    )

    updateItems(updated)
    const updatedItem = updated.find((i) => i.id === editingItem.id)
    if (updatedItem) saveItemToDb(updatedItem)
    setIsEditOpen(false)
    setEditingItem(null)
    toast.success(`Item "${trimmedName}" updated!`)
  }

  const handleDeleteItem = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      updateItems(items.filter((i) => i.id !== id))
      toast.success(`Item "${name}" deleted`)
    }
  }

  const toggleVendorSelection = (vendorName: string) => {
    setSelectedVendors((prev) =>
      prev.includes(vendorName)
        ? prev.filter((v) => v !== vendorName)
        : [...prev, vendorName]
    )
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border shadow-xs">
        <div>
          <h1 className="text-headline text-foreground font-bold tracking-tight flex items-center gap-2.5">
            <Package className="h-7 w-7 text-saffron" />
            Item Master (Raw Materials & Products)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Centralized ingredient database with current market rates, vendor mappings & custom categories
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCategoryModalOpen(true)}
            className="border-saffron text-saffron hover:bg-saffron/10 font-medium"
          >
            <Tag className="h-4 w-4 mr-2" /> Categories Manager
          </Button>
          <Button size="sm" onClick={handleOpenAddModal} className="bg-primary hover:bg-saffron-dark text-primary-foreground font-semibold">
            <Plus className="h-4 w-4 mr-1.5" /> Add New Item
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border border-border shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-end justify-between gap-4">
            {/* Search Input */}
            <div className="space-y-1 w-full md:w-72">
              <Label className="text-xs font-semibold text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search Items By Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>
            </div>

            {/* Filter Dropdowns with Titles */}
            <div className="flex flex-wrap items-end gap-3 w-full md:w-auto">
              {/* Category Filter Dropdown */}
              <div className="space-y-1 w-full sm:w-48">
                <Label className="text-xs font-semibold text-muted-foreground">Category</Label>
                <Select value={selectedCategory} onValueChange={(val) => val && setSelectedCategory(val)}>
                  <SelectTrigger className="w-full h-9 text-xs">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All ({items.length})</SelectItem>
                    {sortedCategories.map((cat) => {
                      const count = items.filter((i) => i.category === cat).length
                      return (
                        <SelectItem key={cat} value={cat}>
                          {cat} ({count})
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Vendor Filter Dropdown */}
              <div className="space-y-1 w-full sm:w-48">
                <Label className="text-xs font-semibold text-muted-foreground">Vendor</Label>
                <Select value={selectedVendor} onValueChange={(val) => val && setSelectedVendor(val)}>
                  <SelectTrigger className="w-full h-9 text-xs">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    {vendors.map((v) => {
                      const count = items.filter((i) => i.vendorNames?.includes(v.name)).length
                      return (
                        <SelectItem key={v.id} value={v.name}>
                          {v.name} ({count})
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Reset Filters Button */}
              {(selectedCategory !== "ALL" || selectedVendor !== "ALL" || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory("ALL")
                    setSelectedVendor("ALL")
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

      {/* Items Data Table (Sequence: Item, Category, Vendor, Price, Unit, Notes, Actions) */}
      <Card className="border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-table-header">
              <TableRow className="hover:bg-transparent">
                {/* 1. Item Name Header */}
                <TableHead
                  onClick={() => handleSort("name")}
                  className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    Item {renderSortIcon("name")}
                  </div>
                </TableHead>

                {/* 2. Category Header */}
                <TableHead
                  onClick={() => handleSort("category")}
                  className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    Category {renderSortIcon("category")}
                  </div>
                </TableHead>

                {/* 3. Vendor Header */}
                <TableHead
                  onClick={() => handleSort("vendors")}
                  className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    Vendor {renderSortIcon("vendors")}
                  </div>
                </TableHead>

                {/* 4. Price Header */}
                <TableHead
                  onClick={() => handleSort("price")}
                  className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    Price {renderSortIcon("price")}
                  </div>
                </TableHead>

                {/* 5. Unit Header */}
                <TableHead
                  onClick={() => handleSort("unit")}
                  className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    Unit {renderSortIcon("unit")}
                  </div>
                </TableHead>

                {/* 6. Notes Header */}
                <TableHead
                  onClick={() => handleSort("notes")}
                  className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    Notes {renderSortIcon("notes")}
                  </div>
                </TableHead>

                {/* 7. Actions Header */}
                <TableHead className="text-table-header-text font-semibold text-xs text-left">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredAndSortedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-left py-10 text-muted-foreground text-sm">
                    No items found matching your filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                    {/* 1. Item Name (Left aligned) */}
                    <TableCell className="font-bold text-foreground text-sm text-left">{item.name}</TableCell>

                    {/* 2. Category (Left aligned) */}
                    <TableCell className="text-left">
                      <Badge variant="outline" className="bg-muted text-foreground border-border">
                        {item.category}
                      </Badge>
                    </TableCell>

                    {/* 3. Vendor (Left aligned) */}
                    <TableCell className="text-left">
                      {item.vendorNames && item.vendorNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.vendorNames.map((vName) => (
                            <Badge key={vName} variant="secondary" className="text-xs bg-accent text-accent-foreground">
                              {vName}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">None mapped</span>
                      )}
                    </TableCell>

                    {/* 4. Price (Left aligned - Price amount only) */}
                    <TableCell className="text-sm font-bold text-saffron text-left">
                      {formatINR(item.currentPrice)}
                    </TableCell>

                    {/* 5. Unit (Left aligned) */}
                    <TableCell className="text-sm text-muted-foreground text-left">{item.unit}</TableCell>

                    {/* 6. Notes Icon Button (Left aligned) */}
                    <TableCell className="text-left">
                      {item.notes ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setNoteItem(item)}
                          className="h-8 w-8 text-saffron hover:text-saffron-dark hover:bg-saffron/10"
                          title="View Note"
                        >
                          <StickyNote className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground select-none">—</span>
                      )}
                    </TableCell>

                    {/* 7. Actions (Left aligned) */}
                    <TableCell className="text-left">
                      <div className="flex items-center justify-start gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditModal(item)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id, item.name)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
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

      {/* Note View Dialog */}
      <Dialog open={!!noteItem} onOpenChange={(open) => !open && setNoteItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <StickyNote className="h-5 w-5 text-saffron" /> Note for {noteItem?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Category: {noteItem?.category}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 rounded-lg bg-muted/50 border border-border my-2">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {noteItem?.notes || "No notes available for this item."}
            </p>
          </div>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setNoteItem(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Add New Item */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Item Master</DialogTitle>
            <DialogDescription>Create a raw material or sweet product entry.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateItem} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Item Name *</Label>
              <Input placeholder="e.g. Pure Cow Ghee" value={itemName} onChange={(e) => setItemName(e.target.value)} required />
            </div>

            {/* Position of + New Category button placed ABOVE the category dropdown */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Category *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="h-6 px-2 text-xs text-saffron hover:text-saffron-dark hover:bg-saffron/10 font-bold"
                >
                  + New Category
                </Button>
              </div>
              <Select value={itemCategory} onValueChange={(val) => val && setItemCategory(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {sortedCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Standard Unit Selection with + Manage Units option */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Standard Unit *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsUnitModalOpen(true)}
                  className="h-6 px-2 text-xs text-primary hover:bg-primary/10 font-semibold"
                >
                  <Scale className="h-3 w-3 mr-1" /> Add/Remove Units
                </Button>
              </div>
              <Select value={itemUnit} onValueChange={(val) => val && setItemUnit(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {standardUnits.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Current Standard Rate (₹/{itemUnit})</Label>
              <Input type="number" step="any" placeholder="e.g. 850" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} />
            </div>

            {/* Available Vendors Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Factory className="h-3.5 w-3.5 text-muted-foreground" /> Map Available Vendors
              </Label>
              <div className="border border-border rounded-md p-3 bg-muted/30 max-h-36 overflow-y-auto space-y-2">
                {vendors.map((v) => {
                  const isChecked = selectedVendors.includes(v.name)
                  return (
                    <label
                      key={v.id}
                      onClick={() => toggleVendorSelection(v.name)}
                      className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-accent cursor-pointer select-none"
                    >
                      <span className="font-medium text-foreground">{v.name}</span>
                      <div
                        className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                          isChecked
                            ? "bg-primary border-primary text-white"
                            : "border-input bg-background"
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3" />}
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notes / Description</Label>
              <Input placeholder="Optional remarks..." value={itemNotes} onChange={(e) => setItemNotes(e.target.value)} />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-saffron-dark text-white font-semibold">
                Create Item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Edit Item */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Item Master</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateItem} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Item Name *</Label>
              <Input value={itemName} onChange={(e) => setItemName(e.target.value)} required />
            </div>

            {/* Position of + New Category button placed ABOVE the category dropdown */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Category *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="h-6 px-2 text-xs text-saffron hover:text-saffron-dark hover:bg-saffron/10 font-bold"
                >
                  + New Category
                </Button>
              </div>
              <Select value={itemCategory} onValueChange={(val) => val && setItemCategory(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortedCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Standard Unit Selection with + Manage Units option */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Standard Unit *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsUnitModalOpen(true)}
                  className="h-6 px-2 text-xs text-primary hover:bg-primary/10 font-semibold"
                >
                  <Scale className="h-3 w-3 mr-1" /> Add/Remove Units
                </Button>
              </div>
              <Select value={itemUnit} onValueChange={(val) => val && setItemUnit(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {standardUnits.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Current Standard Rate (₹/{itemUnit})</Label>
              <Input type="number" step="any" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} />
            </div>

            {/* Available Vendors Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Factory className="h-3.5 w-3.5 text-muted-foreground" /> Map Available Vendors
              </Label>
              <div className="border border-border rounded-md p-3 bg-muted/30 max-h-36 overflow-y-auto space-y-2">
                {vendors.map((v) => {
                  const isChecked = selectedVendors.includes(v.name)
                  return (
                    <label
                      key={v.id}
                      onClick={() => toggleVendorSelection(v.name)}
                      className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-accent cursor-pointer select-none"
                    >
                      <span className="font-medium text-foreground">{v.name}</span>
                      <div
                        className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                          isChecked
                            ? "bg-primary border-primary text-white"
                            : "border-input bg-background"
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3" />}
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notes</Label>
              <Input value={itemNotes} onChange={(e) => setItemNotes(e.target.value)} />
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

      {/* Modal: Category Manager */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Category Manager</DialogTitle>
            <DialogDescription>Add, edit, or delete item categories sorted by name.</DialogDescription>
          </DialogHeader>

          {/* Add Category Section */}
          <div className="flex items-center gap-2 pt-2 pb-4 border-b border-border">
            <Input
              placeholder="Enter new category name..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCategory()
              }}
            />
            <Button size="sm" onClick={handleAddCategory} className="bg-primary hover:bg-saffron-dark text-white font-semibold shrink-0">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>

          {/* Existing Categories List */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Existing Categories ({sortedCategories.length})
            </Label>
            <div className="space-y-1.5">
              {sortedCategories.map((cat) => {
                const isEditing = editingCategoryOldName === cat
                return (
                  <div
                    key={cat}
                    className="flex items-center justify-between p-2 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 w-full">
                        <Input
                          size={1}
                          value={editingCategoryNewName}
                          onChange={(e) => setEditingCategoryNewName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEditCategory()
                          }}
                          className="h-8 text-sm"
                        />
                        <Button variant="ghost" size="icon" onClick={handleSaveEditCategory} className="h-8 w-8 text-emerald-600">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditingCategoryOldName(null)} className="h-8 w-8 text-muted-foreground">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-medium text-foreground">{cat}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStartEditCategory(cat)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCategory(cat)}
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
            <Button variant="outline" size="sm" onClick={() => setIsCategoryModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Standard Units Manager */}
      <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Manage Standard Units</DialogTitle>
            <DialogDescription>Add custom units or remove unused standard measurement units.</DialogDescription>
          </DialogHeader>

          {/* Add Unit Input */}
          <div className="flex items-center gap-2 pt-2 pb-4 border-b border-border">
            <Input
              placeholder="e.g. Barrel, Container..."
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddUnit()
              }}
            />
            <Button size="sm" onClick={handleAddUnit} className="bg-primary hover:bg-saffron-dark text-white font-semibold shrink-0">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>

          {/* Units List */}
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Available Measurement Units ({standardUnits.length})
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {standardUnits.map((u) => (
                <div key={u} className="flex items-center justify-between p-2 rounded border border-border bg-card text-xs font-medium">
                  <span>{u}</span>
                  <button onClick={() => handleDeleteUnit(u)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsUnitModalOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
