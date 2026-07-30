import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

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
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '0'
    if (value >= 1000) {
      return `${Math.round(value / 100) / 10}K`
    }
    return String(value)
  }

  if (typeof value !== 'string') {
    return '0'
  }

  const trimmed = value.trim()
  if (!trimmed) return '0'

  const normalized = trimmed.replace(/\+/g, '')
  const match = normalized.match(/^([0-9]*\.?[0-9]+)\s*([KM])?$/i)
  if (!match) return trimmed

  const numberPortion = parseFloat(match[1])
  if (!Number.isFinite(numberPortion)) return trimmed

  const suffix = match[2]?.toUpperCase()
  if (suffix === 'K') return `${numberPortion}K`
  if (suffix === 'M') return `${numberPortion}M`
  return String(Math.round(numberPortion))
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
