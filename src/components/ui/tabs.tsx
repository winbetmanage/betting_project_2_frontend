"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const TabsContext = React.createContext<{ value: string; setValue: (v: string) => void } | null>(null)

function useTabs() {
  const ctx = React.useContext(TabsContext)
  if (!ctx) throw new Error("Tabs components must be used within <Tabs>")
  return ctx
}

function Tabs({
  defaultValue,
  value,
  onValueChange,
  className,
  children,
}: {
  defaultValue?: string
  value?: string
  onValueChange?: (v: string) => void
  className?: string
  children: React.ReactNode
}) {
  const [internal, setInternal] = React.useState(defaultValue ?? "")
  const active = value ?? internal
  const setValue = React.useCallback(
    (v: string) => {
      setInternal(v)
      onValueChange?.(v)
    },
    [onValueChange]
  )
  return (
    <TabsContext.Provider value={{ value: active, setValue }}>
      <div data-slot="tabs" className={cn("flex flex-col gap-1", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div data-slot="tabs-list" className={cn("inline-flex h-8 items-center justify-center rounded-lg bg-muted p-0.5 text-muted-foreground", className)}>
      {children}
    </div>
  )
}

function TabsTrigger({
  value,
  className,
  children,
}: {
  value: string
  className?: string
  children: React.ReactNode
}) {
  const ctx = useTabs()
  const active = ctx.value === value
  return (
    <button
      type="button"
      data-slot="tabs-trigger"
      data-active={active}
      onClick={() => ctx.setValue(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active ? "bg-background text-foreground shadow-sm" : "hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  )
}

function TabsContent({
  value,
  className,
  children,
}: {
  value: string
  className?: string
  children: React.ReactNode
}) {
  const ctx = useTabs()
  if (ctx.value !== value) return null
  return (
    <div data-slot="tabs-content" className={cn("mt-1", className)}>
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
