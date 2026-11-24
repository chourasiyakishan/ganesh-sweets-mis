"use client"

import { useState, useMemo, useEffect } from "react"
import { ChefHat, Plus, Search, Video, Trash2, ChevronDown, ChevronUp, Scale, Edit, Clock, ListOrdered, Wrench, Timer, GripVertical, ArrowUp, ArrowDown, PieChart as PieChartIcon, Calculator } from "lucide-react"
import { ContributionPieChartModal } from "./contribution-pie-chart-modal"
import { BulkRecipeCalculatorModal } from "./bulk-recipe-calculator-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { formatINR, cn } from "@/lib/utils"
import { Recipe, RecipeIngredient, RecipeProcessStep, RecipeEquipment, Item } from "@/lib/mockData"
import { RECIPES_STORAGE_KEY } from "@/lib/data-management"
import { fetchRecipes, saveRecipeToDb, fetchItems } from "@/lib/supabase/data-service"
import { toast } from "sonner"

// Helper: format total minutes into "Xhr Ymin"
function formatPrepTime(totalMinutes: number): string {
  if (totalMinutes <= 0) return "—"
  const hrs = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  if (hrs > 0 && mins > 0) return `${hrs}hr ${mins}min`
  if (hrs > 0) return `${hrs}hr`
  return `${mins}min`
}

// --- Form Row Types ---
type IngredientFormRow = { itemId: string; itemName: string; quantity: string; unit: string; currentRate: number }
type StepFormRow = { description: string; estimatedMinutes: string }
type EquipmentFormRow = { name: string; quantity: string; role: string }

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [masterItems, setMasterItems] = useState<Item[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null)

  const loadRecipesData = async () => {
    const loaded = await fetchRecipes()
    setRecipes(loaded)
    if (loaded.length > 0 && !expandedRecipeId) {
      setExpandedRecipeId(loaded[0].id)
    }
  }

  const loadItemsData = async () => {
    const loaded = await fetchItems()
    setMasterItems(loaded)
  }

  useEffect(() => {
    loadRecipesData()
    loadItemsData()

    window.addEventListener("recipes-updated", loadRecipesData)
    window.addEventListener("items-updated", loadItemsData)
    window.addEventListener("data-cleared", loadRecipesData)
    return () => {
      window.removeEventListener("recipes-updated", loadRecipesData)
      window.removeEventListener("items-updated", loadItemsData)
      window.removeEventListener("data-cleared", loadRecipesData)
    }
  }, [])

  // Listen for search parameters from URL or Topbar universal search event
  useEffect(() => {
    const handleUrlParams = () => {
      if (typeof window === "undefined") return
      const params = new URLSearchParams(window.location.search)
      const q = params.get("search")
      if (q !== null) setSearchQuery(q)
    }

    handleUrlParams()

    const onSearchNavigate = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail && customEvent.detail.search !== undefined) {
        setSearchQuery(customEvent.detail.search)
      }
    }

    window.addEventListener("mis-search-navigate", onSearchNavigate)
    window.addEventListener("popstate", handleUrlParams)
    return () => {
      window.removeEventListener("mis-search-navigate", onSearchNavigate)
      window.removeEventListener("popstate", handleUrlParams)
    }
  }, [])

  // Modal State
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [pieRecipe, setPieRecipe] = useState<Recipe | null>(null)
  const [isPieOpen, setIsPieOpen] = useState(false)
  const [isBulkCalcOpen, setIsBulkCalcOpen] = useState(false)

  // Form Fields
  const [recipeName, setRecipeName] = useState("")
  const [outputYield, setOutputYield] = useState("")
  const [outputUnit, setOutputUnit] = useState("Kg")
  const [additionalCostName, setAdditionalCostName] = useState("")
  const [additionalExpense, setAdditionalExpense] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [recipeIngredients, setRecipeIngredients] = useState<IngredientFormRow[]>([])
  const [processSteps, setProcessSteps] = useState<StepFormRow[]>([])
  const [equipmentRows, setEquipmentRows] = useState<EquipmentFormRow[]>([])

  // Drag and drop state for process steps
  const [draggedStepIndex, setDraggedStepIndex] = useState<number | null>(null)
  const [dragOverStepIndex, setDragOverStepIndex] = useState<number | null>(null)

  // Alphabetically Sorted Master Items (A-Z) from live items
  const sortedMasterItems = useMemo(() => {
    return [...masterItems].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
  }, [masterItems])

  // Calculate dynamic live cost per unit for a recipe
  const calculateRecipeCost = (
    ingList: { quantity: number; currentRate: number }[],
    addExp: number,
    yieldQty: number
  ) => {
    if (yieldQty <= 0) return 0
    const totalIngredientsCost = ingList.reduce((acc, item) => acc + item.quantity * item.currentRate, 0)
    return (totalIngredientsCost + addExp) / yieldQty
  }

  // Calculate total prep time from process steps
  const calculateTotalPrepTime = (steps: RecipeProcessStep[]): number => {
    return steps.reduce((acc, step) => acc + (step.estimatedMinutes || 0), 0)
  }

  // --- Reset form fields ---
  const resetFormFields = () => {
    setRecipeName("")
    setOutputYield("")
    setOutputUnit("Kg")
    setAdditionalCostName("")
    setAdditionalExpense("")
    setVideoUrl("")
    setRecipeIngredients([])
    setProcessSteps([])
    setEquipmentRows([])
    setDraggedStepIndex(null)
    setDragOverStepIndex(null)
  }

  // --- Ingredient Row Handlers ---
  const handleAddIngredientRow = () => {
    if (sortedMasterItems.length === 0) return
    const firstItem = sortedMasterItems[0]
    setRecipeIngredients([
      ...recipeIngredients,
      { itemId: firstItem.id, itemName: firstItem.name, quantity: "1", unit: firstItem.unit, currentRate: firstItem.currentPrice },
    ])
  }

  const handleRemoveIngredientRow = (index: number) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index))
  }

  const handleIngredientItemChange = (index: number, selectedItemName: string) => {
    const selected = sortedMasterItems.find((i) => i.name === selectedItemName)
    if (!selected) return
    const updated = [...recipeIngredients]
    updated[index] = {
      ...updated[index],
      itemId: selected.id,
      itemName: selected.name,
      unit: selected.unit,
      currentRate: selected.currentPrice,
    }
    setRecipeIngredients(updated)
  }

  const handleIngredientQtyChange = (index: number, qtyStr: string) => {
    const updated = [...recipeIngredients]
    updated[index] = { ...updated[index], quantity: qtyStr }
    setRecipeIngredients(updated)
  }

  // --- Step Row Handlers ---
  const handleAddStepRow = () => {
    setProcessSteps([...processSteps, { description: "", estimatedMinutes: "" }])
  }

  const handleRemoveStepRow = (index: number) => {
    setProcessSteps(processSteps.filter((_, i) => i !== index))
  }

  const handleStepChange = (index: number, field: "description" | "estimatedMinutes", value: string) => {
    const updated = [...processSteps]
    updated[index] = { ...updated[index], [field]: value }
    setProcessSteps(updated)
  }

  // Step Reordering Handlers (Up / Down buttons and Drag-and-Drop)
  const handleMoveStepUp = (index: number) => {
    if (index <= 0) return
    const updated = [...processSteps]
    const temp = updated[index]
    updated[index] = updated[index - 1]
    updated[index - 1] = temp
    setProcessSteps(updated)
  }

  const handleMoveStepDown = (index: number) => {
    if (index >= processSteps.length - 1) return
    const updated = [...processSteps]
    const temp = updated[index]
    updated[index] = updated[index + 1]
    updated[index + 1] = temp
    setProcessSteps(updated)
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", `${index}`)
    e.dataTransfer.effectAllowed = "move"
    setDraggedStepIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    if (dragOverStepIndex !== index) {
      setDragOverStepIndex(index)
    }
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (draggedStepIndex === null || draggedStepIndex === targetIndex) {
      setDraggedStepIndex(null)
      setDragOverStepIndex(null)
      return
    }
    const updated = [...processSteps]
    const [movedItem] = updated.splice(draggedStepIndex, 1)
    updated.splice(targetIndex, 0, movedItem)
    setProcessSteps(updated)
    setDraggedStepIndex(null)
    setDragOverStepIndex(null)
    toast.info(`Step rearranged to #${targetIndex + 1}`)
  }

  // --- Equipment Row Handlers ---
  const handleAddEquipmentRow = () => {
    setEquipmentRows([...equipmentRows, { name: "", quantity: "1", role: "" }])
  }

  const handleRemoveEquipmentRow = (index: number) => {
    setEquipmentRows(equipmentRows.filter((_, i) => i !== index))
  }

  const handleEquipmentChange = (index: number, field: "name" | "quantity" | "role", value: string) => {
    const updated = [...equipmentRows]
    updated[index] = { ...updated[index], [field]: value }
    setEquipmentRows(updated)
  }

  // --- Build Recipe from form ---
  const buildRecipeFromForm = (id: string): Recipe | null => {
    const trimmed = recipeName.trim()
    const yieldNum = parseFloat(outputYield) || 0

    if (!trimmed || yieldNum <= 0 || recipeIngredients.length === 0) {
      toast.error("Recipe name, valid batch yield, and at least 1 ingredient are required")
      return null
    }

    const addExpNum = parseFloat(additionalExpense) || 0
    const formattedIngredients: RecipeIngredient[] = recipeIngredients.map((ing, idx) => {
      const q = parseFloat(ing.quantity) || 0
      const cost = q * ing.currentRate
      return {
        id: `ri-${Date.now()}-${idx}`,
        itemId: ing.itemId,
        itemName: ing.itemName,
        quantity: q,
        unit: ing.unit,
        currentRate: ing.currentRate,
        cost: cost,
        contributionPct: 0,
      }
    })

    const formattedSteps: RecipeProcessStep[] = processSteps
      .filter((s) => s.description.trim())
      .map((s, idx) => {
        const mins = parseInt(s.estimatedMinutes) || 0
        return {
          stepNumber: idx + 1,
          description: s.description.trim(),
          estimatedMinutes: mins,
          estimatedTime: mins > 0 ? `${mins} mins` : undefined,
        }
      })

    const formattedEquipment: RecipeEquipment[] = equipmentRows
      .filter((e) => e.name.trim())
      .map((e) => ({
        name: e.name.trim(),
        quantity: parseInt(e.quantity) || 1,
        role: e.role.trim(),
      }))

    const costPerUnit = calculateRecipeCost(formattedIngredients, addExpNum, yieldNum)

    return {
      id,
      name: trimmed,
      outputYield: yieldNum,
      outputUnit: outputUnit,
      additionalExpense: addExpNum,
      additionalCostName: additionalCostName.trim() || undefined,
      calculatedCostPerKg: costPerUnit,
      videoUrl: videoUrl.trim() || undefined,
      ingredients: formattedIngredients,
      processSteps: formattedSteps,
      equipment: formattedEquipment,
    }
  }

  // --- Create Recipe Handler ---
  const handleCreateRecipe = async (e: React.FormEvent) => {
    e.preventDefault()
    const newRecipe = buildRecipeFromForm(`r-${Date.now()}`)
    if (!newRecipe) return

    const updated = [newRecipe, ...recipes]
    setRecipes(updated)
    try {
      localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new Event("recipes-updated"))
    } catch {}
    await saveRecipeToDb(newRecipe)

    setIsAddOpen(false)
    resetFormFields()
    toast.success(`Created recipe card for "${newRecipe.name}" (${formatINR(newRecipe.calculatedCostPerKg)}/${newRecipe.outputUnit})`)
  }

  // --- Open Edit Modal ---
  const handleOpenEditModal = (recipe: Recipe) => {
    setEditingRecipe(recipe)
    setRecipeName(recipe.name)
    setOutputYield(recipe.outputYield.toString())
    setOutputUnit(recipe.outputUnit)
    setAdditionalCostName(recipe.additionalCostName || "")
    setAdditionalExpense(recipe.additionalExpense.toString())
    setVideoUrl(recipe.videoUrl || "")
    setRecipeIngredients(
      recipe.ingredients.map((ing) => ({
        itemId: ing.itemId,
        itemName: ing.itemName,
        quantity: ing.quantity.toString(),
        unit: ing.unit,
        currentRate: ing.currentRate,
      }))
    )
    setProcessSteps(
      recipe.processSteps.map((s) => ({
        description: s.description,
        estimatedMinutes: s.estimatedMinutes.toString(),
      }))
    )
    setEquipmentRows(
      recipe.equipment.map((e) => ({
        name: e.name,
        quantity: e.quantity.toString(),
        role: e.role,
      }))
    )
    setIsEditOpen(true)
  }

  // --- Update Recipe Handler ---
  const handleUpdateRecipe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRecipe) return
    const updatedRecipe = buildRecipeFromForm(editingRecipe.id)
    if (!updatedRecipe) return

    const updated = recipes.map((r) => (r.id === editingRecipe.id ? updatedRecipe : r))
    setRecipes(updated)
    try {
      localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new Event("recipes-updated"))
    } catch {}
    await saveRecipeToDb(updatedRecipe)

    setIsEditOpen(false)
    setEditingRecipe(null)
    resetFormFields()
    toast.success(`Updated recipe "${updatedRecipe.name}"`)
  }

  const handleDeleteRecipe = (id: string, name: string) => {
    if (confirm(`Delete recipe card "${name}"?`)) {
      const updated = recipes.filter((r) => r.id !== id)
      setRecipes(updated)
      try {
        localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(updated))
        window.dispatchEvent(new Event("recipes-updated"))
      } catch {}
      toast.success(`Recipe "${name}" deleted`)
    }
  }

  const filteredRecipes = useMemo(() => {
    return recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.ingredients.some((i) => i.itemName.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  }, [recipes, searchQuery])

  // Computed total form step time
  const formTotalPrepMinutes = processSteps.reduce((acc, s) => acc + (parseInt(s.estimatedMinutes) || 0), 0)

  // --- Shared Recipe Form JSX (used in both Add & Edit modals) ---
  const renderRecipeForm = (onSubmit: (e: React.FormEvent) => void, submitLabel: string) => (
    <form onSubmit={onSubmit} className="space-y-5 py-2">
      {/* ① Basic Info */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Basic Information
        </h3>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Recipe Name *</Label>
          <Input placeholder="e.g. Kaju Katli" value={recipeName} onChange={(e) => setRecipeName(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Batch Yield *</Label>
            <Input type="number" step="any" placeholder="e.g. 10" value={outputYield} onChange={(e) => setOutputYield(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Yield Unit</Label>
            <Select value={outputUnit} onValueChange={(val) => val && setOutputUnit(val)}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Kg">Kg</SelectItem>
                <SelectItem value="Gram">Gram</SelectItem>
                <SelectItem value="Litre">Litre</SelectItem>
                <SelectItem value="Piece">Piece</SelectItem>
                <SelectItem value="Tray">Tray</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ② Ingredients */}
      <div className="space-y-2.5 pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Recipe Ingredients *
          </h3>
          <Button type="button" variant="outline" size="sm" onClick={handleAddIngredientRow} className="text-xs text-saffron">
            + Add Ingredient
          </Button>
        </div>

        {recipeIngredients.map((row, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg border border-border">
            <Select
              value={row.itemName}
              onValueChange={(val) => val && handleIngredientItemChange(idx, val)}
            >
              <SelectTrigger className="flex-1 text-xs">
                <SelectValue placeholder="Select ingredient...">
                  {row.itemName}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {sortedMasterItems.map((item) => (
                  <SelectItem key={item.id} value={item.name}>
                    {item.name} ({formatINR(item.currentPrice)}/{item.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              step="any"
              placeholder="Qty"
              value={row.quantity}
              onChange={(e) => handleIngredientQtyChange(idx, e.target.value)}
              className="w-20 text-xs"
            />
            <span className="text-xs text-muted-foreground w-10">{row.unit}</span>

            <span className="text-xs font-bold text-saffron w-24 text-right">
              {formatINR((parseFloat(row.quantity) || 0) * row.currentRate)}
            </span>

            <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveIngredientRow(idx)} className="h-8 w-8 text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {recipeIngredients.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3 bg-muted/20 rounded-lg border border-dashed border-border">
            Click &quot;+ Add Ingredient&quot; to add raw materials from Item Master
          </p>
        )}
      </div>

      {/* ③ Additional Costing */}
      <div className="space-y-2.5 pt-3 border-t border-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Additional Costing
        </h3>
        <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg border border-border">
          <div className="flex-1 space-y-1">
            <Label className="text-[11px] text-muted-foreground">Cost Name</Label>
            <Input
              placeholder="e.g. Labor & Fuel, Packaging"
              value={additionalCostName}
              onChange={(e) => setAdditionalCostName(e.target.value)}
              className="text-xs"
            />
          </div>
          <div className="w-32 space-y-1">
            <Label className="text-[11px] text-muted-foreground">Amount (₹)</Label>
            <Input
              type="number"
              step="any"
              placeholder="0"
              value={additionalExpense}
              onChange={(e) => setAdditionalExpense(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>
      </div>

      {/* ④ Process Steps (With Drag & Drop and Up/Down Reordering) */}
      <div className="space-y-2.5 pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Process Steps
            </h3>
            {formTotalPrepMinutes > 0 && (
              <Badge variant="outline" className="text-[10px] font-bold text-saffron border-saffron/40 dark:border-saffron/60">
                <Timer className="h-3 w-3 mr-1" /> Total: {formatPrepTime(formTotalPrepMinutes)}
              </Badge>
            )}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleAddStepRow} className="text-xs text-saffron">
            + Add Step
          </Button>
        </div>

        {processSteps.map((step, idx) => (
          <div
            key={idx}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragLeave={() => setDragOverStepIndex(null)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={() => { setDraggedStepIndex(null); setDragOverStepIndex(null) }}
            className={cn(
              "flex items-start gap-2 p-2.5 rounded-lg border transition-all",
              dragOverStepIndex === idx ? "border-saffron bg-saffron-container/20 shadow-md" : "bg-muted/30 border-border",
              draggedStepIndex === idx ? "opacity-40" : ""
            )}
          >
            {/* Reorder Buttons & Drag Handle */}
            <div className="flex flex-col items-center gap-0.5 shrink-0 mt-0.5">
              <div
                className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                title="Drag to rearrange step"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={idx === 0}
                  onClick={() => handleMoveStepUp(idx)}
                  className="h-4 w-5 p-0 text-muted-foreground hover:text-foreground disabled:opacity-20"
                  title="Move step up"
                >
                  <ArrowUp className="h-2.5 w-2.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={idx === processSteps.length - 1}
                  onClick={() => handleMoveStepDown(idx)}
                  className="h-4 w-5 p-0 text-muted-foreground hover:text-foreground disabled:opacity-20"
                  title="Move step down"
                >
                  <ArrowDown className="h-2.5 w-2.5" />
                </Button>
              </div>
            </div>

            {/* Step Number */}
            <span className="text-xs font-bold text-saffron mt-2 w-7 shrink-0">#{idx + 1}</span>

            {/* Step Description */}
            <div className="flex-1 space-y-1">
              <Textarea
                placeholder="Describe this step..."
                value={step.description}
                onChange={(e) => handleStepChange(idx, "description", e.target.value)}
                className="text-xs min-h-[58px] resize-none"
              />
            </div>

            {/* Estimated Time in minutes */}
            <div className="w-20 space-y-1 shrink-0">
              <Label className="text-[10px] text-muted-foreground">Time (min)</Label>
              <Input
                type="number"
                placeholder="0"
                value={step.estimatedMinutes}
                onChange={(e) => handleStepChange(idx, "estimatedMinutes", e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Delete Step */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveStepRow(idx)}
              className="h-8 w-8 text-destructive mt-1 shrink-0"
              title="Delete step"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {processSteps.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3 bg-muted/20 rounded-lg border border-dashed border-border">
            Click &quot;+ Add Step&quot; to add preparation steps with time estimates. Drag handle or use up/down buttons to reorder.
          </p>
        )}
      </div>

      {/* ⑤ Equipment */}
      <div className="space-y-2.5 pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Equipment Required
          </h3>
          <Button type="button" variant="outline" size="sm" onClick={handleAddEquipmentRow} className="text-xs text-saffron">
            + Add Equipment
          </Button>
        </div>

        {equipmentRows.map((eq, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg border border-border">
            <Input
              placeholder="Equipment name"
              value={eq.name}
              onChange={(e) => handleEquipmentChange(idx, "name", e.target.value)}
              className="flex-1 text-xs"
            />
            <Input
              type="number"
              placeholder="Qty"
              value={eq.quantity}
              onChange={(e) => handleEquipmentChange(idx, "quantity", e.target.value)}
              className="w-16 text-xs"
            />
            <Input
              placeholder="Role / Purpose"
              value={eq.role}
              onChange={(e) => handleEquipmentChange(idx, "role", e.target.value)}
              className="w-36 text-xs"
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveEquipmentRow(idx)} className="h-8 w-8 text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {equipmentRows.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3 bg-muted/20 rounded-lg border border-dashed border-border">
            Click &quot;+ Add Equipment&quot; to list required equipment
          </p>
        )}
      </div>

      {/* ⑥ YouTube Link */}
      <div className="space-y-2 pt-3 border-t border-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Video Tutorial / YouTube Link (Optional)
        </h3>
        <Input placeholder="https://youtube.com/watch?v=..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="text-xs" />
      </div>

      <DialogFooter className="pt-3">
        <Button type="button" variant="outline" onClick={() => { isEditOpen ? setIsEditOpen(false) : setIsAddOpen(false); resetFormFields() }}>
          Cancel
        </Button>
        <Button type="submit" className="bg-primary hover:bg-saffron-dark text-white font-semibold">
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border shadow-xs">
        <div>
          <h1 className="text-headline text-foreground font-bold tracking-tight flex items-center gap-2.5">
            <ChefHat className="h-7 w-7 text-saffron" />
            Recipes & Dynamic Costing Cards
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            BOM recipe engine with live cost recalculation based on current raw material prices
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBulkCalcOpen(true)}
            className="border-saffron text-saffron hover:bg-saffron/10 font-semibold"
          >
            <Calculator className="h-4 w-4 mr-1.5" /> Bulk Recipe Calculator
          </Button>
          <Button size="sm" onClick={() => { resetFormFields(); setIsAddOpen(true) }} className="bg-primary hover:bg-saffron-dark text-white font-semibold">
            <Plus className="h-4 w-4 mr-1.5" /> Add New Recipe
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="border border-border shadow-card">
        <CardContent className="p-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Recipe Or Ingredient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Recipe Cards Accordion List / Empty State */}
      {filteredRecipes.length === 0 ? (
        <Card className="border border-border shadow-card text-center p-12 space-y-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <ChefHat className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">
              {searchQuery ? "No matching recipes found" : "No Recipes Added Yet"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {searchQuery
                ? `No recipe matched "${searchQuery}". Clear your search query or add a new recipe.`
                : "Your recipe master is clean and ready for real data. Click 'Add New Recipe' to enter your sweet batch formulas, ingredient ratios, and preparation steps."}
            </p>
          </div>
          {!searchQuery && (
            <Button
              onClick={() => { resetFormFields(); setIsAddOpen(true) }}
              className="bg-primary hover:bg-saffron-dark text-white text-xs font-semibold"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add First Recipe
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRecipes.map((recipe) => {
          const isExpanded = expandedRecipeId === recipe.id
          const liveCostPerUnit = calculateRecipeCost(recipe.ingredients, recipe.additionalExpense, recipe.outputYield)
          const totalIngCost = recipe.ingredients.reduce((acc, curr) => acc + curr.quantity * curr.currentRate, 0)
          const totalPrepMinutes = calculateTotalPrepTime(recipe.processSteps)

          return (
            <Card key={recipe.id} className="border border-border shadow-card overflow-hidden transition-all">
              <CardHeader
                className="bg-card hover:bg-muted/30 p-5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none"
                onClick={() => setExpandedRecipeId(isExpanded ? null : recipe.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-saffron-container/40 flex items-center justify-center text-saffron font-bold">
                    <ChefHat className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                      {recipe.name}
                      {recipe.videoUrl && (
                        <a
                          href={recipe.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-normal bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded-full"
                        >
                          <Video className="h-3 w-3" /> Watch Video
                        </a>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span>Batch Yield: <strong className="text-foreground">{recipe.outputYield} {recipe.outputUnit}</strong></span>
                      <span>• {recipe.ingredients.length} Ingredients</span>
                      {recipe.processSteps.length > 0 && <span>• {recipe.processSteps.length} Steps</span>}
                      {totalPrepMinutes > 0 && (
                        <span className="flex items-center gap-1">
                          • <Clock className="h-3 w-3" /> {formatPrepTime(totalPrepMinutes)}
                        </span>
                      )}
                      {recipe.equipment.length > 0 && (
                        <span className="flex items-center gap-1">
                          • <Wrench className="h-3 w-3" /> {recipe.equipment.length} Equipment
                        </span>
                      )}
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider block">Live Cost / {recipe.outputUnit}</span>
                    <span className="text-xl font-bold text-saffron">{formatINR(liveCostPerUnit)}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); handleOpenEditModal(recipe) }}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title="Edit Recipe"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); handleDeleteRecipe(recipe.id, recipe.name) }}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title="Delete Recipe"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="p-6 border-t border-border bg-muted/10 space-y-6">
                  {/* Ingredients Breakdown Table */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <Scale className="h-4 w-4 text-deep-green" /> Ingredients & Raw Material Costing Breakdown
                    </h3>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="bg-table-header text-table-header-text">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-table-header-text font-semibold text-xs text-left">Ingredient Item</TableHead>
                            <TableHead className="text-table-header-text font-semibold text-xs text-left">Quantity Required</TableHead>
                            <TableHead className="text-table-header-text font-semibold text-xs text-left">Current Rate (₹)</TableHead>
                            <TableHead className="text-table-header-text font-semibold text-xs text-left">Total Ingredient Cost (₹)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recipe.ingredients.map((ing) => {
                            const cost = ing.quantity * ing.currentRate
                            return (
                              <TableRow key={ing.id} className="hover:bg-muted/50">
                                <TableCell className="font-bold text-foreground text-xs text-left">{ing.itemName}</TableCell>
                                <TableCell className="text-xs text-foreground font-medium text-left">
                                  {ing.quantity} {ing.unit}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground text-left">{formatINR(ing.currentRate)}/{ing.unit}</TableCell>
                                <TableCell className="text-xs font-bold text-saffron text-left">{formatINR(cost)}</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* View Ingredients Contribution Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5">
                      <span className="text-xs text-muted-foreground">
                        Visual raw material cost and quantity share analysis:
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setPieRecipe(recipe)
                          setIsPieOpen(true)
                        }}
                        className="text-xs border-saffron text-saffron hover:bg-saffron/10 font-semibold h-8"
                      >
                        <PieChartIcon className="h-3.5 w-3.5 mr-1.5" /> View Ingredients Contribution
                      </Button>
                    </div>
                  </div>

                  {/* Summary Totals Box */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
                    <div className="bg-card p-3.5 rounded-lg border border-border">
                      <span className="text-xs text-muted-foreground font-semibold">Total Raw Material Cost:</span>
                      <div className="text-base font-bold text-foreground mt-0.5">{formatINR(totalIngCost)}</div>
                    </div>

                    <div className="bg-card p-3.5 rounded-lg border border-border">
                      <span className="text-xs text-muted-foreground font-semibold">{recipe.additionalCostName || "Additional Expense"}:</span>
                      <div className="text-base font-bold text-foreground mt-0.5">{formatINR(recipe.additionalExpense)}</div>
                    </div>

                    <div className="bg-saffron-container/30 p-3.5 rounded-lg border border-saffron/40">
                      <span className="text-xs text-saffron font-bold">Final Cost per {recipe.outputUnit}:</span>
                      <div className="text-lg font-bold text-saffron mt-0.5">{formatINR(liveCostPerUnit)}</div>
                    </div>
                  </div>

                  {/* Process Steps */}
                  {recipe.processSteps.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                        <ListOrdered className="h-4 w-4 text-deep-green" /> Process Steps
                        <Badge variant="outline" className="ml-2 text-[10px] font-bold text-saffron border-saffron/40">
                          <Timer className="h-3 w-3 mr-1" /> {formatPrepTime(totalPrepMinutes)}
                        </Badge>
                      </h3>
                      <div className="space-y-2">
                        {recipe.processSteps.map((step) => (
                          <div key={step.stepNumber} className="flex items-start gap-3 bg-card p-3 rounded-lg border border-border">
                            <div className="w-7 h-7 rounded-full bg-saffron-container/40 flex items-center justify-center text-xs font-bold text-saffron shrink-0 mt-0.5">
                              {step.stepNumber}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-foreground">{step.description}</p>
                            </div>
                            {step.estimatedMinutes > 0 && (
                              <Badge variant="secondary" className="text-[10px] font-semibold shrink-0">
                                <Clock className="h-3 w-3 mr-1" /> {step.estimatedMinutes} min
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Equipment */}
                  {recipe.equipment.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                        <Wrench className="h-4 w-4 text-deep-green" /> Equipment Required
                      </h3>
                      <div className="border border-border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader className="bg-table-header text-table-header-text">
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="text-table-header-text font-semibold text-xs text-left">Equipment</TableHead>
                              <TableHead className="text-table-header-text font-semibold text-xs text-left">Quantity</TableHead>
                              <TableHead className="text-table-header-text font-semibold text-xs text-left">Role / Purpose</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {recipe.equipment.map((eq, idx) => (
                              <TableRow key={idx} className="hover:bg-muted/50">
                                <TableCell className="font-bold text-foreground text-xs text-left">{eq.name}</TableCell>
                                <TableCell className="text-xs text-foreground text-left">{eq.quantity}</TableCell>
                                <TableCell className="text-xs text-muted-foreground text-left">{eq.role}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )
        })}
        </div>
      )}

      {/* Modal: Add New Recipe */}
      <Dialog open={isAddOpen} onOpenChange={(open) => { if (!open) resetFormFields(); setIsAddOpen(open) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Recipe & Cost Card</DialogTitle>
            <DialogDescription>Link raw materials from Item Master, add process steps, equipment & calculate exact cost.</DialogDescription>
          </DialogHeader>
          {renderRecipeForm(handleCreateRecipe, "Save Recipe")}
        </DialogContent>
      </Dialog>

      {/* Modal: Edit Recipe */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { if (!open) { resetFormFields(); setEditingRecipe(null) }; setIsEditOpen(open) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Recipe — {editingRecipe?.name}</DialogTitle>
            <DialogDescription>Update recipe details, ingredients, process steps & equipment.</DialogDescription>
          </DialogHeader>
          {renderRecipeForm(handleUpdateRecipe, "Update Recipe")}
        </DialogContent>
      </Dialog>

      {/* Modal: Ingredient Contribution Pie Chart */}
      <ContributionPieChartModal
        recipe={pieRecipe}
        isOpen={isPieOpen}
        onClose={() => {
          setIsPieOpen(false)
          setPieRecipe(null)
        }}
      />

      {/* Modal: Bulk Recipe Calculator */}
      <BulkRecipeCalculatorModal
        recipes={recipes}
        isOpen={isBulkCalcOpen}
        onClose={() => setIsBulkCalcOpen(false)}
      />
    </div>
  )
}
