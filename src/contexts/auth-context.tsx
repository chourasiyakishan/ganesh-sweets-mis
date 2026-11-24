"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

export type UserRole = "Owner" | "Manager" | "Accountant" | "Cashier" | "Staff"

export interface UserProfile {
  id: string
  name: string
  email: string
  role: UserRole
  phone?: string
  status?: "ACTIVE" | "INACTIVE"
}

interface AuthContextType {
  user: UserProfile | null
  isLoading: boolean
  login: (email: string, password?: string) => Promise<boolean>
  logout: () => Promise<void>
  canAccess: (allowedRoles: UserRole[]) => boolean
  updateUsername: (newName: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ACTIVE_USER_STORAGE_KEY = "ganesh_sweets_active_user"

const getCustomStoredUsername = (id?: string, email?: string): string | null => {
  try {
    if (id) {
      const byId = localStorage.getItem(`ganesh_sweets_username_${id}`)
      if (byId && byId.trim()) return byId.trim()
    }
    if (email) {
      const byEmail = localStorage.getItem(`ganesh_sweets_username_${email.toLowerCase().trim()}`)
      if (byEmail && byEmail.trim()) return byEmail.trim()
    }
  } catch {}
  return null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const initAuth = async () => {
      try {
        // 1. Check live Supabase session if configured
        if (isSupabaseConfigured()) {
          try {
            const supabase = createClient()
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()

            if (!sessionError && session?.user) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", session.user.id)
                .single()

              const roleName = profile?.role
                ? ((profile.role.charAt(0).toUpperCase() + profile.role.slice(1)) as UserRole)
                : "Owner"

              const customName = getCustomStoredUsername(session.user.id, session.user.email || "")

              const sbUser: UserProfile = {
                id: session.user.id,
                name: customName || profile?.full_name || session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
                email: session.user.email || profile?.email || "",
                role: roleName,
                status: profile?.status || "ACTIVE",
              }
              setUser(sbUser)
              localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(sbUser))
              setIsLoading(false)
              return
            } else {
              // No active Supabase session - user must log in
              setUser(null)
              localStorage.removeItem(ACTIVE_USER_STORAGE_KEY)
              setIsLoading(false)
              return
            }
          } catch (sbErr) {
            console.warn("Supabase session check error:", sbErr)
          }
        }

        // 2. Offline fallback session check
        const storedActive = localStorage.getItem(ACTIVE_USER_STORAGE_KEY)
        if (storedActive) {
          try {
            const parsedActive = JSON.parse(storedActive)
            const customName = getCustomStoredUsername(parsedActive.id, parsedActive.email)
            if (customName) {
              parsedActive.name = customName
            }
            setUser(parsedActive)
          } catch {
            setUser(null)
          }
        } else {
          setUser(null)
        }
      } catch (e) {
        console.error("Auth initialization error:", e)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (email: string, password?: string): Promise<boolean> => {
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPassword = password ? password.trim() : ""

    // Strict check: both email and password are required
    if (!trimmedEmail || !trimmedPassword) {
      return false
    }

    // 1. Primary: Authenticate via Supabase Auth
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: trimmedPassword,
        })

        if (error || !data.user) {
          console.warn("Supabase authentication failed:", error?.message)
          // Strictly reject if credentials don't match Supabase!
          return false
        }

        // Fetch user profile and assigned role from Supabase
        let roleName: UserRole = "Staff"
        let fullName = trimmedEmail.split("@")[0]

        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .single()

          if (profile) {
            roleName = profile.role
              ? ((profile.role.charAt(0).toUpperCase() + profile.role.slice(1)) as UserRole)
              : "Owner"
            fullName = profile.full_name || fullName
          } else {
            // First time login - identify if owner
            const isOwner =
              trimmedEmail.includes("kishan") ||
              trimmedEmail.includes("admin") ||
              trimmedEmail.includes("owner")

            roleName = isOwner ? "Owner" : "Staff"

            await supabase.from("profiles").upsert({
              id: data.user.id,
              email: trimmedEmail,
              full_name: fullName,
              role: roleName.toLowerCase(),
              status: "ACTIVE",
            })
          }
        } catch (profileErr) {
          console.warn("Profile fetch error:", profileErr)
        }

        const customStoredName = getCustomStoredUsername(data.user.id, trimmedEmail)

        const authenticatedUser: UserProfile = {
          id: data.user.id,
          name: customStoredName || fullName,
          email: data.user.email || trimmedEmail,
          role: roleName,
          status: "ACTIVE",
        }

        setUser(authenticatedUser)
        localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(authenticatedUser))
        return true
      } catch (err) {
        console.error("Supabase signin exception:", err)
        return false
      }
    }

    // 2. Offline / Local fallback credentials (ONLY when Supabase is not configured)
    if (
      (trimmedEmail === "admin@ganeshsweets.com" || trimmedEmail === "kishan710@gmail.com") &&
      (trimmedPassword === "Ganesh@2026" || trimmedPassword === "demo123" || trimmedPassword === "admin123")
    ) {
      const customStoredName = getCustomStoredUsername("offline_owner", trimmedEmail)
      const offlineOwner: UserProfile = {
        id: "offline_owner",
        name: customStoredName || (trimmedEmail === "kishan710@gmail.com" ? "Kishan (Owner)" : "Admin User"),
        email: trimmedEmail,
        role: "Owner",
        status: "ACTIVE",
      }
      setUser(offlineOwner)
      localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(offlineOwner))
      return true
    }

    // Unmatched credentials strictly rejected!
    return false
  }

  const updateUsername = async (newName: string): Promise<boolean> => {
    const trimmed = newName.trim()
    if (!trimmed || !user) return false

    const updatedUser: UserProfile = {
      ...user,
      name: trimmed,
    }

    setUser(updatedUser)

    try {
      localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(updatedUser))
      localStorage.setItem(`ganesh_sweets_username_${user.id}`, trimmed)
      if (user.email) {
        localStorage.setItem(`ganesh_sweets_username_${user.email.toLowerCase().trim()}`, trimmed)
      }
    } catch (e) {
      console.warn("Error caching custom username:", e)
    }

    // Live sync to Supabase if connected
    if (isSupabaseConfigured() && user.id && user.id !== "offline_owner") {
      try {
        const supabase = createClient()
        await supabase.from("profiles").update({ full_name: trimmed }).eq("id", user.id)
        await supabase.auth.updateUser({ data: { full_name: trimmed } })
      } catch (err) {
        console.warn("Supabase username sync warning:", err)
      }
    }

    return true
  }

  const logout = async () => {
    try {
      if (isSupabaseConfigured()) {
        const supabase = createClient()
        await supabase.auth.signOut()
      }
    } catch (e) {
      console.warn("Supabase logout error:", e)
    }
    setUser(null)
    localStorage.removeItem(ACTIVE_USER_STORAGE_KEY)
    router.push("/login")
  }

  const canAccess = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false
    if (user.role === "Owner") return true
    return allowedRoles.includes(user.role)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        canAccess,
        updateUsername,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
