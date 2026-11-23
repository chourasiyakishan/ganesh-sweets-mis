"use client"

import { useState } from "react"
import { SlidersHorizontal, Check, RotateCcw, CheckSquare, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

export interface ViewElementOption {
  id: string
  label: string
  description?: string
  category?: string
  defaultVisible?: boolean
}

interface ViewCustomizerProps {
  title?: string
  description?: string
  options: ViewElementOption[]
  visibleState: Record<string, boolean>
  onToggle: (id: string, checked: boolean) => void
  onSelectAll: () => void
  onReset: () => void
  triggerVariant?: "default" | "outline" | "ghost" | "secondary"
  triggerSize?: "default" | "sm" | "lg" | "icon"
  triggerClassName?: string
}

export function ViewCustomizer({
  title = "Customize View",
  description = "Select which information cards and modules should be displayed on this screen.",
  options,
  visibleState,
  onToggle,
  onSelectAll,
  onReset,
  triggerVariant = "outline",
  triggerSize = "sm",
  triggerClassName = "",
}: ViewCustomizerProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Group options by category
  const categories = Array.from(new Set(options.map((opt) => opt.category || "General Elements")))

  const visibleCount = options.filter((opt) => visibleState[opt.id] !== false).length
  const totalCount = options.length

  return (
    <>
      <Button
        variant={triggerVariant}
        size={triggerSize}
        onClick={() => setIsOpen(true)}
        className={`font-semibold flex items-center gap-2 cursor-pointer ${triggerClassName}`}
      >
        <SlidersHorizontal className="h-3.5 w-3.5 text-saffron shrink-0" />
        <span>Customize View</span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-0.5">
          {visibleCount}/{totalCount}
        </Badge>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden border border-border shadow-elevated bg-popover">
          {/* Header */}
          <DialogHeader className="p-5 pb-3 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-saffron" />
                {title}
              </DialogTitle>
              <Badge variant="outline" className="text-xs">
                {visibleCount} of {totalCount} Visible
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              {description}
            </DialogDescription>
          </DialogHeader>

          {/* Quick Action Toolbar */}
          <div className="px-5 py-2.5 bg-muted/20 border-b border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Toggle items on or off:</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSelectAll}
                className="h-7 text-xs px-2 text-foreground hover:text-primary"
              >
                <CheckSquare className="h-3.5 w-3.5 mr-1" />
                Show All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>
          </div>

          {/* Scrollable Checkbox List */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1 max-h-[420px]">
            {categories.map((category) => {
              const categoryOptions = options.filter(
                (opt) => (opt.category || "General Elements") === category
              )

              return (
                <div key={category} className="space-y-2">
                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                    {category}
                  </h4>
                  <div className="space-y-1.5">
                    {categoryOptions.map((opt) => {
                      const isChecked = visibleState[opt.id] !== false

                      return (
                        <div
                          key={opt.id}
                          onClick={() => onToggle(opt.id, !isChecked)}
                          className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                            isChecked
                              ? "bg-card border-border hover:border-primary/40 hover:bg-muted/40 shadow-xs"
                              : "bg-muted/20 border-transparent opacity-60 hover:opacity-80"
                          }`}
                        >
                          {/* Checkbox Icon */}
                          <div
                            className={`mt-0.5 w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors shrink-0 ${
                              isChecked
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-input bg-background"
                            }`}
                          >
                            {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-xs font-semibold leading-tight ${
                                isChecked ? "text-foreground" : "text-muted-foreground line-through decoration-muted-foreground/40"
                              }`}
                            >
                              {opt.label}
                            </p>
                            {opt.description && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                                {opt.description}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <DialogFooter className="p-3.5 border-t border-border bg-muted/20 sm:justify-between flex items-center">
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Preferences are saved automatically
            </span>
            <Button
              size="sm"
              onClick={() => setIsOpen(false)}
              className="bg-primary hover:bg-saffron-dark text-primary-foreground font-semibold px-4"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
