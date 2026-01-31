import { NextRequest, NextResponse } from "next/server"
import { getPrisma } from "@/lib/db"
export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma()
    
    // Get all active auctions with company and KYC info
    // Inclure TOUS les SWIFT validés pour pouvoir matcher avec swiftReference
    const auctions = await prisma.auction.findMany({
      where: { status: "active" },
      include: {
        company: {
          include: {
            kyc: true,
            swifts: {
              where: { validated: true },
              // Ne pas limiter à 1, on a besoin de tous pour matcher avec swiftReference
            },
          },
        },
        bids: true,
      },
      orderBy: { createdAt: "desc" },
    })

    // Filter auctions where KYC is approved
    // Si l'enchère a un swiftReference, vérifier que le SWIFT correspondant existe et est validé
    // Sinon, juste vérifier que le KYC est approuvé (pour les enchères créées sans SWIFT)
    const validAuctions = auctions.filter(a => {
      const kyc = a.company.kyc
      if (kyc?.complianceStatus !== "approved") return false
      
      // Si l'enchère a un swiftReference, vérifier que le SWIFT correspondant existe et est validé
      if (a.swiftReference) {
        const matchingSwift = a.company.swifts.find(s => s.reference === a.swiftReference)
        return matchingSwift?.validated === true
      }
      
      // Si pas de swiftReference, accepter si KYC approuvé (enchère créée directement)
      return true
    })

    return NextResponse.json({ auctions: validAuctions })
  } catch (error) {
    console.error("[auctions/all] Error:", error)
    return NextResponse.json({ auctions: [] }, { status: 200 })
  }
}






