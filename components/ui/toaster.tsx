"use client"

import { toast as sonnerToast } from "sonner"

type ToastFn = (description: string, title?: string) => void

function createToast(
  method: "success" | "error" | "info"
): ToastFn {
  return (description, title) => {
    if (title) {
      sonnerToast[method](title, { description })
      return
    }
    sonnerToast[method](description)
  }
}

/** API partilhada de alertas (Sonner) — usar em todo o sistema. */
export const toast = {
  success: createToast("success"),
  error: createToast("error"),
  info: createToast("info"),
}

/** Hook de compatibilidade; preferir `import { toast } from "@/components/ui/toaster"`. */
export function useToast() {
  return toast
}
