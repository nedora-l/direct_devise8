'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { SessionProvider } from 'next-auth/react'
import { ThemeMode, CustomTheme, applyTheme, getStoredTheme, PRESET_THEMES } from '@/lib/theme-utils'
import { I18nProvider } from '@/lib/i18n-context'

interface ThemeContextType {
  mode: ThemeMode
  customTheme?: CustomTheme
  setTheme: (mode: ThemeMode, customTheme?: CustomTheme) => void
  presetThemes: Record<string, CustomTheme>
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function Providers({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light')
  const [customTheme, setCustomTheme] = useState<CustomTheme | undefined>()

  useEffect(() => {
    const { mode: storedMode, customTheme: storedTheme } = getStoredTheme()
    setMode(storedMode)
    setCustomTheme(storedTheme)
    applyTheme(storedMode, storedTheme)
  }, [])

  const setTheme = (newMode: ThemeMode, newCustomTheme?: CustomTheme) => {
    setMode(newMode)
    setCustomTheme(newCustomTheme)
    applyTheme(newMode, newCustomTheme)
  }

  return (
    <SessionProvider>
      <ThemeContext.Provider value={{ mode, customTheme, setTheme, presetThemes: PRESET_THEMES }}>
        <I18nProvider>
          {children}
        </I18nProvider>
      </ThemeContext.Provider>
    </SessionProvider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within Providers')
  }
  return context
}
