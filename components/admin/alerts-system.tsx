"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function AlertsSystem() {
  const alerts = [
    {
      id: "ALT-001",
      type: "Dépassement Plafond",
      severity: "high",
      message: "Opération OP-005 dépasse le plafond IGOC",
      time: "Il y a 5 min",
      client: "Export Services",
    },
    {
      id: "ALT-002",
      type: "Documents Manquants",
      severity: "medium",
      message: "Contrat commercial manquant pour OP-004",
      time: "Il y a 15 min",
      client: "Tech Solutions",
    },
    {
      id: "ALT-003",
      type: "Vérification KYC",
      severity: "medium",
      message: "KYC expirant bientôt pour client AB123",
      time: "Il y a 2h",
      client: "Import/Export SA",
    },
    {
      id: "ALT-004",
      type: "Délai SWIFT",
      severity: "low",
      message: "SWIFT reçu avec 12h de retard",
      time: "Il y a 4h",
      client: "Services Consulting",
    },
    {
      id: "ALT-005",
      type: "Anomalie Taux",
      severity: "medium",
      message: "Taux appliqué hors fourchette normale",
      time: "Hier",
      client: "Premium Trade Ltd",
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-4">
        <Badge variant="outline">Total: {alerts.length}</Badge>
        <Badge variant="secondary">Critiques: {alerts.filter((a) => a.severity === "high").length}</Badge>
        <Badge variant="secondary">À traiter: {alerts.filter((a) => a.severity !== "low").length}</Badge>
      </div>

      {alerts.map((alert) => (
        <Card
          key={alert.id}
          className={
            alert.severity === "high"
              ? "border-destructive"
              : alert.severity === "medium"
                ? "border-yellow-400"
                : "border-border"
          }
        >
          <CardContent className="pt-6">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex gap-2 items-center mb-1">
                  <h3 className="font-bold">{alert.type}</h3>
                  <Badge variant={alert.severity === "high" ? "destructive" : "secondary"}>{alert.severity}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{alert.message}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {alert.client} • {alert.time}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
