// src/styles/light.ts

import { Theme } from "./theme"

export const lightTheme: Theme = {
  colors: {
    primary: "#18B481",
    secondary: "#9333EA",
    background: "#FFFFFF",
    surface: "#F9FAFB",
    text: "#111827",
    textSecondary: "#6B7280",
    border: "#E5E7EB",
    success: "#10B981",
    error: "#EF4444",
    warning: "#F59E0B",
  },

  typography: {
    // Alinhado a `next/font` Geist no layout — uma única família em todo o produto
    fontFamily:
      'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
    fontSize: {
      small: "14px", // Small
      body: "16px", // Body
      h3: "20px", // H3
      h2: "24px", // H2
      h1: "32px", // H1
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },

  spacing: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
    "2xl": "32px",
    "3xl": "48px",
  },

  borderRadius: {
    small: "4px",
    medium: "8px",
    large: "16px",
    round: "9999px",
  },
}

export default lightTheme