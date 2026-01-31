"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Globe } from 'lucide-react'
import { useI18n } from "@/lib/i18n-context"

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()

  const languages = {
    fr: 'Français',
    en: 'English',
    ar: 'العربية',
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 font-medium">
          <Globe className="h-4 w-4" />
          {locale.toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLocale('fr')}>
          {languages.fr} (FR)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocale('en')}>
          {languages.en} (EN)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocale('ar')}>
          {languages.ar} (AR)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
