"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function ConformityMonitor() {
  const operations = [
    {
      id: "OP-001",
      client: "Import/Export SA",
      checks: [
        { name: "IGOC", status: "ok" },
        { name: "70%/30%", status: "ok" },
        { name: "SWIFT", status: "ok" },
        { name: "KYC", status: "ok" },
        { name: "Documents", status: "ok" },
      ],
      score: 100,
    },
    {
      id: "OP-002",
      client: "Tech Solutions",
      checks: [
        { name: "IGOC", status: "ok" },
        { name: "70%/30%", status: "warning" },
        { name: "SWIFT", status: "ok" },
        { name: "KYC", status: "ok" },
        { name: "Documents", status: "alert" },
      ],
      score: 72,
    },
    {
      id: "OP-003",
      client: "Services Consulting",
      checks: [
        { name: "IGOC", status: "ok" },
        { name: "70%/30%", status: "ok" },
        { name: "SWIFT", status: "alert" },
        { name: "KYC", status: "ok" },
        { name: "Documents", status: "ok" },
      ],
      score: 80,
    },
  ]

  return (
    <div className="space-y-4">
      {operations.map((op) => (
        <Card key={op.id}>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold">{op.client}</h3>
                <p className="text-xs text-muted-foreground">{op.id}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{op.score}%</p>
                <p className="text-xs text-muted-foreground">Score conformité</p>
              </div>
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
              {op.checks.map((check) => (
                <Badge
                  key={check.name}
                  variant={check.status === "ok" ? "default" : check.status === "warning" ? "secondary" : "destructive"}
                >
                  {check.name}
                </Badge>
              ))}
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                Détails
              </Button>
              <Button size="sm" variant="outline" className="ml-auto bg-transparent">
                Générer Rapport
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
