"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Search,
  Bell,
  Sun,
  Moon,
  Laptop,
  Package,
  Factory,
  Users,
  ShoppingCart,
  FileText,
  ChefHat,
  Scale,
  TrendingUp,
  BarChart3,
  Settings as SettingsIcon,
  Tag,
  ArrowRight,
  X,
  Layers,
  LogOut,
  Sparkles,
  UserCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { useRouter } from "next/navigation"
import { formatINR } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { isDemoMode } from "@/lib/data-management"
import {
  initialItems,
  initialCategories,
  initialVendors,
  initialCustomers,
  initialRecipes,
  initialOrders,
  initialPurchases,
  Item,
  Vendor,
  Customer,
  Recipe,
  Order,
  PurchaseEntry,
} from "@/lib/mockData"

const PURCHASES_STORAGE_KEY = "ganesh_sweets_purchases"

export function Topbar() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light")
  const [demoActive, setDemoActive] = useState(false)
  const router = useRouter()
  const { user, users, switchUser, logout } = useAuth()

  // Listen to Demo Mode status
  useEffect(() => {
    setDemoActive(isDemoMode())
    const handleDemo = () => setDemoActive(isDemoMode())
    window.addEventListener("demo-mode-changed", handleDemo)
    window.addEventListener("data-cleared", handleDemo)
    window.addEventListener("data-restored", handleDemo)
    return () => {
      window.removeEventListener("demo-mode-changed", handleDemo)
      window.removeEventListener("data-cleared", handleDemo)
      window.removeEventListener("data-restored", handleDemo)
    }
  }, [])

  // User initials
  const userInitials = useMemo(() => {
    if (!user?.name) return "GS"
    const parts = user.name.split(" ").filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return user.name.slice(0, 2).toUpperCase()
  }, [user?.name])

  // Real-time Master & Ledger Records
  const [itemsList] = useState<Item[]>(initialItems)
  const [categoriesList] = useState<string[]>(initialCategories)
  const [vendorsList] = useState<Vendor[]>(initialVendors)
  const [customersList] = useState<Customer[]>(initialCustomers)
  const [recipesList] = useState<Recipe[]>(initialRecipes)
  const [ordersList] = useState<Order[]>(initialOrders)
  const [purchasesList, setPurchasesList] = useState<PurchaseEntry[]>(initialPurchases)

  // Sync purchases from localStorage
  useEffect(() => {
    const loadPurchases = () => {
      try {
        const stored = localStorage.getItem(PURCHASES_STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPurchasesList(parsed)
          }
        }
      } catch (e) {
        console.error("Failed to load purchases in Topbar:", e)
      }
    }

    loadPurchases()
    window.addEventListener("purchases-updated", loadPurchases)
    return () => window.removeEventListener("purchases-updated", loadPurchases)
  }, [])

  // Theme & keyboard shortcut listener
  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme") as "light" | "dark" | "system") || "light"
    setTheme(savedTheme)
    applyTheme(savedTheme)

    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const applyTheme = (targetTheme: "light" | "dark" | "system") => {
    if (targetTheme === "dark") {
      document.documentElement.classList.add("dark")
    } else if (targetTheme === "light") {
      document.documentElement.classList.remove("dark")
    } else {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    }
  }

  const toggleTheme = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    applyTheme(newTheme)
  }

  // Navigate helper with deep query parameter support and broadcast event
  const navigateTo = (path: string, searchParams?: Record<string, string>) => {
    setSearchOpen(false)
    setQuery("")

    if (searchParams) {
      const urlParams = new URLSearchParams()
      Object.entries(searchParams).forEach(([k, v]) => {
        if (v) urlParams.set(k, v)
      })
      const fullPath = `${path}?${urlParams.toString()}`
      router.push(fullPath)
      // Broadcast event so active page immediately filters even without full unmount
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("mis-search-navigate", { detail: searchParams }))
      }
    } else {
      router.push(path)
    }
  }

  // --- Search Logic (Android Settings / Universal Spotlight Style) ---
  const cleanQuery = query.trim().toLowerCase()
  const queryWords = useMemo(() => cleanQuery.split(/\s+/).filter(Boolean), [cleanQuery])

  // 1. Raw Materials & Ingredients
  const matchedItems = useMemo(() => {
    if (!cleanQuery) return []
    return itemsList.filter((item) => {
      const vendorStr = item.vendorNames?.join(" ") || ""
      const fullStr = `${item.name} ${item.category} ${vendorStr} ${item.notes || ""} ${item.unit} ${item.currentPrice}`.toLowerCase()
      return queryWords.every((w) => fullStr.includes(w))
    })
  }, [itemsList, cleanQuery, queryWords])

  // 2. Categories
  const matchedCategories = useMemo(() => {
    if (!cleanQuery) return []
    return categoriesList.filter((cat) => {
      const fullStr = `${cat} category`.toLowerCase()
      return queryWords.every((w) => fullStr.includes(w))
    })
  }, [categoriesList, cleanQuery, queryWords])

  // 3. Vendors & Suppliers
  const matchedVendors = useMemo(() => {
    if (!cleanQuery) return []
    return vendorsList.filter((v) => {
      const matStr = v.materials.join(" ")
      const fullStr = `${v.name} ${v.code} ${v.contactName || ""} ${v.phone || ""} ${matStr} ${v.address} ${v.gstin}`.toLowerCase()
      return queryWords.every((w) => fullStr.includes(w))
    })
  }, [vendorsList, cleanQuery, queryWords])

  // 4. Customers Directory
  const matchedCustomers = useMemo(() => {
    if (!cleanQuery) return []
    return customersList.filter((c) => {
      const fullStr = `${c.name} ${c.customerNumber} ${c.mobile} ${c.type} ${c.address} ${c.reference || ""} ${c.gstin || ""}`.toLowerCase()
      return queryWords.every((w) => fullStr.includes(w))
    })
  }, [customersList, cleanQuery, queryWords])

  // 5. Recipes & Products
  const matchedRecipes = useMemo(() => {
    if (!cleanQuery) return []
    return recipesList.filter((r) => {
      const ingStr = r.ingredients.map((i) => i.itemName).join(" ")
      const equipStr = r.equipment?.map((e) => e.name).join(" ") || ""
      const fullStr = `${r.name} ${r.outputYield} ${r.outputUnit} ${r.calculatedCostPerKg} ${ingStr} ${equipStr}`.toLowerCase()
      return queryWords.every((w) => fullStr.includes(w))
    })
  }, [recipesList, cleanQuery, queryWords])

  // 6. Orders & Pre-Orders
  const matchedOrders = useMemo(() => {
    if (!cleanQuery) return []
    return ordersList.filter((o) => {
      const itemsStr = o.items.map((i) => `${i.itemName} ${i.quantity}${i.unit}`).join(" ")
      const fullStr = `${o.orderNumber} ${o.customerName} ${o.customerType} ${o.contactNumber} ${o.status} ${o.deliveryDate} ${o.totalAmount} ${itemsStr} ${o.notes || ""}`.toLowerCase()
      return queryWords.every((w) => fullStr.includes(w))
    })
  }, [ordersList, cleanQuery, queryWords])

  // 7. Purchases Ledger Entries
  const matchedPurchases = useMemo(() => {
    if (!cleanQuery) return []
    return purchasesList.filter((p) => {
      const fullStr = `${p.itemName} ${p.vendorName} ${p.lotNumber || ""} ${p.purchaseDate} ${p.monthGroup || ""} ${p.rate} ${p.total} ${p.quantity}${p.unit} ${p.remarks || ""}`.toLowerCase()
      return queryWords.every((w) => fullStr.includes(w))
    })
  }, [purchasesList, cleanQuery, queryWords])

  // 8. Calculators & System Tools
  const systemTools = useMemo(() => [
    {
      name: "Item Master",
      desc: "Raw materials, ingredients, category & unit management",
      path: "/items",
      icon: Package,
      keywords: "items raw materials ingredients units inventory kaju ghee milk sugar besan maida",
      group: "Master Data",
    },
    {
      name: "Vendor Master",
      desc: "Suppliers directory, contacts, GSTIN & materials mapping",
      path: "/vendors",
      icon: Factory,
      keywords: "vendors suppliers contacts mahi shreeji gujarat kerala phone address",
      group: "Master Data",
    },
    {
      name: "Customer Directory",
      desc: "Retail, wholesale & catering client records and history",
      path: "/customers",
      icon: Users,
      keywords: "customers clients directory sharma royal banquet apex catering wholesale retail",
      group: "Master Data",
    },
    {
      name: "Purchases Entry Ledger",
      desc: "Raw material bulk procurement, lots & invoice ledger",
      path: "/purchases",
      icon: ShoppingCart,
      keywords: "purchases procurement buying bulk purchase lots rates invoices fy bills khareedi",
      group: "Transactions",
    },
    {
      name: "Orders Book & Installments",
      desc: "Order processing, installments tracking & deliveries",
      path: "/orders",
      icon: FileText,
      keywords: "orders sales booking installments advance delivery packed prep pending ord",
      group: "Transactions",
    },
    {
      name: "Recipes & Costing Intelligence",
      desc: "Standard recipe formulas, yield, cost/kg & preparation steps",
      path: "/recipes",
      icon: ChefHat,
      keywords: "recipes costing formulas kaju katli motichoor laddu sweet making production yield vidhi",
      group: "Operations",
    },
    {
      name: "Weight-Price Counter Calculator",
      desc: "Quick counter billing calculation for variable sweet weights",
      path: "/calculators/weight-price",
      icon: Scale,
      keywords: "weight price calculator counter gram kilogram rate vazan hisab bill tol",
      group: "Calculators",
    },
    {
      name: "Profit & Loss Calculator",
      desc: "Batch margin analysis and profit estimation calculator",
      path: "/calculators/profit-loss",
      icon: TrendingUp,
      keywords: "profit loss calculator p&l margin revenue cost munafa fayda hisab",
      group: "Calculators",
    },
    {
      name: "Bulk Recipe Scaler",
      desc: "Scale recipe ingredient quantities for large wedding & festive batches",
      path: "/calculators/bulk-recipe",
      icon: ChefHat,
      keywords: "bulk recipe scaler batch multiply catering halwai scale production",
      group: "Calculators",
    },
    {
      name: "Business Reports & Analytics",
      desc: "Sales vs purchase trends, top categories & financial summaries",
      path: "/reports",
      icon: BarChart3,
      keywords: "reports analytics charts business sales purchase graphs summary",
      group: "Operations",
    },
    {
      name: "Settings & Role Management",
      desc: "Business profile, user permissions & role management",
      path: "/settings",
      icon: SettingsIcon,
      keywords: "settings configuration users roles permissions admin business profile",
      group: "Operations",
    },
  ], [])

  const matchedTools = useMemo(() => {
    if (!cleanQuery) return []
    return systemTools.filter((tool) => {
      const fullStr = `${tool.name} ${tool.desc} ${tool.keywords} ${tool.path}`.toLowerCase()
      return queryWords.every((w) => fullStr.includes(w))
    })
  }, [systemTools, cleanQuery, queryWords])

  const totalMatches =
    matchedItems.length +
    matchedCategories.length +
    matchedVendors.length +
    matchedCustomers.length +
    matchedRecipes.length +
    matchedOrders.length +
    matchedPurchases.length +
    matchedTools.length

  return (
    <>
      <header className="sticky top-0 right-0 h-16 bg-background/80 backdrop-blur-md z-40 border-b border-border shadow-xs flex items-center px-4 lg:px-6 gap-4 justify-between">
        {/* Search Bar Trigger */}
        <div className="flex-1 max-w-xl relative pl-10 lg:pl-0">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full bg-muted/60 hover:bg-muted border border-input rounded-full py-2 pl-4 pr-4 text-left text-sm text-muted-foreground transition-all flex items-center group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 truncate">
              <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              <span className="truncate">Search Raw Materials, Vendors, Categories, Orders, Recipes...</span>
            </div>
          </button>
        </div>

        {/* Right Section: Notifications, Theme, Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-full p-2 hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer">
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toggleTheme("light")} className="cursor-pointer">
                <Sun className="mr-2 h-4 w-4 text-saffron" /> Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleTheme("dark")} className="cursor-pointer">
                <Moon className="mr-2 h-4 w-4" /> Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleTheme("system")} className="cursor-pointer">
                <Laptop className="mr-2 h-4 w-4" /> System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Demo Mode Indicator (Clickable to jump to settings) */}
          {demoActive ? (
            <Badge
              variant="outline"
              onClick={() => router.push("/settings")}
              className="hidden md:inline-flex items-center gap-1.5 cursor-pointer bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20 text-[11px] font-semibold py-1 px-2.5 transition-colors"
              title="Click to manage demo data or switch to Live Real Business Data"
            >
              <Sparkles className="h-3 w-3" /> Demo Mode
            </Badge>
          ) : (
            <Badge
              variant="outline"
              onClick={() => router.push("/settings")}
              className="hidden md:inline-flex items-center gap-1.5 cursor-pointer bg-deep-green/10 text-deep-green border-deep-green/30 hover:bg-deep-green/20 text-[11px] font-semibold py-1 px-2.5 transition-colors"
              title="Live Real Business Database Active"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-deep-green animate-pulse" /> Live Mode
            </Badge>
          )}

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-saffron animate-pulse" />
          </Button>

          <div className="h-6 w-[1px] bg-border hidden sm:block" />

          {/* Active User Menu & Role Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2.5 cursor-pointer hover:bg-accent p-1.5 rounded-lg transition-all border-none bg-transparent">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-xs shadow-xs">
                {userInitials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-foreground leading-tight truncate max-w-[120px]">
                  {user?.name || "Kishan (Owner)"}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium">
                  {user?.role || "Owner"}
                </p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-xs font-bold leading-none text-foreground">{user?.name}</p>
                  <p className="text-[11px] leading-none text-muted-foreground">{user?.email}</p>
                  <div className="pt-1.5">
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                      Role: {user?.role}
                    </Badge>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Quick Switch Role */}
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Switch Active Role
              </div>
              {users.map((u) => (
                <DropdownMenuItem
                  key={u.id}
                  onClick={() => switchUser(u.id)}
                  className={`cursor-pointer text-xs flex items-center justify-between ${
                    user?.id === u.id ? "bg-accent font-bold text-primary" : ""
                  }`}
                >
                  <span className="truncate">{u.name}</span>
                  <Badge variant="outline" className="text-[9px] ml-2">
                    {u.role}
                  </Badge>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />
              {(!user || user.role === "Owner") && (
                <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer text-xs">
                  <SettingsIcon className="h-3.5 w-3.5 mr-2" /> Settings & Data Management
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={logout}
                className="text-destructive font-medium cursor-pointer text-xs"
              >
                <LogOut className="h-3.5 w-3.5 mr-2" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Global Universal Search Dialog */}
      <CommandDialog
        open={searchOpen}
        onOpenChange={(open) => {
          setSearchOpen(open)
          if (!open) setQuery("")
        }}
        shouldFilter={false}
      >
        <div className="relative border-b border-border shrink-0">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search Raw Materials, Vendors, Categories, Orders, Recipes, Purchases..."
            className="text-base"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <CommandList className="flex-1 overflow-y-auto">
          {/* INITIAL STATE: When user hasn't typed anything */}
          {!cleanQuery && (
            <div className="p-3 space-y-4">
              {/* Quick Category Pills */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  Browse by Category
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {categoriesList.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => navigateTo("/items", { category: cat })}
                      className="inline-flex items-center gap-1.5 text-xs font-medium bg-muted/60 hover:bg-primary/10 hover:text-primary text-foreground border border-border rounded-full px-3 py-1 transition-colors cursor-pointer"
                    >
                      <Tag className="h-3 w-3 text-saffron" />
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Master Data Shortcuts */}
              <CommandGroup heading="Master Records">
                <CommandItem onSelect={() => navigateTo("/items")}>
                  <Package className="h-4 w-4 mr-2 text-saffron" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Item Master (Raw Materials & Ingredients)</p>
                    <p className="text-xs text-muted-foreground">Manage Raw Materials, Rates, Units & Categories</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-60 ml-2" />
                </CommandItem>
                <CommandItem onSelect={() => navigateTo("/vendors")}>
                  <Factory className="h-4 w-4 mr-2 text-deep-green" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Vendor Master (Suppliers & Contacts)</p>
                    <p className="text-xs text-muted-foreground">Directory of Suppliers, GSTIN, Contacts & Mapped Materials</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-60 ml-2" />
                </CommandItem>
                <CommandItem onSelect={() => navigateTo("/customers")}>
                  <Users className="h-4 w-4 mr-2 text-blue-500" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Customer Directory (Retail / Wholesale / Catering)</p>
                    <p className="text-xs text-muted-foreground">Client Profiles, Contact Details & Past Orders</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-60 ml-2" />
                </CommandItem>
              </CommandGroup>

              {/* Transactions */}
              <CommandGroup heading="Transactions & Ledger">
                <CommandItem onSelect={() => navigateTo("/purchases")}>
                  <ShoppingCart className="h-4 w-4 mr-2 text-amber-500" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Purchases Entry Ledger</p>
                    <p className="text-xs text-muted-foreground">Bulk Procurement, Lot Entries, Rates & Supplier Invoices</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-60 ml-2" />
                </CommandItem>
                <CommandItem onSelect={() => navigateTo("/orders")}>
                  <FileText className="h-4 w-4 mr-2 text-emerald-500" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Orders Book & Installments</p>
                    <p className="text-xs text-muted-foreground">Sales Orders, Delivery Schedules & Multi-Installment Payment Tracking</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-60 ml-2" />
                </CommandItem>
              </CommandGroup>

              {/* Operations & Calculators */}
              <CommandGroup heading="Production & Calculators">
                <CommandItem onSelect={() => navigateTo("/recipes")}>
                  <ChefHat className="h-4 w-4 mr-2 text-purple-500" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Recipes & Costing Intelligence</p>
                    <p className="text-xs text-muted-foreground">Formulations, Dynamic Ingredient Cost Breakdown & Preparation Steps</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-60 ml-2" />
                </CommandItem>
                <CommandItem onSelect={() => navigateTo("/calculators/weight-price")}>
                  <Scale className="h-4 w-4 mr-2 text-saffron" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Weight-Price Counter Calculator</p>
                    <p className="text-xs text-muted-foreground">Instant Counter Billing Calculator for Variable Sweet Weights</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-60 ml-2" />
                </CommandItem>
                <CommandItem onSelect={() => navigateTo("/calculators/profit-loss")}>
                  <TrendingUp className="h-4 w-4 mr-2 text-deep-green" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Profit & Loss Calculator</p>
                    <p className="text-xs text-muted-foreground">Product Margin & Batch Profit Estimation Calculator</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-60 ml-2" />
                </CommandItem>
                <CommandItem onSelect={() => navigateTo("/calculators/bulk-recipe")}>
                  <ChefHat className="h-4 w-4 mr-2 text-indigo-500" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Bulk Recipe Scaler</p>
                    <p className="text-xs text-muted-foreground">Batch Ingredient Scaler for Wedding & Festival Volumes</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-60 ml-2" />
                </CommandItem>
              </CommandGroup>
            </div>
          )}

          {/* ACTIVE SEARCH: User typed a term */}
          {cleanQuery && totalMatches === 0 && (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                <Search className="w-6 h-6 opacity-40" />
              </div>
              <p className="text-sm font-semibold text-foreground">No matches found for &quot;{query}&quot;</p>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto">
                Try searching for Raw Materials (e.g. Kaju, Ghee, Sugar), Vendors (Mahi Dairy, Gujarat Sugar), Categories (Dry Fruits, Dairy), Recipes (Kaju Katli), Orders (ORD-1001), or Purchases.
              </p>
            </div>
          )}

          {cleanQuery && (
            <>
              {/* 1. Raw Materials & Ingredients */}
              {matchedItems.length > 0 && (
                <CommandGroup heading={`Raw Materials & Ingredients (${matchedItems.length})`}>
                  {matchedItems.map((item) => (
                    <CommandItem
                      key={item.id}
                      onSelect={() => navigateTo("/items", { search: item.name })}
                      className="py-2.5"
                    >
                      <Package className="h-4 w-4 mr-2.5 text-saffron shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate">{item.name}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                            {item.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          <span className="font-medium text-foreground">{formatINR(item.currentPrice)}</span> / {item.unit}
                          {item.vendorNames && item.vendorNames.length > 0 && (
                            <span> • Suppliers: {item.vendorNames.join(", ")}</span>
                          )}
                          {item.notes && <span> • Note: {item.notes}</span>}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0 ml-2">
                        Raw Material
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* 2. Categories */}
              {matchedCategories.length > 0 && (
                <CommandGroup heading={`Categories (${matchedCategories.length})`}>
                  {matchedCategories.map((cat) => {
                    const itemCount = itemsList.filter((i) => i.category === cat).length
                    return (
                      <CommandItem
                        key={cat}
                        onSelect={() => navigateTo("/items", { category: cat })}
                        className="py-2.5"
                      >
                        <Tag className="h-4 w-4 mr-2.5 text-saffron shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-foreground">{cat}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Category in Item Master • {itemCount} raw materials registered
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0 ml-2">
                          Category
                        </Badge>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}

              {/* 3. Vendors & Suppliers */}
              {matchedVendors.length > 0 && (
                <CommandGroup heading={`Vendors & Suppliers (${matchedVendors.length})`}>
                  {matchedVendors.map((vendor) => (
                    <CommandItem
                      key={vendor.id}
                      onSelect={() => navigateTo("/vendors", { search: vendor.name })}
                      className="py-2.5"
                    >
                      <Factory className="h-4 w-4 mr-2.5 text-deep-green shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate">{vendor.name}</span>
                          <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1 rounded">
                            {vendor.code}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {vendor.contactName && <span>Contact: {vendor.contactName} ({vendor.phone}) • </span>}
                          <span>Supplies: {vendor.materials.join(", ")}</span>
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-deep-green border-deep-green/30 shrink-0 ml-2">
                        Vendor
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* 4. Customer Directory */}
              {matchedCustomers.length > 0 && (
                <CommandGroup heading={`Customers Directory (${matchedCustomers.length})`}>
                  {matchedCustomers.map((cust) => (
                    <CommandItem
                      key={cust.id}
                      onSelect={() => navigateTo("/customers", { search: cust.name })}
                      className="py-2.5"
                    >
                      <Users className="h-4 w-4 mr-2.5 text-blue-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate">{cust.name}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {cust.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {cust.customerNumber} • {cust.mobile} • {cust.address}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-blue-500 border-blue-500/30 shrink-0 ml-2">
                        Customer
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* 5. Recipes & Costing */}
              {matchedRecipes.length > 0 && (
                <CommandGroup heading={`Recipes & Production (${matchedRecipes.length})`}>
                  {matchedRecipes.map((recipe) => (
                    <CommandItem
                      key={recipe.id}
                      onSelect={() => navigateTo("/recipes", { search: recipe.name })}
                      className="py-2.5"
                    >
                      <ChefHat className="h-4 w-4 mr-2.5 text-purple-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate">{recipe.name}</span>
                          <span className="text-xs text-muted-foreground">
                            (Yield: {recipe.outputYield} {recipe.outputUnit})
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          Cost: <span className="font-medium text-foreground">{formatINR(recipe.calculatedCostPerKg)}/Kg</span> • Ingredients: {recipe.ingredients.map((i) => i.itemName).join(", ")}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-purple-500 border-purple-500/30 shrink-0 ml-2">
                        Recipe
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* 6. Orders & Deliveries */}
              {matchedOrders.length > 0 && (
                <CommandGroup heading={`Orders Book (${matchedOrders.length})`}>
                  {matchedOrders.map((order) => (
                    <CommandItem
                      key={order.id}
                      onSelect={() => navigateTo("/orders", { search: order.orderNumber })}
                      className="py-2.5"
                    >
                      <FileText className="h-4 w-4 mr-2.5 text-emerald-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-foreground">{order.orderNumber}</span>
                          <span className="text-xs text-muted-foreground font-medium">({order.customerName})</span>
                          <Badge
                            variant={
                              order.status === "Packed"
                                ? "default"
                                : order.status === "Prep"
                                ? "secondary"
                                : "outline"
                            }
                            className="text-[10px] px-1.5 py-0"
                          >
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          Items: {order.items.map((i) => `${i.itemName} (${i.quantity}${i.unit})`).join(", ")} • Total: <span className="font-medium text-foreground">{formatINR(order.totalAmount)}</span> • Due: {order.deliveryDate}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-600/30 shrink-0 ml-2">
                        Order
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* 7. Purchases Ledger */}
              {matchedPurchases.length > 0 && (
                <CommandGroup heading={`Purchases Ledger (${matchedPurchases.length})`}>
                  {matchedPurchases.slice(0, 10).map((purchase) => (
                    <CommandItem
                      key={purchase.id}
                      onSelect={() => navigateTo("/purchases", { search: purchase.itemName })}
                      className="py-2.5"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2.5 text-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate">{purchase.itemName}</span>
                          {purchase.lotNumber && (
                            <span className="font-mono text-[10px] bg-muted px-1 rounded text-muted-foreground">
                              {purchase.lotNumber}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">• {purchase.purchaseDate}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          Supplier: <span className="font-medium text-foreground">{purchase.vendorName}</span> • {purchase.quantity} {purchase.unit} @ {formatINR(purchase.rate)} = <span className="font-medium text-foreground">{formatINR(purchase.total)}</span>
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-600/30 shrink-0 ml-2">
                        Purchase
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* 8. Calculators & Navigation Tools */}
              {matchedTools.length > 0 && (
                <CommandGroup heading={`System Tools & Operations (${matchedTools.length})`}>
                  {matchedTools.map((tool) => {
                    const Icon = tool.icon
                    return (
                      <CommandItem
                        key={tool.path}
                        onSelect={() => navigateTo(tool.path)}
                        className="py-2.5"
                      >
                        <Icon className="h-4 w-4 mr-2.5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-foreground">{tool.name}</span>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{tool.desc}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0 ml-2">
                          {tool.group}
                        </Badge>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>

        {/* Footer info bar */}
        <div className="border-t border-border bg-muted/30 px-3.5 py-2.5 shrink-0 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded border bg-background px-1 py-0.5 font-mono text-[10px]">↑</kbd>
              <kbd className="rounded border bg-background px-1 py-0.5 font-mono text-[10px] ml-0.5">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono text-[10px]">↵</kbd> to select & open
            </span>
            <span>
              <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono text-[10px]">ESC</kbd> to close
            </span>
          </div>
          {cleanQuery && (
            <span className="font-medium text-foreground">
              {totalMatches} {totalMatches === 1 ? "result" : "results"} found
            </span>
          )}
        </div>
      </CommandDialog>
    </>
  )
}
