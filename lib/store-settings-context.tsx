"use client"

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react"
import { API_BASE_URL, apiPath, authHeaders, apiFetch } from "@/lib/api"

export interface CryptoNetwork {
  network: string
  address: string
}

export interface CryptoCurrency {
  name: string
  symbol: string
  networks: CryptoNetwork[]
}

export interface PaymentSettings {
  creditCardEnabled: boolean
  paypalEnabled: boolean
  paypalLinkEnabled: boolean
  paypalLink: string
  paypalApiEnabled: boolean
  paypalApiUrl: string
  paypalWebhookUrl: string
  stripeApiUrl: string
  stripeWebhookUrl: string
  cryptoEnabled: boolean
  cryptoCurrencies: CryptoCurrency[]
}

export interface FaqItem {
  id?: string
  hidden?: boolean
  question: string
  answer: string
}

export interface StoreSettings {
  storeName: string
  storeEmail: string
  storePhone: string
  storeAddress: string
  storeDiscordLink: string
  storeDescription: string
  primaryColor: string
  logoUrl: string | null
  faviconUrl: string | null
  paymentSettings: PaymentSettings
  faqs: FaqItem[]
}

const normalizeImageUrl = (value: string | null | undefined) => {
  if (typeof value !== 'string' || !value) return null
  if (value.startsWith('data:image/') || value.startsWith('http://') || value.startsWith('https://')) {
    return value
  }

  if (value.startsWith('/')) {
    return `${API_BASE_URL}${value}`
  }
  return value
}

const defaultSettings: StoreSettings = {
  storeName: "",
  storeEmail: "",
  storePhone: "",
  storeAddress: "",
  storeDiscordLink: "",
  storeDescription: "",
  primaryColor: "",
  logoUrl: null,
  faviconUrl: null,
  paymentSettings: {
    creditCardEnabled: false,
    paypalEnabled: false,
    paypalLinkEnabled: false,
    paypalLink: "",
    paypalApiEnabled: false,
    paypalApiUrl: "",
    paypalWebhookUrl: "",
    stripeApiUrl: "",
    stripeWebhookUrl: "",
    cryptoEnabled: false,
    cryptoCurrencies: []
  },
  faqs: []
}

export function hasSettingsChanged(current: StoreSettings | null, previous: StoreSettings | null) {
  if (!current || !previous) return false
  return JSON.stringify(current) !== JSON.stringify(previous)
}

const normalizePaymentSettings = (data: any): PaymentSettings => {
  const merged = {
    ...defaultSettings.paymentSettings,
    ...(data ?? {})
  }

  return {
    ...merged,
    paypalEnabled:
      Boolean(merged.paypalEnabled) ||
      Boolean(merged.paypalLinkEnabled) ||
      Boolean(merged.paypalApiEnabled)
  }
}

interface StoreSettingsContextType {
  settings: StoreSettings
  updateSettings: (newSettings: Partial<StoreSettings>) => void
  saveSettings: () => Promise<void>
  isSaving: boolean
  isLoaded: boolean
}

const StoreSettingsContext = createContext<StoreSettingsContextType | null>(null)

export function StoreSettingsProvider({ children, initialSettings }: { children: ReactNode; initialSettings?: StoreSettings }) {
  const [settings, setSettings] = useState<StoreSettings>(initialSettings ?? defaultSettings)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoaded, setIsLoaded] = useState(!!initialSettings)
  const settingsRef = useRef<StoreSettings>(initialSettings ?? defaultSettings)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 10000)

    const loadSettings = async () => {
      if (typeof window === 'undefined') return

      try {
        const response = await apiFetch(apiPath('/settings'), { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`Failed to load store settings: ${response.status}`)
        }

        const data = await response.json()
        if (cancelled) return

        const loadedSettings: StoreSettings = {
          ...defaultSettings,
          ...data,
          paymentSettings: normalizePaymentSettings(data?.paymentSettings),
          logoUrl: normalizeImageUrl(data.logoUrl),
          faviconUrl: normalizeImageUrl(data.faviconUrl),
          faqs: Array.isArray(data.faqs) ? data.faqs : defaultSettings.faqs
        }

        if (!cancelled) {
          setSettings(loadedSettings)
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          console.error('[store-settings] settings request timed out after 10 seconds')
        } else {
          console.error('Failed to load store settings from API', error)
        }

        if (!cancelled && initialSettings) {
          setSettings(initialSettings)
        } else if (!cancelled) {
          setSettings(defaultSettings)
        }
      } finally {
        if (!cancelled) setIsLoaded(true)
      }
    }

    if (typeof window !== 'undefined') {
      loadSettings()
    }

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [initialSettings])

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  // Listen for real-time settings updates via SSE and apply them instantly
  useEffect(() => {
    if (typeof window === 'undefined') return

    let es: EventSource | null = null
    try {
      es = new EventSource(apiPath('/events'))

      const onMessage = (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data)
          if (!payload || payload.type !== 'settings') return
          // merge incoming settings
          const updated = payload.data || {}
          const merged: StoreSettings = {
            ...settingsRef.current,
            ...updated,
            paymentSettings: normalizePaymentSettings(updated.paymentSettings ?? settingsRef.current.paymentSettings),
            logoUrl: normalizeImageUrl(updated.logoUrl ?? settingsRef.current.logoUrl),
            faviconUrl: normalizeImageUrl(updated.faviconUrl ?? settingsRef.current.faviconUrl),
            faqs: Array.isArray(updated.faqs) ? updated.faqs : settingsRef.current.faqs
          }
          setSettings(merged)
        } catch (err) {
          // ignore parse errors
        }
      }

      es.addEventListener('message', onMessage)
    } catch (err) {
      // ignore SSE failures
    }

    return () => {
      if (es) {
        try {
          es.close()
        } catch (error) {
          // ignore
        }
      }
    }
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty("--store-primary", settings.primaryColor || "")
    document.documentElement.style.setProperty("--tiktok-pink", settings.primaryColor || "")
  }, [settings.primaryColor])

  useEffect(() => {
    const siteTitle = settings.storeName || "Store"
    const siteDescription = settings.storeDescription || ""
    document.title = siteDescription ? `${siteTitle} | ${siteDescription}` : siteTitle
  }, [settings.storeName, settings.storeDescription])

  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    setSettings(prev => {
      const update: any = { ...newSettings }
      
      // Only normalize and include image URLs if they're being explicitly set
      if (newSettings.logoUrl !== undefined) {
        update.logoUrl = normalizeImageUrl(newSettings.logoUrl)
      }
      if (newSettings.faviconUrl !== undefined) {
        update.faviconUrl = normalizeImageUrl(newSettings.faviconUrl)
      }
      
      // Only spread the keys that are actually defined
      const nextSettings = { ...prev }
      Object.keys(update).forEach(key => {
        if (update[key] !== undefined) {
          nextSettings[key as keyof StoreSettings] = update[key]
        }
      })
      
      settingsRef.current = nextSettings
      return nextSettings
    })
  }

  const saveSettings = async () => {
    setIsSaving(true)

    try {
      const latestSettings = settingsRef.current
      
      const payload: Partial<any> = {
        storeName: latestSettings.storeName,
        storeDescription: latestSettings.storeDescription,
        primaryColor: latestSettings.primaryColor,
        storePhone: latestSettings.storePhone,
        storeEmail: latestSettings.storeEmail,
        storeDiscordLink: latestSettings.storeDiscordLink,
        paymentSettings: {
          ...latestSettings.paymentSettings,
          paypalEnabled:
            Boolean(latestSettings.paymentSettings.paypalEnabled) ||
            Boolean(latestSettings.paymentSettings.paypalLinkEnabled) ||
            Boolean(latestSettings.paymentSettings.paypalApiEnabled)
        },
        faqs: latestSettings.faqs,
        // Always send both image URLs to preserve existing values
        logoUrl: latestSettings.logoUrl ? normalizeImageUrl(latestSettings.logoUrl) : null,
        faviconUrl: latestSettings.faviconUrl ? normalizeImageUrl(latestSettings.faviconUrl) : null
      }

      const response = await apiFetch('/settings', {
        method: 'PUT',
        headers: authHeaders(undefined, true),
        body: JSON.stringify(payload)
      })

      if (response.status === 401) {
        console.warn('[store-settings] Admin session missing or expired; redirecting to /admin/login')
        if (typeof window !== 'undefined') {
          window.location.href = '/admin/login'
          return
        }
      }

      if (!response.ok) {
        throw new Error(`Failed to save settings: ${response.status}`)
      }

      const updatedSettings = await response.json()
      setSettings(prev => ({
        ...prev,
        ...updatedSettings,
        logoUrl: normalizeImageUrl(updatedSettings.logoUrl),
        faviconUrl: normalizeImageUrl(updatedSettings.faviconUrl)
      }))
    } catch (err: any) {
      console.error('Failed to save store settings to backend', err)
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <StoreSettingsContext.Provider value={{ settings, updateSettings, saveSettings, isSaving, isLoaded }}>
      {children}
    </StoreSettingsContext.Provider>
  )
}

export function useStoreSettings() {
  const context = useContext(StoreSettingsContext)
  if (!context) {
    throw new Error("useStoreSettings must be used within a StoreSettingsProvider")
  }
  return context
}
