"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export default function DealDetail({ params }: { params: { id: string } }) {
  const [currentTab, setCurrentTab] = useState("overview")

  const dealData = {
    id: params.id,
    trxId: "TRX-20250115-0847",
    client: "Import/Export SA",
    status: "En Validation",
    created: "2025-01-15 14:30",

    swift: {
      number: "SWIFT-TRX-0847",
      date: "2025-01-15",
      time: "14:32:45",
      senderBic: "DEUXDEDD",
      receiverBic: "BMCEMAMC",
      amount: "12500",
      currency: "EUR",
      converted: "141000",
      senderIban: "DE75512108001234567890",
      receiverIban: "MA6400746000000123456789",
      reference: "INV-2025-0847",
      purpose: "Rapatriement recettes exportation",
    },

    compliance: [
      { check: "IGOC Conformité", status: "ok", message: "Montant conforme aux plafonds" },
      { check: "Délai Rapatriement", status: "ok", message: "Délai OC respecté (D+0)" },
      { check: "Quota 70%/30%", status: "warning", message: "À vérifier engagement client" },
      { check: "KYC Client", status: "ok", message: "Données à jour" },
      { check: "AML/LCB/FT", status: "ok", message: "Pas d'alerte détectée" },
      { check: "Documents", status: "alert", message: "Contrat commercial manquant" },
      { check: "IBAN Validation", status: "ok", message: "VOP confirmée" },
      { check: "Historique", status: "ok", message: "Aucune anomalie précédente" },
    ],

    validations: [
      { step: "Client", status: "validé", user: "contact@import-export.ma", time: "14:45" },
      { step: "Conformité", status: "en cours", user: "compliance@direct-devise.ma", time: "-" },
      { step: "Finance", status: "attente", user: "-", time: "-" },
      { step: "Banque", status: "attente", user: "-", time: "-" },
    ],

    timeline: [
      { action: "Demande reçue", time: "14:30", status: "done", user: "Système" },
      { action: "SWIFT analysé", time: "14:32", status: "done", user: "IA OCR" },
      { action: "Client notifié", time: "14:35", status: "done", user: "Email/WhatsApp" },
      { action: "Validation client", time: "14:45", status: "done", user: "Import/Export SA" },
      { action: "Analyse conformité", time: "15:00", status: "in_progress", user: "Compliance Team" },
      { action: "Validation finance", time: "-", status: "pending", user: "Finance" },
      { action: "Sélection taux", time: "-", status: "pending", user: "Systèmme Auto" },
      { action: "Exécution", time: "-", status: "pending", user: "Banque" },
    ],
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-6 mb-8">
        <div className="container mx-auto">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">{dealData.client}</h1>
              <p className="text-primary-foreground/80 mt-1">{dealData.trxId}</p>
            </div>
            <Badge className="bg-accent">En Validation</Badge>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 pb-8">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Aperçu</TabsTrigger>
            <TabsTrigger value="swift">Détails SWIFT</TabsTrigger>
            <TabsTrigger value="compliance">Conformité</TabsTrigger>
            <TabsTrigger value="timeline">Historique</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Montant de la Demande</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">
                    {dealData.swift.currency} {dealData.swift.amount}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">Équivalent: MAD {dealData.swift.converted}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Dates Clés</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Demande reçue</p>
                    <p className="font-mono">{dealData.created}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Limite validation</p>
                    <p className="font-mono">2025-01-15 16:30</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Validation Steps */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Étapes de Validation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dealData.validations.map((val) => (
                    <div key={val.step} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{val.step}</p>
                        <p className="text-xs text-muted-foreground">{val.user}</p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            val.status === "validé" ? "default" : val.status === "en cours" ? "secondary" : "outline"
                          }
                        >
                          {val.status}
                        </Badge>
                        {val.time !== "-" && <p className="text-xs text-muted-foreground mt-1">{val.time}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SWIFT Details */}
          <TabsContent value="swift">
            <Card>
              <CardHeader>
                <CardTitle>Données SWIFT Extraites</CardTitle>
                <CardDescription>Message type MT103 analysé et validé</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Numéro SWIFT</p>
                    <p className="font-mono font-bold">{dealData.swift.number}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Date/Heure</p>
                    <p className="font-mono text-sm">
                      {dealData.swift.date} {dealData.swift.time}
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Référence</p>
                    <p className="font-mono font-bold">{dealData.swift.reference}</p>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">BIC Expéditeur</p>
                    <p className="font-mono">{dealData.swift.senderBic}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">BIC Récepteur</p>
                    <p className="font-mono">{dealData.swift.receiverBic}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Motif</p>
                    <p className="text-sm">{dealData.swift.purpose}</p>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">IBAN Émetteur</p>
                    <p className="font-mono text-xs">{dealData.swift.senderIban}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">IBAN Bénéficiaire</p>
                    <p className="font-mono text-xs">{dealData.swift.receiverIban}</p>
                  </div>
                  <div className="p-4 bg-primary/10 border border-primary rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Montant Brut</p>
                    <p className="font-bold text-primary">
                      {dealData.swift.currency} {dealData.swift.amount}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-bold mb-4">Conversion Proposée</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Montant Initial</p>
                      <p className="font-bold text-lg">
                        {dealData.swift.currency} {dealData.swift.amount}
                      </p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Taux</p>
                      <p className="font-bold text-lg">11.28</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Commission</p>
                      <p className="font-bold text-lg">MAD 705</p>
                    </div>
                    <div className="p-4 bg-accent/10 border border-accent rounded-lg">
                      <p className="text-xs text-muted-foreground">Net à Créditer</p>
                      <p className="font-bold text-lg text-accent">MAD {dealData.swift.converted}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance */}
          <TabsContent value="compliance">
            <Card>
              <CardHeader>
                <CardTitle>Vérifications de Conformité</CardTitle>
                <CardDescription>Audit complet IGOC, BAM, CNDP</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {dealData.compliance.map((check) => (
                  <div key={check.check} className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{check.check}</p>
                      <p className="text-xs text-muted-foreground mt-1">{check.message}</p>
                    </div>
                    <Badge
                      variant={
                        check.status === "ok" ? "default" : check.status === "warning" ? "secondary" : "destructive"
                      }
                      className="whitespace-nowrap"
                    >
                      {check.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timeline */}
          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>Historique de la Transaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dealData.timeline.map((event, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-4 h-4 rounded-full border-2 ${
                            event.status === "done"
                              ? "bg-accent border-accent"
                              : event.status === "in_progress"
                                ? "bg-primary border-primary"
                                : "bg-muted border-border"
                          }`}
                        ></div>
                        {idx < dealData.timeline.length - 1 && (
                          <div className={`w-0.5 h-12 ${event.status === "done" ? "bg-accent" : "bg-border"}`}></div>
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="font-medium">{event.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.user} • {event.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          <Button className="flex-1" size="lg">
            Approuver & Envoyer aux Banques
          </Button>
          <Button variant="outline" size="lg">
            Demander Complément
          </Button>
          <Button variant="destructive" size="lg">
            Rejeter la Demande
          </Button>
        </div>
      </main>
    </div>
  )
}
