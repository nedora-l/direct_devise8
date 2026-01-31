"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail, MessageCircle, Copy } from "lucide-react"
import { useState } from "react"

interface NotificationTemplatesProps {
  offer: {
    bank: string
    amount: number
    currency: string
    rate: number
    validationLink: string
  }
  companyName: string
  contactName: string
}

export function NotificationTemplates({ offer, companyName, contactName }: NotificationTemplatesProps) {
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null)

  const whatsappMessage = `Bonjour ${contactName},

DIRECT DEVISE vous propose une excellente offre de change :

📊 **Détails de l'opération:**
• Montant: ${offer.amount.toLocaleString()} ${offer.currency}
• Banque: ${offer.bank}
• Taux proposé: ${offer.rate.toFixed(4)} MAD/${offer.currency}
• Montant net estimé: ${(offer.amount * offer.rate * 0.985).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD

✅ Validez cette offre directement sur notre plateforme:
${offer.validationLink}

⏰ Statut: Actif et prêt à être validé (aucun délai limité)

Pour toute question, contactez-nous directement.

Cordialement,
DIRECT DEVISE - Plateforme de Change Fintech`

  const emailSubject = `Nouvelle offre de taux de change - ${offer.amount.toLocaleString()} ${offer.currency}`

  const emailBody = `Bonjour ${contactName},

Nous vous proposons une excellente offre de taux de change pour votre opération.

═════════════════════════════════════════════════════════════

📋 DÉTAILS DE L'OFFRE DE CHANGE

Banque partenaire: ${offer.bank}
Montant initial: ${offer.amount.toLocaleString()} ${offer.currency}
Taux de change proposé: ${offer.rate.toFixed(4)} MAD/${offer.currency}

═════════════════════════════════════════════════════════════

💰 CALCUL DÉTAILLÉ

Montant à convertir: ${offer.amount.toLocaleString()} ${offer.currency}
Taux appliqué: ${offer.rate.toFixed(4)} MAD/${offer.currency}
Montant brut en MAD: ${(offer.amount * offer.rate).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD

Commission DIRECT DEVISE (1.5%): -${(offer.amount * offer.rate * 0.015).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD
═════════════════════════════════════════════════════════════
MONTANT NET À RECEVOIR: ${(offer.amount * offer.rate * 0.985).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD
═════════════════════════════════════════════════════════════

✅ ACTIONS REQUISES

1. Consultez l'offre sur notre plateforme: ${offer.validationLink}
2. Vérifiez les détails de l'opération
3. Validez l'offre en ligne (aucun délai limité, prenez le temps d'examiner)
4. Nous transmettrons votre validation à ${offer.bank} pour exécution

⏱️ DÉLAI DE TRAITEMENT

Une fois validée, votre opération sera exécutée dans les 2-4 heures bancaires suivantes.
La virement en Dirhams sera effectué sur votre compte MAD agréé.

📞 SUPPORT

Pour toute question ou clarification:
• Email: support@directdevise.ma
• WhatsApp: +212 6XX XXX XXX
• Plateforme: Via votre tableau de bord

🔒 CONFORMITÉ

Cette opération respecte l'intégralité des exigences réglementaires marocaines:
• Instruction Générale des Opérations de Change (IGOC)
• Normes de Bank Al-Maghrib (BAM)
• Protection des données personnelles (CNDP)

Cordialement,
L'équipe DIRECT DEVISE
Plateforme Fintech de Change agréée`

  const handleCopy = (text: string, template: string) => {
    navigator.clipboard.writeText(text)
    setCopiedTemplate(template)
    setTimeout(() => setCopiedTemplate(null), 2000)
  }

  return (
    <div className="space-y-4">
      {/* WhatsApp Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-500" />
            Message WhatsApp
          </CardTitle>
          <CardDescription>Template de notification WhatsApp à envoyer au client</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <p className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">{whatsappMessage}</p>
          </div>
          <Button
            onClick={() => handleCopy(whatsappMessage, "whatsapp")}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <Copy className="w-4 h-4 mr-2" />
            {copiedTemplate === "whatsapp" ? "Copié !" : "Copier le message"}
          </Button>
        </CardContent>
      </Card>

      {/* Email Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-500" />
            Email de Notification
          </CardTitle>
          <CardDescription>Template d'email à envoyer au client</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Objet:</p>
              <p className="text-sm font-semibold text-foreground">{emailSubject}</p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">{emailBody}</p>
            </div>
          </div>

          <Button onClick={() => handleCopy(emailBody, "email")} variant="outline" className="w-full" size="sm">
            <Copy className="w-4 h-4 mr-2" />
            {copiedTemplate === "email" ? "Copié !" : "Copier le contenu de l'email"}
          </Button>
        </CardContent>
      </Card>

      {/* Email Template avec Sujet */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Email Complet (Sujet + Contenu)</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => handleCopy(`Sujet: ${emailSubject}\n\n${emailBody}`, "full-email")}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <Copy className="w-4 h-4 mr-2" />
            {copiedTemplate === "full-email" ? "Copié !" : "Copier l'email complet"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
