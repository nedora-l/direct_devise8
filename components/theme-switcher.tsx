'use client'

import { useTheme } from '@/app/providers'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Moon, Sun, Palette } from 'lucide-react'
import { useState } from 'react'

export function ThemeSwitcher() {
  const { mode, setTheme, presetThemes } = useTheme()
  const [showColorPicker, setShowColorPicker] = useState(false)

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10"
            title="Theme"
          >
            {mode === 'dark' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme('light')}>
            <Sun className="w-4 h-4 mr-2" />
            Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>
            <Moon className="w-4 h-4 mr-2" />
            Dark
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {Object.entries(presetThemes).map(([name, theme]) => (
            <DropdownMenuItem
              key={name}
              onClick={() => setTheme('custom', theme)}
              className="capitalize"
            >
              <Palette className="w-4 h-4 mr-2" />
              {name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
