"use client"

import { useEffect } from "react"
import { useStoreSettings } from "@/lib/store-settings-context"

export function FaviconUpdater() {
  const { settings } = useStoreSettings()

  useEffect(() => {
    const existingLinks = Array.from(document.head.querySelectorAll<HTMLLinkElement>("link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']"))

    if (!settings.faviconUrl) {
      existingLinks.forEach(link => link.remove())
      return
    }

    const faviconUrl = settings.faviconUrl
    const dataMime = faviconUrl.startsWith("data:") ? faviconUrl.split(";")[0].replace("data:", "") : undefined
    const type = dataMime || (faviconUrl.endsWith(".svg") ? "image/svg+xml" : "image/png")
    const rels = ["icon", "shortcut icon", "apple-touch-icon"]

    if (existingLinks.length > 0) {
      existingLinks.forEach(link => {
        link.href = faviconUrl
        link.setAttribute("type", type)
        link.setAttribute("sizes", "any")
      })
    } else {
      rels.forEach(rel => {
        const link = document.createElement("link")
        link.rel = rel
        link.href = faviconUrl
        link.setAttribute("type", type)
        link.setAttribute("sizes", "any")
        document.head.appendChild(link)
      })
    }
  }, [settings.faviconUrl])

  return null
}
