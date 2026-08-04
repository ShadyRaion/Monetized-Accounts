"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

export interface PendingAction {
  type: "checkout" | "affiliate" | "contact" | "favorite" | null
  data?: any
  targetPage?: string
}

interface PendingActionContextType {
  pendingAction: PendingAction
  savePendingAction: (action: PendingAction) => void
  getPendingAction: () => PendingAction
  clearPendingAction: () => void
}

const PendingActionContext = createContext<PendingActionContextType | undefined>(undefined)
const PENDING_ACTION_STORAGE_KEY = 'pending_action_state_v1'

export function PendingActionProvider({ children }: { children: ReactNode }) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(() => {
    if (typeof window === 'undefined') {
      return { type: null }
    }

    try {
      const stored = window.sessionStorage.getItem(PENDING_ACTION_STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.warn('Failed to parse pending action from storage', error)
    }

    return { type: null }
  })

  const savePendingAction = useCallback((action: PendingAction) => {
    setPendingAction(action)
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(PENDING_ACTION_STORAGE_KEY, JSON.stringify(action))
      } catch (error) {
        console.warn('Failed to persist pending action', error)
      }
    }
  }, [])

  const getPendingAction = useCallback(() => {
    return pendingAction
  }, [pendingAction])

  const clearPendingAction = useCallback(() => {
    setPendingAction({ type: null })
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(PENDING_ACTION_STORAGE_KEY)
    }
  }, [])

  return (
    <PendingActionContext.Provider
      value={{
        pendingAction,
        savePendingAction,
        getPendingAction,
        clearPendingAction
      }}
    >
      {children}
    </PendingActionContext.Provider>
  )
}

export function usePendingAction() {
  const context = useContext(PendingActionContext)
  if (!context) {
    throw new Error("usePendingAction must be used within PendingActionProvider")
  }
  return context
}
