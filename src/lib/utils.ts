import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/**
 * Format number in Indian notation (e.g., 1,23,456.00)
 */
export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "₹0"
  return inrFormatter.format(amount)
}

/**
 * Format number in compact Indian notation (e.g., ₹45.2K, ₹1.2M)
 */
export function formatINRCompact(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
  return formatINR(amount)
}

/**
 * Format date to DD-MM-YYYY strictly with hyphen separators
 */
export function formatDateDDMMYYYY(date: Date | string | null | undefined): string {
  if (!date) return ""
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [yyyy, mm, dd] = date.split("-")
    return `${dd}-${mm}-${yyyy}`
  }
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return String(date)
  
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

/**
 * Format date to DD/MM/YYYY
 */
export function formatDate(date: Date | string | null | undefined): string {
  return formatDateDDMMYYYY(date)
}

/**
 * Format date with time DD/MM/YYYY, hh:mm AM/PM
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return ""
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  })
}

/**
 * Format relative date (Today, Tomorrow, Yesterday, or date)
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow"
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  return formatDate(d)
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Generate a unique ID (for client-side temporary use)
 */
export function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Get month-year string for grouping
 */
export function getMonthYear(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  })
}
