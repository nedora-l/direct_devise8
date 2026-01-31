"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, FileText, TrendingUp, Zap } from "lucide-react"

interface Swift {
  id: string
  reference: string
  amount: number
  currency: string
  validated: boolean
  validatedAt: string | null
  adminStatus: string
  createdAt: string
  rateStrategy?: string | null
  targetRate?: number | null
  targetCurrency?: string | null
  rateTriggeredAt?: string | null
}

interface RecentSwiftsProps {
  swifts: Swift[]
}

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n)
}

export default function RecentSwifts({ swifts }: RecentSwiftsProps) {
  const recentSwifts = swifts
    .filter(s => s.validated && s.adminStatus === "approved")
    .slice(0, 3)

  if (recentSwifts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Derniers SWIFT validés
          </CardTitle>
          <CardDescription>Aucun SWIFT validé pour le moment</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Derniers SWIFT validés
            </CardTitle>
            <CardDescription>{recentSwifts.length} SWIFT récent(s)</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/pme/validations">
              Voir tout
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentSwifts.map((swift) => (
            <div
              key={swift.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm">
                    {swift.currency.toUpperCase()} {fmt(swift.amount)}
                  </p>
                  <Badge variant="outline" className="bg-green-600/10 text-green-700 dark:text-green-400 border-green-600 dark:border-green-500">
                    Validé
                  </Badge>
                </div>
                <p className="text-xs text-foreground/70 dark:text-foreground/80 font-mono">
                  {swift.reference}
                </p>
                {swift.validatedAt && (
                  <p className="text-xs text-foreground/60 dark:text-foreground/70 mt-1">
                    {new Date(swift.validatedAt).toLocaleDateString("fr-FR")}
                  </p>
                )}
                {swift.rateStrategy === "spotting" && (
                  <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-1 mb-1">
                      <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
                      <span className="text-xs font-medium text-green-700 dark:text-green-400">Spotting actif</span>
                    </div>
                    {swift.targetRate && swift.targetCurrency && (
                      <p className="text-xs text-green-700 dark:text-green-400">
                        Taux cible: {swift.targetRate} {swift.targetCurrency}
                      </p>
                    )}
                    {swift.rateTriggeredAt && (
                      <p className="text-xs text-green-600 dark:text-green-500 font-medium mt-1">
                        ✓ Taux atteint
                      </p>
                    )}
                  </div>
                )}
                {swift.rateStrategy === "auction" && !swift.rateTriggeredAt && (
                  <div className="mt-2 flex items-center gap-1">
                    <Zap className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs text-blue-700 dark:text-blue-400">Enchère directe</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}






