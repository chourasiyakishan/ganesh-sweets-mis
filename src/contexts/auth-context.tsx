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

export const defaultTeamUsers: UserProfile[] = [
  {
    id: "u1",
    name: "Kishan (Owner)",
    email: "admin@ganeshsweets.com",
    role: "Owner",
    phone: "+91 98765 43210",
    status: "ACTIVE",
  },
]

interface AuthContextType {
  user: UserProfile | null
  users: UserProfile[]
  isLoading: boolean
  login: (email: string, password?: string) => Promise<boolean>
  logout: () => Promise<void>
  switchUser: (userId: string) => void
  addUser: (userData: Omit<UserProfile, "id">) => void
  updateUser: (userId: string, updates: Partial<UserProfile>) => void
  deleteUser: (userId: string) => void
  canAccess: (allowedRoles: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ACTIVE_USER_STORAGE_KEY = "ganesh_sweets_active_user"
const USERS_LIST_STORAGE_KEY = "ganesh_sweets_users_list"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [users, setUsers] = useState<UserProfile[]>(defaultTeamUsers)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const initAuth = async () => {
      try {
        // 1. Load users list from storage
        const storedUsers = localStorage.getItem(USERS_LIST_STORAGE_KEY)
        let currentUsersList = defaultTeamUsers
        if (storedUsers) {
          const parsed = JSON.parse(storedUsers)
          if (Array.isArray(parsed) && parsed.length > 0) {
            currentUsersList = parsed
            setUsers(parsed)
          }
        }

        // 2. Check active Supabase session if configured
        if (isSupabaseConfigured()) {
          try {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", session.user.id)
                .single()

              const roleName = profile?.role
                ? ((profile.role.charAt(0).toUpperCase() + profile.role.slice(1)) as UserRole)
                : "Owner"

              const sbUser: UserProfile = {
                id: session.user.id,
                name: profile?.full_name || session.user.email?.split("@")[0] || "User",
                email: session.user.email || profile?.email || "",
                role: roleName,
                status: profile?.status || "ACTIVE",
              }
              setUser(sbUser)
              localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(sbUser))
              setIsLoading(false)
              return
            }
          } catch (sbErr) {
            console.warn("Supabase session check error:", sbErr)
          }
        }

        // 3. Load active user from localStorage if user had previously logged in
        const storedActive = localStorage.getItem(ACTIVE_USER_STORAGE_KEY)
        if (storedActive) {
          const parsedActive = JSON.parse(storedActive)
          const matched = currentUsersList.find(
            (u) => u.email.toLowerCase() === parsedActive.email?.toLowerCase()
          )
          setUser(matched || parsedActive)
        } else {
          // If no session exists, stay logged out so Login screen appears!
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
    const trimmed = email.trim().toLowerCase()

    // 1. If Supabase configured and password provided, authenticate against Supabase
    if (isSupabaseConfigured() && password) {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password: password,
        })

        if (!error && data.user) {
          // Fetch profile from Supabase
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .single()

          const roleName = profile?.role
            ? ((profile.role.charAt(0).toUpperCase() + profile.role.slice(1)) as UserRole)
            : "Owner"

          const loggedInUser: UserProfile = {
            id: data.user.id,
            name: profile?.full_name || trimmed.split("@")[0],
            email: data.user.email || trimmed,
            role: roleName,
            status: "ACTIVE",
          }

          setUser(loggedInUser)
          localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(loggedInUser))
          return true
        } else if (error) {
          console.warn("Supabase signin failed:", error.message)
          // Don't abort yet; check local users fallback
        }
      } catch (err) {
        console.warn("Supabase auth error during login:", err)
      }
    }

    // 2. Predefined local accounts
    const matched = users.find((u) => u.email.toLowerCase() === trimmed)
    if (matched) {
      setUser(matched)
      localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(matched))
      return true
    }

    // 3. Fallback: Log in as Owner/Staff
    const newUser: UserProfile = {
      id: "u_" + Date.now(),
      name: trimmed.split("@")[0],
      email: trimmed,
      role:
        trimmed.includes("admin") ||
        trimmed.includes("owner") ||
        trimmed.includes("kishan") ||
        trimmed.includes("ganesh")
          ? "Owner"
          : "Cashier",
      status: "ACTIVE",
    }
    const updatedUsers = [...users, newUser]
    setUsers(updatedUsers)
    setUser(newUser)
    localStorage.setItem(USERS_LIST_STORAGE_KEY, JSON.stringify(updatedUsers))
    localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(newUser))
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

  const switchUser = (userId: string) => {
    const target = users.find((u) => u.id === userId)
    if (target) {
      setUser(target)
      localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(target))
      window.dispatchEvent(new Event("auth-changed"))
    }
  }

  const addUser = (userData: Omit<UserProfile, "id">) => {
    const newUser: UserProfile = {
      ...userData,
      id: "u_" + Date.now(),
    }
    const updated = [...users, newUser]
    setUsers(updated)
    localStorage.setItem(USERS_LIST_STORAGE_KEY, JSON.stringify(updated))
  }

  const updateUser = (userId: string, updates: Partial<UserProfile>) => {
    const updated = users.map((u) => (u.id === userId ? { ...u, ...updates } : u))
    setUsers(updated)
    localStorage.setItem(USERS_LIST_STORAGE_KEY, JSON.stringify(updated))

    if (user?.id === userId) {
      const activeUpdated = { ...user, ...updates }
      setUser(activeUpdated)
      localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(activeUpdated))
    }
  }

  const deleteUser = (userId: string) => {
    const updated = users.filter((u) => u.id !== userId)
    setUsers(updated)
    localStorage.setItem(USERS_LIST_STORAGE_KEY, JSON.stringify(updated))
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
        users,
        isLoading,
        login,
        logout,
        switchUser,
        addUser,
        updateUser,
        deleteUser,
        canAccess,
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
