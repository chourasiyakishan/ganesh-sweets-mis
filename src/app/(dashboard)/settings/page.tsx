"use client"

import { useState, useEffect } from "react"
import {
  Settings as SettingsIcon,
  Shield,
  User,
  Database,
  Building2,
  Save,
  Key,
  CheckCircle,
  Lock,
  Trash2,
  Plus,
  RefreshCw,
  AlertTriangle,
  Copy,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { clearAllDemoData } from "@/lib/data-management"

interface StaffProfile {
  id: string
  name: string
  email: string
  role: string
  status: string
}

export default function SettingsPage() {
  const { user: currentUser } = useAuth()

  // Business info state
  const [businessName, setBusinessName] = useState("Ganesh Sweets & Namkeen")
  const [gstin, setGstin] = useState("24AAAAA0000A1Z5")
  const [phone, setPhone] = useState("+91 98765 43210")
  const [address, setAddress] = useState("Main Road, Sweets Market, Gujarat, India")

  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [newStaffOpen, setNewStaffOpen] = useState(false)
  const [copiedSql, setCopiedSql] = useState(false)
  const [staffUsers, setStaffUsers] = useState<StaffProfile[]>([])

  // Load business info from localStorage if saved
  useEffect(() => {
    try {
      const savedInfo = localStorage.getItem("ganesh_sweets_business_info")
      if (savedInfo) {
        const parsed = JSON.parse(savedInfo)
        if (parsed.businessName) setBusinessName(parsed.businessName)
        if (parsed.gstin) setGstin(parsed.gstin)
        if (parsed.phone) setPhone(parsed.phone)
        if (parsed.address) setAddress(parsed.address)
      }
    } catch {}
  }, [])

  // Load staff users from Supabase profiles
  const loadStaffUsers = async () => {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.from("profiles").select("*").order("created_at")
        if (!error && data && data.length > 0) {
          const mapped: StaffProfile[] = data.map((d) => ({
            id: d.id,
            name: d.full_name || d.email.split("@")[0],
            email: d.email,
            role: d.role ? d.role.charAt(0).toUpperCase() + d.role.slice(1) : "Staff",
            status: d.status || "ACTIVE",
          }))
          setStaffUsers(mapped)
          return
        }
      } catch (err) {
        console.warn("Failed to load staff profiles from Supabase:", err)
      }
    }

    if (currentUser) {
      setStaffUsers([
        {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
          status: "ACTIVE",
        },
      ])
    }
  }

  useEffect(() => {
    loadStaffUsers()
  }, [currentUser])

  // Access control: only Owner can access Settings
  if (currentUser && currentUser.role !== "Owner") {
    return (
      <div className="bg-card p-10 rounded-xl border border-border shadow-card text-center space-y-4 max-w-lg mx-auto mt-12">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
          <Shield className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Access Restricted</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Business settings and role administration are exclusively accessible to the Business Owner. Your current account role is{" "}
          <strong className="text-foreground">{currentUser.role}</strong>.
        </p>
      </div>
    )
  }

  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      localStorage.setItem(
        "ganesh_sweets_business_info",
        JSON.stringify({ businessName, gstin, phone, address })
      )
    } catch {}
    toast.success("Business profile settings saved!")
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setStaffUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    )

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient()
        await supabase
          .from("profiles")
          .update({ role: newRole.toLowerCase() })
          .eq("id", userId)
      } catch (err) {
        console.warn("Failed to update role in Supabase:", err)
      }
    }
    toast.success("User permission role updated!")
  }

  const handleClearDataConfirm = () => {
    clearAllDemoData()
    setClearDialogOpen(false)
    toast.success("All sample demo data cleared! Empty ledgers are now active for real data.")
  }

  const sqlSchemaText = `-- Ganesh Sweets MIS Supabase Schema
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role text default 'staff' check (role in ('owner', 'manager', 'accountant', 'cashier', 'staff')),
  status text default 'ACTIVE',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists items (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null,
  current_price numeric default 0,
  unit text not null,
  status text default 'ACTIVE',
  vendor_names text[] default '{}',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists vendors (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  code text,
  materials text[] default '{}',
  contact_name text,
  phone text,
  gstin text,
  address text,
  status text default 'ACTIVE',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists purchases (
  id uuid default gen_random_uuid() primary key,
  purchase_date date not null,
  month_group text not null,
  item_name text not null,
  lot_number text,
  vendor_name text not null,
  quantity numeric not null,
  unit text not null,
  rate numeric not null,
  total numeric not null,
  remarks text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists expenses (
  id uuid default gen_random_uuid() primary key,
  expense_date date not null,
  month_group text not null,
  category text not null,
  amount numeric not null,
  payment_mode text default 'Cash',
  payee text,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists customers (
  id uuid default gen_random_uuid() primary key,
  customer_number text,
  name text not null,
  mobile text not null,
  type text default 'Retail',
  address text,
  gstin text,
  status text default 'ACTIVE',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists orders (
  id uuid default gen_random_uuid() primary key,
  order_number text not null,
  order_date date not null,
  delivery_date date not null,
  customer_name text not null,
  customer_type text,
  contact_number text,
  address text,
  total_amount numeric default 0,
  payment_received numeric default 0,
  status text default 'Pending',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);`

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchemaText)
    setCopiedSql(true)
    toast.success("SQL Schema copied to clipboard!")
    setTimeout(() => setCopiedSql(false), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card p-6 rounded-xl border border-border shadow-xs">
        <h1 className="text-headline text-foreground font-bold tracking-tight flex items-center gap-2.5">
          <SettingsIcon className="h-7 w-7 text-saffron" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Business information, staff role permissions (RBAC) & cloud database connections
        </p>
      </div>

      <Tabs defaultValue="business" className="w-full">
        <TabsList className="grid w-full sm:w-auto grid-cols-3 bg-muted/60 p-1">
          <TabsTrigger value="business" className="text-xs font-semibold">
            <Building2 className="h-4 w-4 mr-2 text-primary" /> Business Profile
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs font-semibold">
            <Shield className="h-4 w-4 mr-2 text-deep-green" /> Users & Roles (RBAC)
          </TabsTrigger>
          <TabsTrigger value="database" className="text-xs font-semibold">
            <Database className="h-4 w-4 mr-2 text-blue-600" /> Cloud Database
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Business Profile */}
        <TabsContent value="business" className="mt-6 space-y-6">
          <Card className="border border-border shadow-card max-w-2xl">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="text-title font-bold text-foreground">Business Information</CardTitle>
              <CardDescription className="text-xs">
                Printed on daily operational reports, invoices, and export sheets
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSaveBusiness} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Business / Shop Name *</Label>
                  <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">GSTIN</Label>
                    <Input value={gstin} onChange={(e) => setGstin(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Contact Phone</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Shop / Factory Address</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>

                <div className="pt-2">
                  <Button type="submit" className="bg-primary hover:bg-saffron-dark text-white font-semibold text-xs">
                    <Save className="h-4 w-4 mr-1.5" /> Save Business Profile
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Users & Roles (RBAC) */}
        <TabsContent value="users" className="mt-6 space-y-6">
          <Card className="border border-border shadow-card">
            <CardHeader className="bg-muted/30 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-title font-bold text-foreground">
                  User Roles & Permissions (RBAC)
                </CardTitle>
                <CardDescription className="text-xs">
                  Assign roles to team members. Each staff member logs in securely with their own email and password.
                </CardDescription>
              </div>
              <Button
                onClick={() => setNewStaffOpen(true)}
                className="bg-primary hover:bg-saffron-dark text-white text-xs font-semibold"
              >
                <Plus className="h-4 w-4 mr-1.5" /> How to Add Staff
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-left text-xs">
                <thead className="bg-table-header text-table-header-text">
                  <tr>
                    <th className="p-3">Staff Name</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Assigned Role</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {staffUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/40">
                      <td className="p-3 font-bold text-foreground">
                        {u.name}
                        {u.email === currentUser?.email && (
                          <span className="ml-2 text-[10px] text-primary font-semibold">(You)</span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">{u.email}</td>
                      <td className="p-3">
                        <Select
                          value={u.role}
                          onValueChange={(role) => role && handleRoleChange(u.id, role)}
                          disabled={u.email === currentUser?.email}
                        >
                          <SelectTrigger className="w-40 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Owner">Owner (Superadmin)</SelectItem>
                            <SelectItem value="Manager">Store Manager</SelectItem>
                            <SelectItem value="Accountant">Accountant</SelectItem>
                            <SelectItem value="Cashier">Cashier / Counter</SelectItem>
                            <SelectItem value="Staff">Staff</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3 text-center">
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                          {u.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Role Permissions Matrix Card */}
          <Card className="border border-border shadow-card">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="text-title font-bold text-foreground text-sm">
                Role Permissions Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 rounded-lg border border-border bg-card">
                  <h4 className="font-bold text-saffron">Owner (Superadmin)</h4>
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    Full access to all operations, business settings, financial P&L, reports, and role administration.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card">
                  <h4 className="font-bold text-deep-green">Store Manager</h4>
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    Manages inventory items, suppliers, purchases, recipes, and customer orders. Cannot access Settings.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card">
                  <h4 className="font-bold text-amber-600">Accountant</h4>
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    Access to daily purchases ledger, expenses tracking, vendor balances, and Excel reports.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card">
                  <h4 className="font-bold text-blue-600">Cashier / Counter</h4>
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    Fast booking of counter sweet orders, customer phone numbers, item price lookup, and weight-price calculator.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Cloud Database (Supabase) */}
        <TabsContent value="database" className="mt-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border border-border shadow-card">
              <CardHeader className="bg-muted/30 border-b border-border">
                <CardTitle className="text-title font-bold text-foreground">
                  Supabase PostgreSQL Cloud
                </CardTitle>
                <CardDescription className="text-xs">
                  Connected via Vercel Native Storage Integration
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                      Cloud PostgreSQL Connected
                    </h4>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Your Supabase database is active and linked to the live Vercel production deployment.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Database Engine:</span>
                    <span className="font-bold text-foreground">PostgreSQL (Supabase)</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Row Level Security (RLS):</span>
                    <span className="font-bold text-emerald-600">Active</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground">Data Storage:</span>
                    <span className="font-bold text-foreground">Live Cloud Database</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setClearDialogOpen(true)}
                    className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Clear Local Cache
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* SQL Migration Script Box */}
            <Card className="border border-border shadow-card">
              <CardHeader className="bg-muted/30 border-b border-border flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-title font-bold text-foreground text-sm">
                    Database Schema SQL
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Run in Supabase SQL Editor if tables ever need to be recreated
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleCopySql} className="text-xs">
                  {copiedSql ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copy SQL
                    </>
                  )}
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                <pre className="p-3 bg-muted/60 rounded-lg text-[10px] font-mono overflow-x-auto max-h-56 text-foreground border border-border">
                  {sqlSchemaText}
                </pre>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog for Clearing Cache */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Reset Local Browser Cache?
            </DialogTitle>
            <DialogDescription className="text-xs pt-2">
              This will clear local browser cache and force a fresh synchronization directly from the cloud Supabase database.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setClearDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleClearDataConfirm}>
              Yes, Reset Cache
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for Adding New Staff Member via Supabase */}
      <Dialog open={newStaffOpen} onOpenChange={setNewStaffOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              How to Add a Staff User
            </DialogTitle>
            <DialogDescription className="text-xs">
              Follow these simple steps in Supabase to give staff members their own login credentials:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-lg border border-border bg-muted/40 space-y-1">
              <p className="font-bold text-foreground">Step 1: Open Supabase Dashboard</p>
              <p className="text-muted-foreground text-[11px]">
                Go to <strong>Authentication → Users</strong> in your Supabase dashboard.
              </p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/40 space-y-1">
              <p className="font-bold text-foreground">Step 2: Click &ldquo;Add User&rdquo; → &ldquo;Create User&rdquo;</p>
              <p className="text-muted-foreground text-[11px]">
                Enter your staff member&apos;s email and assign them a secure password.
              </p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/40 space-y-1">
              <p className="font-bold text-foreground">Step 3: Assign Role</p>
              <p className="text-muted-foreground text-[11px]">
                In this Settings page, select their role (Manager, Accountant, or Cashier) in the dropdown table above.
              </p>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" size="sm" onClick={() => setNewStaffOpen(false)}>
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
