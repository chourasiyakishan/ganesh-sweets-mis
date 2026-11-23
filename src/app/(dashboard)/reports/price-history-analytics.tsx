"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Filter,
  BarChart3,
  ArrowRightLeft,
  Calendar,
  Sparkles,
  RotateCcw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
  CartesianGrid,
  ReferenceLine,
} from "recharts"

export type TimeframeOption = "CURRENT" | "3M" | "6M" | "ALL_FY"
export type ComparisonGranularity = "MONTH" | "QUARTER" | "BLOCK"

interface MonthlyRateRecord {
  month: string // e.g. "Aug 2025"
  sortKey: string // "2025-08"
  fy: "FY 2025-26" | "FY 2024-25"
  quarter: string
  itemName: string
  category: string
  unit: string
  avgRate: number
  minRate: number
  maxRate: number
  totalQty: number
  totalSpend: number
  vendor: string
}

// Comprehensive Historical Procurement Rates Dataset
// Contains all 10 items with current FY 2025-26 months (Aug 2025 - Mar 2026)
// plus historical benchmark months for FY 2024-25 (accessible via Comparison Mode)
const HISTORICAL_MONTHLY_RATES: MonthlyRateRecord[] = [
  // 1. Pure Cow Ghee (Litre)
  { month: "Aug 2025", sortKey: "2025-08", fy: "FY 2025-26", quarter: "Q2 FY 2025-26", itemName: "Pure Cow Ghee", category: "Dairy", unit: "Litre", avgRate: 790, minRate: 790, maxRate: 800, totalQty: 120, totalSpend: 94800, vendor: "Mahi Dairy Farms" },
  { month: "Sep 2025", sortKey: "2025-09", fy: "FY 2025-26", quarter: "Q2 FY 2025-26", itemName: "Pure Cow Ghee", category: "Dairy", unit: "Litre", avgRate: 800, minRate: 800, maxRate: 810, totalQty: 130, totalSpend: 104000, vendor: "Mahi Dairy Farms" },
  { month: "Oct 2025", sortKey: "2025-10", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Pure Cow Ghee", category: "Dairy", unit: "Litre", avgRate: 815, minRate: 810, maxRate: 825, totalQty: 220, totalSpend: 179300, vendor: "Mahi Dairy Farms" },
  { month: "Nov 2025", sortKey: "2025-11", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Pure Cow Ghee", category: "Dairy", unit: "Litre", avgRate: 825, minRate: 820, maxRate: 830, totalQty: 140, totalSpend: 115500, vendor: "Mahi Dairy Farms" },
  { month: "Dec 2025", sortKey: "2025-12", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Pure Cow Ghee", category: "Dairy", unit: "Litre", avgRate: 835, minRate: 830, maxRate: 840, totalQty: 150, totalSpend: 125250, vendor: "Mahi Dairy Farms" },
  { month: "Jan 2026", sortKey: "2026-01", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Pure Cow Ghee", category: "Dairy", unit: "Litre", avgRate: 840, minRate: 835, maxRate: 845, totalQty: 135, totalSpend: 113400, vendor: "Mahi Dairy Farms" },
  { month: "Feb 2026", sortKey: "2026-02", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Pure Cow Ghee", category: "Dairy", unit: "Litre", avgRate: 840, minRate: 840, maxRate: 840, totalQty: 140, totalSpend: 117600, vendor: "Mahi Dairy Farms" },
  { month: "Mar 2026", sortKey: "2026-03", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Pure Cow Ghee", category: "Dairy", unit: "Litre", avgRate: 850, minRate: 850, maxRate: 850, totalQty: 150, totalSpend: 127500, vendor: "Mahi Dairy Farms" },
  { month: "Mar 2025", sortKey: "2025-03", fy: "FY 2024-25", quarter: "Q4 FY 2024-25", itemName: "Pure Cow Ghee", category: "Dairy", unit: "Litre", avgRate: 780, minRate: 775, maxRate: 785, totalQty: 130, totalSpend: 101400, vendor: "Mahi Dairy Farms" },
  { month: "Oct 2024", sortKey: "2024-10", fy: "FY 2024-25", quarter: "Q3 FY 2024-25", itemName: "Pure Cow Ghee", category: "Dairy", unit: "Litre", avgRate: 760, minRate: 755, maxRate: 770, totalQty: 190, totalSpend: 144400, vendor: "Mahi Dairy Farms" },

  // 2. Fresh Milk (Litre)
  { month: "Aug 2025", sortKey: "2025-08", fy: "FY 2025-26", quarter: "Q2 FY 2025-26", itemName: "Fresh Milk", category: "Dairy", unit: "Litre", avgRate: 55, minRate: 55, maxRate: 55, totalQty: 240, totalSpend: 13200, vendor: "Mahi Dairy Farms" },
  { month: "Sep 2025", sortKey: "2025-09", fy: "FY 2025-26", quarter: "Q2 FY 2025-26", itemName: "Fresh Milk", category: "Dairy", unit: "Litre", avgRate: 56, minRate: 55, maxRate: 57, totalQty: 250, totalSpend: 14000, vendor: "Mahi Dairy Farms" },
  { month: "Oct 2025", sortKey: "2025-10", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Fresh Milk", category: "Dairy", unit: "Litre", avgRate: 58, minRate: 58, maxRate: 58, totalQty: 380, totalSpend: 22040, vendor: "Mahi Dairy Farms" },
  { month: "Nov 2025", sortKey: "2025-11", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Fresh Milk", category: "Dairy", unit: "Litre", avgRate: 57, minRate: 57, maxRate: 57, totalQty: 260, totalSpend: 14820, vendor: "Mahi Dairy Farms" },
  { month: "Dec 2025", sortKey: "2025-12", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Fresh Milk", category: "Dairy", unit: "Litre", avgRate: 58, minRate: 58, maxRate: 58, totalQty: 270, totalSpend: 15660, vendor: "Mahi Dairy Farms" },
  { month: "Jan 2026", sortKey: "2026-01", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Fresh Milk", category: "Dairy", unit: "Litre", avgRate: 58, minRate: 58, maxRate: 58, totalQty: 270, totalSpend: 15660, vendor: "Mahi Dairy Farms" },
  { month: "Feb 2026", sortKey: "2026-02", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Fresh Milk", category: "Dairy", unit: "Litre", avgRate: 58, minRate: 58, maxRate: 58, totalQty: 280, totalSpend: 16240, vendor: "Mahi Dairy Farms" },
  { month: "Mar 2026", sortKey: "2026-03", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Fresh Milk", category: "Dairy", unit: "Litre", avgRate: 60, minRate: 60, maxRate: 60, totalQty: 300, totalSpend: 18000, vendor: "Mahi Dairy Farms" },
  { month: "Mar 2025", sortKey: "2025-03", fy: "FY 2024-25", quarter: "Q4 FY 2024-25", itemName: "Fresh Milk", category: "Dairy", unit: "Litre", avgRate: 54, minRate: 54, maxRate: 54, totalQty: 250, totalSpend: 13500, vendor: "Mahi Dairy Farms" },
  { month: "Oct 2024", sortKey: "2024-10", fy: "FY 2024-25", quarter: "Q3 FY 2024-25", itemName: "Fresh Milk", category: "Dairy", unit: "Litre", avgRate: 52, minRate: 52, maxRate: 52, totalQty: 340, totalSpend: 17680, vendor: "Mahi Dairy Farms" },

  // 3. Mawa (Khoa) (Kg)
  { month: "Aug 2025", sortKey: "2025-08", fy: "FY 2025-26", quarter: "Q2 FY 2025-26", itemName: "Mawa (Khoa)", category: "Dairy", unit: "Kg", avgRate: 295, minRate: 290, maxRate: 300, totalQty: 30, totalSpend: 8850, vendor: "Mahi Dairy Farms" },
  { month: "Sep 2025", sortKey: "2025-09", fy: "FY 2025-26", quarter: "Q2 FY 2025-26", itemName: "Mawa (Khoa)", category: "Dairy", unit: "Kg", avgRate: 300, minRate: 300, maxRate: 300, totalQty: 30, totalSpend: 9000, vendor: "Mahi Dairy Farms" },
  { month: "Oct 2025", sortKey: "2025-10", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Mawa (Khoa)", category: "Dairy", unit: "Kg", avgRate: 315, minRate: 310, maxRate: 320, totalQty: 60, totalSpend: 18900, vendor: "Mahi Dairy Farms" },
  { month: "Nov 2025", sortKey: "2025-11", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Mawa (Khoa)", category: "Dairy", unit: "Kg", avgRate: 305, minRate: 300, maxRate: 310, totalQty: 35, totalSpend: 10675, vendor: "Mahi Dairy Farms" },
  { month: "Dec 2025", sortKey: "2025-12", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Mawa (Khoa)", category: "Dairy", unit: "Kg", avgRate: 310, minRate: 310, maxRate: 310, totalQty: 35, totalSpend: 10850, vendor: "Mahi Dairy Farms" },
  { month: "Jan 2026", sortKey: "2026-01", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Mawa (Khoa)", category: "Dairy", unit: "Kg", avgRate: 310, minRate: 310, maxRate: 310, totalQty: 35, totalSpend: 10850, vendor: "Mahi Dairy Farms" },
  { month: "Feb 2026", sortKey: "2026-02", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Mawa (Khoa)", category: "Dairy", unit: "Kg", avgRate: 310, minRate: 310, maxRate: 310, totalQty: 35, totalSpend: 10850, vendor: "Mahi Dairy Farms" },
  { month: "Mar 2026", sortKey: "2026-03", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Mawa (Khoa)", category: "Dairy", unit: "Kg", avgRate: 320, minRate: 320, maxRate: 320, totalQty: 40, totalSpend: 12800, vendor: "Mahi Dairy Farms" },
  { month: "Mar 2025", sortKey: "2025-03", fy: "FY 2024-25", quarter: "Q4 FY 2024-25", itemName: "Mawa (Khoa)", category: "Dairy", unit: "Kg", avgRate: 290, minRate: 285, maxRate: 295, totalQty: 30, totalSpend: 8700, vendor: "Mahi Dairy Farms" },
  { month: "Oct 2024", sortKey: "2024-10", fy: "FY 2024-25", quarter: "Q3 FY 2024-25", itemName: "Mawa (Khoa)", category: "Dairy", unit: "Kg", avgRate: 280, minRate: 275, maxRate: 285, totalQty: 55, totalSpend: 15400, vendor: "Mahi Dairy Farms" },

  // 4. Kaju (Cashew W320) (Kg)
  { month: "Aug 2025", sortKey: "2025-08", fy: "FY 2025-26", quarter: "Q2 FY 2025-26", itemName: "Kaju (Cashew W320)", category: "Dry Fruits", unit: "Kg", avgRate: 660, minRate: 650, maxRate: 670, totalQty: 35, totalSpend: 23100, vendor: "Shreeji Dry Fruits" },
  { month: "Sep 2025", sortKey: "2025-09", fy: "FY 2025-26", quarter: "Q2 FY 2025-26", itemName: "Kaju (Cashew W320)", category: "Dry Fruits", unit: "Kg", avgRate: 660, minRate: 660, maxRate: 660, totalQty: 40, totalSpend: 26400, vendor: "Shreeji Dry Fruits" },
  { month: "Oct 2025", sortKey: "2025-10", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Kaju (Cashew W320)", category: "Dry Fruits", unit: "Kg", avgRate: 690, minRate: 680, maxRate: 700, totalQty: 80, totalSpend: 55200, vendor: "Shreeji Dry Fruits" },
  { month: "Nov 2025", sortKey: "2025-11", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Kaju (Cashew W320)", category: "Dry Fruits", unit: "Kg", avgRate: 680, minRate: 675, maxRate: 685, totalQty: 45, totalSpend: 30600, vendor: "Shreeji Dry Fruits" },
  { month: "Dec 2025", sortKey: "2025-12", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Kaju (Cashew W320)", category: "Dry Fruits", unit: "Kg", avgRate: 675, minRate: 670, maxRate: 680, totalQty: 40, totalSpend: 27000, vendor: "Shreeji Dry Fruits" },
  { month: "Jan 2026", sortKey: "2026-01", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Kaju (Cashew W320)", category: "Dry Fruits", unit: "Kg", avgRate: 680, minRate: 675, maxRate: 685, totalQty: 42, totalSpend: 28560, vendor: "Shreeji Dry Fruits" },
  { month: "Feb 2026", sortKey: "2026-02", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Kaju (Cashew W320)", category: "Dry Fruits", unit: "Kg", avgRate: 680, minRate: 680, maxRate: 680, totalQty: 45, totalSpend: 30600, vendor: "Shreeji Dry Fruits" },
  { month: "Mar 2026", sortKey: "2026-03", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Kaju (Cashew W320)", category: "Dry Fruits", unit: "Kg", avgRate: 680, minRate: 680, maxRate: 680, totalQty: 50, totalSpend: 34000, vendor: "Shreeji Dry Fruits" },
  { month: "Mar 2025", sortKey: "2025-03", fy: "FY 2024-25", quarter: "Q4 FY 2024-25", itemName: "Kaju (Cashew W320)", category: "Dry Fruits", unit: "Kg", avgRate: 650, minRate: 645, maxRate: 655, totalQty: 40, totalSpend: 26000, vendor: "Shreeji Dry Fruits" },
  { month: "Oct 2024", sortKey: "2024-10", fy: "FY 2024-25", quarter: "Q3 FY 2024-25", itemName: "Kaju (Cashew W320)", category: "Dry Fruits", unit: "Kg", avgRate: 630, minRate: 625, maxRate: 635, totalQty: 70, totalSpend: 44100, vendor: "Shreeji Dry Fruits" },

  // 5. Almonds (Badam) (Kg)
  { month: "Aug 2025", sortKey: "2025-08", fy: "FY 2025-26", quarter: "Q2 FY 2025-26", itemName: "Almonds (Badam)", category: "Dry Fruits", unit: "Kg", avgRate: 710, minRate: 700, maxRate: 720, totalQty: 12, totalSpend: 8520, vendor: "Shreeji Dry Fruits" },
  { month: "Sep 2025", sortKey: "2025-09", fy: "FY 2025-26", quarter: "Q2 FY 2025-26", itemName: "Almonds (Badam)", category: "Dry Fruits", unit: "Kg", avgRate: 720, minRate: 715, maxRate: 725, totalQty: 12, totalSpend: 8640, vendor: "Shreeji Dry Fruits" },
  { month: "Oct 2025", sortKey: "2025-10", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Almonds (Badam)", category: "Dry Fruits", unit: "Kg", avgRate: 740, minRate: 735, maxRate: 750, totalQty: 25, totalSpend: 18500, vendor: "Shreeji Dry Fruits" },
  { month: "Nov 2025", sortKey: "2025-11", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Almonds (Badam)", category: "Dry Fruits", unit: "Kg", avgRate: 735, minRate: 730, maxRate: 740, totalQty: 15, totalSpend: 11025, vendor: "Shreeji Dry Fruits" },
  { month: "Dec 2025", sortKey: "2025-12", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Almonds (Badam)", category: "Dry Fruits", unit: "Kg", avgRate: 740, minRate: 735, maxRate: 745, totalQty: 14, totalSpend: 10360, vendor: "Shreeji Dry Fruits" },
  { month: "Jan 2026", sortKey: "2026-01", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Almonds (Badam)", category: "Dry Fruits", unit: "Kg", avgRate: 750, minRate: 745, maxRate: 755, totalQty: 14, totalSpend: 10500, vendor: "Shreeji Dry Fruits" },
  { month: "Feb 2026", sortKey: "2026-02", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Almonds (Badam)", category: "Dry Fruits", unit: "Kg", avgRate: 750, minRate: 750, maxRate: 750, totalQty: 15, totalSpend: 11250, vendor: "Shreeji Dry Fruits" },
  { month: "Mar 2026", sortKey: "2026-03", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Almonds (Badam)", category: "Dry Fruits", unit: "Kg", avgRate: 750, minRate: 750, maxRate: 750, totalQty: 15, totalSpend: 11250, vendor: "Shreeji Dry Fruits" },
  { month: "Mar 2025", sortKey: "2025-03", fy: "FY 2024-25", quarter: "Q4 FY 2024-25", itemName: "Almonds (Badam)", category: "Dry Fruits", unit: "Kg", avgRate: 720, minRate: 715, maxRate: 725, totalQty: 12, totalSpend: 8640, vendor: "Shreeji Dry Fruits" },
  { month: "Oct 2024", sortKey: "2024-10", fy: "FY 2024-25", quarter: "Q3 FY 2024-25", itemName: "Almonds (Badam)", category: "Dry Fruits", unit: "Kg", avgRate: 700, minRate: 695, maxRate: 705, totalQty: 22, totalSpend: 15400, vendor: "Shreeji Dry Fruits" },

  // 6. Pistachio (Pista) (Kg)
  { month: "Aug 2025", sortKey: "2025-08", fy: "FY 2025-26", quarter: "Q2 FY 2025-26", itemName: "Pistachio (Pista)", category: "Dry Fruits", unit: "Kg", avgRate: 1700, minRate: 1680, maxRate: 1720, totalQty: 6, totalSpend: 10200, vendor: "Shreeji Dry Fruits" },
  { month: "Sep 2025", sortKey: "2025-09", fy: "FY 2025-26", quarter: "Q2 FY 2025-26", itemName: "Pistachio (Pista)", category: "Dry Fruits", unit: "Kg", avgRate: 1720, minRate: 1700, maxRate: 1730, totalQty: 6, totalSpend: 10320, vendor: "Shreeji Dry Fruits" },
  { month: "Oct 2025", sortKey: "2025-10", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Pistachio (Pista)", category: "Dry Fruits", unit: "Kg", avgRate: 1780, minRate: 1750, maxRate: 1800, totalQty: 15, totalSpend: 26700, vendor: "Shreeji Dry Fruits" },
  { month: "Nov 2025", sortKey: "2025-11", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Pistachio (Pista)", category: "Dry Fruits", unit: "Kg", avgRate: 1750, minRate: 1740, maxRate: 1760, totalQty: 8, totalSpend: 14000, vendor: "Shreeji Dry Fruits" },
  { month: "Dec 2025", sortKey: "2025-12", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Pistachio (Pista)", category: "Dry Fruits", unit: "Kg", avgRate: 1760, minRate: 1750, maxRate: 1780, totalQty: 7, totalSpend: 12320, vendor: "Shreeji Dry Fruits" },
  { month: "Jan 2026", sortKey: "2026-01", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Pistachio (Pista)", category: "Dry Fruits", unit: "Kg", avgRate: 1780, minRate: 1770, maxRate: 1790, totalQty: 7, totalSpend: 12460, vendor: "Shreeji Dry Fruits" },
  { month: "Feb 2026", sortKey: "2026-02", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Pistachio (Pista)", category: "Dry Fruits", unit: "Kg", avgRate: 1800, minRate: 1800, maxRate: 1800, totalQty: 8, totalSpend: 14400, vendor: "Shreeji Dry Fruits" },
  { month: "Mar 2026", sortKey: "2026-03", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Pistachio (Pista)", category: "Dry Fruits", unit: "Kg", avgRate: 1800, minRate: 1800, maxRate: 1800, totalQty: 8, totalSpend: 14400, vendor: "Shreeji Dry Fruits" },
  { month: "Mar 2025", sortKey: "2025-03", fy: "FY 2024-25", quarter: "Q4 FY 2024-25", itemName: "Pistachio (Pista)", category: "Dry Fruits", unit: "Kg", avgRate: 1680, minRate: 1660, maxRate: 1700, totalQty: 6, totalSpend: 10080, vendor: "Shreeji Dry Fruits" },
  { month: "Oct 2024", sortKey: "2024-10", fy: "FY 2024-25", quarter: "Q3 FY 2024-25", itemName: "Pistachio (Pista)", category: "Dry Fruits", unit: "Kg", avgRate: 1650, minRate: 1630, maxRate: 1670, totalQty: 12, totalSpend: 19800, vendor: "Shreeji Dry Fruits" },

  // 7. Refined Sugar (M-30) (Kg)
  { month: "Aug 2025", sortKey: "2025-08", fy: "FY 2025-26", quarter: "Q2 FY 2025-26", itemName: "Refined Sugar (M-30)", category: "Raw Materials", unit: "Kg", avgRate: 36.0, minRate: 35.5, maxRate: 36.5, totalQty: 380, totalSpend: 13680, vendor: "Gujarat Sugar Mills" },
  { month: "Sep 2025", sortKey: "2025-09", fy: "FY 2025-26", quarter: "Q2 FY 2025-26", itemName: "Refined Sugar (M-30)", category: "Raw Materials", unit: "Kg", avgRate: 36.5, minRate: 36.0, maxRate: 37.0, totalQty: 400, totalSpend: 14600, vendor: "Gujarat Sugar Mills" },
  { month: "Oct 2025", sortKey: "2025-10", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Refined Sugar (M-30)", category: "Raw Materials", unit: "Kg", avgRate: 37.5, minRate: 37.0, maxRate: 38.0, totalQty: 750, totalSpend: 28125, vendor: "Gujarat Sugar Mills" },
  { month: "Nov 2025", sortKey: "2025-11", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Refined Sugar (M-30)", category: "Raw Materials", unit: "Kg", avgRate: 37.0, minRate: 37.0, maxRate: 37.0, totalQty: 420, totalSpend: 15540, vendor: "Gujarat Sugar Mills" },
  { month: "Dec 2025", sortKey: "2025-12", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Refined Sugar (M-30)", category: "Raw Materials", unit: "Kg", avgRate: 37.5, minRate: 37.0, maxRate: 38.0, totalQty: 440, totalSpend: 16500, vendor: "Gujarat Sugar Mills" },
  { month: "Jan 2026", sortKey: "2026-01", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Refined Sugar (M-30)", category: "Raw Materials", unit: "Kg", avgRate: 38.0, minRate: 37.5, maxRate: 38.5, totalQty: 430, totalSpend: 16340, vendor: "Gujarat Sugar Mills" },
  { month: "Feb 2026", sortKey: "2026-02", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Refined Sugar (M-30)", category: "Raw Materials", unit: "Kg", avgRate: 38.0, minRate: 38.0, maxRate: 38.0, totalQty: 450, totalSpend: 17100, vendor: "Gujarat Sugar Mills" },
  { month: "Mar 2026", sortKey: "2026-03", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Refined Sugar (M-30)", category: "Raw Materials", unit: "Kg", avgRate: 38.5, minRate: 38.5, maxRate: 38.5, totalQty: 500, totalSpend: 19250, vendor: "Gujarat Sugar Mills" },
  { month: "Mar 2025", sortKey: "2025-03", fy: "FY 2024-25", quarter: "Q4 FY 2024-25", itemName: "Refined Sugar (M-30)", category: "Raw Materials", unit: "Kg", avgRate: 36.0, minRate: 35.5, maxRate: 36.5, totalQty: 420, totalSpend: 15120, vendor: "Gujarat Sugar Mills" },
  { month: "Oct 2024", sortKey: "2024-10", fy: "FY 2024-25", quarter: "Q3 FY 2024-25", itemName: "Refined Sugar (M-30)", category: "Raw Materials", unit: "Kg", avgRate: 34.5, minRate: 34.0, maxRate: 35.0, totalQty: 650, totalSpend: 22425, vendor: "Gujarat Sugar Mills" },

  // 8. Besan (Gram Flour) (Kg)
  { month: "Aug 2025", sortKey: "2025-08", fy: "FY 2025-26", quarter: "Q2 FY 2025-26", itemName: "Besan (Gram Flour)", category: "Raw Materials", unit: "Kg", avgRate: 84, minRate: 82, maxRate: 85, totalQty: 150, totalSpend: 12600, vendor: "Gujarat Sugar Mills" },
  { month: "Sep 2025", sortKey: "2025-09", fy: "FY 2025-26", quarter: "Q2 FY 2025-26", itemName: "Besan (Gram Flour)", category: "Raw Materials", unit: "Kg", avgRate: 85, minRate: 85, maxRate: 85, totalQty: 160, totalSpend: 13600, vendor: "Gujarat Sugar Mills" },
  { month: "Oct 2025", sortKey: "2025-10", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Besan (Gram Flour)", category: "Raw Materials", unit: "Kg", avgRate: 88, minRate: 86, maxRate: 90, totalQty: 280, totalSpend: 24640, vendor: "Gujarat Sugar Mills" },
  { month: "Nov 2025", sortKey: "2025-11", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Besan (Gram Flour)", category: "Raw Materials", unit: "Kg", avgRate: 86, minRate: 85, maxRate: 87, totalQty: 170, totalSpend: 14620, vendor: "Gujarat Sugar Mills" },
  { month: "Dec 2025", sortKey: "2025-12", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Besan (Gram Flour)", category: "Raw Materials", unit: "Kg", avgRate: 87, minRate: 86, maxRate: 88, totalQty: 175, totalSpend: 15225, vendor: "Gujarat Sugar Mills" },
  { month: "Jan 2026", sortKey: "2026-01", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Besan (Gram Flour)", category: "Raw Materials", unit: "Kg", avgRate: 88, minRate: 87, maxRate: 89, totalQty: 165, totalSpend: 14520, vendor: "Gujarat Sugar Mills" },
  { month: "Feb 2026", sortKey: "2026-02", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Besan (Gram Flour)", category: "Raw Materials", unit: "Kg", avgRate: 88, minRate: 88, maxRate: 88, totalQty: 180, totalSpend: 15840, vendor: "Gujarat Sugar Mills" },
  { month: "Mar 2026", sortKey: "2026-03", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Besan (Gram Flour)", category: "Raw Materials", unit: "Kg", avgRate: 90, minRate: 90, maxRate: 90, totalQty: 200, totalSpend: 18000, vendor: "Gujarat Sugar Mills" },
  { month: "Mar 2025", sortKey: "2025-03", fy: "FY 2024-25", quarter: "Q4 FY 2024-25", itemName: "Besan (Gram Flour)", category: "Raw Materials", unit: "Kg", avgRate: 82, minRate: 80, maxRate: 83, totalQty: 160, totalSpend: 13120, vendor: "Gujarat Sugar Mills" },
  { month: "Oct 2024", sortKey: "2024-10", fy: "FY 2024-25", quarter: "Q3 FY 2024-25", itemName: "Besan (Gram Flour)", category: "Raw Materials", unit: "Kg", avgRate: 80, minRate: 78, maxRate: 81, totalQty: 240, totalSpend: 19200, vendor: "Gujarat Sugar Mills" },

  // 9. Cardamom (Elaichi) (Kg)
  { month: "Aug 2025", sortKey: "2025-08", fy: "FY 2025-26", quarter: "Q2 FY 2025-26", itemName: "Cardamom (Elaichi)", category: "Spices", unit: "Kg", avgRate: 2150, minRate: 2100, maxRate: 2200, totalQty: 4, totalSpend: 8600, vendor: "Kerala Spices Co." },
  { month: "Sep 2025", sortKey: "2025-09", fy: "FY 2025-26", quarter: "Q2 FY 2025-26", itemName: "Cardamom (Elaichi)", category: "Spices", unit: "Kg", avgRate: 2200, minRate: 2200, maxRate: 2200, totalQty: 4, totalSpend: 8800, vendor: "Kerala Spices Co." },
  { month: "Oct 2025", sortKey: "2025-10", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Cardamom (Elaichi)", category: "Spices", unit: "Kg", avgRate: 2350, minRate: 2300, maxRate: 2400, totalQty: 8, totalSpend: 18800, vendor: "Kerala Spices Co." },
  { month: "Nov 2025", sortKey: "2025-11", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Cardamom (Elaichi)", category: "Spices", unit: "Kg", avgRate: 2300, minRate: 2300, maxRate: 2300, totalQty: 5, totalSpend: 11500, vendor: "Kerala Spices Co." },
  { month: "Dec 2025", sortKey: "2025-12", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Cardamom (Elaichi)", category: "Spices", unit: "Kg", avgRate: 2300, minRate: 2250, maxRate: 2350, totalQty: 5, totalSpend: 11500, vendor: "Kerala Spices Co." },
  { month: "Jan 2026", sortKey: "2026-01", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Cardamom (Elaichi)", category: "Spices", unit: "Kg", avgRate: 2350, minRate: 2300, maxRate: 2400, totalQty: 4, totalSpend: 9400, vendor: "Kerala Spices Co." },
  { month: "Feb 2026", sortKey: "2026-02", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Cardamom (Elaichi)", category: "Spices", unit: "Kg", avgRate: 2350, minRate: 2350, maxRate: 2350, totalQty: 5, totalSpend: 11750, vendor: "Kerala Spices Co." },
  { month: "Mar 2026", sortKey: "2026-03", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Cardamom (Elaichi)", category: "Spices", unit: "Kg", avgRate: 2400, minRate: 2400, maxRate: 2400, totalQty: 5, totalSpend: 12000, vendor: "Kerala Spices Co." },
  { month: "Mar 2025", sortKey: "2025-03", fy: "FY 2024-25", quarter: "Q4 FY 2024-25", itemName: "Cardamom (Elaichi)", category: "Spices", unit: "Kg", avgRate: 2200, minRate: 2150, maxRate: 2250, totalQty: 4, totalSpend: 8800, vendor: "Kerala Spices Co." },
  { month: "Oct 2024", sortKey: "2024-10", fy: "FY 2024-25", quarter: "Q3 FY 2024-25", itemName: "Cardamom (Elaichi)", category: "Spices", unit: "Kg", avgRate: 2100, minRate: 2050, maxRate: 2150, totalQty: 7, totalSpend: 14700, vendor: "Kerala Spices Co." },

  // 10. Sweet Boxes (500g) (Pcs)
  { month: "Aug 2025", sortKey: "2025-08", fy: "FY 2025-26", quarter: "Q2 FY 2025-26", itemName: "Sweet Boxes (500g)", category: "Packaging", unit: "Pcs", avgRate: 13.0, minRate: 12.8, maxRate: 13.2, totalQty: 800, totalSpend: 10400, vendor: "Gujarat Packaging Works" },
  { month: "Sep 2025", sortKey: "2025-09", fy: "FY 2025-26", quarter: "Q2 FY 2025-26", itemName: "Sweet Boxes (500g)", category: "Packaging", unit: "Pcs", avgRate: 13.5, minRate: 13.5, maxRate: 13.5, totalQty: 900, totalSpend: 12150, vendor: "Gujarat Packaging Works" },
  { month: "Oct 2025", sortKey: "2025-10", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Sweet Boxes (500g)", category: "Packaging", unit: "Pcs", avgRate: 14.5, minRate: 14.0, maxRate: 15.0, totalQty: 1800, totalSpend: 26100, vendor: "Gujarat Packaging Works" },
  { month: "Nov 2025", sortKey: "2025-11", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Sweet Boxes (500g)", category: "Packaging", unit: "Pcs", avgRate: 13.5, minRate: 13.5, maxRate: 13.5, totalQty: 950, totalSpend: 12825, vendor: "Gujarat Packaging Works" },
  { month: "Dec 2025", sortKey: "2025-12", fy: "FY 2025-26", quarter: "Q3 FY 2025-26", itemName: "Sweet Boxes (500g)", category: "Packaging", unit: "Pcs", avgRate: 13.8, minRate: 13.5, maxRate: 14.0, totalQty: 900, totalSpend: 12420, vendor: "Gujarat Packaging Works" },
  { month: "Jan 2026", sortKey: "2026-01", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Sweet Boxes (500g)", category: "Packaging", unit: "Pcs", avgRate: 14.0, minRate: 13.8, maxRate: 14.2, totalQty: 850, totalSpend: 11900, vendor: "Gujarat Packaging Works" },
  { month: "Feb 2026", sortKey: "2026-02", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Sweet Boxes (500g)", category: "Packaging", unit: "Pcs", avgRate: 14.0, minRate: 14.0, maxRate: 14.0, totalQty: 900, totalSpend: 12600, vendor: "Gujarat Packaging Works" },
  { month: "Mar 2026", sortKey: "2026-03", fy: "FY 2025-26", quarter: "Q4 FY 2025-26", itemName: "Sweet Boxes (500g)", category: "Packaging", unit: "Pcs", avgRate: 14.5, minRate: 14.5, maxRate: 14.5, totalQty: 1000, totalSpend: 14500, vendor: "Gujarat Packaging Works" },
  { month: "Mar 2025", sortKey: "2025-03", fy: "FY 2024-25", quarter: "Q4 FY 2024-25", itemName: "Sweet Boxes (500g)", category: "Packaging", unit: "Pcs", avgRate: 13.0, minRate: 12.8, maxRate: 13.2, totalQty: 800, totalSpend: 10400, vendor: "Gujarat Packaging Works" },
  { month: "Oct 2024", sortKey: "2024-10", fy: "FY 2024-25", quarter: "Q3 FY 2024-25", itemName: "Sweet Boxes (500g)", category: "Packaging", unit: "Pcs", avgRate: 12.5, minRate: 12.0, maxRate: 13.0, totalQty: 1500, totalSpend: 18750, vendor: "Gujarat Packaging Works" },
]

export function PriceHistoryAnalytics() {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL")
  const [selectedMaterial, setSelectedMaterial] = useState<string>("Pure Cow Ghee")
  const [timeframe, setTimeframe] = useState<TimeframeOption>("6M")

  // Duration Comparison Mode State
  const [isCompareDurations, setIsCompareDurations] = useState(false)
  const [comparisonGranularity, setComparisonGranularity] = useState<ComparisonGranularity>("MONTH")
  const [compareMonthA, setCompareMonthA] = useState<string>("Mar 2026")
  const [compareMonthB, setCompareMonthB] = useState<string>("Feb 2026")
  const [compareQuarterA, setCompareQuarterA] = useState<string>("Q4 FY 2025-26")
  const [compareQuarterB, setCompareQuarterB] = useState<string>("Q3 FY 2025-26")
  const [blockDurationA, setBlockDurationA] = useState<"LAST_3M" | "LAST_4M">("LAST_3M")
  const [blockDurationB, setBlockDurationB] = useState<"PRIOR_3M" | "PRIOR_4M">("PRIOR_3M")

  // Available unique categories
  const categoriesList = useMemo(() => {
    return Array.from(new Set(HISTORICAL_MONTHLY_RATES.map((r) => r.category))).sort()
  }, [])

  // Materials strictly filtered by the currently selected category
  const availableMaterials = useMemo(() => {
    let items = HISTORICAL_MONTHLY_RATES
    if (selectedCategory !== "ALL") {
      items = items.filter((r) => r.category === selectedCategory)
    }
    return Array.from(new Set(items.map((r) => r.itemName))).sort()
  }, [selectedCategory])

  // Category change handler: immediately updates category and switches material to the first item of the new category
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat)
    const categoryItems = Array.from(
      new Set(
        HISTORICAL_MONTHLY_RATES
          .filter((r) => cat === "ALL" || r.category === cat)
          .map((r) => r.itemName)
      )
    ).sort()

    if (categoryItems.length > 0) {
      setSelectedMaterial(categoryItems[0])
    }
  }

  // Safety synchronization: ensure selectedMaterial always belongs to availableMaterials
  useEffect(() => {
    if (availableMaterials.length > 0 && !availableMaterials.includes(selectedMaterial)) {
      setSelectedMaterial(availableMaterials[0])
    }
  }, [availableMaterials, selectedMaterial])

  // All distinct historical months available for comparison (including previous FY)
  const allAvailableMonths = useMemo(() => {
    const months = Array.from(new Set(HISTORICAL_MONTHLY_RATES.map((r) => r.month)))
    // Custom sort order
    const order = [
      "Mar 2026",
      "Feb 2026",
      "Jan 2026",
      "Dec 2025",
      "Nov 2025",
      "Oct 2025",
      "Sep 2025",
      "Aug 2025",
      "Mar 2025",
      "Oct 2024",
    ]
    return months.sort((a, b) => order.indexOf(a) - order.indexOf(b))
  }, [])

  // All distinct historical quarters available for comparison
  const allAvailableQuarters = useMemo(() => {
    return [
      "Q4 FY 2025-26",
      "Q3 FY 2025-26",
      "Q2 FY 2025-26",
      "Q4 FY 2024-25",
      "Q3 FY 2024-25",
    ]
  }, [])

  // Filtered dataset for selected material and timeframe (Strictly bounded to current FY 2025-26)
  const filteredRecords = useMemo(() => {
    // Only entries from current FY 2025-26 are visible in standard duration views
    let items = HISTORICAL_MONTHLY_RATES.filter(
      (r) => r.itemName === selectedMaterial && r.fy === "FY 2025-26"
    )

    if (timeframe === "CURRENT") {
      return items.slice(-1) // Only latest month (March 2026)
    }
    if (timeframe === "3M") {
      return items.slice(-3) // Last 3 Months: Jan, Feb, Mar 2026
    }
    if (timeframe === "6M") {
      return items.slice(-6) // Last 6 Months: Oct 2025 - Mar 2026
    }
    // "ALL_FY": All available in Current Financial Year (Aug 2025 - Mar 2026)
    return items
  }, [selectedMaterial, timeframe])

  // Summary Metrics for the active material & duration
  const { currentRate, minRate, maxRate, startRate, priceVariance, priceVariancePct, avgPeriodRate, unit } =
    useMemo(() => {
      if (filteredRecords.length === 0) {
        return {
          currentRate: 0,
          minRate: 0,
          maxRate: 0,
          startRate: 0,
          priceVariance: 0,
          priceVariancePct: 0,
          avgPeriodRate: 0,
          unit: "Unit",
        }
      }

      const rates = filteredRecords.map((r) => r.avgRate)
      const cRate = rates[rates.length - 1]
      const sRate = rates[0]
      const mn = Math.min(...rates)
      const mx = Math.max(...rates)
      const diff = cRate - sRate
      const pct = sRate > 0 ? (diff / sRate) * 100 : 0
      const totalSpend = filteredRecords.reduce((acc, curr) => acc + curr.totalSpend, 0)
      const totalQty = filteredRecords.reduce((acc, curr) => acc + curr.totalQty, 0)
      const weightedAvg = totalQty > 0 ? totalSpend / totalQty : cRate

      return {
        currentRate: cRate,
        minRate: mn,
        maxRate: mx,
        startRate: sRate,
        priceVariance: diff,
        priceVariancePct: pct,
        avgPeriodRate: weightedAvg,
        unit: filteredRecords[0].unit,
      }
    }, [filteredRecords])

  // Dynamic Duration Comparison Analytics (Month-wise, Quarter-wise, or Multi-Month Block)
  const compareMetrics = useMemo(() => {
    const allForMaterial = HISTORICAL_MONTHLY_RATES.filter((r) => r.itemName === selectedMaterial)

    if (comparisonGranularity === "MONTH") {
      const recA = allForMaterial.find((r) => r.month === compareMonthA)
      const recB = allForMaterial.find((r) => r.month === compareMonthB)

      const rateA = recA ? recA.avgRate : 0
      const rateB = recB ? recB.avgRate : 0
      const diff = rateA - rateB
      const pct = rateB > 0 ? (diff / rateB) * 100 : 0

      return {
        labelA: compareMonthA,
        labelB: compareMonthB,
        rateA,
        rateB,
        diffRate: diff,
        pctChange: pct,
        qtyA: recA ? recA.totalQty : 0,
        qtyB: recB ? recB.totalQty : 0,
        spendA: recA ? recA.totalSpend : 0,
        spendB: recB ? recB.totalSpend : 0,
      }
    }

    if (comparisonGranularity === "QUARTER") {
      const recsA = allForMaterial.filter((r) => r.quarter === compareQuarterA)
      const recsB = allForMaterial.filter((r) => r.quarter === compareQuarterB)

      const spendA = recsA.reduce((sum, r) => sum + r.totalSpend, 0)
      const qtyA = recsA.reduce((sum, r) => sum + r.totalQty, 0)
      const rateA = qtyA > 0 ? spendA / qtyA : 0

      const spendB = recsB.reduce((sum, r) => sum + r.totalSpend, 0)
      const qtyB = recsB.reduce((sum, r) => sum + r.totalQty, 0)
      const rateB = qtyB > 0 ? spendB / qtyB : 0

      const diff = rateA - rateB
      const pct = rateB > 0 ? (diff / rateB) * 100 : 0

      return {
        labelA: compareQuarterA,
        labelB: compareQuarterB,
        rateA,
        rateB,
        diffRate: diff,
        pctChange: pct,
        qtyA,
        qtyB,
        spendA,
        spendB,
      }
    }

    // MULTI-MONTH BLOCK
    const curFYRecords = allForMaterial.filter((r) => r.fy === "FY 2025-26")
    const countA = blockDurationA === "LAST_3M" ? 3 : 4
    const countB = blockDurationB === "PRIOR_3M" ? 3 : 4

    const d1Records = curFYRecords.slice(-countA)
    const d2Records = curFYRecords.slice(-(countA + countB), -countA)

    const spendA = d1Records.reduce((acc, curr) => acc + curr.totalSpend, 0)
    const qtyA = Math.max(1, d1Records.reduce((acc, curr) => acc + curr.totalQty, 0))
    const d1Avg = spendA / qtyA

    const spendB = d2Records.reduce((acc, curr) => acc + curr.totalSpend, 0)
    const qtyB = Math.max(1, d2Records.reduce((acc, curr) => acc + curr.totalQty, 0))
    const d2Avg = spendB / qtyB

    const diff = d1Avg - d2Avg
    const pct = d2Avg > 0 ? (diff / d2Avg) * 100 : 0

    return {
      labelA: blockDurationA === "LAST_3M" ? "Recent 3M (Jan - Mar 2026)" : "Recent 4M (Dec 2025 - Mar 2026)",
      labelB: blockDurationB === "PRIOR_3M" ? "Prior 3M (Oct - Dec 2025)" : "Prior 4M (Aug - Nov 2025)",
      rateA: d1Avg,
      rateB: d2Avg,
      diffRate: diff,
      pctChange: pct,
      qtyA,
      qtyB,
      spendA,
      spendB,
    }
  }, [
    selectedMaterial,
    comparisonGranularity,
    compareMonthA,
    compareMonthB,
    compareQuarterA,
    compareQuarterB,
    blockDurationA,
    blockDurationB,
  ])

  // Chart data formatted for main monthly trend chart
  const chartData = useMemo(() => {
    return filteredRecords.map((r) => ({
      month: r.month,
      avgRate: r.avgRate,
      minRate: r.minRate,
      maxRate: r.maxRate,
      totalQty: r.totalQty,
      spendFormatted: formatINR(r.totalSpend),
      vendor: r.vendor,
    }))
  }, [filteredRecords])

  // Custom theme-aware tooltip for the price history chart
  const renderPriceTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0]?.payload
    if (!data) return null

    return (
      <div className="bg-popover text-popover-foreground border border-border shadow-2xl rounded-xl p-3 min-w-44 text-xs backdrop-blur-md">
        <div className="font-bold text-foreground border-b border-border/80 pb-1.5 mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold tracking-tight">{label}</span>
          <Badge variant="outline" className="text-[10px] bg-saffron-container/20 text-saffron border-saffron/40 font-mono">
            {unit}
          </Badge>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#ff9933] inline-block shadow-xs shrink-0" />
              <span>Avg Rate:</span>
            </span>
            <span className="font-bold text-foreground font-mono">
              {formatINR(data.avgRate)} /{unit}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Rate Range:</span>
            <span className="font-semibold text-foreground/80 font-mono">
              {formatINR(data.minRate)} - {formatINR(data.maxRate)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Volume Procured:</span>
            <span className="font-semibold text-foreground font-mono">
              {data.totalQty} {unit}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-1 mt-1">
            <span className="text-muted-foreground">Supplier:</span>
            <span className="font-semibold text-foreground truncate max-w-32">{data.vendor}</span>
          </div>
        </div>
      </div>
    )
  }

  // Side-by-Side comparison chart data when Compare Durations is active
  const comparisonChartData = useMemo(() => {
    return [
      {
        name: selectedMaterial,
        rateA: Math.round(compareMetrics.rateA * 10) / 10,
        rateB: Math.round(compareMetrics.rateB * 10) / 10,
      },
    ]
  }, [selectedMaterial, compareMetrics])

  return (
    <Card className="border border-border shadow-card overflow-hidden">
      <CardHeader className="bg-muted/20 border-b border-border p-5 space-y-4">
        {/* Tier 1: Title and Timeframe Selector */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-xs shrink-0">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-bold tracking-tight text-foreground">
                  Raw Material Price History & Rate Trend Analytics
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground border-border bg-muted/40">
                  Procurement Intelligence
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Monthly weighted average procurement rate tracking, price fluctuation variance & duration comparisons from Purchase Ledger
              </CardDescription>
            </div>
          </div>

          {/* Timeframe Selector Segmented Pills (Current Month first, All Available strictly bounded to current FY) */}
          <div className="flex items-center gap-1.5 bg-muted/60 p-1.5 rounded-xl border border-border shadow-xs self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setTimeframe("CURRENT")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                timeframe === "CURRENT"
                  ? "bg-card text-foreground shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/40"
              }`}
            >
              Current Month
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("3M")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                timeframe === "3M"
                  ? "bg-card text-foreground shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/40"
              }`}
            >
              Last 3 Months
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("6M")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                timeframe === "6M"
                  ? "bg-card text-foreground shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/40"
              }`}
            >
              Last 6 Months
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("ALL_FY")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                timeframe === "ALL_FY"
                  ? "bg-card text-foreground shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/40"
              }`}
            >
              All Available (FY 2025-26)
            </button>
          </div>
        </div>

        {/* Tier 2: Dimension Filters (Explicit Category & Material Labels, Dynamic Material Selection) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/70 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground/90 mr-1">
              <Filter className="h-3.5 w-3.5 text-saffron" />
              <span>Select Material:</span>
            </div>

            {/* Category Filter Pill with Explicit Label */}
            <div className="flex items-center gap-1.5 bg-card border border-border/80 rounded-lg px-2.5 py-1 shadow-2xs">
              <span className="text-[11px] font-bold text-muted-foreground">Category:</span>
              <Select value={selectedCategory} onValueChange={(val) => val && handleCategoryChange(val)}>
                <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-semibold text-foreground focus:ring-0 shadow-none w-36">
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

            {/* Material Filter Pill with Explicit Label (Strictly filtered by selectedCategory) */}
            <div className="flex items-center gap-1.5 bg-card border border-border/80 rounded-lg px-2.5 py-1 shadow-2xs">
              <span className="text-[11px] font-bold text-muted-foreground">Material:</span>
              <Select
                key={`material-select-${selectedCategory}`}
                value={selectedMaterial}
                onValueChange={(val) => val && setSelectedMaterial(val)}
              >
                <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-bold text-foreground focus:ring-0 shadow-none w-48">
                  <SelectValue placeholder="Select Material" />
                </SelectTrigger>
                <SelectContent>
                  {availableMaterials.map((mat) => (
                    <SelectItem key={mat} value={mat}>
                      {mat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Toggle Duration Comparison Mode */}
          <Button
            variant={isCompareDurations ? "default" : "outline"}
            size="sm"
            onClick={() => setIsCompareDurations(!isCompareDurations)}
            className={`h-8 text-xs gap-1.5 cursor-pointer font-semibold rounded-lg shadow-2xs transition-all ${
              isCompareDurations
                ? "bg-saffron text-black hover:bg-saffron/90"
                : "text-foreground hover:bg-muted/60"
            }`}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            {isCompareDurations ? "Close Duration Comparison" : "Compare Durations"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* KPI Stats for Price History (Current Rate, Min-Max Range, Period Average, Inflation Trend) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Current Rate */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Current Average Rate (March 2026)
            </span>
            <div className="text-headline font-bold text-saffron mt-1">
              {formatINR(currentRate)} <span className="text-xs font-normal text-muted-foreground">/{unit}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Weighted average across lots</p>
          </div>

          {/* Card 2: Period Range */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {timeframe === "CURRENT" ? "Current Rate" : `${timeframe} Rate Range (Min - Max)`}
            </span>
            <div className="text-headline font-bold text-foreground mt-1">
              {timeframe === "CURRENT"
                ? `${formatINR(currentRate)} /${unit}`
                : `${formatINR(minRate)} - ${formatINR(maxRate)}`}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {timeframe === "CURRENT" ? "Single month procurement" : `Lowest to peak price in ${timeframe}`}
            </p>
          </div>

          {/* Card 3: Period Average */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {timeframe === "CURRENT" ? "Weighted Rate" : `${timeframe} Weighted Average Rate`}
            </span>
            <div className="text-headline font-bold text-deep-green mt-1">
              {formatINR(avgPeriodRate)} <span className="text-xs font-normal text-muted-foreground">/{unit}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Historical baseline procurement rate</p>
          </div>

          {/* Card 4: Price Shift */}
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Price Inflation / Trend
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-headline font-bold ${
                  priceVariance > 0 ? "text-amber-600" : priceVariance < 0 ? "text-deep-green" : "text-foreground"
                }`}
              >
                {priceVariance > 0 ? `+${formatINR(priceVariance)}` : formatINR(priceVariance)}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold ${
                  priceVariance > 0
                    ? "text-amber-600 border-amber-500/40 bg-amber-500/10"
                    : priceVariance < 0
                    ? "text-deep-green border-deep-green/40 bg-deep-green/10"
                    : "text-muted-foreground"
                }`}
              >
                {priceVariancePct > 0 ? `+${priceVariancePct.toFixed(1)}%` : `${priceVariancePct.toFixed(1)}%`}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              From {filteredRecords[0]?.month} baseline ({formatINR(startRate)})
            </p>
          </div>
        </div>

        {/* DURATION COMPARISON SECTION (Month-wise, Quarter-wise, and Multi-Month Benchmarking) */}
        {isCompareDurations && (
          <div className="p-5 rounded-xl border border-saffron/40 bg-saffron-container/15 space-y-4 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-saffron/30 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-saffron" />
                  <h4 className="text-sm font-bold text-foreground">
                    Custom Duration Price Benchmarking: {selectedMaterial}
                  </h4>
                  <Badge variant="outline" className="text-[10px] font-bold text-saffron border-saffron/40 bg-saffron-container/30">
                    Side-by-Side Analysis
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Compare procurement rates across any two individual months, quarters, or historical intervals
                </p>
              </div>

              {/* Granularity Switcher: Month-wise vs Quarter-wise vs Multi-Month */}
              <div className="flex items-center gap-1 bg-background/80 p-1 rounded-lg border border-border shadow-xs self-start lg:self-auto">
                <button
                  type="button"
                  onClick={() => setComparisonGranularity("MONTH")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    comparisonGranularity === "MONTH"
                      ? "bg-card text-foreground shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/30"
                  }`}
                >
                  Month vs Month
                </button>
                <button
                  type="button"
                  onClick={() => setComparisonGranularity("QUARTER")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    comparisonGranularity === "QUARTER"
                      ? "bg-card text-foreground shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/30"
                  }`}
                >
                  Quarter vs Quarter
                </button>
                <button
                  type="button"
                  onClick={() => setComparisonGranularity("BLOCK")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    comparisonGranularity === "BLOCK"
                      ? "bg-card text-foreground shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/30"
                  }`}
                >
                  Multi-Month Trend
                </button>
              </div>
            </div>

            {/* Duration Selector Deck (Orange Period A vs Green Period B) */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-background/60 p-3 rounded-xl border border-border/70 shadow-xs">
              <div className="flex flex-wrap items-center gap-3">
                {/* Period A Selector Pill (Orange) */}
                <div className="flex items-center gap-2.5 bg-card border border-border/80 rounded-lg px-3 py-1.5 shadow-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff9933] shrink-0 shadow-xs" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none mb-1">
                      {comparisonGranularity === "MONTH"
                        ? "Selected Month (A)"
                        : comparisonGranularity === "QUARTER"
                        ? "Selected Quarter (A)"
                        : "Recent Interval (A)"}
                    </span>
                    {comparisonGranularity === "MONTH" && (
                      <Select value={compareMonthA} onValueChange={(val) => val && setCompareMonthA(val)}>
                        <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-bold text-foreground focus:ring-0 shadow-none w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allAvailableMonths.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {comparisonGranularity === "QUARTER" && (
                      <Select value={compareQuarterA} onValueChange={(val) => val && setCompareQuarterA(val)}>
                        <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-bold text-foreground focus:ring-0 shadow-none w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allAvailableQuarters.map((q) => (
                            <SelectItem key={q} value={q}>
                              {q}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {comparisonGranularity === "BLOCK" && (
                      <Select value={blockDurationA} onValueChange={(val) => val && setBlockDurationA(val as any)}>
                        <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-bold text-foreground focus:ring-0 shadow-none w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LAST_3M">Recent 3 Months</SelectItem>
                          <SelectItem value="LAST_4M">Recent 4 Months</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {/* Central VS Badge */}
                <div className="flex items-center justify-center">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-muted text-muted-foreground border border-border/80 shadow-xs">
                    VS
                  </span>
                </div>

                {/* Period B Selector Pill (Green) */}
                <div className="flex items-center gap-2.5 bg-card border border-border/80 rounded-lg px-3 py-1.5 shadow-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3f6653] shrink-0 shadow-xs" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none mb-1">
                      {comparisonGranularity === "MONTH"
                        ? "Comparison Month (B)"
                        : comparisonGranularity === "QUARTER"
                        ? "Comparison Quarter (B)"
                        : "Prior Interval (B)"}
                    </span>
                    {comparisonGranularity === "MONTH" && (
                      <Select value={compareMonthB} onValueChange={(val) => val && setCompareMonthB(val)}>
                        <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-bold text-foreground focus:ring-0 shadow-none w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allAvailableMonths.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {comparisonGranularity === "QUARTER" && (
                      <Select value={compareQuarterB} onValueChange={(val) => val && setCompareQuarterB(val)}>
                        <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-bold text-foreground focus:ring-0 shadow-none w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allAvailableQuarters.map((q) => (
                            <SelectItem key={q} value={q}>
                              {q}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {comparisonGranularity === "BLOCK" && (
                      <Select value={blockDurationB} onValueChange={(val) => val && setBlockDurationB(val as any)}>
                        <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-bold text-foreground focus:ring-0 shadow-none w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PRIOR_3M">Prior 3 Months</SelectItem>
                          <SelectItem value="PRIOR_4M">Prior 4 Months</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Note */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-md border border-border/40">
                <Sparkles className="h-3.5 w-3.5 text-saffron" />
                <span>Historical FY 2024-25 benchmarks available for comparison</span>
              </div>
            </div>

            {/* Comparison Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Rate A */}
              <div className="p-3.5 rounded-lg bg-card border border-border shadow-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#ff9933] shrink-0" />
                  <span className="text-[11px] font-semibold text-muted-foreground truncate">{compareMetrics.labelA}</span>
                </div>
                <div className="text-title font-bold text-foreground mt-1">
                  {formatINR(compareMetrics.rateA)} <span className="text-xs font-normal text-muted-foreground">/{unit}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {compareMetrics.qtyA > 0 ? `${compareMetrics.qtyA} ${unit} procured (${formatINR(compareMetrics.spendA)})` : "Primary period procurement rate"}
                </p>
              </div>

              {/* Card 2: Rate B */}
              <div className="p-3.5 rounded-lg bg-card border border-border shadow-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#3f6653] shrink-0" />
                  <span className="text-[11px] font-semibold text-muted-foreground truncate">{compareMetrics.labelB}</span>
                </div>
                <div className="text-title font-bold text-foreground mt-1">
                  {formatINR(compareMetrics.rateB)} <span className="text-xs font-normal text-muted-foreground">/{unit}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {compareMetrics.qtyB > 0 ? `${compareMetrics.qtyB} ${unit} procured (${formatINR(compareMetrics.spendB)})` : "Benchmark reference rate"}
                </p>
              </div>

              {/* Card 3: Rate Difference */}
              <div className="p-3.5 rounded-lg bg-card border border-border shadow-xs">
                <span className="text-[11px] font-semibold text-muted-foreground">Price Variance (₹)</span>
                <div className="text-title font-bold mt-1 text-foreground">
                  {compareMetrics.diffRate > 0 ? (
                    <span className="text-amber-600">+{formatINR(compareMetrics.diffRate)}</span>
                  ) : compareMetrics.diffRate < 0 ? (
                    <span className="text-deep-green">{formatINR(compareMetrics.diffRate)}</span>
                  ) : (
                    <span>₹0.00</span>
                  )}
                  <span className="text-xs font-normal text-muted-foreground"> /{unit}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Absolute procurement rate difference</p>
              </div>

              {/* Card 4: Shift % */}
              <div className="p-3.5 rounded-lg bg-card border border-border shadow-xs">
                <span className="text-[11px] font-semibold text-muted-foreground">Inflation / Shift %</span>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-title font-bold ${
                      compareMetrics.diffRate > 0 ? "text-amber-600" : compareMetrics.diffRate < 0 ? "text-deep-green" : "text-foreground"
                    }`}
                  >
                    {compareMetrics.diffRate > 0 ? `+${compareMetrics.pctChange.toFixed(1)}%` : `${compareMetrics.pctChange.toFixed(1)}%`}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold ${
                      compareMetrics.diffRate > 0
                        ? "text-amber-600 border-amber-500/40 bg-amber-500/10"
                        : compareMetrics.diffRate < 0
                        ? "text-deep-green border-deep-green/40 bg-deep-green/10"
                        : "text-muted-foreground"
                    }`}
                  >
                    {compareMetrics.diffRate > 0 ? "Rate Hike" : compareMetrics.diffRate < 0 ? "Price Drop" : "Unchanged"}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {compareMetrics.diffRate > 0 ? "Inflation impact on purchase cost" : compareMetrics.diffRate < 0 ? "Favorable procurement savings" : "Stable pricing across periods"}
                </p>
              </div>
            </div>

            {/* Side-by-Side Mini Bar Comparison */}
            <div className="p-3.5 rounded-lg bg-background/80 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">Visual Rate Comparison:</span>
                <p className="text-[11px] text-muted-foreground">
                  Direct rate comparison between {compareMetrics.labelA} (Orange) and {compareMetrics.labelB} (Green)
                </p>
              </div>
              <div className="flex items-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-[#ff9933] shadow-xs" />
                  <span className="font-semibold text-foreground">
                    {compareMetrics.labelA}: <span className="font-mono">{formatINR(compareMetrics.rateA)}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-[#3f6653] shadow-xs" />
                  <span className="font-semibold text-foreground">
                    {compareMetrics.labelB}: <span className="font-mono">{formatINR(compareMetrics.rateB)}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PRICE HISTORY BAR CHART */}
        <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>Monthly Average Procurement Price Graph: {selectedMaterial}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {unit}
                </Badge>
              </h4>
              <p className="text-xs text-muted-foreground">
                Bar height indicates average purchase rate in ₹/{unit} for each month
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#ff9933] inline-block shadow-xs" />
                Monthly Average Rate
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#3f6653] inline-block border-t border-dashed" />
                Period Baseline ({formatINR(avgPeriodRate)})
              </span>
            </div>
          </div>

          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" stroke="#887364" fontSize={12} />
                <YAxis
                  stroke="#887364"
                  fontSize={12}
                  domain={["auto", "auto"]}
                  tickFormatter={(v) => `₹${v}`}
                />
                <Tooltip content={renderPriceTooltip} />
                <ReferenceLine
                  y={avgPeriodRate}
                  stroke="#3f6653"
                  strokeDasharray="4 4"
                  label={{
                    value: `Avg: ₹${avgPeriodRate.toFixed(0)}`,
                    fill: "#3f6653",
                    fontSize: 11,
                    position: "right",
                  }}
                />
                <Bar
                  dataKey="avgRate"
                  name="Average Rate"
                  fill="#ff9933"
                  maxBarSize={38}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* MONTHLY RATE BREAKDOWN TABLE */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="p-3.5 bg-muted/40 border-b border-border flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Monthly Rate Ledger & Volume: {selectedMaterial}
            </span>
            <span className="text-[11px] text-muted-foreground">
              Showing {filteredRecords.length} recorded monthly intervals
            </span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-table-header">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-table-header-text font-semibold text-xs">Month</TableHead>
                  <TableHead className="text-table-header-text font-semibold text-xs">Primary Supplier</TableHead>
                  <TableHead className="text-table-header-text font-semibold text-xs text-right">
                    Avg Rate (₹/{unit})
                  </TableHead>
                  <TableHead className="text-table-header-text font-semibold text-xs text-right">
                    Min - Max Range
                  </TableHead>
                  <TableHead className="text-table-header-text font-semibold text-xs text-right">
                    Procured Qty
                  </TableHead>
                  <TableHead className="text-table-header-text font-semibold text-xs text-right">
                    Total Spend
                  </TableHead>
                  <TableHead className="text-table-header-text font-semibold text-xs text-right">
                    MoM Rate Shift
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((r, index) => {
                  const prevRecord = index > 0 ? filteredRecords[index - 1] : null
                  const rateDiff = prevRecord ? r.avgRate - prevRecord.avgRate : 0
                  const ratePct = prevRecord && prevRecord.avgRate > 0 ? (rateDiff / prevRecord.avgRate) * 100 : 0

                  return (
                    <TableRow key={r.month} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-bold text-xs text-foreground">{r.month}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.vendor}</TableCell>
                      <TableCell className="text-xs font-bold text-saffron text-right font-mono">
                        {formatINR(r.avgRate)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground text-right font-mono">
                        {formatINR(r.minRate)} - {formatINR(r.maxRate)}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground text-right">
                        {r.totalQty} {r.unit}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground text-right font-mono">
                        {formatINR(r.totalSpend)}
                      </TableCell>
                      <TableCell className="text-right">
                        {prevRecord ? (
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 font-bold ${
                              rateDiff > 0
                                ? "text-amber-600 border-amber-500/40 bg-amber-500/10"
                                : rateDiff < 0
                                ? "text-deep-green border-deep-green/40 bg-deep-green/10"
                                : "text-muted-foreground"
                            }`}
                          >
                            {rateDiff > 0 ? `+${rateDiff} (${ratePct.toFixed(1)}%)` : rateDiff < 0 ? `${rateDiff} (${ratePct.toFixed(1)}%)` : "0.0%"}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-mono">Baseline</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
