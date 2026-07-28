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

export function PendingActionProvider({ children }: { children: ReactNode }) {
  const [pendingAction, setPendingAction] = useState<PendingAction>({ type: null })

  const savePendingAction = useCallback((action: PendingAction) => {
    setPendingAction(action)
  }, [])

  const getPendingAction = useCallback(() => {
    return pendingAction
  }, [pendingAction])

  const clearPendingAction = useCallback(() => {
    setPendingAction({ type: null })
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
