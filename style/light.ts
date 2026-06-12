// src/styles/light.ts

import { Theme } from "./theme"

export const lightTheme: Theme = {
  colors: {
    primary: "#0064e0",
    secondary: "#a121ce",
    background: "#ffffff",
    surface: "#ffffff",
    text: "#1c1e21",
    textSecondary: "#5d6c7b",
    border: "#ced0d4",
    success: "#0064e0",
    error: "#e41e3f",
    warning: "#f7b928",
  },

  typography: {
    // "Optimistic VF" nao esta disponivel no Google Fonts.
    // Montserrat funciona como fallback proximo com a mesma ideia de peso.
    fontFamily:
      'var(--font-optimistic), var(--font-inter), ui-sans-serif, system-ui, sans-serif',
    fontSize: {
      small: "14px",
      body: "16px",
      h3: "24px",
      h2: "36px",
      h1: "48px",
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 700,
      bold: 700,
    },
  },

  spacing: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "20px",
    xl: "24px",
    "2xl": "32px",
    "3xl": "40px",
  },

  borderRadius: {
    small: "8px",
    medium: "8px",
    large: "16px",
    round: "100px",
  },
}

export default lightTheme