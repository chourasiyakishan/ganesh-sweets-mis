"use client"

import { useState, useMemo, useEffect } from "react"
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
import { PurchaseEntry } from "@/lib/mockData"

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

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function getFinancialYear(dateStr: string): string {
  if (!dateStr) return "FY 2025-26"
  const y = parseInt(dateStr.slice(0, 4), 10)
  const m = parseInt(dateStr.slice(5, 7), 10)
  if (isNaN(y) || isNaN(m)) return "FY 2025-26"
  if (m <= 3) {
    return `FY ${y - 1}-${String(y).slice(-2)}`
  } else {
    return `FY ${y}-${String(y + 1).slice(-2)}`
  }
}

export function computeComparativeMaterials(purchases: PurchaseEntry[]): {
  materials: ComparativeMaterial[]
  availableMonths: string[]
  availableQuarters: string[]
  availableYears: string[]
  quarterlyTrendData: { quarter: string; currentFY: number; prevFY: number; note: string }[]
  annualTrendData: { year: string; totalSpend: number; avgMonthly: number; growth: string }[]
} {
  if (!purchases || purchases.length === 0) {
    return {
      materials: [],
      availableMonths: [],
      availableQuarters: [],
      availableYears: [],
      quarterlyTrendData: [],
      annualTrendData: [],
    }
  }

  const materialsMap: Record<
    string,
    {
      id: string
      itemName: string
      category: string
      unit: string
      vendors: Record<string, number>
      months: Record<string, { qty: number; spend: number }>
    }
  > = {}

  const monthKeysSet = new Set<string>() // "YYYY-MM"
  const fySet = new Set<string>()

  purchases.forEach((p, idx) => {
    const rawDate = p.purchaseDate || p.date || ""
    if (!rawDate) return

    let y = 0
    let m = 0
    if (/^\d{4}-\d{2}/.test(rawDate)) {
      y = parseInt(rawDate.slice(0, 4), 10)
      m = parseInt(rawDate.slice(5, 7), 10)
    } else {
      const match = rawDate.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
      if (match) {
        m = parseInt(match[2], 10)
        y = parseInt(match[3], 10)
      } else {
        const d = new Date(rawDate)
        if (!isNaN(d.getTime())) {
          y = d.getFullYear()
          m = d.getMonth() + 1
        }
      }
    }
    if (!y || !m) return

    const sortKey = `${y}-${String(m).padStart(2, "0")}`
    monthKeysSet.add(sortKey)

    const fy = getFinancialYear(`${y}-${String(m).padStart(2, "0")}-01`)
    fySet.add(fy)

    const monthLabel = `${MONTH_NAMES[m - 1]} ${y}`
    const name = p.itemName ? p.itemName.trim() : "Unknown Item"

    if (!materialsMap[name]) {
      materialsMap[name] = {
        id: `cm-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        itemName: name,
        category: "Raw Materials",
        unit: p.unit || "Kg",
        vendors: {},
        months: {},
      }
    }

    const mat = materialsMap[name]
    if (!mat.months[monthLabel]) {
      mat.months[monthLabel] = { qty: 0, spend: 0 }
    }

    const q = p.quantity || 0
    const spend = p.total || 0
    mat.months[monthLabel].qty += q
    mat.months[monthLabel].spend += spend

    if (p.vendorName) {
      mat.vendors[p.vendorName] = (mat.vendors[p.vendorName] || 0) + spend
    }
  })

  // Format materials list
  const materials: ComparativeMaterial[] = Object.values(materialsMap).map((m) => {
    let primaryVendor = "General Supplier"
    let maxVSpend = -1
    Object.entries(m.vendors).forEach(([v, s]) => {
      if (s > maxVSpend) {
        maxVSpend = s
        primaryVendor = v
      }
    })

    const formattedMonths: Record<string, MaterialMonthlyData> = {}
    Object.entries(m.months).forEach(([lbl, data]) => {
      formattedMonths[lbl] = {
        qty: Math.round(data.qty * 100) / 100,
        spend: Math.round(data.spend * 100) / 100,
        rate: data.qty > 0 ? Math.round((data.spend / data.qty) * 100) / 100 : 0,
      }
    })

    return {
      id: m.id,
      itemName: m.itemName,
      category: m.category,
      vendor: primaryVendor,
      unit: m.unit,
      months: formattedMonths,
    }
  })

  // Available Months (sorted descending by year-month)
  const sortedMonthKeys = Array.from(monthKeysSet).sort().reverse()
  const availableMonths = sortedMonthKeys.map((mk) => {
    const [yearStr, monthStr] = mk.split("-")
    const y = parseInt(yearStr, 10)
    const m = parseInt(monthStr, 10)
    return `${MONTH_NAMES[m - 1]} ${y}`
  })

  // Available Years
  const availableYears = Array.from(fySet).sort().reverse()

  // Available Quarters
  const quartersSet = new Set<string>()
  sortedMonthKeys.forEach((mk) => {
    const [yearStr, monthStr] = mk.split("-")
    const y = parseInt(yearStr, 10)
    const m = parseInt(monthStr, 10)
    const fy = getFinancialYear(`${mk}-01`)
    if (m >= 4 && m <= 6) quartersSet.add(`Q1 ${fy} (Apr - Jun ${y})`)
    else if (m >= 7 && m <= 9) quartersSet.add(`Q2 ${fy} (Jul - Sep ${y})`)
    else if (m >= 10 && m <= 12) quartersSet.add(`Q3 ${fy} (Oct - Dec ${y})`)
    else quartersSet.add(`Q4 ${fy} (Jan - Mar ${y})`)
  })
  const availableQuarters = Array.from(quartersSet)

  // Quarterly Trend Data (Current FY vs Previous FY)
  const currentFY = availableYears[0] || "FY 2025-26"
  const prevFY = availableYears[1] || ""

  const getQuarterSpend = (targetFY: string, qNum: number): number => {
    if (!targetFY) return 0
    let total = 0
    purchases.forEach((p) => {
      const rawDate = p.purchaseDate || p.date || ""
      const fy = getFinancialYear(rawDate)
      if (fy !== targetFY) return

      let m = 0
      if (/^\d{4}-\d{2}/.test(rawDate)) {
        m = parseInt(rawDate.slice(5, 7), 10)
      } else {
        const match = rawDate.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
        if (match) m = parseInt(match[2], 10)
      }

      let q = 4
      if (m >= 4 && m <= 6) q = 1
      else if (m >= 7 && m <= 9) q = 2
      else if (m >= 10 && m <= 12) q = 3

      if (q === qNum) {
        total += p.total || 0
      }
    })
    return Math.round(total)
  }

  const quarterlyTrendData = [
    { quarter: "Q1 (Apr - Jun)", currentFY: getQuarterSpend(currentFY, 1), prevFY: getQuarterSpend(prevFY, 1), note: "Season Opening" },
    { quarter: "Q2 (Jul - Sep)", currentFY: getQuarterSpend(currentFY, 2), prevFY: getQuarterSpend(prevFY, 2), note: "Festive Pre-Orders" },
    { quarter: "Q3 (Oct - Dec)", currentFY: getQuarterSpend(currentFY, 3), prevFY: getQuarterSpend(prevFY, 3), note: "Diwali Festive Peak" },
    { quarter: "Q4 (Jan - Mar)", currentFY: getQuarterSpend(currentFY, 4), prevFY: getQuarterSpend(prevFY, 4), note: "Holi & Year End" },
  ]

  // Annual Trend Data
  const annualTrendData: { year: string; totalSpend: number; avgMonthly: number; growth: string }[] = []
  const reversedYears = [...availableYears].reverse()
  reversedYears.forEach((yr, idx) => {
    const yrTotal = purchases
      .filter((p) => getFinancialYear(p.purchaseDate || p.date || "") === yr)
      .reduce((sum, p) => sum + (p.total || 0), 0)

    const prevYrTotal = idx > 0
      ? purchases
          .filter((p) => getFinancialYear(p.purchaseDate || p.date || "") === reversedYears[idx - 1])
          .reduce((sum, p) => sum + (p.total || 0), 0)
      : 0

    let growthStr = "Baseline"
    if (idx > 0 && prevYrTotal > 0) {
      const g = ((yrTotal - prevYrTotal) / prevYrTotal) * 100
      growthStr = `${g >= 0 ? "+" : ""}${g.toFixed(1)}%`
    }

    annualTrendData.push({
      year: yr === currentFY ? `${yr} (Current)` : yr,
      totalSpend: Math.round(yrTotal),
      avgMonthly: Math.round(yrTotal / 12),
      growth: growthStr,
    })
  })

  return {
    materials,
    availableMonths,
    availableQuarters,
    availableYears,
    quarterlyTrendData,
    annualTrendData,
  }
}

// Multi-duration period data calculator for any material
function getItemPeriodData(
  item: ComparativeMaterial,
  period: string
): { qty: number; rate: number; spend: number } {
  if (!item || !period) return { qty: 0, rate: 0, spend: 0 }

  // 1. Direct Month match (e.g. "March 2026")
  if (item.months[period]) {
    return item.months[period]
  }

  // 2. Quarter calculations (e.g. "Q1 FY 2024-25 ...")
  if (period.startsWith("Q1") || period.startsWith("Q2") || period.startsWith("Q3") || period.startsWith("Q4")) {
    const qCode = period.slice(0, 2)
    const matchFY = period.match(/FY\s*(\d{4})-(\d{2})/)
    if (matchFY) {
      const startYear = parseInt(matchFY[1], 10)
      const century = matchFY[1].slice(0, 2)
      const endYear = parseInt(century + matchFY[2], 10)

      let targetMonths: string[] = []
      if (qCode === "Q1") {
        targetMonths = [`April ${startYear}`, `May ${startYear}`, `June ${startYear}`]
      } else if (qCode === "Q2") {
        targetMonths = [`July ${startYear}`, `August ${startYear}`, `September ${startYear}`]
      } else if (qCode === "Q3") {
        targetMonths = [`October ${startYear}`, `November ${startYear}`, `December ${startYear}`]
      } else if (qCode === "Q4") {
        targetMonths = [`January ${endYear}`, `February ${endYear}`, `March ${endYear}`]
      }

      let totalSpend = 0
      let totalQty = 0
      targetMonths.forEach((m) => {
        if (item.months[m]) {
          totalSpend += item.months[m].spend
          totalQty += item.months[m].qty
        }
      })
      const avgRate = totalQty > 0 ? totalSpend / totalQty : 0
      return { qty: totalQty, rate: avgRate, spend: totalSpend }
    }
  }

  // 3. Financial Year calculations (e.g. "FY 2024-25" or "FY 2025-26 (Current)")
  const matchFYOnly = period.match(/FY\s*(\d{4})-(\d{2})/)
  if (matchFYOnly) {
    const startYear = parseInt(matchFYOnly[1], 10)
    const century = matchFYOnly[1].slice(0, 2)
    const endYear = parseInt(century + matchFYOnly[2], 10)

    const all12Months = [
      `April ${startYear}`,
      `May ${startYear}`,
      `June ${startYear}`,
      `July ${startYear}`,
      `August ${startYear}`,
      `September ${startYear}`,
      `October ${startYear}`,
      `November ${startYear}`,
      `December ${startYear}`,
      `January ${endYear}`,
      `February ${endYear}`,
      `March ${endYear}`,
    ]

    let totalSpend = 0
    let totalQty = 0
    all12Months.forEach((m) => {
      if (item.months[m]) {
        totalSpend += item.months[m].spend
        totalQty += item.months[m].qty
      }
    })
    const avgRate = totalQty > 0 ? totalSpend / totalQty : 0
    return { qty: totalQty, rate: avgRate, spend: totalSpend }
  }

  return { qty: 0, rate: 0, spend: 0 }
}

export function ComparativeAnalytics({ purchases = [] }: { purchases?: PurchaseEntry[] }) {
  const {
    materials: comparativeMaterials,
    availableMonths,
    availableQuarters,
    availableYears,
    quarterlyTrendData,
    annualTrendData,
  } = useMemo(() => computeComparativeMaterials(purchases), [purchases])

  const [mode, setMode] = useState<ComparisonMode>("MOM")
  const [viewType, setViewType] = useState<"BREAKUP" | "CUMULATIVE">("BREAKUP")

  // Duration State per Mode
  const [selectedMonthA, setSelectedMonthA] = useState<string>("")
  const [selectedQuarterA, setSelectedQuarterA] = useState<string>("")
  const [selectedYearA, setSelectedYearA] = useState<string>("")
  const [customPeriodA, setCustomPeriodA] = useState<string>("")
  const [customPeriodB, setCustomPeriodB] = useState<string>("")

  // Dimension Filters
  const [selectedCategory, setSelectedCategory] = useState("ALL")
  const [selectedVendor, setSelectedVendor] = useState("ALL")
  const [selectedMaterial, setSelectedMaterial] = useState("ALL")

  // Sync initial period selections from available data
  useEffect(() => {
    if (availableMonths.length > 0) {
      if (!selectedMonthA || !availableMonths.includes(selectedMonthA)) {
        setSelectedMonthA(availableMonths[0])
      }
      if (!customPeriodA || !availableMonths.includes(customPeriodA)) {
        setCustomPeriodA(availableMonths[0])
      }
      if (!customPeriodB || !availableMonths.includes(customPeriodB)) {
        setCustomPeriodB(availableMonths[1] || availableMonths[0])
      }
    }
    if (availableQuarters.length > 0 && (!selectedQuarterA || !availableQuarters.includes(selectedQuarterA))) {
      setSelectedQuarterA(availableQuarters[0])
    }
    if (availableYears.length > 0 && (!selectedYearA || !availableYears.includes(selectedYearA))) {
      setSelectedYearA(availableYears[0])
    }
  }, [availableMonths, availableQuarters, availableYears])

  const handleModeChange = (newMode: ComparisonMode) => {
    setMode(newMode)
  }

  const getPriorMonth = (m: string): string => {
    const idx = availableMonths.indexOf(m)
    if (idx !== -1 && idx < availableMonths.length - 1) return availableMonths[idx + 1]
    return availableMonths[0] || m
  }

  const getPriorQuarter = (q: string): string => {
    const idx = availableQuarters.indexOf(q)
    if (idx !== -1 && idx < availableQuarters.length - 1) return availableQuarters[idx + 1]
    return availableQuarters[0] || q
  }

  const getPriorYear = (y: string): string => {
    const idx = availableYears.indexOf(y)
    if (idx !== -1 && idx < availableYears.length - 1) return availableYears[idx + 1]
    return availableYears[0] || y
  }

  // Derive Effective Period A and Period B based on active mode
  const { effectivePeriodA, effectivePeriodB } = useMemo(() => {
    if (mode === "MOM") {
      return {
        effectivePeriodA: selectedMonthA || (availableMonths[0] ?? ""),
        effectivePeriodB: getPriorMonth(selectedMonthA || (availableMonths[0] ?? "")),
      }
    }
    if (mode === "QOQ") {
      return {
        effectivePeriodA: selectedQuarterA || (availableQuarters[0] ?? ""),
        effectivePeriodB: getPriorQuarter(selectedQuarterA || (availableQuarters[0] ?? "")),
      }
    }
    if (mode === "YOY") {
      return {
        effectivePeriodA: selectedYearA || (availableYears[0] ?? ""),
        effectivePeriodB: getPriorYear(selectedYearA || (availableYears[0] ?? "")),
      }
    }
    if (mode === "CUSTOM") {
      return {
        effectivePeriodA: customPeriodA || (availableMonths[0] ?? ""),
        effectivePeriodB: customPeriodB || (availableMonths[1] ?? availableMonths[0] ?? ""),
      }
    }
    if (mode === "QUARTERLY_TREND") {
      return {
        effectivePeriodA: availableYears[0] || "FY 2025-26",
        effectivePeriodB: availableYears[1] || "FY 2024-25",
      }
    }
    return {
      effectivePeriodA: availableYears[0] ? `${availableYears[0]} (Current)` : "Current FY",
      effectivePeriodB: availableYears[1] || "Previous FY",
    }
  }, [mode, selectedMonthA, selectedQuarterA, selectedYearA, customPeriodA, customPeriodB, availableMonths, availableQuarters, availableYears])

  // Explicit Series Labels for Bar Chart & Tooltips
  const { seriesNameA, seriesNameB } = useMemo(() => {
    if (mode === "QUARTERLY_TREND") {
      return { seriesNameA: availableYears[0] || "Current FY", seriesNameB: availableYears[1] || "Prior FY" }
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
  }, [mode, effectivePeriodA, effectivePeriodB, availableYears])

  // Custom theme-aware Recharts Tooltip
  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null
    const title = payload[0]?.payload?.fullName || label

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
                <span className="font-bold text-foreground font-mono">{formatINR(val)}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Filter options derived from real materials
  const categoriesList = useMemo(() => {
    return Array.from(new Set(comparativeMaterials.map((i) => i.category))).sort()
  }, [comparativeMaterials])

  const vendorsList = useMemo(() => {
    return Array.from(new Set(comparativeMaterials.map((i) => i.vendor))).sort()
  }, [comparativeMaterials])

  const materialsList = useMemo(() => {
    let items = comparativeMaterials
    if (selectedCategory !== "ALL") {
      items = items.filter((i) => i.category === selectedCategory)
    }
    return items.map((i) => i.itemName).sort()
  }, [comparativeMaterials, selectedCategory])

  const resetFilters = () => {
    setSelectedCategory("ALL")
    setSelectedVendor("ALL")
    setSelectedMaterial("ALL")
  }

  const isFiltered = selectedCategory !== "ALL" || selectedVendor !== "ALL" || selectedMaterial !== "ALL"

  // Filtered dataset based on dimension filters
  const filteredMaterials = useMemo(() => {
    return comparativeMaterials.filter((item) => {
      if (selectedCategory !== "ALL" && item.category !== selectedCategory) return false
      if (selectedVendor !== "ALL" && item.vendor !== selectedVendor) return false
      if (selectedMaterial !== "ALL" && item.itemName !== selectedMaterial) return false
      return true
    })
  }, [comparativeMaterials, selectedCategory, selectedVendor, selectedMaterial])

  // Summary Computations based on selected Period A and Period B
  const { currentTotal, prevTotal, variance, variancePct, topGainer } = useMemo(() => {
    if (mode === "QUARTERLY_TREND") {
      const cTot = quarterlyTrendData.reduce((acc, curr) => acc + curr.currentFY, 0)
      const pTot = quarterlyTrendData.reduce((acc, curr) => acc + curr.prevFY, 0)
      const diff = cTot - pTot
      const pct = pTot > 0 ? (diff / pTot) * 100 : 0
      return {
        currentTotal: cTot,
        prevTotal: pTot,
        variance: diff,
        variancePct: pct,
        topGainer: "Quarterly Aggregate",
      }
    }

    if (mode === "ANNUAL_TREND") {
      const latest = annualTrendData[annualTrendData.length - 1]?.totalSpend || 0
      const prev = annualTrendData[annualTrendData.length - 2]?.totalSpend || 0
      const diff = latest - prev
      const pct = prev > 0 ? (diff / prev) * 100 : 0
      return {
        currentTotal: latest,
        prevTotal: prev,
        variance: diff,
        variancePct: pct,
        topGainer: "Annual Aggregate",
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
  }, [mode, filteredMaterials, effectivePeriodA, effectivePeriodB, quarterlyTrendData, annualTrendData])

  // Chart data preparation
  const chartData = useMemo(() => {
    if (viewType === "CUMULATIVE") {
      if (mode === "QUARTERLY_TREND") {
        return [
          {
            label: "Total Procurement",
            fullName: "Full Financial Year Procurement",
            periodA: quarterlyTrendData.reduce((acc, curr) => acc + curr.currentFY, 0),
            periodB: quarterlyTrendData.reduce((acc, curr) => acc + curr.prevFY, 0),
          },
        ]
      }
      if (mode === "ANNUAL_TREND") {
        return annualTrendData.map((y) => ({
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
      return quarterlyTrendData.map((q) => ({
        label: q.quarter.split(" ")[0],
        fullName: q.quarter,
        periodA: q.currentFY,
        periodB: q.prevFY,
      }))
    }

    if (mode === "ANNUAL_TREND") {
      return annualTrendData.map((y) => ({
        label: y.year.replace(" (Current)", ""),
        fullName: y.year,
        periodA: y.totalSpend,
        periodB: 0,
        growth: y.growth,
      }))
    }

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
  }, [
    viewType,
    mode,
    quarterlyTrendData,
    annualTrendData,
    effectivePeriodA,
    effectivePeriodB,
    currentTotal,
    prevTotal,
    filteredMaterials,
    selectedMaterial,
  ])

  if (!purchases || purchases.length === 0 || comparativeMaterials.length === 0) {
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

  return (
    <Card className="border border-border shadow-card">
      <CardHeader className="bg-muted/30 border-b border-border pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-title font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-saffron" />
              Comparative Procurement & Trend Analytics
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Multi-duration expenditure comparison, festive volume variances & long-term procurement trends
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border">
            {(
              [
                { id: "MOM", label: "Month-over-Month (MoM)" },
                { id: "QOQ", label: "Quarter-over-Quarter (QoQ)" },
                { id: "YOY", label: "Year-over-Year (YoY)" },
                { id: "CUSTOM", label: "Custom Range" },
                { id: "QUARTERLY_TREND", label: "Quarterly Trend" },
                { id: "ANNUAL_TREND", label: "Annual Trend" },
              ] as { id: ComparisonMode; label: string }[]
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleModeChange(item.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  mode === item.id
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Period Selectors Bar */}
        <div className="mt-4 pt-3 border-t border-border/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {mode === "MOM" && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">Select Month:</span>
                <Select value={selectedMonthA} onValueChange={(val) => val && setSelectedMonthA(val)}>
                  <SelectTrigger className="h-7 text-xs font-bold bg-card border-border w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground font-semibold">vs {getPriorMonth(selectedMonthA)}</span>
              </div>
            )}

            {mode === "QOQ" && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">Select Quarter:</span>
                <Select value={selectedQuarterA} onValueChange={(val) => val && setSelectedQuarterA(val)}>
                  <SelectTrigger className="h-7 text-xs font-bold bg-card border-border w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableQuarters.map((q) => (
                      <SelectItem key={q} value={q}>
                        {q}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground font-semibold">vs {getPriorQuarter(selectedQuarterA)}</span>
              </div>
            )}

            {mode === "YOY" && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">Financial Year:</span>
                <Select value={selectedYearA} onValueChange={(val) => val && setSelectedYearA(val)}>
                  <SelectTrigger className="h-7 text-xs font-bold bg-card border-border w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground font-semibold">vs {getPriorYear(selectedYearA)}</span>
              </div>
            )}

            {mode === "CUSTOM" && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">Compare:</span>
                <Select value={customPeriodA} onValueChange={(val) => val && setCustomPeriodA(val)}>
                  <SelectTrigger className="h-7 text-xs font-bold bg-card border-border w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs font-bold text-muted-foreground">with</span>
                <Select value={customPeriodB} onValueChange={(val) => val && setCustomPeriodB(val)}>
                  <SelectTrigger className="h-7 text-xs font-bold bg-card border-border w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {mode === "QUARTERLY_TREND" && (
              <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  {availableYears[0] || "Current FY"} vs {availableYears[1] || "Prior FY"}
                </Badge>
                <span>Quarter-by-quarter expenditure benchmark across all raw materials</span>
              </div>
            )}

            {mode === "ANNUAL_TREND" && (
              <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  Multi-Year Perspective
                </Badge>
                <span>Annual procurement volume trajectory across completed fiscal years</span>
              </div>
            )}
          </div>

          {/* Dimension Filters */}
          {(mode === "MOM" || mode === "QOQ" || mode === "YOY" || mode === "CUSTOM") && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground font-semibold">
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
                        const itemsForCat = comparativeMaterials.filter((i) => i.category === val).map((i) => i.itemName)
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
                    {vendorsList.map((vnd) => (
                      <SelectItem key={vnd} value={vnd}>
                        {vnd}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Material Pill */}
              <div className="flex items-center gap-1.5 bg-card border border-border/80 rounded-lg px-2.5 py-1 shadow-2xs">
                <span className="text-[11px] font-bold text-muted-foreground">Item:</span>
                <Select value={selectedMaterial} onValueChange={(val) => val && setSelectedMaterial(val)}>
                  <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-semibold text-foreground focus:ring-0 shadow-none w-36">
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

              {isFiltered && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground px-2 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Reset
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* KPI Cards Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{effectivePeriodA}</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff9933]" />
            </div>
            <div className="text-2xl font-bold text-saffron mt-1 font-mono">{formatINR(currentTotal)}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filteredMaterials.length} monitored inventory items
            </p>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{effectivePeriodB}</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#3f6653]" />
            </div>
            <div className="text-2xl font-bold text-deep-green mt-1 font-mono">{formatINR(prevTotal)}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Comparative baseline period</p>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Procurement Variance</span>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-2xl font-bold font-mono ${
                  variance > 0 ? "text-saffron" : variance < 0 ? "text-deep-green" : "text-muted-foreground"
                }`}
              >
                {variance > 0 ? `+${formatINR(variance)}` : formatINR(variance)}
              </span>
              <Badge
                variant="outline"
                className={`text-xs px-2 py-0.5 font-bold ${
                  variance > 0
                    ? "text-saffron border-saffron/40 bg-saffron-container/20"
                    : variance < 0
                    ? "text-deep-green border-deep-green/40 bg-deep-green-container/20"
                    : "text-muted-foreground"
                }`}
              >
                {variance > 0 ? (
                  <>
                    <ArrowUpRight className="h-3 w-3 mr-0.5" /> +{variancePct.toFixed(1)}%
                  </>
                ) : variance < 0 ? (
                  <>
                    <ArrowDownRight className="h-3 w-3 mr-0.5" /> {variancePct.toFixed(1)}%
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
                  ? `${availableYears[0] || "Current FY"} vs ${availableYears[1] || "Prior FY"} Quarterly Comparison`
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
