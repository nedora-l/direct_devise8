"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, TrendingUp, Shield, Building2 } from 'lucide-react'
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { useI18n } from "@/lib/i18n-context"

export default function Home() {
  const { t } = useI18n()

  return (
    <main className="min-h-screen relative overflow-hidden">
      <nav className="relative z-10 container mx-auto px-4 sm:px-6 py-6 sm:py-8 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground font-serif font-bold text-lg sm:text-xl italic">D</span>
          </div>
          <span className="text-lg sm:text-xl font-serif font-bold tracking-tight">Direct Devise</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <LanguageSwitcher />
          <ThemeSwitcher />
          <Link href="/fichiers-de-test" className="text-xs sm:text-sm font-medium hover:text-primary/70 transition-colors">
            Fichiers de test
          </Link>
          <Link href="/login" className="text-xs sm:text-sm font-medium hover:text-primary/70 transition-colors">
            {t('nav.login')}
          </Link>
          <Link href="/register">
            <Button size="sm" className="rounded-full px-4 sm:px-6 font-medium text-xs sm:text-sm h-9 sm:h-10">
              {t('nav.register')}
            </Button>
          </Link>
        </div>
      </nav>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-20 sm:pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-secondary/70 backdrop-blur-sm border border-border text-xs sm:text-sm font-medium mb-6 sm:mb-8 animate-fade-in-up">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 animate-pulse"></span>
          {t('landing.badge')}
        </div>
        
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-serif font-medium tracking-tight mb-6 sm:mb-8 leading-[1.1]">
          {t('landing.hero.title')} <br />
          <span className="italic text-muted-foreground">{t('landing.hero.subtitle')}</span>
        </h1>
        
        <p className="text-base sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-12 font-light leading-relaxed px-4">
          {t('landing.hero.description')}
          <br className="hidden sm:block" />
          {t('landing.hero.description2')}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
          <Link href="/register" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 rounded-full text-base sm:text-lg font-medium shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
              {t('landing.cta.register')}
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 rounded-full text-base sm:text-lg backdrop-blur-sm">
              {t('landing.cta.login')}
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 pb-20 sm:pb-32">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Card 1 */}
          <div className="group p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-card/90 backdrop-blur-md border border-border/60 shadow-sm hover:shadow-lg hover:border-primary/20 transition-all duration-500 hover:-translate-y-1">
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-primary/10 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-500">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <h3 className="text-xl sm:text-2xl font-serif mb-2 sm:mb-3 font-medium">{t('landing.feature1.title')}</h3>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {t('landing.feature1.desc')}
            </p>
          </div>

          {/* Card 2 */}
          <div className="group p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-card/90 backdrop-blur-md border border-border/60 shadow-sm hover:shadow-lg hover:border-primary/20 transition-all duration-500 hover:-translate-y-1">
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-primary/10 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-500">
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <h3 className="text-xl sm:text-2xl font-serif mb-2 sm:mb-3 font-medium">{t('landing.feature2.title')}</h3>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {t('landing.feature2.desc')}
            </p>
          </div>

          {/* Card 3 */}
          <div className="group p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-card/90 backdrop-blur-md border border-border/60 shadow-sm hover:shadow-lg hover:border-primary/20 transition-all duration-500 hover:-translate-y-1 sm:col-span-2 lg:col-span-1">
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-primary/10 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-500">
              <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <h3 className="text-xl sm:text-2xl font-serif mb-2 sm:mb-3 font-medium">{t('landing.feature3.title')}</h3>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {t('landing.feature3.desc')}
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
