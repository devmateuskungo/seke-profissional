import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold tracking-[-0.14px] leading-[1.43] transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-[#0457cb]",
        destructive:
          "bg-destructive text-white active:opacity-90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        buy: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-[#0457cb]",
        outline:
          "border-2 border-[#0a1317] bg-transparent text-[#0a1317] active:bg-[#f1f4f7]",
        secondary:
          "bg-secondary text-secondary-foreground active:bg-secondary/80",
        ghost:
          "border-2 border-[rgba(10,19,23,0.12)] bg-transparent text-[#0a1317] active:bg-[#f1f4f7]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-11 px-[30px] py-[14px] has-[>svg]:px-6",
        xs: "min-h-8 gap-1 px-4 py-2 text-xs has-[>svg]:px-3 [&_svg:not([class*='size-'])]:size-3",
        sm: "min-h-10 gap-1.5 px-6 py-3 has-[>svg]:px-5",
        lg: "min-h-12 px-8 py-[14px] has-[>svg]:px-7",
        icon: "size-10 rounded-[9999px] p-0",
        "icon-xs": "size-8 rounded-[9999px] p-0 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-11 rounded-[9999px] p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
