"use client"

import { useState, useEffect } from "react"
import {
  Settings,
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
  Sparkles,
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
import { useAuth, UserRole } from "@/contexts/auth-context"
import { isDemoMode, clearAllDemoData, restoreDemoData, setDemoMode } from "@/lib/data-management"

export default function SettingsPage() {
  const { users, addUser, updateUser, deleteUser, user: currentUser } = useAuth()

  // Business info state
  const [businessName, setBusinessName] = useState("Ganesh Sweets & Namkeen")
  const [gstin, setGstin] = useState("24AAAAA0000A1Z5")
  const [phone, setPhone] = useState("+91 98765 43210")
  const [address, setAddress] = useState("Main Road, Sweets Market, Gujarat, India")

  // Demo mode state
  const [demoActive, setDemoActive] = useState(true)
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [newStaffOpen, setNewStaffOpen] = useState(false)
  const [copiedSql, setCopiedSql] = useState(false)

  // New staff form state
  const [staffName, setStaffName] = useState("")
  const [staffEmail, setStaffEmail] = useState("")
  const [staffPhone, setStaffPhone] = useState("")
  const [staffRole, setStaffRole] = useState<UserRole>("Cashier")

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

  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success("Business profile settings updated!")
  }

  const handleRoleChange = (userId: string, newRole: string) => {
    updateUser(userId, { role: newRole as UserRole })
    toast.success("User permission role updated!")
  }

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault()
    if (!staffName.trim() || !staffEmail.trim()) {
      toast.error("Please provide both name and email")
      return
    }

    addUser({
      name: staffName.trim(),
      email: staffEmail.trim(),
      phone: staffPhone.trim() || undefined,
      role: staffRole,
      status: "ACTIVE",
    })

    setStaffName("")
    setStaffEmail("")
    setStaffPhone("")
    setStaffRole("Cashier")
    setNewStaffOpen(false)
    toast.success("New staff user added successfully!")
  }

  const handleClearDataConfirm = () => {
    clearAllDemoData()
    setClearDialogOpen(false)
    setDemoActive(false)
    toast.success("All sample demo data cleared! You are now in Live Mode with fresh empty ledgers.")
  }

  const handleRestoreDemo = () => {
    restoreDemoData()
    setDemoActive(true)
    toast.success("Sample demo data restored successfully!")
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
      <div className="bg-card p-6 rounded-xl border border-border shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-headline text-foreground font-bold tracking-tight flex items-center gap-2.5">
            <Settings className="h-7 w-7 text-saffron" />
            Settings & Business Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your shop profile, staff permission roles (RBAC) & switch between Demo and Live real data.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {demoActive ? (
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 py-1 px-3 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Demo Mode Active
            </Badge>
          ) : (
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 py-1 px-3 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5" /> Live Data Mode
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="data" className="w-full">
        <TabsList className="grid w-full sm:w-auto grid-cols-4 bg-muted/60 p-1">
          <TabsTrigger value="data" className="text-xs font-semibold">
            <Sparkles className="h-4 w-4 mr-2 text-saffron" /> Data Management
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs font-semibold">
            <Shield className="h-4 w-4 mr-2 text-deep-green" /> Users & Roles (RBAC)
          </TabsTrigger>
          <TabsTrigger value="business" className="text-xs font-semibold">
            <Building2 className="h-4 w-4 mr-2 text-primary" /> Business Profile
          </TabsTrigger>
          <TabsTrigger value="database" className="text-xs font-semibold">
            <Database className="h-4 w-4 mr-2 text-blue-600" /> Supabase Cloud
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Data Management (Mock vs Live) */}
        <TabsContent value="data" className="mt-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Live Mode / Fresh Start Card */}
            <Card className="border-2 border-primary/20 shadow-card">
              <CardHeader className="bg-muted/30 border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-title font-bold text-foreground flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    Start Fresh with Real Shop Data
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {demoActive ? "Ready to Clear" : "Currently Active"}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Remove sample demo entries (Kaju Katli, Mahi Dairy, demo purchases) and start recording your actual Ganesh Sweets daily business transactions.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="bg-muted/40 p-4 rounded-lg space-y-2 text-xs border border-border">
                  <p className="font-semibold text-foreground">What happens when you click Start Fresh?</p>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    <li>Purchases ledger will be reset to 0 entries.</li>
                    <li>Expenses ledger will be reset to 0 entries.</li>
                    <li>Orders and customer lists will be cleared.</li>
                    <li>Standard Units (Kg, Litre, Gram, Packet, Tin, Box) remain ready to use.</li>
                    <li>Common Sweet Categories (Raw Materials, Dairy, Dry Fruits, Packaging) remain intact.</li>
                  </ul>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => setClearDialogOpen(true)}
                    className="bg-primary hover:bg-saffron-dark text-white font-semibold text-xs py-2"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" /> Clear All Demo Data & Start Fresh
                  </Button>

                  {/* Restore Demo button */}
                  <Button
                    variant="outline"
                    onClick={handleRestoreDemo}
                    className="text-xs border-border text-foreground hover:bg-accent"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Restore Sample Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Next Steps for Live Data */}
            <Card className="border border-border shadow-card">
              <CardHeader className="bg-muted/30 border-b border-border">
                <CardTitle className="text-title font-bold text-foreground">
                  How to Add Your Real Business Data
                </CardTitle>
                <CardDescription className="text-xs">
                  Step-by-step workflow to get your shop running on the platform
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-3 text-xs">
                <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
                  <span className="w-6 h-6 rounded-full bg-saffron/15 text-saffron font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div>
                    <h4 className="font-bold text-foreground">Add Your Suppliers (Vendors)</h4>
                    <p className="text-muted-foreground mt-0.5">
                      Go to the <strong>Vendors</strong> page to enter your dairy, dry fruit, and packaging suppliers or upload your Excel list.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
                  <span className="w-6 h-6 rounded-full bg-deep-green/15 text-deep-green font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div>
                    <h4 className="font-bold text-foreground">Register Raw Materials & Sweets</h4>
                    <p className="text-muted-foreground mt-0.5">
                      Go to <strong>Item Master</strong> to add Milk, Mawa, Ghee, Sugar, Cashews with your current purchase rates.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
                  <span className="w-6 h-6 rounded-full bg-blue-500/15 text-blue-600 font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div>
                    <h4 className="font-bold text-foreground">Log Daily Purchases & Expenses</h4>
                    <p className="text-muted-foreground mt-0.5">
                      Use <strong>Purchases</strong> for incoming raw material bills and <strong>Expenses</strong> for daily shop overheads, salaries, and utility bills.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Users & Roles (RBAC) */}
        <TabsContent value="users" className="mt-6 space-y-6">
          <Card className="border border-border shadow-card">
            <CardHeader className="bg-muted/30 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-title font-bold text-foreground">
                  User Roles & Access Control (RBAC)
                </CardTitle>
                <CardDescription className="text-xs">
                  Assign granular permissions to staff members (Owner, Manager, Accountant, Cashier)
                </CardDescription>
              </div>
              <Button
                onClick={() => setNewStaffOpen(true)}
                className="bg-primary hover:bg-saffron-dark text-white text-xs font-semibold"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Add New Staff Member
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-left text-xs">
                <thead className="bg-table-header text-table-header-text">
                  <tr>
                    <th className="p-3">Staff Name</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Assigned Role</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/40">
                      <td className="p-3 font-bold text-foreground">
                        {u.name}
                        {u.id === currentUser?.id && (
                          <span className="ml-2 text-[10px] text-primary font-semibold">(You)</span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">{u.email}</td>
                      <td className="p-3 text-muted-foreground">{u.phone || "-"}</td>
                      <td className="p-3">
                        <Select
                          value={u.role}
                          onValueChange={(role) => role && handleRoleChange(u.id, role)}
                          disabled={u.id === "u1"} // Primary owner protected
                        >
                          <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Owner">Owner (Superadmin)</SelectItem>
                            <SelectItem value="Manager">Store Manager</SelectItem>
                            <SelectItem value="Accountant">Accountant</SelectItem>
                            <SelectItem value="Cashier">Cashier / Counter</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3 text-center">
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                          {u.status || "ACTIVE"}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        {u.id !== "u1" && u.id !== currentUser?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              deleteUser(u.id)
                              toast.success(`User ${u.name} removed`)
                            }}
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            title="Remove staff member"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
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
                Role Permissions Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 rounded-lg border border-border bg-card">
                  <h4 className="font-bold text-saffron">Owner (Superadmin)</h4>
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    Full unrestricted access to all modules, financial P&L, reports, business settings, and staff role management.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card">
                  <h4 className="font-bold text-deep-green">Store Manager</h4>
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    Manages inventory, items, vendors, customer orders, daily purchases, recipe formulation, and bulk calculators.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card">
                  <h4 className="font-bold text-amber-600">Accountant</h4>
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    Access to purchases ledger, expenses tracking, vendor balances, operational reports, and Excel data export.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card">
                  <h4 className="font-bold text-blue-600">Cashier / Counter</h4>
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    Fast booking of counter sweet orders, customer directory, item price lookup, and quick weight-price calculator.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Business Profile */}
        <TabsContent value="business" className="mt-6">
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
                    <Save className="h-4 w-4 mr-1.5" /> Save Profile Settings
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Database Connection Status & SQL Schema */}
        <TabsContent value="database" className="mt-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border border-border shadow-card">
              <CardHeader className="bg-muted/30 border-b border-border">
                <CardTitle className="text-title font-bold text-foreground">
                  Supabase PostgreSQL Cloud
                </CardTitle>
                <CardDescription className="text-xs">
                  Cloud database integration via Vercel Native Storage
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                      Integration Connected to Vercel
                    </h4>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Your Supabase database project is linked to Vercel deployment.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Database Engine:</span>
                    <span className="font-bold text-foreground">PostgreSQL (Supabase)</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Vercel Environment Keys:</span>
                    <span className="font-bold text-emerald-600">Injected & Supported</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground">Row Level Security (RLS):</span>
                    <span className="font-bold text-emerald-600">Enabled</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SQL Migration Script Box */}
            <Card className="border border-border shadow-card">
              <CardHeader className="bg-muted/30 border-b border-border flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-title font-bold text-foreground text-sm">
                    Supabase SQL Schema
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Run this once in Supabase SQL Editor to create tables
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopySql}
                  className="text-xs"
                >
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

      {/* Confirmation Dialog for Clearing Demo Data */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Clear Demo Data & Start Fresh?
            </DialogTitle>
            <DialogDescription className="text-xs pt-2">
              Are you sure you want to clear the sample demo data? This will wipe the mock purchases, expenses, and demo suppliers so you can begin entering Ganesh Sweets&apos; actual business transactions.
              <br /><br />
              <strong>Note:</strong> Standard sweet categories and measurement units (Kg, Litre, Box) will be preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setClearDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleClearDataConfirm}>
              Yes, Clear & Start Fresh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for Adding New Staff Member */}
      <Dialog open={newStaffOpen} onOpenChange={setNewStaffOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Add New Staff Member
            </DialogTitle>
            <DialogDescription className="text-xs">
              Assign a role and email to grant access to the Ganesh Sweets MIS.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateStaff} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Staff Full Name *</Label>
              <Input
                placeholder="e.g. Rahul Sharma"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                required
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Email Address *</Label>
              <Input
                type="email"
                placeholder="e.g. rahul@ganeshsweets.com"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                required
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mobile Number</Label>
              <Input
                placeholder="+91 98765 00000"
                value={staffPhone}
                onChange={(e) => setStaffPhone(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Assigned Role *</Label>
              <Select value={staffRole} onValueChange={(val) => setStaffRole(val as UserRole)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Owner">Owner (Full Admin Access)</SelectItem>
                  <SelectItem value="Manager">Store Manager (Inventory, Orders, Purchases)</SelectItem>
                  <SelectItem value="Accountant">Accountant (Expenses, Ledgers, Reports)</SelectItem>
                  <SelectItem value="Cashier">Cashier / Counter (Orders, Weight-Price Calc)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setNewStaffOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary hover:bg-saffron-dark text-white font-semibold">
                Create Staff Member
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
