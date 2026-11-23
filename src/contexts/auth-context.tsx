"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export type UserRole = "Owner" | "Manager" | "Accountant" | "Cashier"

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
  {
    id: "u2",
    name: "Ramesh Sharma (Manager)",
    email: "manager@ganeshsweets.com",
    role: "Manager",
    phone: "+91 98765 43211",
    status: "ACTIVE",
  },
  {
    id: "u3",
    name: "Amit Verma (Accountant)",
    email: "accounts@ganeshsweets.com",
    role: "Accountant",
    phone: "+91 98765 43212",
    status: "ACTIVE",
  },
  {
    id: "u4",
    name: "Pooja Gupta (Cashier)",
    email: "counter@ganeshsweets.com",
    role: "Cashier",
    phone: "+91 98765 43213",
    status: "ACTIVE",
  },
]

interface AuthContextType {
  user: UserProfile | null
  users: UserProfile[]
  isLoading: boolean
  login: (email: string, password?: string) => Promise<boolean>
  logout: () => void
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
    try {
      // 1. Load users list
      const storedUsers = localStorage.getItem(USERS_LIST_STORAGE_KEY)
      let currentUsersList = defaultTeamUsers
      if (storedUsers) {
        const parsed = JSON.parse(storedUsers)
        if (Array.isArray(parsed) && parsed.length > 0) {
          currentUsersList = parsed
          setUsers(parsed)
        }
      }

      // 2. Load active user session
      const storedActive = localStorage.getItem(ACTIVE_USER_STORAGE_KEY)
      if (storedActive) {
        const parsedActive = JSON.parse(storedActive)
        // Verify user still exists
        const matched = currentUsersList.find((u) => u.email.toLowerCase() === parsedActive.email?.toLowerCase())
        if (matched) {
          setUser(matched)
        } else {
          setUser(parsedActive)
        }
      } else {
        // Default to Owner for seamless first-run
        setUser(currentUsersList[0])
        localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(currentUsersList[0]))
      }
    } catch (e) {
      console.error("Auth initialization error:", e)
      setUser(defaultTeamUsers[0])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = async (email: string): Promise<boolean> => {
    const trimmed = email.trim().toLowerCase()
    const matched = users.find((u) => u.email.toLowerCase() === trimmed)

    if (matched) {
      setUser(matched)
      localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(matched))
      return true
    }

    // If new email, create as Cashier/Staff by default
    const newUser: UserProfile = {
      id: "u_" + Date.now(),
      name: email.split("@")[0],
      email: trimmed,
      role: "Cashier",
      status: "ACTIVE",
    }
    const updatedUsers = [...users, newUser]
    setUsers(updatedUsers)
    setUser(newUser)
    localStorage.setItem(USERS_LIST_STORAGE_KEY, JSON.stringify(updatedUsers))
    localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(newUser))
    return true
  }

  const logout = () => {
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
    if (user.role === "Owner") return true // Owner has global access
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
