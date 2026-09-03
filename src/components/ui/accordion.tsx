"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type AccordionContextValue = {
  openItems: Set<string>
  toggle: (value: string) => void
  type: "single" | "multiple"
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null)

function useAccordion() {
  const ctx = React.useContext(AccordionContext)
  if (!ctx) throw new Error("Accordion components must be used within <Accordion>")
  return ctx
}

function Accordion({
  type = "single",
  collapsible = true,
  defaultValue,
  className,
  children,
}: {
  type?: "single" | "multiple"
  collapsible?: boolean
  defaultValue?: string
  className?: string
  children: React.ReactNode
}) {
  const [openItems, setOpenItems] = React.useState<Set<string>>(() => new Set(defaultValue ? [defaultValue] : []))

  const toggle = React.useCallback(
    (value: string) => {
      setOpenItems((prev) => {
        const next = new Set(prev)
        if (next.has(value)) {
          if (type === "single" && !collapsible && next.size === 1) return next
          next.delete(value)
        } else {
          if (type === "single") next.clear()
          next.add(value)
        }
        return next
      })
    },
    [type, collapsible]
  )

  return (
    <AccordionContext.Provider value={{ openItems, toggle, type }}>
      <div data-slot="accordion" className={cn("", className)}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

const ItemContext = React.createContext<string>("")

function AccordionItem({
  value,
  className,
  children,
}: {
  value: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <ItemContext.Provider value={value}>
      <div data-slot="accordion-item" data-value={value} className={cn("border-b last:border-b-0", className)}>
        {children}
      </div>
    </ItemContext.Provider>
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string; children: React.ReactNode }) {
  const ctx = useAccordion()
  const value = React.useContext(ItemContext)
  const isOpen = ctx.openItems.has(value)

  return (
    <div className="flex">
      <button
        data-slot="accordion-trigger"
        type="button"
        aria-expanded={isOpen}
        onClick={() => ctx.toggle(value)}
        className={cn(
          "flex flex-1 items-center justify-between py-3 text-sm font-medium transition-all hover:underline text-left [&[data-state=open]>svg]:rotate-180",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className={cn("text-muted-foreground size-4 shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>
    </div>
  )
}

function AccordionContent({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  const ctx = useAccordion()
  const value = React.useContext(ItemContext)
  const isOpen = ctx.openItems.has(value)
  if (!isOpen) return null

  return (
    <div data-slot="accordion-content" className={cn("overflow-hidden text-sm", className)}>
      <div className={cn("pt-0 pb-4", className)}>{children}</div>
    </div>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
