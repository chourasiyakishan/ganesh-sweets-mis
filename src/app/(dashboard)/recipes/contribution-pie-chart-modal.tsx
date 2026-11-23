"use client"

import { useState } from "react"
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatINR } from "@/lib/utils"
import { Recipe } from "@/lib/mockData"
import { PieChart as PieIcon, Scale } from "lucide-react"

const PIE_COLORS = [
  "#8f4e00", // Saffron primary
  "#3f6653", // Deep Green
  "#d97706", // Amber
  "#0284c7", // Sky Blue
  "#7c3aed", // Violet
  "#db2777", // Pink
  "#ea580c", // Orange
  "#16a34a", // Green
  "#0d9488", // Teal
  "#4f46e5", // Indigo
  "#b45309", // Warm Brown
  "#64748b", // Slate
]

interface ContributionPieChartModalProps {
  recipe: Recipe | null
  isOpen: boolean
  onClose: () => void
}

export function ContributionPieChartModal({ recipe, isOpen, onClose }: ContributionPieChartModalProps) {
  const [activeTab, setActiveTab] = useState<"weight" | "cost">("weight")

  if (!recipe) return null

  // 1. Calculate Cost Breakdown Data
  const totalCost = recipe.ingredients.reduce((sum, ing) => sum + ing.quantity * ing.currentRate, 0)
  const costData = recipe.ingredients.map((ing, index) => {
    const itemCost = ing.quantity * ing.currentRate
    const pct = totalCost > 0 ? (itemCost / totalCost) * 100 : 0
    return {
      name: ing.itemName,
      value: parseFloat(pct.toFixed(1)),
      cost: itemCost,
      qty: ing.quantity,
      unit: ing.unit,
      color: PIE_COLORS[index % PIE_COLORS.length],
    }
  })

  // 2. Calculate Weight / Quantity Breakdown Data
  const totalWeight = recipe.ingredients.reduce((sum, ing) => sum + ing.quantity, 0)
  const weightData = recipe.ingredients.map((ing, index) => {
    const pct = totalWeight > 0 ? (ing.quantity / totalWeight) * 100 : 0
    return {
      name: ing.itemName,
      value: parseFloat(pct.toFixed(1)),
      cost: ing.quantity * ing.currentRate,
      qty: ing.quantity,
      unit: ing.unit,
      color: PIE_COLORS[index % PIE_COLORS.length],
    }
  })

  const activeData = activeTab === "cost" ? costData : weightData

  // Identify highest contributor
  const highestContributor = [...costData].sort((a, b) => b.cost - a.cost)[0]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <PieIcon className="h-5 w-5 text-saffron" />
            Ingredient Contribution Breakdown — {recipe.name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Visual breakdown of cost contribution and raw material proportions for {recipe.outputYield} {recipe.outputUnit} batch. Press Esc or click close to exit.
          </DialogDescription>
        </DialogHeader>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-2">
          <div className="bg-muted/40 p-3 rounded-lg border border-border">
            <span className="text-[11px] text-muted-foreground font-semibold">Total Raw Material Cost</span>
            <div className="text-base font-bold text-foreground mt-0.5">{formatINR(totalCost)}</div>
          </div>
          <div className="bg-muted/40 p-3 rounded-lg border border-border">
            <span className="text-[11px] text-muted-foreground font-semibold">Primary Cost Driver</span>
            <div className="text-sm font-bold text-saffron truncate mt-0.5" title={highestContributor?.name}>
              {highestContributor?.name} ({highestContributor?.value}%)
            </div>
          </div>
          <div className="bg-muted/40 p-3 rounded-lg border border-border col-span-2 sm:col-span-1">
            <span className="text-[11px] text-muted-foreground font-semibold">Batch Output</span>
            <div className="text-base font-bold text-deep-green mt-0.5">{recipe.outputYield} {recipe.outputUnit}</div>
          </div>
        </div>

        {/* Tabs: Weight vs Cost (Quantity ratio first, Cost share second) */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full mt-2">
          <TabsList className="grid grid-cols-2 bg-muted/60 p-1 w-full sm:w-80 mx-auto">
            <TabsTrigger value="weight" className="text-xs font-semibold">
              <Scale className="h-3.5 w-3.5 mr-1 text-deep-green" /> Quantity Ratio (%)
            </TabsTrigger>
            <TabsTrigger value="cost" className="text-xs font-semibold">
              Cost Share (%)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weight" className="mt-4 space-y-4">
            {/* Interactive Pie Chart: Quantity Ratio */}
            <div className="h-64 w-full bg-card rounded-xl border border-border p-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={weightData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }: any) => `${value}%`}
                    labelLine={false}
                  >
                    {weightData.map((entry, index) => (
                      <Cell key={`weight-cell-${index}`} fill={entry.color} stroke="var(--card)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any, item: any) => [
                      `${item.payload.qty} ${item.payload.unit} (${value}%)`,
                      name,
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-xs text-foreground font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="cost" className="mt-4 space-y-4">
            {/* Interactive Pie Chart: Cost Share */}
            <div className="h-64 w-full bg-card rounded-xl border border-border p-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }: any) => `${value}%`}
                    labelLine={false}
                  >
                    {costData.map((entry, index) => (
                      <Cell key={`cost-cell-${index}`} fill={entry.color} stroke="var(--card)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any, item: any) => [
                      `${formatINR(item.payload.cost)} (${value}%)`,
                      name,
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-xs text-foreground font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>

        {/* Detailed Data Table */}
        <div className="mt-2 border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-table-header">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-left">Ingredient</TableHead>
                <TableHead className="text-xs font-semibold text-left">Quantity</TableHead>
                <TableHead className="text-xs font-semibold text-left">Cost (₹)</TableHead>
                <TableHead className="text-xs font-semibold text-left">
                  {activeTab === "cost" ? "Cost Share" : "Qty Share"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeData.map((item, idx) => (
                <TableRow key={idx} className="hover:bg-muted/40">
                  <TableCell className="text-xs font-medium text-left flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-foreground font-semibold">{item.name}</span>
                  </TableCell>
                  <TableCell className="text-xs text-left text-muted-foreground">
                    {item.qty} {item.unit}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-foreground text-left">
                    {formatINR(item.cost)}
                  </TableCell>
                  <TableCell className="text-xs text-left">
                    <Badge variant="outline" className="text-[11px] font-bold border-border">
                      {item.value}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
