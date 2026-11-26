"use client"

import { useState } from "react"
import { TrendingUp, RotateCcw, Target, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatINR } from "@/lib/utils"

export default function ProfitLossCalculatorPage() {
  // All inputs default to BLANK
  const [costPrice, setCostPrice] = useState<string>("")
  const [sellingPrice, setSellingPrice] = useState<string>("")
  const [additionalExpenses, setAdditionalExpenses] = useState<string>("")
  const [desiredProfitPercent, setDesiredProfitPercent] = useState<string>("")

  const numCP = parseFloat(costPrice) || 0
  const numSP = parseFloat(sellingPrice) || 0
  const numExpenses = parseFloat(additionalExpenses) || 0

  // Total cost = Cost Price + Additional Expenses
  const totalCost = numCP + numExpenses
  const hasCostAndPrice = totalCost > 0 && numSP > 0

  // 1. Current Profit Amount & Percentage
  const profitAmount = hasCostAndPrice ? numSP - totalCost : 0
  const isProfit = profitAmount >= 0
  const profitPercentage = hasCostAndPrice && totalCost > 0 ? (profitAmount / totalCost) * 100 : 0

  // 2. Desired Profit Reverse Calculation
  const numDesiredPercent = parseFloat(desiredProfitPercent) || 0
  const hasDesiredPercent = desiredProfitPercent.trim() !== "" && !isNaN(numDesiredPercent)

  // Target Selling Price = Total Cost * (1 + Desired % / 100)
  const targetProfitAmount = totalCost > 0 ? totalCost * (numDesiredPercent / 100) : 0
  const targetSellingPrice = totalCost > 0 ? totalCost * (1 + numDesiredPercent / 100) : 0
  const priceDiff = hasDesiredPercent && numSP > 0 ? targetSellingPrice - numSP : 0

  const desiredPresets = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]

  const handleReset = () => {
    setCostPrice("")
    setSellingPrice("")
    setAdditionalExpenses("")
    setDesiredProfitPercent("")
  }

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-card p-4 sm:p-5 rounded-xl border border-border shadow-xs">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2.5">
          <TrendingUp className="h-6 w-6 text-deep-green" />
          Profit-Loss Calculator
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="text-xs h-8 px-3 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Minimal Inputs */}
        <Card className="lg:col-span-5 border border-border shadow-card">
          <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider">
              Inputs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            {/* Cost Price */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Cost Price (₹) *
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-bold text-muted-foreground">₹</span>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 400"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="pl-8 text-lg font-bold text-foreground h-11 border-border"
                  autoFocus
                />
              </div>
            </div>

            {/* Selling Price */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Selling Price (₹) *
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-bold text-muted-foreground">₹</span>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 500"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="pl-8 text-lg font-bold text-foreground h-11 border-border"
                />
              </div>
            </div>

            {/* Additional Expenses */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Additional Expenses (₹)
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-bold text-muted-foreground">₹</span>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 50"
                  value={additionalExpenses}
                  onChange={(e) => setAdditionalExpenses(e.target.value)}
                  className="pl-8 text-lg font-bold text-foreground h-11 border-border"
                />
              </div>
            </div>

            {totalCost > 0 && (
              <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>Total Cost (CP + Expenses):</span>
                <span className="font-bold text-foreground">{formatINR(totalCost)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Outputs & Desired Profit Margin Section */}
        <div className="lg:col-span-7 space-y-4">
          {/* Row 1: Dual Big Outputs (Profit Amount & Profit %) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Output 1: Profit Amount */}
            <Card className={`border-2 shadow-sm p-5 sm:p-6 flex flex-col justify-between min-h-[200px] ${
              !hasCostAndPrice
                ? "border-border bg-card"
                : isProfit
                ? "border-deep-green/40 dark:border-deep-green/60 bg-deep-green/10"
                : "border-destructive/40 dark:border-destructive/60 bg-destructive/10"
            }`}>
              <div>
                <span className={`text-xs font-bold uppercase tracking-wider block ${
                  !hasCostAndPrice
                    ? "text-muted-foreground"
                    : isProfit
                    ? "text-deep-green"
                    : "text-destructive"
                }`}>
                  {!hasCostAndPrice ? "Profit Amount" : isProfit ? "Profit Amount" : "Loss Amount"}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5 block">
                  Net {isProfit ? "Gain" : "Deficit"}
                </span>
              </div>

              <div className="my-auto py-2">
                <div className={`text-5xl sm:text-6xl font-black tracking-tight ${
                  !hasCostAndPrice
                    ? "text-muted-foreground/50"
                    : isProfit
                    ? "text-deep-green"
                    : "text-destructive"
                }`}>
                  {!hasCostAndPrice
                    ? "—"
                    : profitAmount < 0
                    ? `-${formatINR(Math.abs(profitAmount))}`
                    : formatINR(profitAmount)}
                </div>
              </div>

              <div className="text-xs font-semibold text-muted-foreground border-t border-border pt-2.5">
                {hasCostAndPrice
                  ? `Selling ${formatINR(numSP)} - Total Cost ${formatINR(totalCost)}`
                  : "Cost aur Selling Price enter karein"}
              </div>
            </Card>

            {/* Output 2: Profit Percentage */}
            <Card className={`border-2 shadow-sm p-5 sm:p-6 flex flex-col justify-between min-h-[200px] ${
              !hasCostAndPrice
                ? "border-border bg-card"
                : isProfit
                ? "border-deep-green/40 dark:border-deep-green/60 bg-deep-green/10"
                : "border-destructive/40 dark:border-destructive/60 bg-destructive/10"
            }`}>
              <div>
                <span className={`text-xs font-bold uppercase tracking-wider block ${
                  !hasCostAndPrice
                    ? "text-muted-foreground"
                    : isProfit
                    ? "text-deep-green"
                    : "text-destructive"
                }`}>
                  {!hasCostAndPrice ? "Profit Percentage" : isProfit ? "Profit Percentage" : "Loss Percentage"}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5 block">
                  Return on Total Cost
                </span>
              </div>

              <div className="my-auto py-2">
                <div className={`text-5xl sm:text-6xl font-black tracking-tight ${
                  !hasCostAndPrice
                    ? "text-muted-foreground/50"
                    : isProfit
                    ? "text-deep-green"
                    : "text-destructive"
                }`}>
                  {!hasCostAndPrice
                    ? "—"
                    : `${profitPercentage >= 0 ? "+" : ""}${profitPercentage.toFixed(1)}%`}
                </div>
              </div>

              <div className="text-xs font-semibold text-muted-foreground border-t border-border/40 pt-2.5">
                {hasCostAndPrice ? "(Profit ÷ Total Cost) × 100" : "Cost aur Selling Price enter karein"}
              </div>
            </Card>
          </div>

          {/* Row 2: Desired Profit Percentage & Recommended Selling Price Calculator */}
          <Card className="border-2 border-saffron/40 bg-saffron-container/15 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-saffron/20 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-saffron flex items-center gap-1.5">
                <Target className="h-4 w-4 text-saffron" />
                Desired Profit Calculator
              </span>
              {hasCostAndPrice && (
                <span className="text-xs font-semibold text-muted-foreground">
                  Current Profit: <strong className="text-foreground">{profitPercentage.toFixed(1)}%</strong>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
              {/* Desired % Input */}
              <div className="sm:col-span-5 space-y-2">
                <Label className="text-xs font-bold text-foreground">
                  Enter Desired Profit (%)
                </Label>
                <div className="relative">
                  <span className="absolute right-3.5 top-2.5 text-sm font-bold text-muted-foreground">%</span>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 25"
                    value={desiredProfitPercent}
                    onChange={(e) => setDesiredProfitPercent(e.target.value)}
                    className="pr-8 text-lg font-bold text-foreground h-11 bg-card border-border"
                  />
                </div>

                {/* Quick Presets for Desired % in 4-4 rows */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {desiredPresets.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDesiredProfitPercent(pct.toString())}
                      className={`py-1 text-xs rounded-md font-semibold transition-all border text-center ${
                        desiredProfitPercent === pct.toString()
                          ? "bg-saffron text-white border-saffron shadow-xs"
                          : "bg-card hover:bg-muted text-foreground border-border"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Recommended Selling Price Output */}
              <div className="sm:col-span-7 bg-card p-4 sm:p-5 rounded-xl border border-saffron/30 shadow-xs flex flex-col justify-between min-h-[140px]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    New Selling Price Required
                  </span>
                  {hasDesiredPercent && (
                    <span className="text-xs font-bold text-saffron bg-saffron-container/30 px-2 py-0.5 rounded">
                      For {numDesiredPercent}% Profit
                    </span>
                  )}
                </div>

                <div className="my-auto py-2">
                  {hasDesiredPercent && totalCost > 0 ? (
                    <div>
                      <div className="text-4xl sm:text-5xl font-black text-saffron tracking-tight">
                        {formatINR(targetSellingPrice)}
                      </div>
                      <div className="text-xs font-semibold text-muted-foreground mt-1.5 flex flex-wrap items-center gap-2">
                        <span>Target Profit: <strong className="text-deep-green font-bold">{formatINR(targetProfitAmount)}</strong></span>
                        {numSP > 0 && priceDiff !== 0 && (
                          <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                            priceDiff > 0
                              ? "bg-deep-green/10 text-deep-green"
                              : "bg-muted text-foreground"
                          }`}>
                            {priceDiff > 0 ? `+${formatINR(priceDiff)}` : `${formatINR(priceDiff)}`}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-4xl sm:text-5xl font-black text-muted-foreground/30 tracking-tight">
                      —
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
