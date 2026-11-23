"use client"

import { useState } from "react"
import { Scale, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatINR } from "@/lib/utils"

export default function WeightPriceCalculatorPage() {
  const [ratePerKg, setRatePerKg] = useState<string>("")
  const [desiredNumber, setDesiredNumber] = useState<string>("")

  const pricePresets = [100, 120, 140, 160, 200, 240, 280, 320, 360, 400, 440, 480, 560, 600]
  const presetNumbers = [10, 20, 30, 50, 100, 150, 200, 250, 300, 350, 400, 500, 600, 700, 800]

  const numericRatePerKg = parseFloat(ratePerKg) || 0
  const numericDesiredNumber = parseFloat(desiredNumber) || 0

  // 1. Quantity for desired rupees
  const calculatedGrams = numericRatePerKg > 0 ? (numericDesiredNumber / numericRatePerKg) * 1000 : 0
  const calculatedKg = calculatedGrams / 1000

  // 2. Price for desired grams
  const calculatedPrice = numericRatePerKg > 0 ? numericDesiredNumber * (numericRatePerKg / 1000) : 0

  const handleReset = () => {
    setRatePerKg("")
    setDesiredNumber("")
  }

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-card p-4 sm:p-5 rounded-xl border border-border shadow-xs">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2.5">
          <Scale className="h-6 w-6 text-saffron" />
          Weight-Price Calculator
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
            {/* Price per Kg */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Item Price per Kg (₹)
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-bold text-muted-foreground">₹</span>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 400"
                  value={ratePerKg}
                  onChange={(e) => setRatePerKg(e.target.value)}
                  className="pl-8 text-lg font-bold text-foreground h-11 border-border"
                  autoFocus
                />
              </div>

              {/* Quick Price Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {pricePresets.map((price) => (
                  <button
                    key={price}
                    type="button"
                    onClick={() => setRatePerKg(price.toString())}
                    className={`px-2 py-0.5 text-xs rounded-md font-semibold transition-all border ${
                      ratePerKg === price.toString()
                        ? "bg-saffron text-white border-saffron shadow-xs"
                        : "bg-muted/60 hover:bg-muted text-foreground border-border"
                    }`}
                  >
                    ₹{price}
                  </button>
                ))}
              </div>
            </div>

            {/* Desired Number */}
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-xs font-bold text-foreground">
                Desired Number (Rupees or Grams)
              </Label>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 300"
                value={desiredNumber}
                onChange={(e) => setDesiredNumber(e.target.value)}
                className="text-lg font-bold text-foreground h-11"
              />

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {presetNumbers.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setDesiredNumber(num.toString())}
                    className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all border ${
                      desiredNumber === num.toString()
                        ? "bg-saffron text-white border-saffron"
                        : "bg-muted/60 hover:bg-muted text-foreground border-border"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: Big Output Values */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Output 1: Quantity in Amount */}
          <Card className="border-2 border-saffron/40 dark:border-saffron/60 bg-saffron-container/15 shadow-sm p-5 sm:p-6 flex flex-col justify-between min-h-[220px]">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-saffron block">
                Quantity for ₹{desiredNumber || "0"}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 block">
                Grams
              </span>
            </div>

            <div className="my-auto py-3">
              <div className="text-5xl sm:text-6xl font-black text-foreground tracking-tight">
                {calculatedGrams >= 1000
                  ? `${calculatedGrams.toLocaleString("en-IN", { maximumFractionDigits: 1 })}`
                  : `${calculatedGrams.toLocaleString("en-IN", { maximumFractionDigits: 1 })}`}
                <span className="text-2xl sm:text-3xl font-bold text-saffron ml-1.5">g</span>
              </div>
              {calculatedGrams >= 1000 && (
                <div className="text-lg sm:text-xl font-bold text-muted-foreground mt-1">
                  {calculatedKg.toFixed(3)} kg
                </div>
              )}
            </div>

            <div className="text-xs font-semibold text-muted-foreground border-t border-saffron/20 pt-2.5">
              {numericRatePerKg > 0 ? `@ ${formatINR(numericRatePerKg)} / kg` : "@ — / kg"}
            </div>
          </Card>

          {/* Output 2: Price for Grams */}
          <Card className="border-2 border-deep-green/40 dark:border-deep-green/60 bg-deep-green/10 shadow-sm p-5 sm:p-6 flex flex-col justify-between min-h-[220px]">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-deep-green block">
                Price for {desiredNumber || "0"} g
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 block">
                Amount
              </span>
            </div>

            <div className="my-auto py-3">
              <div className="text-5xl sm:text-6xl font-black text-deep-green tracking-tight">
                {formatINR(calculatedPrice)}
              </div>
            </div>

            <div className="text-xs font-semibold text-muted-foreground border-t border-deep-green/20 pt-2.5">
              {numericRatePerKg > 0 ? `@ ${formatINR(numericRatePerKg)} / kg` : "@ — / kg"}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
