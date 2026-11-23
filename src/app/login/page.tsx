"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  UserCheck,
  Store,
  Briefcase,
  Receipt,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth, UserRole } from "@/contexts/auth-context"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const { login, users, switchUser } = useAuth()
  const router = useRouter()

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error("Please enter your email address")
      return
    }

    setLoading(true)
    try {
      // 1. Try Supabase Auth if credentials provided
      const supabase = createClient()
      if (password) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password.trim(),
          })
          if (!error && data.user) {
            toast.success("Signed in with Supabase Cloud!")
          }
        } catch {
          // Fallback to local auth context
        }
      }

      // 2. Auth context login
      await login(email.trim(), password)
      toast.success(`Welcome to Ganesh Sweets MIS!`)
      router.push("/dashboard")
    } catch {
      toast.error("Sign in failed. Please check credentials.")
    } finally {
      setLoading(false)
    }
  }

  const handleQuickRoleLogin = (userId: string, roleName: string) => {
    switchUser(userId)
    toast.success(`Logged in as ${roleName}!`)
    router.push("/dashboard")
  }

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "Owner":
        return <Store className="h-5 w-5 text-saffron" />
      case "Manager":
        return <Briefcase className="h-5 w-5 text-deep-green" />
      case "Accountant":
        return <Receipt className="h-5 w-5 text-amber-600" />
      case "Cashier":
        return <UserCheck className="h-5 w-5 text-blue-600" />
    }
  }

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case "Owner":
        return "bg-saffron/15 text-saffron-dark dark:text-saffron-light border-saffron/30"
      case "Manager":
        return "bg-deep-green-container text-deep-green border-deep-green/30"
      case "Accountant":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300"
      case "Cashier":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300"
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-[#FBFBFA] via-[#F4F1EA] to-[#EAE5DA] dark:from-[#111413] dark:via-[#161B18] dark:to-[#0D100E]">
      <div className="w-full max-w-4xl grid md:grid-cols-12 gap-6 items-center">
        {/* Left Side: Brand & Quick Roles Selection */}
        <div className="md:col-span-5 space-y-5">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Ganesh Sweets Logo"
              width={48}
              height={48}
              className="object-contain drop-shadow-sm"
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-primary">Ganesh Sweets</h1>
              <p className="text-xs text-muted-foreground font-medium">Enterprise MIS & ERP Platform</p>
            </div>
          </div>

          <div className="bg-card/80 backdrop-blur-xs p-5 rounded-xl border border-border shadow-card space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-saffron" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                1-Click Staff Login (RBAC)
              </h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Select any profile below to preview role-based access control and dashboard permissions:
            </p>

            <div className="space-y-2.5">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickRoleLogin(u.id, u.role)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-muted/70 hover:border-primary/50 transition-all text-left group cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-md bg-muted/60 shrink-0">
                      {getRoleIcon(u.role)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {u.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 font-semibold ${getRoleBadgeClass(u.role)}`}>
                    {u.role}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Sign-in Form */}
        <div className="md:col-span-7">
          <Card className="border border-border shadow-card bg-card">
            <CardHeader className="space-y-1.5 pb-5 border-b border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-foreground">Sign In to Dashboard</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1 text-deep-green" /> Secure Session
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Enter your registered business email and password to access the sweet shop ledger.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 pb-2">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="e.g. admin@ganeshsweets.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">Password / Security Key</Label>
                    <span className="text-[11px] text-muted-foreground">Default: demo123</span>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 text-xs"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-saffron-dark text-white font-semibold text-xs py-2.5 shadow-sm mt-2"
                >
                  {loading ? "Authenticating..." : "Sign In to Ganesh Sweets"}
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </form>
            </CardContent>

            <CardFooter className="pt-4 pb-5 border-t border-border flex flex-col items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span>Cloud PostgreSQL Connected via Supabase & Vercel</span>
              <span>© {new Date().getFullYear()} Ganesh Sweets Management Information System</span>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
