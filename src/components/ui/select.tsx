'use client'

import React, { createContext, useContext, useState, useRef, useEffect } from 'react'

const SelectContext = createContext<{
  value: string
  onValueChange: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
} | null>(null)

export function Select({ value, onValueChange, children }: {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  
  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  )
}

export function SelectTrigger({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ctx = useContext(SelectContext)
  if (!ctx) throw new Error('SelectTrigger must be used within Select')
  
  return (
    <button
      type="button"
      onClick={() => ctx.setOpen(!ctx.open)}
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
      <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )
}

export function SelectValue({ placeholder = '' }: { placeholder?: string }) {
  const ctx = useContext(SelectContext)
  if (!ctx) throw new Error('SelectValue must be used within Select')
  
  return <span className={!ctx.value ? 'text-gray-500' : ''}>{ctx.value || placeholder}</span>
}

export function SelectContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ctx = useContext(SelectContext)
  const ref = useRef<HTMLDivElement>(null)
  if (!ctx) throw new Error('SelectContent must be used within Select')
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        ctx.setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [ctx])
  
  if (!ctx.open) return null
  
  return (
    <div
      ref={ref}
      className={`absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white text-gray-900 shadow-md mt-1 w-full ${className}`}
    >
      <div className="p-1">{children}</div>
    </div>
  )
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = useContext(SelectContext)
  if (!ctx) throw new Error('SelectItem must be used within Select')
  
  return (
    <div
      onClick={() => {
        ctx.onValueChange(value)
        ctx.setOpen(false)
      }}
      className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100 ${
        ctx.value === value ? 'bg-gray-100 font-medium' : ''
      }`}
    >
      {ctx.value === value && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}
      {children}
    </div>
  )
}
