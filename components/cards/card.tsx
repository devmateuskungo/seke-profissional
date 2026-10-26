// src/components/Card.tsx

import { lightTheme } from "@/style"

interface CardProps {
  title: string
  children: React.ReactNode
}

export const Card = ({ title, children }: CardProps) => {
  return (
    <div
      style={{
        backgroundColor: lightTheme.colors.surface,
        padding: lightTheme.spacing.xl,
        borderRadius: lightTheme.borderRadius.medium,
        border: `1px solid ${lightTheme.colors.border}`,
        fontFamily: lightTheme.typography.fontFamily,
        maxWidth: "320px",
      }}
    >
      <h3
        style={{
          margin: 0,
          marginBottom: lightTheme.spacing.md,
          color: lightTheme.colors.text,
          fontSize: lightTheme.typography.fontSize.h3,
          fontWeight: lightTheme.typography.fontWeight.semibold,
        }}
      >
        {title}
      </h3>

      <div
        style={{
          color: lightTheme.colors.textSecondary,
          fontSize: lightTheme.typography.fontSize.body,
        }}
      >
        {children}
      </div>
    </div>
  )
}
