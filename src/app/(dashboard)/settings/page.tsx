"use client"

import { useState } from "react"
import { Settings, Shield, User, Database, Building2, Save, Key, CheckCircle, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

export default function SettingsPage() {
  // Business info state
  const [businessName, setBusinessName] = useState("Ganesh Sweets & Namkeen")
  const [gstin, setGstin] = useState("24AAAAA0000A1Z5")
  const [phone, setPhone] = useState("+91 98765 43210")
  const [address, setAddress] = useState("Main Road, Sweets Market, Gujarat, India")

  // Mock Users State
  const [users, setUsers] = useState([
    { id: "u1", name: "Kishan (Owner)", email: "admin@ganeshsweets.com", role: "Superadmin", status: "ACTIVE" },
    { id: "u2", name: "Manager Staff", email: "manager@ganeshsweets.com", role: "Manager", status: "ACTIVE" },
    { id: "u3", name: "Counter Operator", email: "counter@ganeshsweets.com", role: "Viewer", status: "ACTIVE" },
  ])

  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success("Business profile settings updated!")
  }

  const handleRoleChange = (userId: string, newRole: string) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
    toast.success("User permission role updated!")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card p-6 rounded-xl border border-border shadow-xs">
        <h1 className="text-headline text-foreground font-bold tracking-tight flex items-center gap-2.5">
          <Settings className="h-7 w-7 text-saffron" />
          Settings & Role Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Business details, user permission roles (RBAC) & database connections
        </p>
      </div>

      <Tabs defaultValue="business" className="w-full">
        <TabsList className="grid w-full sm:w-auto grid-cols-3 bg-muted/60 p-1">
          <TabsTrigger value="business" className="text-xs font-semibold">
            <Building2 className="h-4 w-4 mr-2 text-saffron" /> Business Profile
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs font-semibold">
            <Shield className="h-4 w-4 mr-2 text-deep-green" /> Users & Roles (RBAC)
          </TabsTrigger>
          <TabsTrigger value="database" className="text-xs font-semibold">
            <Database className="h-4 w-4 mr-2 text-blue-600" /> Database & Cloud
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Business Profile */}
        <TabsContent value="business" className="mt-6">
          <Card className="border border-border shadow-card max-w-2xl">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="text-title font-bold text-foreground">Business Information</CardTitle>
              <CardDescription className="text-xs">Printed on reports and purchase invoices</CardDescription>
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
                  <Button type="submit" className="bg-primary hover:bg-saffron-dark text-white font-semibold">
                    <Save className="h-4 w-4 mr-1.5" /> Save Profile Settings
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Users & Roles (RBAC) */}
        <TabsContent value="users" className="mt-6">
          <Card className="border border-border shadow-card">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="text-title font-bold text-foreground">User Roles & Access Control</CardTitle>
              <CardDescription className="text-xs">Granular access control for staff (Superadmin, Manager, Viewer)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-left text-xs">
                <thead className="bg-table-header text-table-header-text">
                  <tr>
                    <th className="p-3">User Name</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Assigned Role</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/40">
                      <td className="p-3 font-bold text-foreground">{u.name}</td>
                      <td className="p-3 text-muted-foreground">{u.email}</td>
                      <td className="p-3">
                        <Select value={u.role} onValueChange={(role) => role && handleRoleChange(u.id, role)}>
                          <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Superadmin">Superadmin</SelectItem>
                            <SelectItem value="Manager">Manager</SelectItem>
                            <SelectItem value="Viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3 text-center">
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {u.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Database Connection Status */}
        <TabsContent value="database" className="mt-6">
          <Card className="border border-border shadow-card max-w-xl">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="text-title font-bold text-foreground">Cloud Database Connection</CardTitle>
              <CardDescription className="text-xs">Supabase PostgreSQL integration status</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 rounded-lg">
                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300">Ready for Supabase Credentials</h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local to sync real PostgreSQL tables.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Database Engine:</span>
                  <span className="font-bold text-foreground">PostgreSQL (Supabase)</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Total Schema Tables:</span>
                  <span className="font-bold text-foreground">23 Tables Configured</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground">Row Level Security (RLS):</span>
                  <span className="font-bold text-emerald-600">Enabled</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
