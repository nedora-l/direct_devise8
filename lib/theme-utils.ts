'use client'

export type ThemeMode = 'light' | 'dark' | 'custom'

export type CustomTheme = {
  primary: string
  secondary: string
  accent: string
  background: string
  foreground: string
}

export const PRESET_THEMES: Record<string, CustomTheme> = {
  ocean: {
    primary: 'oklch(0.4 0.15 240)', // Adjusted for better contrast
    secondary: 'oklch(0.95 0.05 240)',
    accent: 'oklch(0.9 0.1 200)',
    background: 'oklch(0.98 0.01 240)', // Very light blue tint
    foreground: 'oklch(0.15 0.05 240)',
  },
  sunset: {
    primary: 'oklch(0.55 0.2 30)',
    secondary: 'oklch(0.95 0.05 40)',
    accent: 'oklch(0.9 0.1 60)',
    background: 'oklch(0.99 0.01 35)', // Very light warm tint
    foreground: 'oklch(0.2 0.05 30)',
  },
  forest: {
    primary: 'oklch(0.35 0.12 150)',
    secondary: 'oklch(0.95 0.05 150)',
    accent: 'oklch(0.9 0.1 120)',
    background: 'oklch(0.98 0.02 150)', // Very light green tint
    foreground: 'oklch(0.15 0.05 150)',
  },
  purple: {
    primary: 'oklch(0.45 0.18 290)',
    secondary: 'oklch(0.96 0.04 290)',
    accent: 'oklch(0.9 0.1 300)',
    background: 'oklch(0.99 0.01 290)', // Very light purple tint
    foreground: 'oklch(0.15 0.05 290)',
  },
}

export function applyTheme(mode: ThemeMode, customTheme?: CustomTheme) {
  const root = document.documentElement
  
  root.style.removeProperty('--primary')
  root.style.removeProperty('--secondary')
  root.style.removeProperty('--accent')
  root.style.removeProperty('--background')
  root.style.removeProperty('--foreground')

  if (mode === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light') // Ensure light class is removed
  } else if (mode === 'light') {
    root.classList.remove('dark')
    root.classList.add('light')
  } else {
    // Custom mode
    root.classList.remove('dark')
    root.classList.remove('light')
  }

  if (mode === 'custom' && customTheme) {
    root.style.setProperty('--primary', customTheme.primary)
    root.style.setProperty('--secondary', customTheme.secondary)
    root.style.setProperty('--accent', customTheme.accent)
    root.style.setProperty('--background', customTheme.background)
    root.style.setProperty('--foreground', customTheme.foreground)
  }

  localStorage.setItem('theme-mode', mode)
  if (customTheme && mode === 'custom') {
    localStorage.setItem('custom-theme', JSON.stringify(customTheme))
  }
}

export function getStoredTheme(): { mode: ThemeMode; customTheme?: CustomTheme } {
  if (typeof window === 'undefined') return { mode: 'light' }
  
  const mode = (localStorage.getItem('theme-mode') as ThemeMode) || 'light'
  const customThemeStr = localStorage.getItem('custom-theme')
  const customTheme = customThemeStr ? JSON.parse(customThemeStr) : undefined
  
  return { mode, customTheme }
}
