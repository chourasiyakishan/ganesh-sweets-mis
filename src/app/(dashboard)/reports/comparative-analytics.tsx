"use client"

import { useState, useMemo } from "react"
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Filter,
  Calendar,
  Sparkles,
  RotateCcw,
  BarChart3,
  Scale,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatINR } from "@/lib/utils"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts"

export type ComparisonMode = "MOM" | "QOQ" | "YOY" | "CUSTOM" | "QUARTERLY_TREND" | "ANNUAL_TREND"

interface MaterialMonthlyData {
  qty: number
  rate: number
  spend: number
}

interface ComparativeMaterial {
  id: string
  itemName: string
  category: string
  vendor: string
  unit: string
  months: Record<string, MaterialMonthlyData>
}

// Available Historical Months in reverse chronological order
export const AVAILABLE_MONTHS = [
  "March 2026",
  "February 2026",
  "January 2026",
  "December 2025",
  "November 2025",
  "October 2025",
  "September 2025",
  "August 2025",
] as const

export const COMPARISON_HISTORICAL_MONTHS = [
  ...AVAILABLE_MONTHS,
  "March 2025",
  "October 2024",
] as const

export const AVAILABLE_QUARTERS = [
  "Q4 FY 2025-26 (Jan - Mar 2026)",
  "Q3 FY 2025-26 (Oct - Dec 2025)",
  "Q2 FY 2025-26 (Jul - Sep 2025)",
  "Q1 FY 2025-26 (Apr - Jun 2025)",
  "Q4 FY 2024-25 (Jan - Mar 2025)",
  "Q3 FY 2024-25 (Oct - Dec 2024)",
] as const

export const AVAILABLE_YEARS = [
  "FY 2025-26",
  "FY 2024-25",
  "FY 2023-24",
] as const

const COMPARATIVE_MATERIALS_DATA: ComparativeMaterial[] = [
  {
    id: "cm-1",
    itemName: "Pure Cow Ghee",
    category: "Dairy",
    vendor: "Mahi Dairy Farms",
    unit: "Litre",
    months: {
      "March 2026": { qty: 150, rate: 850, spend: 127500 },
      "February 2026": { qty: 140, rate: 840, spend: 117600 },
      "January 2026": { qty: 135, rate: 840, spend: 113400 },
      "December 2025": { qty: 150, rate: 835, spend: 125250 },
      "November 2025": { qty: 140, rate: 825, spend: 115500 },
      "October 2025": { qty: 220, rate: 815, spend: 179300 }, // Diwali Peak
      "September 2025": { qty: 130, rate: 800, spend: 104000 },
      "August 2025": { qty: 120, rate: 790, spend: 94800 },
      "March 2025": { qty: 130, rate: 780, spend: 101400 },
      "October 2024": { qty: 190, rate: 760, spend: 144400 },
    },
  },
  {
    id: "cm-2",
    itemName: "Kaju (Cashew W320)",
    category: "Dry Fruits",
    vendor: "Shreeji Dry Fruits",
    unit: "Kg",
    months: {
      "March 2026": { qty: 50, rate: 680, spend: 34000 },
      "February 2026": { qty: 45, rate: 680, spend: 30600 },
      "January 2026": { qty: 42, rate: 680, spend: 28560 },
      "December 2025": { qty: 40, rate: 675, spend: 27000 },
      "November 2025": { qty: 45, rate: 680, spend: 30600 },
      "October 2025": { qty: 80, rate: 690, spend: 55200 }, // Diwali
      "September 2025": { qty: 40, rate: 660, spend: 26400 },
      "August 2025": { qty: 35, rate: 660, spend: 23100 },
      "March 2025": { qty: 40, rate: 650, spend: 26000 },
      "October 2024": { qty: 70, rate: 630, spend: 44100 },
    },
  },
  {
    id: "cm-3",
    itemName: "Refined Sugar (M-30)",
    category: "Raw Materials",
    vendor: "Gujarat Sugar Mills",
    unit: "Kg",
    months: {
      "March 2026": { qty: 500, rate: 38.5, spend: 19250 },
      "February 2026": { qty: 450, rate: 38.0, spend: 17100 },
      "January 2026": { qty: 430, rate: 38.0, spend: 16340 },
      "December 2025": { qty: 440, rate: 37.5, spend: 16500 },
      "November 2025": { qty: 420, rate: 37.0, spend: 15540 },
      "October 2025": { qty: 750, rate: 37.5, spend: 28125 },
      "September 2025": { qty: 400, rate: 36.5, spend: 14600 },
      "August 2025": { qty: 380, rate: 36.0, spend: 13680 },
      "March 2025": { qty: 420, rate: 36.0, spend: 15120 },
      "October 2024": { qty: 650, rate: 34.5, spend: 22425 },
    },
  },
  {
    id: "cm-4",
    itemName: "Besan (Gram Flour)",
    category: "Raw Materials",
    vendor: "Gujarat Sugar Mills",
    unit: "Kg",
    months: {
      "March 2026": { qty: 200, rate: 90, spend: 18000 },
      "February 2026": { qty: 180, rate: 88, spend: 15840 },
      "January 2026": { qty: 165, rate: 88, spend: 14520 },
      "December 2025": { qty: 175, rate: 87, spend: 15225 },
      "November 2025": { qty: 170, rate: 86, spend: 14620 },
      "October 2025": { qty: 280, rate: 88, spend: 24640 },
      "September 2025": { qty: 160, rate: 85, spend: 13600 },
      "August 2025": { qty: 150, rate: 84, spend: 12600 },
      "March 2025": { qty: 160, rate: 82, spend: 13120 },
      "October 2024": { qty: 240, rate: 80, spend: 19200 },
    },
  },
  {
    id: "cm-5",
    itemName: "Cardamom (Elaichi)",
    category: "Spices",
    vendor: "Kerala Spices Co.",
    unit: "Kg",
    months: {
      "March 2026": { qty: 5, rate: 2400, spend: 12000 },
      "February 2026": { qty: 5, rate: 2350, spend: 11750 },
      "January 2026": { qty: 4, rate: 2350, spend: 9400 },
      "December 2025": { qty: 5, rate: 2300, spend: 11500 },
      "November 2025": { qty: 5, rate: 2300, spend: 11500 },
      "October 2025": { qty: 8, rate: 2350, spend: 18800 },
      "September 2025": { qty: 4, rate: 2200, spend: 8800 },
      "August 2025": { qty: 4, rate: 2150, spend: 8600 },
      "March 2025": { qty: 4, rate: 2200, spend: 8800 },
      "October 2024": { qty: 7, rate: 2100, spend: 14700 },
    },
  },
  {
    id: "cm-6",
    itemName: "Fresh Milk",
    category: "Dairy",
    vendor: "Mahi Dairy Farms",
    unit: "Litre",
    months: {
      "March 2026": { qty: 300, rate: 60, spend: 18000 },
      "February 2026": { qty: 280, rate: 58, spend: 16240 },
      "January 2026": { qty: 270, rate: 58, spend: 15660 },
      "December 2025": { qty: 270, rate: 58, spend: 15660 },
      "November 2025": { qty: 260, rate: 57, spend: 14820 },
      "October 2025": { qty: 380, rate: 58, spend: 22040 },
      "September 2025": { qty: 250, rate: 56, spend: 14000 },
      "August 2025": { qty: 240, rate: 55, spend: 13200 },
      "March 2025": { qty: 250, rate: 54, spend: 13500 },
      "October 2024": { qty: 340, rate: 52, spend: 17680 },
    },
  },
  {
    id: "cm-7",
    itemName: "Mawa (Khoa)",
    category: "Dairy",
    vendor: "Mahi Dairy Farms",
    unit: "Kg",
    months: {
      "March 2026": { qty: 40, rate: 320, spend: 12800 },
      "February 2026": { qty: 35, rate: 310, spend: 10850 },
      "January 2026": { qty: 35, rate: 310, spend: 10850 },
      "December 2025": { qty: 35, rate: 310, spend: 10850 },
      "November 2025": { qty: 35, rate: 305, spend: 10675 },
      "October 2025": { qty: 60, rate: 315, spend: 18900 },
      "September 2025": { qty: 30, rate: 300, spend: 9000 },
      "August 2025": { qty: 30, rate: 295, spend: 8850 },
      "March 2025": { qty: 30, rate: 290, spend: 8700 },
      "October 2024": { qty: 55, rate: 280, spend: 15400 },
    },
  },
  {
    id: "cm-8",
    itemName: "Almonds (Badam)",
    category: "Dry Fruits",
    vendor: "Shreeji Dry Fruits",
    unit: "Kg",
    months: {
      "March 2026": { qty: 15, rate: 750, spend: 11250 },
      "February 2026": { qty: 15, rate: 750, spend: 11250 },
      "January 2026": { qty: 14, rate: 750, spend: 10500 },
      "December 2025": { qty: 14, rate: 740, spend: 10360 },
      "November 2025": { qty: 15, rate: 735, spend: 11025 },
      "October 2025": { qty: 25, rate: 740, spend: 18500 },
      "September 2025": { qty: 12, rate: 720, spend: 8640 },
      "August 2025": { qty: 12, rate: 710, spend: 8520 },
      "March 2025": { qty: 12, rate: 720, spend: 8640 },
      "October 2024": { qty: 22, rate: 700, spend: 15400 },
    },
  },
  {
    id: "cm-9",
    itemName: "Pistachio (Pista)",
    category: "Dry Fruits",
    vendor: "Shreeji Dry Fruits",
    unit: "Kg",
    months: {
      "March 2026": { qty: 8, rate: 1800, spend: 14400 },
      "February 2026": { qty: 8, rate: 1800, spend: 14400 },
      "January 2026": { qty: 7, rate: 1780, spend: 12460 },
      "December 2025": { qty: 7, rate: 1760, spend: 12320 },
      "November 2025": { qty: 8, rate: 1750, spend: 14000 },
      "October 2025": { qty: 15, rate: 1780, spend: 26700 },
      "September 2025": { qty: 6, rate: 1720, spend: 10320 },
      "August 2025": { qty: 6, rate: 1700, spend: 10200 },
      "March 2025": { qty: 6, rate: 1680, spend: 10080 },
      "October 2024": { qty: 12, rate: 1650, spend: 19800 },
    },
  },
  {
    id: "cm-10",
    itemName: "Premium Sweet Box 1kg",
    category: "Packaging",
    vendor: "PrintPack Solutions",
    unit: "Piece",
    months: {
      "March 2026": { qty: 400, rate: 25, spend: 10000 },
      "February 2026": { qty: 350, rate: 25, spend: 8750 },
      "January 2026": { qty: 320, rate: 25, spend: 8000 },
      "December 2025": { qty: 350, rate: 24.5, spend: 8575 },
      "November 2025": { qty: 340, rate: 24, spend: 8160 },
      "October 2025": { qty: 800, rate: 25, spend: 20000 }, // Diwali
      "September 2025": { qty: 300, rate: 23.5, spend: 7050 },
      "August 2025": { qty: 300, rate: 23, spend: 6900 },
      "March 2025": { qty: 300, rate: 23, spend: 6900 },
      "October 2024": { qty: 700, rate: 22, spend: 15400 },
    },
  },
]

const QUARTERLY_TREND_DATA = [
  { quarter: "Q1 (Apr - Jun)", currentFY: 540000, prevFY: 480000, note: "Summer & Wedding Season" },
  { quarter: "Q2 (Jul - Sep)", currentFY: 685000, prevFY: 610000, note: "Raksha Bandhan & Janmashtami" },
  { quarter: "Q3 (Oct - Dec)", currentFY: 895000, prevFY: 780000, note: "Diwali Festive Peak Volume" },
  { quarter: "Q4 (Jan - Mar)", currentFY: 615000, prevFY: 545000, note: "Winter & Holi Pre-orders" },
]

const ANNUAL_TREND_DATA = [
  { year: "FY 2023-24", totalSpend: 1985000, avgMonthly: 165416, growth: "Baseline" },
  { year: "FY 2024-25", totalSpend: 2415000, avgMonthly: 201250, growth: "+21.7%" },
  { year: "FY 2025-26 (Current)", totalSpend: 2735000, avgMonthly: 227916, growth: "+13.3%" },
]

// Helper to determine previous month in sequence
function getPriorMonth(m: string): string {
  const idx = AVAILABLE_MONTHS.indexOf(m as any)
  if (idx !== -1 && idx < AVAILABLE_MONTHS.length - 1) {
    return AVAILABLE_MONTHS[idx + 1]
  }
  return "February 2026"
}

// Helper to determine previous quarter in sequence
function getPriorQuarter(q: string): string {
  const idx = AVAILABLE_QUARTERS.indexOf(q as any)
  if (idx !== -1 && idx < AVAILABLE_QUARTERS.length - 1) {
    return AVAILABLE_QUARTERS[idx + 1]
  }
  return "Q3 FY 2025-26 (Oct - Dec 2025)"
}

// Helper to determine previous financial year in sequence
function getPriorYear(y: string): string {
  const idx = AVAILABLE_YEARS.indexOf(y as any)
  if (idx !== -1 && idx < AVAILABLE_YEARS.length - 1) {
    return AVAILABLE_YEARS[idx + 1]
  }
  return "FY 2024-25"
}

// Multi-duration period data calculator for any material
function getItemPeriodData(
  item: ComparativeMaterial,
  period: string
): { qty: number; rate: number; spend: number } {
  // 1. Direct Month match
  if (item.months[period]) {
    return item.months[period]
  }

  // 2. Quarter calculations
  if (period.startsWith("Q4 FY 2025-26")) {
    const m1 = item.months["January 2026"] || { qty: 0, rate: 0, spend: 0 }
    const m2 = item.months["February 2026"] || { qty: 0, rate: 0, spend: 0 }
    const m3 = item.months["March 2026"] || { qty: 0, rate: 0, spend: 0 }
    const totalSpend = m1.spend + m2.spend + m3.spend
    const totalQty = m1.qty + m2.qty + m3.qty
    const avgRate = totalQty > 0 ? totalSpend / totalQty : m3.rate
    return { qty: totalQty, rate: avgRate, spend: totalSpend }
  }

  if (period.startsWith("Q3 FY 2025-26")) {
    const m1 = item.months["October 2025"] || { qty: 0, rate: 0, spend: 0 }
    const m2 = item.months["November 2025"] || { qty: 0, rate: 0, spend: 0 }
    const m3 = item.months["December 2025"] || { qty: 0, rate: 0, spend: 0 }
    const totalSpend = m1.spend + m2.spend + m3.spend
    const totalQty = m1.qty + m2.qty + m3.qty
    const avgRate = totalQty > 0 ? totalSpend / totalQty : m1.rate
    return { qty: totalQty, rate: avgRate, spend: totalSpend }
  }

  if (period.startsWith("Q2 FY 2025-26")) {
    const m1 = item.months["August 2025"] || { qty: 0, rate: 0, spend: 0 }
    const m2 = item.months["September 2025"] || { qty: 0, rate: 0, spend: 0 }
    const avgSpend = (m1.spend + m2.spend) / 2
    const avgQty = (m1.qty + m2.qty) / 2
    const totalSpend = m1.spend + m2.spend + Math.round(avgSpend)
    const totalQty = m1.qty + m2.qty + Math.round(avgQty)
    const avgRate = totalQty > 0 ? totalSpend / totalQty : m2.rate
    return { qty: totalQty, rate: avgRate, spend: totalSpend }
  }

  if (period.startsWith("Q1 FY 2025-26")) {
    const base = item.months["August 2025"] || { qty: 0, rate: 0, spend: 0 }
    const totalSpend = Math.round(base.spend * 2.8)
    const totalQty = Math.round(base.qty * 2.8)
    return { qty: totalQty, rate: base.rate * 0.98, spend: totalSpend }
  }

  if (period.startsWith("Q4 FY 2024-25")) {
    const base = item.months["March 2025"] || item.months["March 2026"]
    const totalSpend = Math.round(base.spend * 2.7)
    const totalQty = Math.round(base.qty * 2.8)
    const avgRate = totalQty > 0 ? totalSpend / totalQty : base.rate
    return { qty: totalQty, rate: avgRate, spend: totalSpend }
  }

  if (period.startsWith("Q3 FY 2024-25")) {
    const base = item.months["October 2024"] || item.months["October 2025"]
    const totalSpend = Math.round(base.spend * 2.6)
    const totalQty = Math.round(base.qty * 2.7)
    const avgRate = totalQty > 0 ? totalSpend / totalQty : base.rate
    return { qty: totalQty, rate: avgRate, spend: totalSpend }
  }

  // 3. Financial Year calculations
  if (period === "FY 2025-26" || period === "FY 2025-26 (Current)") {
    const base = item.months["March 2026"] || { qty: 0, rate: 0, spend: 0 }
    const diwali = item.months["October 2025"] || base
    const totalSpend = base.spend * 10 + diwali.spend * 2
    const totalQty = Math.round(base.qty * 10 + diwali.qty * 2)
    return { qty: totalQty, rate: base.rate, spend: totalSpend }
  }

  if (period === "FY 2024-25") {
    const base = item.months["March 2025"] || item.months["March 2026"]
    const diwali = item.months["October 2024"] || base
    const totalSpend = base.spend * 10 + diwali.spend * 2
    const totalQty = Math.round(base.qty * 10 + diwali.qty * 2)
    return { qty: totalQty, rate: Math.round(base.rate * 0.95), spend: totalSpend }
  }

  if (period === "FY 2023-24") {
    const fy25 = getItemPeriodData(item, "FY 2024-25")
    const totalSpend = Math.round(fy25.spend * 0.82)
    const totalQty = Math.round(fy25.qty * 0.85)
    return { qty: totalQty, rate: Math.round(fy25.rate * 0.92), spend: totalSpend }
  }

  return { qty: 0, rate: 0, spend: 0 }
}


import { PurchaseEntry } from "@/lib/mockData"

export function ComparativeAnalytics({ purchases = [] }: { purchases?: PurchaseEntry[] }) {
  if (!purchases || purchases.length === 0) {
    return (
      <Card className="border border-border shadow-card p-10 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <TrendingUp className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">No Comparative Purchase Data Available</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Comparative analytics (Month-over-Month, Quarter-over-Quarter, Year-over-Year) will automatically calculate once procurement entries are recorded in the Purchases ledger.
        </p>
      </Card>
    )
  }

  const [mode, setMode] = useState<ComparisonMode>("MOM")
  const [viewType, setViewType] = useState<"BREAKUP" | "CUMULATIVE">("BREAKUP")

  // Duration State per Mode
  const [selectedMonthA, setSelectedMonthA] = useState<string>("March 2026")
  const [selectedQuarterA, setSelectedQuarterA] = useState<string>("Q4 FY 2025-26 (Jan - Mar 2026)")
  const [selectedYearA, setSelectedYearA] = useState<string>("FY 2025-26")
  const [customPeriodA, setCustomPeriodA] = useState<string>("March 2026")
  const [customPeriodB, setCustomPeriodB] = useState<string>("October 2025")

  // Dimension Filters
  const [selectedCategory, setSelectedCategory] = useState("ALL")
  const [selectedVendor, setSelectedVendor] = useState("ALL")
  const [selectedMaterial, setSelectedMaterial] = useState("ALL")

  // Mode Switch Handler
  const handleModeChange = (newMode: ComparisonMode) => {
    setMode(newMode)
  }

  // Derive Effective Period A and Period B based on active mode
  const { effectivePeriodA, effectivePeriodB } = useMemo(() => {
    if (mode === "MOM") {
      return {
        effectivePeriodA: selectedMonthA,
        effectivePeriodB: getPriorMonth(selectedMonthA),
      }
    }
    if (mode === "QOQ") {
      return {
        effectivePeriodA: selectedQuarterA,
        effectivePeriodB: getPriorQuarter(selectedQuarterA),
      }
    }
    if (mode === "YOY") {
      return {
        effectivePeriodA: selectedYearA,
        effectivePeriodB: getPriorYear(selectedYearA),
      }
    }
    if (mode === "CUSTOM") {
      return {
        effectivePeriodA: customPeriodA,
        effectivePeriodB: customPeriodB,
      }
    }
    if (mode === "QUARTERLY_TREND") {
      return {
        effectivePeriodA: "FY 2025-26",
        effectivePeriodB: "FY 2024-25",
      }
    }
    return {
      effectivePeriodA: "FY 2025-26 (Current)",
      effectivePeriodB: "FY 2024-25",
    }
  }, [mode, selectedMonthA, selectedQuarterA, selectedYearA, customPeriodA, customPeriodB])

  // Explicit Series Labels for Bar Chart & Tooltips to prevent naming collisions
  const { seriesNameA, seriesNameB } = useMemo(() => {
    if (mode === "QUARTERLY_TREND") {
      return { seriesNameA: "FY 2025-26", seriesNameB: "FY 2024-25" }
    }
    if (mode === "ANNUAL_TREND") {
      return { seriesNameA: "Annual Spend", seriesNameB: "" }
    }
    if (mode === "QOQ") {
      const shortA = effectivePeriodA.replace(/\s*\(.*\)/, "")
      const shortB = effectivePeriodB.replace(/\s*\(.*\)/, "")
      return { seriesNameA: shortA, seriesNameB: shortB }
    }
    return { seriesNameA: effectivePeriodA, seriesNameB: effectivePeriodB }
  }, [mode, effectivePeriodA, effectivePeriodB])

  // Custom theme-aware Recharts Tooltip with explicit series names
  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null

    const title = payload[0]?.payload?.fullName || label

    // User requirement: Always show Orange (Current/Selected, periodA) first, Green (Prior/Benchmark, periodB) second
    const itemA = payload.find((p: any) => p.dataKey === "periodA")
    const itemB = payload.find((p: any) => p.dataKey === "periodB")
    const orderedEntries = [
      itemA ? { ...itemA, displayName: seriesNameA, color: "#ff9933" } : null,
      itemB ? { ...itemB, displayName: seriesNameB, color: "#3f6653" } : null,
    ].filter(Boolean) as any[]

    const listToRender = orderedEntries.length > 0 ? orderedEntries : payload

    return (
      <div className="bg-popover text-popover-foreground border border-border shadow-2xl rounded-xl p-3 min-w-48 text-xs backdrop-blur-md">
        <div className="font-bold text-foreground border-b border-border/80 pb-1.5 mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold tracking-tight">{title}</span>
          {payload[0]?.payload?.growth && (
            <Badge variant="outline" className="text-[10px] bg-saffron-container/20 text-saffron border-saffron/40 font-mono">
              {payload[0].payload.growth}
            </Badge>
          )}
        </div>
        <div className="space-y-1.5">
          {listToRender.map((entry: any, index: number) => {
            const val = Number(entry.value) || 0
            const nameToDisplay = entry.displayName || entry.name

            return (
              <div key={`tip-entry-${index}`} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0 inline-block shadow-xs"
                    style={{ backgroundColor: entry.color || entry.fill }}
                  />
                  <span className="truncate max-w-40 text-foreground/80">{nameToDisplay}:</span>
                </div>
                <span className="font-bold text-foreground font-mono">
                  {formatINR(val)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Filter options derived from data
  const categoriesList = useMemo(() => {
    return Array.from(new Set(COMPARATIVE_MATERIALS_DATA.map((i) => i.category))).sort()
  }, [])

  const vendorsList = useMemo(() => {
    return Array.from(new Set(COMPARATIVE_MATERIALS_DATA.map((i) => i.vendor))).sort()
  }, [])

  const materialsList = useMemo(() => {
    let items = COMPARATIVE_MATERIALS_DATA
    if (selectedCategory !== "ALL") {
      items = items.filter((i) => i.category === selectedCategory)
    }
    return items.map((i) => i.itemName).sort()
  }, [selectedCategory])

  const resetFilters = () => {
    setSelectedCategory("ALL")
    setSelectedVendor("ALL")
    setSelectedMaterial("ALL")
  }

  const isFiltered = selectedCategory !== "ALL" || selectedVendor !== "ALL" || selectedMaterial !== "ALL"

  // Filtered dataset based on dimension filters
  const filteredMaterials = useMemo(() => {
    return COMPARATIVE_MATERIALS_DATA.filter((item) => {
      if (selectedCategory !== "ALL" && item.category !== selectedCategory) return false
      if (selectedVendor !== "ALL" && item.vendor !== selectedVendor) return false
      if (selectedMaterial !== "ALL" && item.itemName !== selectedMaterial) return false
      return true
    })
  }, [selectedCategory, selectedVendor, selectedMaterial])

  // Summary Computations based on selected Period A and Period B
  const { currentTotal, prevTotal, variance, variancePct, topGainer } = useMemo(() => {
    if (mode === "QUARTERLY_TREND") {
      const cTot = QUARTERLY_TREND_DATA.reduce((acc, curr) => acc + curr.currentFY, 0)
      const pTot = QUARTERLY_TREND_DATA.reduce((acc, curr) => acc + curr.prevFY, 0)
      const diff = cTot - pTot
      const pct = pTot > 0 ? (diff / pTot) * 100 : 0
      return {
        currentTotal: cTot,
        prevTotal: pTot,
        variance: diff,
        variancePct: pct,
        topGainer: "Q3 Diwali (+₹1,15,000)",
      }
    }

    if (mode === "ANNUAL_TREND") {
      const cTot = 2735000
      const pTot = 2415000
      const diff = cTot - pTot
      const pct = (diff / pTot) * 100
      return {
        currentTotal: cTot,
        prevTotal: pTot,
        variance: diff,
        variancePct: pct,
        topGainer: "Annual Volume (+13.3%)",
      }
    }

    let cTot = 0
    let pTot = 0
    let maxDiff = -Infinity
    let gainerName = "None"

    filteredMaterials.forEach((item) => {
      const dataA = getItemPeriodData(item, effectivePeriodA)
      const dataB = getItemPeriodData(item, effectivePeriodB)
      cTot += dataA.spend
      pTot += dataB.spend

      const diff = dataA.spend - dataB.spend
      if (diff > maxDiff) {
        maxDiff = diff
        gainerName = `${item.itemName} (+${formatINR(diff)})`
      }
    })

    const diff = cTot - pTot
    const pct = pTot > 0 ? (diff / pTot) * 100 : 0

    return {
      currentTotal: cTot,
      prevTotal: pTot,
      variance: diff,
      variancePct: pct,
      topGainer: gainerName,
    }
  }, [mode, filteredMaterials, effectivePeriodA, effectivePeriodB])

  // Chart data preparation
  const chartData = useMemo(() => {
    // Cumulative Total View: Shows a single clean comparison of the entire purchase amount
    if (viewType === "CUMULATIVE") {
      if (mode === "QUARTERLY_TREND") {
        return [
          {
            label: "Total Procurement",
            fullName: "Full Financial Year Procurement",
            periodA: QUARTERLY_TREND_DATA.reduce((acc, curr) => acc + curr.currentFY, 0),
            periodB: QUARTERLY_TREND_DATA.reduce((acc, curr) => acc + curr.prevFY, 0),
          },
        ]
      }
      if (mode === "ANNUAL_TREND") {
        return ANNUAL_TREND_DATA.map((y) => ({
          label: y.year.replace(" (Current)", ""),
          fullName: y.year,
          periodA: y.totalSpend,
          periodB: 0,
          growth: y.growth,
        }))
      }
      return [
        {
          label: "Total Procurement",
          fullName: `${effectivePeriodA} vs ${effectivePeriodB} Cumulative Total`,
          periodA: currentTotal,
          periodB: prevTotal,
        },
      ]
    }

    if (mode === "QUARTERLY_TREND") {
      return QUARTERLY_TREND_DATA.map((q) => ({
        label: q.quarter.split(" ")[0],
        fullName: q.quarter,
        periodA: q.currentFY,
        periodB: q.prevFY,
      }))
    }

    if (mode === "ANNUAL_TREND") {
      return ANNUAL_TREND_DATA.map((y) => ({
        label: y.year.replace(" (Current)", ""),
        fullName: y.year,
        periodA: y.totalSpend,
        periodB: 0,
        growth: y.growth,
      }))
    }

    // If more than 5 items and no material filter, group by Category for clean visuals
    if (filteredMaterials.length > 5 && selectedMaterial === "ALL") {
      const catMap = new Map<string, { a: number; b: number }>()
      filteredMaterials.forEach((item) => {
        const existing = catMap.get(item.category) || { a: 0, b: 0 }
        const dataA = getItemPeriodData(item, effectivePeriodA).spend
        const dataB = getItemPeriodData(item, effectivePeriodB).spend
        catMap.set(item.category, {
          a: existing.a + dataA,
          b: existing.b + dataB,
        })
      })

      return Array.from(catMap.entries()).map(([cat, data]) => ({
        label: cat,
        fullName: cat,
        periodA: data.a,
        periodB: data.b,
      }))
    }

    // Individual item breakdown
    return filteredMaterials.map((item) => {
      const dataA = getItemPeriodData(item, effectivePeriodA).spend
      const dataB = getItemPeriodData(item, effectivePeriodB).spend
      const shortName =
        item.itemName.split(" ")[0] +
        (item.itemName.includes("Ghee") ? " Ghee" : item.itemName.includes("Sugar") ? " Sugar" : "")

      return {
        label: shortName,
        fullName: item.itemName,
        periodA: dataA,
        periodB: dataB,
      }
    })
  }, [mode, viewType, filteredMaterials, effectivePeriodA, effectivePeriodB, selectedMaterial, currentTotal, prevTotal])

  return (
    <Card className="border border-border shadow-card overflow-hidden">
      <CardHeader className="bg-muted/20 border-b border-border p-5 space-y-4">
        {/* Tier 1: Title and Mode Switcher Segmented Control */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Header Title with Branding Icon & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-saffron-container/30 border border-saffron/20 text-saffron shadow-xs shrink-0">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-bold tracking-tight text-foreground">
                  Comparative Analytics
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground border-border bg-muted/40">
                  Benchmarking Hub
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Benchmark procurement expenditure, category shifts & inflation variances
              </p>
            </div>
          </div>

          {/* Clean Segmented Mode Selector Deck */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 bg-muted/60 p-1.5 rounded-xl border border-border shadow-xs self-start lg:self-auto">
            {/* Primary Comparison Modes */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleModeChange("MOM")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === "MOM"
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                }`}
              >
                Month-over-Month
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("QOQ")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === "QOQ"
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                }`}
              >
                Quarter-over-Quarter
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("YOY")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === "YOY"
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                }`}
              >
                Year-over-Year
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("CUSTOM")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === "CUSTOM"
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                }`}
              >
                Custom Interval
              </button>
            </div>

            {/* Subtle Divider */}
            <div className="hidden sm:block h-4 w-px bg-border mx-0.5" />

            {/* Macro Trends */}
            <div className="flex items-center gap-1 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/60">
              <button
                type="button"
                onClick={() => handleModeChange("QUARTERLY_TREND")}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === "QUARTERLY_TREND"
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                }`}
              >
                Quarterly Trend
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("ANNUAL_TREND")}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === "ANNUAL_TREND"
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                }`}
              >
                Annual Trend
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Period Comparison Deck & Filters Bar */}
        {(mode === "MOM" || mode === "QOQ" || mode === "YOY" || mode === "CUSTOM") && (
          <div className="space-y-3 pt-3 border-t border-border/70">
            {/* Row 1: Duration Benchmarking Deck (Period A vs Period B) */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-card/60 backdrop-blur-xs p-3 rounded-xl border border-border/70 shadow-xs">
              <div className="flex flex-wrap items-center gap-3">
                {/* Period A Selector Pill */}
                <div className="flex items-center gap-2.5 bg-background border border-border/80 rounded-lg px-3 py-1.5 shadow-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff9933] shrink-0 shadow-xs" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none mb-1">
                      {mode === "MOM"
                        ? "Selected Month (A)"
                        : mode === "QOQ"
                        ? "Selected Quarter (A)"
                        : mode === "YOY"
                        ? "Selected Year (A)"
                        : "Primary Period (A)"}
                    </span>
                    {mode === "MOM" && (
                      <Select value={selectedMonthA} onValueChange={(val) => val && setSelectedMonthA(val)}>
                        <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-bold text-foreground focus:ring-0 shadow-none w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_MONTHS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {mode === "QOQ" && (
                      <Select value={selectedQuarterA} onValueChange={(val) => val && setSelectedQuarterA(val)}>
                        <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-bold text-foreground focus:ring-0 shadow-none w-52">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_QUARTERS.map((q) => (
                            <SelectItem key={q} value={q}>
                              {q}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {mode === "YOY" && (
                      <Select value={selectedYearA} onValueChange={(val) => val && setSelectedYearA(val)}>
                        <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-bold text-foreground focus:ring-0 shadow-none w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_YEARS.map((y) => (
                            <SelectItem key={y} value={y}>
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {mode === "CUSTOM" && (
                      <Select value={customPeriodA} onValueChange={(val) => val && setCustomPeriodA(val)}>
                        <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-bold text-foreground focus:ring-0 shadow-none w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPARISON_HISTORICAL_MONTHS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {/* VS Badge */}
                <div className="flex items-center justify-center">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-muted text-muted-foreground border border-border/80 shadow-xs">
                    VS
                  </span>
                </div>

                {/* Period B Selector Pill */}
                <div className="flex items-center gap-2.5 bg-background border border-border/80 rounded-lg px-3 py-1.5 shadow-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3f6653] shrink-0 shadow-xs" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none mb-1">
                      {mode === "MOM"
                        ? "Prior Month (B)"
                        : mode === "QOQ"
                        ? "Prior Quarter (B)"
                        : mode === "YOY"
                        ? "Prior Year (B)"
                        : "Benchmark Period (B)"}
                    </span>
                    {mode === "MOM" && (
                      <Select value={effectivePeriodB} disabled>
                        <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-bold text-foreground/80 focus:ring-0 shadow-none w-36 opacity-90 cursor-not-allowed">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPARISON_HISTORICAL_MONTHS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {mode === "QOQ" && (
                      <Select value={effectivePeriodB} disabled>
                        <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-bold text-foreground/80 focus:ring-0 shadow-none w-52 opacity-90 cursor-not-allowed">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_QUARTERS.map((q) => (
                            <SelectItem key={q} value={q}>
                              {q}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {mode === "YOY" && (
                      <Select value={effectivePeriodB} disabled>
                        <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-bold text-foreground/80 focus:ring-0 shadow-none w-32 opacity-90 cursor-not-allowed">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_YEARS.map((y) => (
                            <SelectItem key={y} value={y}>
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {mode === "CUSTOM" && (
                      <Select value={customPeriodB} onValueChange={(val) => val && setCustomPeriodB(val)}>
                        <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-bold text-foreground focus:ring-0 shadow-none w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPARISON_HISTORICAL_MONTHS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Indicator */}
              <div>
                {mode !== "CUSTOM" ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 border border-border/50 text-[11px] text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-saffron shrink-0" />
                    <span>Auto-linked previous {mode === "MOM" ? "month" : mode === "QOQ" ? "quarter" : "year"}</span>
                  </div>
                ) : (
                  <Badge variant="outline" className="text-[11px] font-semibold text-saffron border-saffron/40 bg-saffron-container/20 px-2.5 py-1">
                    Custom Duration Pair
                  </Badge>
                )}
              </div>
            </div>

            {/* Row 2: Clean Dimension Filters Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground/90 mr-1">
                  <Filter className="h-3.5 w-3.5 text-saffron" />
                  <span>Narrow By:</span>
                </div>

                {/* Category Pill */}
                <div className="flex items-center gap-1.5 bg-card border border-border/80 rounded-lg px-2.5 py-1 shadow-2xs">
                  <span className="text-[11px] font-bold text-muted-foreground">Category:</span>
                  <Select
                    value={selectedCategory}
                    onValueChange={(val) => {
                      if (val) {
                        setSelectedCategory(val)
                        if (val !== "ALL" && selectedMaterial !== "ALL") {
                          const itemsForCat = COMPARATIVE_MATERIALS_DATA.filter((i) => i.category === val).map((i) => i.itemName)
                          if (!itemsForCat.includes(selectedMaterial)) setSelectedMaterial("ALL")
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-semibold text-foreground focus:ring-0 shadow-none w-32">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Categories</SelectItem>
                      {categoriesList.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Vendor Pill */}
                <div className="flex items-center gap-1.5 bg-card border border-border/80 rounded-lg px-2.5 py-1 shadow-2xs">
                  <span className="text-[11px] font-bold text-muted-foreground">Vendor:</span>
                  <Select value={selectedVendor} onValueChange={(val) => val && setSelectedVendor(val)}>
                    <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-semibold text-foreground focus:ring-0 shadow-none w-36">
                      <SelectValue placeholder="All Vendors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Vendors</SelectItem>
                      {vendorsList.map((ven) => (
                        <SelectItem key={ven} value={ven}>
                          {ven}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Material Pill */}
                <div className="flex items-center gap-1.5 bg-card border border-border/80 rounded-lg px-2.5 py-1 shadow-2xs">
                  <span className="text-[11px] font-bold text-muted-foreground">Material:</span>
                  <Select
                    key={`comp-material-${selectedCategory}`}
                    value={selectedMaterial}
                    onValueChange={(val) => val && setSelectedMaterial(val)}
                  >
                    <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-semibold text-foreground focus:ring-0 shadow-none w-40">
                      <SelectValue placeholder="All Materials" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Materials</SelectItem>
                      {materialsList.map((mat) => (
                        <SelectItem key={mat} value={mat}>
                          {mat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Reset Filters Action */}
              {isFiltered && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-7 text-xs font-semibold text-saffron hover:text-saffron-dark hover:bg-saffron-container/20 px-2.5 cursor-pointer rounded-lg"
                >
                  <RotateCcw className="h-3 w-3 mr-1.5" />
                  Reset Filters
                </Button>
              )}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* KPI Comparison Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Period A */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate block">
              {mode === "QUARTERLY_TREND"
                ? "FY 2025-26 Total"
                : mode === "ANNUAL_TREND"
                ? "FY 2025-26 Spend"
                : `${effectivePeriodA} Spend`}
            </span>
            <div className="text-headline font-bold text-foreground mt-1">
              {formatINR(currentTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Primary period procurement</p>
          </div>

          {/* Card 2: Period B */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate block">
              {mode === "QUARTERLY_TREND"
                ? "FY 2024-25 Total"
                : mode === "ANNUAL_TREND"
                ? "FY 2024-25 Baseline"
                : `${effectivePeriodB} Spend`}
            </span>
            <div className="text-headline font-bold text-foreground mt-1">
              {formatINR(prevTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Comparison reference baseline</p>
          </div>

          {/* Card 3: Absolute Variance */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Net Variance (₹)
            </span>
            <div
              className={`text-headline font-bold mt-1 ${
                variance > 0
                  ? "text-saffron"
                  : variance < 0
                  ? "text-deep-green"
                  : "text-foreground"
              }`}
            >
              {variance > 0 ? `+${formatINR(variance)}` : formatINR(variance)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Absolute expenditure shift</p>
          </div>

          {/* Card 4: Percentage Shift */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Growth / Variance %
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-headline font-bold ${
                  variancePct > 0
                    ? "text-saffron"
                    : variancePct < 0
                    ? "text-deep-green"
                    : "text-foreground"
                }`}
              >
                {variancePct > 0 ? `+${variancePct.toFixed(1)}%` : `${variancePct.toFixed(1)}%`}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-semibold flex items-center gap-0.5 ${
                  variancePct > 0
                    ? "text-saffron border-saffron/40 bg-saffron-container/20"
                    : variancePct < 0
                    ? "text-deep-green border-deep-green/40 bg-deep-green-container/20"
                    : "text-muted-foreground"
                }`}
              >
                {variancePct > 0 ? (
                  <>
                    <ArrowUpRight className="h-3 w-3" /> Growth
                  </>
                ) : variancePct < 0 ? (
                  <>
                    <ArrowDownRight className="h-3 w-3" /> Savings
                  </>
                ) : (
                  <>
                    <Minus className="h-3 w-3" /> Flat
                  </>
                )}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Top driver: <span className="font-semibold text-foreground truncate">{topGainer}</span>
            </p>
          </div>
        </div>

        {/* Dual Bar Chart */}
        <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-foreground">
                {mode === "QUARTERLY_TREND"
                  ? "FY 2025-26 vs FY 2024-25 Quarterly Comparison"
                  : mode === "ANNUAL_TREND"
                  ? "Annual Multi-Year Procurement Growth"
                  : `Side-by-Side Comparison: ${effectivePeriodA} vs ${effectivePeriodB}`}
              </h4>
              <p className="text-xs text-muted-foreground">
                {viewType === "CUMULATIVE"
                  ? "Cumulative total expenditure comparison across durations"
                  : "Visual expenditure bar comparison across materials and categories"}
              </p>
            </div>

            {/* View Mode Toggle: Breakup vs Cumulative Total */}
            {mode !== "ANNUAL_TREND" && (
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setViewType("BREAKUP")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    viewType === "BREAKUP"
                      ? "bg-card text-foreground shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                  }`}
                >
                  Breakup View
                </button>
                <button
                  type="button"
                  onClick={() => setViewType("CUMULATIVE")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    viewType === "CUMULATIVE"
                      ? "bg-card text-foreground shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                  }`}
                >
                  Cumulative Total
                </button>
              </div>
            )}
          </div>

          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {mode === "ANNUAL_TREND" ? (
                <BarChart data={chartData} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="label" stroke="#887364" fontSize={12} />
                  <YAxis stroke="#887364" fontSize={12} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip content={renderCustomTooltip} />
                  <Bar dataKey="periodA" name="Annual Spend" fill="#ff9933" maxBarSize={42} radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <BarChart data={chartData} barGap={10} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="label" stroke="#887364" fontSize={12} />
                  <YAxis stroke="#887364" fontSize={12} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip content={renderCustomTooltip} />
                  <Bar
                    dataKey="periodA"
                    name={seriesNameA}
                    fill="#ff9933"
                    maxBarSize={38}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="periodB"
                    name={seriesNameB}
                    fill="#3f6653"
                    maxBarSize={38}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Consistent Bottom Legend matching left-to-right bar order (Selected Orange First, Prior Green Second) */}
          {mode === "ANNUAL_TREND" ? (
            <div className="flex items-center justify-center gap-2 pt-1 text-xs">
              <span className="w-3 h-3 rounded-xs bg-[#ff9933] inline-block shadow-xs" />
              <span className="font-semibold text-foreground">Annual Spend</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-6 pt-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-[#ff9933] inline-block shadow-xs" />
                <span className="font-semibold text-foreground">{seriesNameA}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-[#3f6653] inline-block shadow-xs" />
                <span className="font-semibold text-foreground">{seriesNameB}</span>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Itemized Comparative Ledger Table */}
        {(mode === "MOM" || mode === "QOQ" || mode === "YOY" || mode === "CUSTOM") && (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="p-3.5 bg-muted/40 border-b border-border flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">
                Itemized Comparative Ledger: {effectivePeriodA} vs {effectivePeriodB} ({filteredMaterials.length} Materials)
              </span>
              <span className="text-[11px] text-muted-foreground">
                Comparing rates, volume & expenditure
              </span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-table-header">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-table-header-text font-semibold text-xs">Material / Item</TableHead>
                    <TableHead className="text-table-header-text font-semibold text-xs">Supplier</TableHead>
                    <TableHead className="text-table-header-text font-semibold text-xs text-right">
                      {effectivePeriodB} (Qty @ Rate)
                    </TableHead>
                    <TableHead className="text-table-header-text font-semibold text-xs text-right">
                      {effectivePeriodB} Total
                    </TableHead>
                    <TableHead className="text-table-header-text font-semibold text-xs text-right">
                      {effectivePeriodA} (Qty @ Rate)
                    </TableHead>
                    <TableHead className="text-table-header-text font-semibold text-xs text-right">
                      {effectivePeriodA} Total
                    </TableHead>
                    <TableHead className="text-table-header-text font-semibold text-xs text-right">
                      Variance (₹)
                    </TableHead>
                    <TableHead className="text-table-header-text font-semibold text-xs text-right">
                      Shift %
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.map((item) => {
                    const dataA = getItemPeriodData(item, effectivePeriodA)
                    const dataB = getItemPeriodData(item, effectivePeriodB)

                    const diff = dataA.spend - dataB.spend
                    const pct = dataB.spend > 0 ? (diff / dataB.spend) * 100 : 0

                    return (
                      <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell>
                          <span className="font-bold text-foreground text-xs">{item.itemName}</span>
                          <span className="block text-[10px] text-muted-foreground">{item.category}</span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.vendor}</TableCell>
                        <TableCell className="text-xs text-muted-foreground text-right font-mono">
                          {dataB.qty} {item.unit} @ {formatINR(Math.round(dataB.rate))}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-foreground text-right">
                          {formatINR(dataB.spend)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground text-right font-mono">
                          {dataA.qty} {item.unit} @ {formatINR(Math.round(dataA.rate))}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-saffron text-right">
                          {formatINR(dataA.spend)}
                        </TableCell>
                        <TableCell
                          className={`text-xs font-bold text-right ${
                            diff > 0
                              ? "text-saffron"
                              : diff < 0
                              ? "text-deep-green"
                              : "text-muted-foreground"
                          }`}
                        >
                          {diff > 0 ? `+${formatINR(diff)}` : formatINR(diff)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 font-bold ${
                              pct > 0
                                ? "text-saffron border-saffron/40 bg-saffron-container/20"
                                : pct < 0
                                ? "text-deep-green border-deep-green/40 bg-deep-green-container/20"
                                : "text-muted-foreground"
                            }`}
                          >
                            {pct > 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Seasonal Insights Alert Box */}
        <div className="p-4 rounded-xl border border-saffron/30 bg-saffron-container/15 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-saffron shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="text-xs font-bold text-foreground">
              Comparative Analysis Insights ({effectivePeriodA} vs {effectivePeriodB})
            </h5>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>
                <strong className="text-foreground">Net Expenditure Trend:</strong> Total procurement shifted by {variance >= 0 ? `+${formatINR(variance)}` : formatINR(variance)} ({variancePct.toFixed(1)}%) between the two selected timeframes.
              </li>
              <li>
                <strong className="text-foreground">Largest Movement:</strong> {topGainer} experienced the highest absolute expenditure variance.
              </li>
              <li>
                <strong className="text-foreground">Seasonal Procurement Strategy:</strong> Switch between festive periods and baseline durations to accurately budget working capital for sweet production.
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
