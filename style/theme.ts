// src/styles/theme.ts

export interface Theme {
  colors: {
    /**
     * Cor principal da marca (usada em botões, links e destaques)
     */
    primary: string
    /**
     * Cor complementar para elementos de apoio
     */
    secondary: string
    /**
     * Fundo neutro da aplicação
     */
    background: string
    /**
     * Fundo de cards e superfícies elevadas
     */
    surface: string
    /**
     * Texto principal
     */
    text: string
    /**
     * Texto secundário / suporte
     */
    textSecondary: string
    /**
     * Bordas, divisores e contornos suaves
     */
    border: string
    success: string
    error: string
    warning: string
    inkButton?: string
    deepInk?: string
    primaryDeep?: string
    primarySoft?: string
    surfaceSoft?: string
    hairlineSoft?: string
    disabledText?: string
    stone?: string
    fbBlue?: string
  }

  typography: {
    /**
     * Família tipográfica única para todo o produto
     */
    fontFamily: string
    /**
     * Escala tipográfica consistente
     *
     * h1: 32px / bold
     * h2: 24px / semibold
     * h3: 20px / semibold
     * body: 16px / regular
     * small: 14px / regular
     */
    fontSize: {
      small: string // 14px
      body: string // 16px
      h3: string // 20px
      h2: string // 24px
      h1: string // 32px
      hero?: string
      display?: string
      headingMd?: string
      subtitle?: string
      caption?: string
    }
    fontWeight: {
      regular: number
      medium: number
      semibold: number
      bold: number
      light?: number
    }
    lineHeight?: {
      tight?: string
      heading?: string
      body?: string
      compact?: string
      caption?: string
    }
    letterSpacing?: {
      body?: string
      compact?: string
      normal?: string
    }
  }

  /**
   * Sistema de espaçamento baseado em escala consistente
   *
   * xs: 4px
   * sm: 8px
   * md: 12px
   * lg: 16px
   * xl: 24px
   * 2xl: 32px
   * 3xl: 48px
   */
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
    "2xl": string
    "3xl": string
    sectionSm?: string
    section?: string
    sectionLg?: string
    hero?: string
  }

  borderRadius: {
    small: string
    medium: string
    large: string
    xxl?: string
    xxxl?: string
    feature?: string
    round: string
    circle?: string
  }
}
