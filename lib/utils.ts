import { format } from 'date-fns'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function safeDate(value: string | undefined | null): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatSafeDate(value: string | undefined | null, pattern: string): string {
  const date = safeDate(value)
  return date ? format(date, pattern) : ""
}

export function getAnonymousInitials(name: string) {
  const trimmed = name?.trim() ?? ""
  const words = trimmed.split(/\s+/).filter(Boolean)
  if (!words.length) return "A"
  const masked = words.map(w => {
    if (!w) return ''
    if (w.length === 1) return w[0].toUpperCase()
    return w[0].toUpperCase() + '*'.repeat(Math.max(0, w.length - 1))
  })
  return masked.join(' ')
}

export function formatRevenue(value: number | string): string {
  const numericValue = typeof value === 'number' ? value : Number(value ?? 0)

  if (!Number.isFinite(numericValue)) {
    return '0,00$'
  }

  if (numericValue >= 10000) {
    const compactValue = numericValue / 1000
    return `${compactValue.toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })}K`
  }

  return `${numericValue.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}$`
}

export function formatFollowers(value: number | string): string {
  const numericValue = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[,\s+]/g, '').replace(/K$/i, '000').replace(/M$/i, '000000'))

  if (!Number.isFinite(numericValue)) {
    return '0'
  }

  const rounded = Math.round(numericValue)

  if (rounded < 1000) {
    return String(rounded)
  }

  if (rounded < 1000000) {
    const kValue = rounded / 1000
    const formatted = Number.isInteger(kValue) ? String(kValue) : kValue.toFixed(1).replace(/\.0$/, '')
    return `${formatted}K`
  }

  const mValue = rounded / 1000000
  const formatted = Number.isInteger(mValue) ? String(mValue) : mValue.toFixed(1).replace(/\.0$/, '')
  return `${formatted}M`
}

export function getGrowthPercentage(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }

  return Number((((current - previous) / previous) * 100).toFixed(1))
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
