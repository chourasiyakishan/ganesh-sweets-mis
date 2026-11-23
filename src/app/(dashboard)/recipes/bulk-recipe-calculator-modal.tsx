"use client"

import { useState, useMemo, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { formatINR } from "@/lib/utils"
import { Recipe } from "@/lib/mockData"
import { Calculator, RotateCcw, Scale, Sparkles, ArrowRightLeft, Info, CheckCircle2 } from "lucide-react"

interface BulkRecipeCalculatorModalProps {
  recipes: Recipe[]
  isOpen: boolean
  onClose: () => void
}

export function BulkRecipeCalculatorModal({ recipes, isOpen, onClose }: BulkRecipeCalculatorModalProps) {
  // Sort recipes alphabetically (A-Z)
  const sortedRecipes = useMemo(() => {
    return [...recipes].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
  }, [recipes])

  const [selectedRecipeName, setSelectedRecipeName] = useState<string>("")
  const [scaleFactor, setScaleFactor] = useState<number>(1.0)
  const [targetYieldInput, setTargetYieldInput] = useState<string>("")
  const [limitingItemName, setLimitingItemName] = useState<string | null>(null)

  // Current active recipe
  const currentRecipe = useMemo(() => {
    if (!selectedRecipeName && sortedRecipes.length > 0) return sortedRecipes[0]
    return sortedRecipes.find((r) => r.name === selectedRecipeName) || sortedRecipes[0]
  }, [sortedRecipes, selectedRecipeName])

  // Initialize or reset when recipe changes or modal opens
  useEffect(() => {
    if (sortedRecipes.length > 0) {
      const active = sortedRecipes.find((r) => r.name === selectedRecipeName) || sortedRecipes[0]
      setSelectedRecipeName(active.name)
      setScaleFactor(1.0)
      setTargetYieldInput(active.outputYield.toString())
      setLimitingItemName(null)
    }
  }, [sortedRecipes, isOpen])

  if (!currentRecipe) return null

  // Handler 1: Scale by Target Yield
  const handleYieldChange = (valStr: string) => {
    setTargetYieldInput(valStr)
    const valNum = parseFloat(valStr)
    if (!isNaN(valNum) && valNum > 0 && currentRecipe.outputYield > 0) {
      const newFactor = valNum / currentRecipe.outputYield
      setScaleFactor(newFactor)
      setLimitingItemName(null)
    }
  }

  // Handler 2: Scale by Single Ingredient (Available Stock / Limiting Ingredient)
  const handleIngredientQtyChange = (itemId: string, enteredQtyStr: string) => {
    const baseIng = currentRecipe.ingredients.find((i) => i.itemId === itemId)
    if (!baseIng || baseIng.quantity <= 0) return

    const enteredQtyNum = parseFloat(enteredQtyStr)
    if (!isNaN(enteredQtyNum) && enteredQtyNum > 0) {
      const newFactor = enteredQtyNum / baseIng.quantity
      setScaleFactor(newFactor)
      setLimitingItemName(baseIng.itemName)
      const calculatedYield = currentRecipe.outputYield * newFactor
      setTargetYieldInput(calculatedYield % 1 === 0 ? calculatedYield.toString() : calculatedYield.toFixed(2))
    }
  }

  // Reset to 1.0x Base Recipe
  const handleReset = () => {
    setScaleFactor(1.0)
    setTargetYieldInput(currentRecipe.outputYield.toString())
    setLimitingItemName(null)
  }

  // Scaled calculations
  const scaledYield = currentRecipe.outputYield * scaleFactor
  const scaledIngredients = currentRecipe.ingredients.map((ing) => {
    const scaledQty = ing.quantity * scaleFactor
    const scaledCost = scaledQty * ing.currentRate
    return {
      ...ing,
      scaledQty: Number(scaledQty.toFixed(3)),
      scaledCost: Number(scaledCost.toFixed(2)),
    }
  })

  const scaledTotalIngCost = scaledIngredients.reduce((sum, ing) => sum + ing.scaledCost, 0)
  const scaledAddExpense = (currentRecipe.additionalExpense || 0) * scaleFactor
  const scaledTotalBatchCost = scaledTotalIngCost + scaledAddExpense
  const scaledCostPerUnit = scaledYield > 0 ? scaledTotalBatchCost / scaledYield : 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-5 w-5 text-saffron" />
              Bulk Recipe Scaling Calculator
            </DialogTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
              title="Reset to 1.0x Standard Recipe"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset to Base
            </Button>
          </div>
          <DialogDescription className="text-xs">
            Two-way proportional scaling: Scale by target output yield OR adjust any single ingredient to reverse-calculate batch capacity.
          </DialogDescription>
        </DialogHeader>

        {/* Recipe Selector Dropdown */}
        <div className="bg-card p-3 rounded-lg border border-border mt-1">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-muted-foreground">Select Recipe to Scale</Label>
            <Select
              value={currentRecipe.name}
              onValueChange={(name) => {
                const r = sortedRecipes.find((x) => x.name === name)
                if (r) {
                  setSelectedRecipeName(r.name)
                  setScaleFactor(1.0)
                  setTargetYieldInput(r.outputYield.toString())
                  setLimitingItemName(null)
                }
              }}
            >
              <SelectTrigger className="text-xs h-9 font-semibold text-foreground">
                <SelectValue placeholder="Select recipe...">
                  {currentRecipe.name} — Standard Batch: {currentRecipe.outputYield} {currentRecipe.outputUnit} ({formatINR(currentRecipe.calculatedCostPerKg)}/{currentRecipe.outputUnit})
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {sortedRecipes.map((r) => (
                  <SelectItem key={r.id} value={r.name}>
                    {r.name} — Standard Batch: {r.outputYield} {r.outputUnit} ({formatINR(r.calculatedCostPerKg)}/{r.outputUnit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Limiting Ingredient Alert Banner */}
        {limitingItemName && (
          <div className="flex items-center gap-2 bg-saffron-container/30 border border-saffron/40 p-2.5 rounded-lg text-xs text-foreground animate-in fade-in duration-200">
            <Sparkles className="h-4 w-4 text-saffron shrink-0" />
            <div>
              <strong>Batch constrained by available stock:</strong> Scaling driven by <strong>{limitingItemName}</strong>. Total yield auto-calculated to <strong>{targetYieldInput} {currentRecipe.outputUnit}</strong>.
            </div>
          </div>
        )}

        {/* Target Batch Yield Control & Scale Factor Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-muted/40 rounded-xl border border-border">
          {/* Target Yield Input */}
          <div className="sm:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5 text-deep-green" /> Target Batch Output Yield
              </Label>
              <span className="text-[11px] text-muted-foreground">
                Base: {currentRecipe.outputYield} {currentRecipe.outputUnit}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="any"
                min="0.1"
                placeholder="e.g. 25"
                value={targetYieldInput}
                onChange={(e) => handleYieldChange(e.target.value)}
                className="text-sm font-bold text-foreground h-9"
              />
              <span className="text-xs font-bold text-muted-foreground bg-background px-3 py-2 rounded-md border border-border">
                {currentRecipe.outputUnit}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              💡 Type desired yield above, or edit any ingredient&apos;s quantity below to auto-scale.
            </p>
          </div>

          {/* Scale Multiplier Display */}
          <div className="flex flex-col justify-center items-center bg-card p-3 rounded-lg border border-border text-center">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Scale Ratio</span>
            <div className="text-xl font-extrabold text-saffron mt-0.5">
              {scaleFactor.toFixed(2)}x
            </div>
            <Badge variant="outline" className="text-[10px] mt-1 border-border font-medium">
              {scaleFactor === 1 ? "1.0x (Standard)" : scaleFactor > 1 ? `+${((scaleFactor - 1) * 100).toFixed(0)}% Scale Up` : `-${((1 - scaleFactor) * 100).toFixed(0)}% Scale Down`}
            </Badge>
          </div>
        </div>

        {/* Proportional Ingredients Table */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ArrowRightLeft className="h-3.5 w-3.5 text-saffron" /> Scaled Ingredients Breakdown
            </h4>
            <span className="text-[11px] text-muted-foreground">
              Edit any quantity to recalculate by available stock
            </span>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-table-header">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-left">Ingredient Item</TableHead>
                  <TableHead className="text-xs font-semibold text-left">Base Qty</TableHead>
                  <TableHead className="text-xs font-semibold text-left w-36">
                    Scaled Qty (Adjustable)
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-left">Unit</TableHead>
                  <TableHead className="text-xs font-semibold text-left">Current Rate</TableHead>
                  <TableHead className="text-xs font-semibold text-left">Scaled Cost (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scaledIngredients.map((ing) => {
                  const isDriver = limitingItemName === ing.itemName
                  return (
                    <TableRow
                      key={ing.id}
                      className={isDriver ? "bg-saffron-container/20 hover:bg-saffron-container/30" : "hover:bg-muted/40"}
                    >
                      {/* Name */}
                      <TableCell className="text-xs font-bold text-foreground text-left">
                        <div className="flex items-center gap-1.5">
                          {isDriver && <CheckCircle2 className="h-3.5 w-3.5 text-saffron shrink-0" />}
                          <span>{ing.itemName}</span>
                        </div>
                      </TableCell>

                      {/* Base Qty */}
                      <TableCell className="text-xs text-muted-foreground text-left">
                        {ing.quantity}
                      </TableCell>

                      {/* Scaled Qty (Directly Editable to reverse scale) */}
                      <TableCell className="text-xs text-left">
                        <Input
                          type="number"
                          step="any"
                          value={ing.scaledQty}
                          onChange={(e) => handleIngredientQtyChange(ing.itemId, e.target.value)}
                          className={`h-7 text-xs font-bold w-28 ${
                            isDriver
                              ? "border-saffron focus-visible:ring-saffron text-saffron"
                              : "text-foreground"
                          }`}
                          title="Type quantity to scale recipe based on this ingredient"
                        />
                      </TableCell>

                      {/* Unit */}
                      <TableCell className="text-xs text-muted-foreground text-left">
                        {ing.unit}
                      </TableCell>

                      {/* Rate */}
                      <TableCell className="text-xs text-muted-foreground text-left">
                        {formatINR(ing.currentRate)}/{ing.unit}
                      </TableCell>

                      {/* Scaled Cost */}
                      <TableCell className="text-xs font-bold text-saffron text-left">
                        {formatINR(ing.scaledCost)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Scaled Cost Summary Totals */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border">
          <div className="bg-card p-3 rounded-lg border border-border">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Raw Materials Total</span>
            <div className="text-sm font-bold text-foreground mt-0.5">{formatINR(scaledTotalIngCost)}</div>
          </div>

          <div className="bg-card p-3 rounded-lg border border-border">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase block">
              {currentRecipe.additionalCostName || "Addl. Cost"} ({scaleFactor.toFixed(2)}x)
            </span>
            <div className="text-sm font-bold text-foreground mt-0.5">{formatINR(scaledAddExpense)}</div>
          </div>

          <div className="bg-card p-3 rounded-lg border border-border">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Total Batch Cost</span>
            <div className="text-sm font-bold text-foreground mt-0.5">{formatINR(scaledTotalBatchCost)}</div>
          </div>

          <div className="bg-saffron-container/30 p-3 rounded-lg border border-saffron/40">
            <span className="text-[10px] text-saffron font-bold uppercase block">Cost / {currentRecipe.outputUnit}</span>
            <div className="text-base font-extrabold text-saffron mt-0.5">{formatINR(scaledCostPerUnit)}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
