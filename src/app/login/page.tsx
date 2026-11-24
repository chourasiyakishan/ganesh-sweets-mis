"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error("Please enter your email address")
      return
    }

    setLoading(true)
    try {
      const success = await login(email.trim(), password.trim())
      if (success) {
        toast.success("Welcome back to Ganesh Sweets MIS!")
        router.push("/dashboard")
      } else {
        toast.error("Invalid credentials. Please verify your email and password.")
      }
    } catch {
      toast.error("Sign in failed. Please check your credentials.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#FBFBFA] via-[#F4F1EA] to-[#EAE5DA] dark:from-[#111413] dark:via-[#161B18] dark:to-[#0D100E]">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-card border border-border shadow-xs mb-1">
            <Image
              src="/logo.png"
              alt="Ganesh Sweets Logo"
              width={56}
              height={56}
              className="object-contain drop-shadow-sm"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Ganesh Sweets</h1>
          <p className="text-xs text-muted-foreground font-medium">Management Information System (MIS)</p>
        </div>

        {/* Login Form Card */}
        <Card className="border border-border shadow-card bg-card/95 backdrop-blur-xs">
          <CardHeader className="space-y-1.5 pb-4 border-b border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-foreground">Sign In</CardTitle>
              <Badge variant="secondary" className="text-[11px] font-semibold text-deep-green border-deep-green/30">
                <ShieldCheck className="h-3 w-3 mr-1 text-deep-green" /> Cloud Secured
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Enter your registered email and password to access the sweet shop ledger.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-5 pb-3">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="e.g. admin@ganeshsweets.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 text-xs h-9"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">Password</Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9 text-xs h-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-saffron-dark text-white font-semibold text-xs py-2 h-9 shadow-sm mt-1"
              >
                {loading ? "Authenticating..." : "Sign In to Ganesh Sweets"}
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </form>
          </CardContent>

          <CardFooter className="pt-3 pb-4 border-t border-border flex flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground text-center">
            <span>Role-Based Access Control (Owner, Manager, Accountant, Cashier)</span>
            <span>© {new Date().getFullYear()} Ganesh Sweets & Namkeen Platform</span>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
