"use client"

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"
import { Toast } from "radix-ui"
import { lightTheme } from "@/style/light"

type ToastVariant = "success" | "error" | "info"

interface ToastItem {
  id: string
  title?: string
  description: string
  variant: ToastVariant
}

interface ToastContextValue {
  toasts: ToastItem[]
  toast: {
    success: (description: string, title?: string) => void
    error: (description: string, title?: string) => void
    info: (description: string, title?: string) => void
  }
}

const ToastContext = createContext<ToastContextValue | null>(null)

const variantStyles: Record<
  ToastVariant,
  { bg: string; border: string; icon?: string }
> = {
  success: {
    bg: "rgb(252, 252, 252)",
    border: "1px solid rgba(16, 185, 129, 0.4)",
  },
  error: {
    bg: "rgb(255, 255, 255)",
    border: "1px solid rgba(239, 68, 68, 0.4)",
  },
  info: {
    bg: "rgb(255, 255, 255)",
    border: `1px solid ${lightTheme.colors.border}`,
  },
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error("useToast must be used within a ToasterProvider")
  }
  return ctx.toast
}

interface ToasterProviderProps {
  children: ReactNode
  duration?: number
}

export function ToasterProvider({ children, duration = 5000 }: ToasterProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback(
    (variant: ToastVariant) => (description: string, title?: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
      setToasts((prev) => [...prev, { id, title, description, variant }])
      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id))
        }, duration)
      }
    },
    [duration]
  )

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = {
    success: addToast("success"),
    error: addToast("error"),
    info: addToast("info"),
  }

  return (
    <ToastContext.Provider value={{ toasts, toast }}>
      <Toast.Provider duration={duration} label="Notificações">
        {children}
        <Toast.Viewport
          className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[380px]"
          style={{ listStyle: "none" }}
        />
        {toasts.map((item) => (
          <Toast.Root
            key={item.id}
            open
            onOpenChange={(open) => {
              if (!open) removeToast(item.id)
            }}
            className="rounded-lg px-4 py-3 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{
              backgroundColor: variantStyles[item.variant].bg,
              border: variantStyles[item.variant].border,
              fontFamily: lightTheme.typography.fontFamily,
            }}
          >
            {item.title && (
              <Toast.Title className="text-sm font-semibold text-gray-900">
                {item.title}
              </Toast.Title>
            )}
            <Toast.Description className="text-sm text-gray-700">
              {item.description}
            </Toast.Description>
            <Toast.Close
              className="absolute right-2 top-2 rounded p-1 opacity-70 hover:opacity-100 focus:opacity-100 focus:outline-none"
              aria-label="Fechar"
            />
          </Toast.Root>
        ))}
      </Toast.Provider>
    </ToastContext.Provider>
  )
}
