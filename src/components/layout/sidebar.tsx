"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Package,
  Factory,
  Users,
  ShoppingCart,
  Receipt,
  FileText,
  ChefHat,
  BarChart3,
  Calculator,
  Scale,
  TrendingUp,
  Settings,
  ChevronLeft,
  Menu,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { useState } from "react"
import { useAuth, UserRole } from "@/contexts/auth-context"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: UserRole[]
}

interface NavSection {
  label: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    label: "Core",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Master Data",
    items: [
      { title: "Item Master", href: "/items", icon: Package, roles: ["Owner", "Manager", "Cashier"] },
      { title: "Vendors", href: "/vendors", icon: Factory, roles: ["Owner", "Manager", "Accountant"] },
      { title: "Customers", href: "/customers", icon: Users, roles: ["Owner", "Manager", "Cashier"] },
    ],
  },
  {
    label: "Transactions",
    items: [
      { title: "Purchases", href: "/purchases", icon: ShoppingCart, roles: ["Owner", "Manager", "Accountant"] },
      { title: "Expenses", href: "/expenses", icon: Receipt, roles: ["Owner", "Accountant"] },
      { title: "Orders", href: "/orders", icon: FileText, roles: ["Owner", "Manager", "Cashier"] },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Recipes", href: "/recipes", icon: ChefHat, roles: ["Owner", "Manager"] },
      { title: "Reports", href: "/reports", icon: BarChart3, roles: ["Owner", "Accountant"] },
    ],
  },
  {
    label: "Utilities",
    items: [
      { title: "Weight-Price Calc", href: "/calculators/weight-price", icon: Scale },
      { title: "Profit & Loss Calc", href: "/calculators/profit-loss", icon: TrendingUp, roles: ["Owner", "Accountant"] },
      { title: "Bulk Recipe Scaler", href: "/calculators/bulk-recipe", icon: ChefHat, roles: ["Owner", "Manager"] },
    ],
  },
]

function NavContent({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  const { user } = useAuth()

  // Filter sections and items based on active user role
  const filteredSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.roles || item.roles.length === 0) return true
        if (!user || user.role === "Owner") return true
        return item.roles.includes(user.role)
      }),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-3.5 shrink-0 border-b border-border",
        collapsed && "justify-center px-2"
      )}>
        <Image
          src="/logo.png"
          alt="Ganesh Sweets"
          width={36}
          height={36}
          className="object-contain shrink-0"
        />
        {!collapsed && (
          <div className="min-w-0">
            <span className="text-base font-bold text-primary tracking-tight truncate block">
              Ganesh Sweets
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
              {user?.role ? `${user.role} Portal` : "MIS Platform"}
            </span>
          </div>
        )}
      </div>

      {/* Navigation with smooth mouse wheel scroll & easily readable fonts */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-2">
        <nav className="space-y-1 pb-4">
          {filteredSections.map((section) => (
            <div key={section.label} className="py-1.5">
              {!collapsed && (
                <p className="text-xs font-bold text-muted-foreground/80 px-3 py-1 uppercase tracking-wider">
                  {section.label}
                </p>
              )}
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 mb-0.5",
                      "hover:bg-accent hover:text-accent-foreground",
                      "active:scale-[0.98]",
                      isActive
                        ? "bg-deep-green-container text-deep-green font-semibold"
                        : "text-foreground/80",
                      collapsed && "justify-center px-2"
                    )}
                    title={collapsed ? item.title : undefined}
                  >
                    <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-deep-green" : "text-muted-foreground")} />
                    {!collapsed && (
                      <span className="text-sm font-medium truncate">{item.title}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Settings (visible to Owner, fixed at bottom) */}
      {(!user || user.role === "Owner") && (
        <div className="border-t border-border px-3 py-3 shrink-0 bg-card">
          <Link
            href="/settings"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150",
              "hover:bg-accent hover:text-accent-foreground",
              pathname.startsWith("/settings")
                ? "bg-deep-green-container text-deep-green font-semibold"
                : "text-foreground/80",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? "Settings" : undefined}
          >
            <Settings className="h-5 w-5 shrink-0 text-muted-foreground" />
            {!collapsed && <span className="text-sm font-medium">Settings & Roles</span>}
          </Link>
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-card z-50 flex flex-col",
          "shadow-card border-r border-border",
          "transition-all duration-300 ease-in-out",
          "hidden lg:flex",
          collapsed ? "w-[68px]" : "w-[260px]"
        )}
      >
        <NavContent collapsed={collapsed} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 bg-card border border-border rounded-full p-1 shadow-sm hover:bg-accent transition-colors"
        >
          <ChevronLeft className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", collapsed && "rotate-180")} />
        </button>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger className="lg:hidden fixed top-3 left-3 z-50 inline-flex items-center justify-center rounded-md p-2 hover:bg-accent border border-border bg-card shadow-sm">
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[280px]">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <NavContent />
        </SheetContent>
      </Sheet>
    </>
  )
}
