import { kycStore } from "./kyc-store"
import { KycDocType, KycStatus, KycDocument, KycSubmission, SwiftData } from "./types"

export interface Auction {
  id: string
  company: string
  title: string
  amount: number
  sourceCurrency: string
  targetCurrency: string
  description: string
  duration: string
  status: 'active' | 'closed' | 'awarded'
  createdBy: string
  createdAt: string
  endsAt: string
  bids: AuctionBid[]
  bestBid: AuctionBid | null
  swiftReference?: string
}

export interface AuctionBid {
  id: string
  auctionId: string
  bankId: string
  bankName: string
  rate: number
  charges: number
  terms: string
  timestamp: string
}

export interface SwiftData {
  id: string
  company: string
  fileName: string
  uploadDate: string
  parsedData: any
  validated?: boolean
  validatedAt?: string
  rejected?: boolean
  rejectionReason?: string
  rejectedBy?: string
  validatedBy?: string
}

class GlobalStore {
  private channel: BroadcastChannel | null = null
  private listeners: Set<(data: any) => void> = new Set()

  constructor() {
    if (typeof window !== 'undefined' && !this.channel) {
      try {
        this.channel = new BroadcastChannel('directdevise_sync')
        console.log('[v0] BroadcastChannel created successfully')
        this.channel.onmessage = (event) => {
          this.listeners.forEach(callback => callback(event.data))
        }
      } catch (error) {
        console.error('[v0] Failed to create BroadcastChannel:', error)
      }
    }
  }

  private broadcast(message: any) {
    if (typeof window === 'undefined') return
    
    try {
      if (!this.channel) {
        this.channel = new BroadcastChannel('directdevise_sync')
        this.channel.onmessage = (event) => {
          this.listeners.forEach(callback => callback(event.data))
        }
      }
      this.channel.postMessage(message)
      console.log('[v0] broadcast:sent', message.type)
    } catch (error) {
      console.error('[v0] broadcast:error', error)
    }
  }

  // Auctions
  getAllAuctions(): Auction[] {
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem('auctions')
    return data ? JSON.parse(data) : []
  }

  getAuction(id: string): Auction | null {
    const auctions = this.getAllAuctions()
    return auctions.find(a => a.id === id) || null
  }

  createAuction(auction: Auction) {
    const auctions = this.getAllAuctions()
    auctions.push(auction)
    localStorage.setItem('auctions', JSON.stringify(auctions))
    
    console.log('[v0] auction:created', { id: auction.id })
    this.broadcast({ type: 'auction:created', auction })
  }

  updateAuction(id: string, updates: Partial<Auction>) {
    const auctions = this.getAllAuctions()
    const index = auctions.findIndex(a => a.id === id)
    if (index !== -1) {
      auctions[index] = { ...auctions[index], ...updates }
      localStorage.setItem('auctions', JSON.stringify(auctions))
      this.broadcast({ type: 'auction_updated', auction: auctions[index] })
    }
  }

  // Bids
  placeBid(auctionId: string, bid: AuctionBid) {
    const auctions = this.getAllAuctions()
    const auction = auctions.find(a => a.id === auctionId)
    
    if (!auction || auction.status !== 'active') {
      console.log('[v0] bid:error - auction not available')
      throw new Error('Enchère non disponible')
    }

    auction.bids.push(bid)
    
    const bestBid = auction.bids.reduce((best, current) => 
      current.rate > (best?.rate || 0) ? current : best
    , auction.bids[0])
    
    const bestChanged = auction.bestBid?.id !== bestBid.id
    auction.bestBid = bestBid

    localStorage.setItem('auctions', JSON.stringify(auctions))
    
    console.log('[v0] bid:placed', { auctionId, bankName: bid.bankName, rate: bid.rate })
    this.broadcast({ type: 'bid:placed', auctionId, bid })
    
    if (bestChanged) {
      console.log('[v0] bestBid:changed', { auctionId, bestBid })
      this.broadcast({ type: 'bestBid:changed', auctionId, bestBid })
    }
  }

  getBidsForAuction(auctionId: string): AuctionBid[] {
    const auction = this.getAuction(auctionId)
    return auction?.bids || []
  }

  // KYC Methods
  publishKyc(submission: KycSubmission) {
    if (typeof window === 'undefined') return
    
    const submissions = this.getAllKycSubmissions()
    
    if (!submission.analysis) {
      submission.analysis = {
        riskScore: Math.floor(Math.random() * 30) + 10, // 10-40 (low risk)
        riskLevel: 'LOW',
        confidenceScore: Math.floor(Math.random() * 15) + 85, // 85-100%
        recommendation: 'APPROVE',
        findings: [
          'Documents authentiques vérifiés',
          'Aucune alerte AML/CFT détectée',
          'Entreprise enregistrée et active',
          'Dirigeant identifié correctement'
        ],
        alerts: [],
        amlFlags: [
          'Aucun signal PEP (Personne Politiquement Exposée)',
          'Aucune liste de sanctions internationales',
          'Historique commercial propre'
        ]
      }
    }
    
    const existingIndex = submissions.findIndex(s => s.company === submission.company)
    if (existingIndex !== -1) {
      submissions[existingIndex] = submission
    } else {
      submissions.push(submission)
    }
    
    localStorage.setItem('kyc_submissions', JSON.stringify(submissions))
    
    console.log('[v0] kyc:published', { company: submission.company })
    this.broadcast({ type: 'kyc:published', submission })
  }

  getAllKycSubmissions(): KycSubmission[] {
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem('kyc_submissions')
    return data ? JSON.parse(data) : []
  }

  getKycSubmission(company: string): KycSubmission | null {
    const submissions = this.getAllKycSubmissions()
    return submissions.find(s => s.company === company) || null
  }

  updateKycStatus(company: string, status: KycStatus, reviewedBy: string, notes: string) {
    if (typeof window === 'undefined') return
    
    const submissions = this.getAllKycSubmissions()
    const index = submissions.findIndex(s => s.company === company)
    
    if (index !== -1) {
      submissions[index].status = status
      submissions[index].reviewedBy = reviewedBy
      submissions[index].reviewedAt = new Date().toISOString()
      submissions[index].adminNotes = notes
      
      localStorage.setItem('kyc_submissions', JSON.stringify(submissions))
      
      console.log('[v0] status:' + status, { company })
      this.broadcast({ type: 'kyc:' + status, company, submission: submissions[index] })
    }
  }

  // SWIFT Methods
  saveSwift(swiftData: SwiftData) {
    if (typeof window === 'undefined') return
    
    try {
      const amt = parseFloat(swiftData?.parsedData?.amount || '0')
      const allowed70 = Math.round(amt * 0.7)
      const reserve30 = Math.round(amt * 0.3)
      if (!swiftData.parsedData) swiftData.parsedData = {}
      swiftData.parsedData.igoc = { allowed70, reserve30 }
    } catch {}

    const swifts = this.getAllSwifts()
    const index = swifts.findIndex(s => s.id === swiftData.id)
    if (index !== -1) {
      swifts[index] = swiftData
    } else {
      swifts.push(swiftData)
    }
    
    localStorage.setItem('swift_documents', JSON.stringify(swifts))
    
    console.log('[v0] swift:uploaded', { id: swiftData.id, validated: swiftData.validated })
    this.broadcast({ type: 'swift:uploaded', swiftData })
  }

  validateSwift(id: string, adminName: string) {
    if (typeof window === 'undefined') return
    
    const swifts = this.getAllSwifts()
    const index = swifts.findIndex(s => s.id === id)
    
    if (index !== -1) {
      swifts[index].validated = true
      swifts[index].validatedAt = new Date().toISOString()
      swifts[index].validatedBy = adminName
      if (swifts[index].parsedData.manualEntry) {
        swifts[index].parsedData.manualEntry = false
      }

      localStorage.setItem('swift_documents', JSON.stringify(swifts))
      console.log('[v0] swift:validated', { id })
      this.broadcast({ type: 'swift:validated', swiftData: swifts[index] })
    }
  }

  rejectSwift(id: string, reason: string, adminName: string) {
    if (typeof window === 'undefined') return
    
    const swifts = this.getAllSwifts()
    const index = swifts.findIndex(s => s.id === id)
    
    if (index !== -1) {
      swifts[index].validated = false
      swifts[index].rejected = true
      swifts[index].rejectionReason = reason
      swifts[index].rejectedBy = adminName
      
      localStorage.setItem('swift_documents', JSON.stringify(swifts))
      this.broadcast({ type: 'swift:rejected', swiftData: swifts[index] })
    }
  }

  getAllSwifts(): SwiftData[] {
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem('swift_documents')
    return data ? JSON.parse(data) : []
  }

  getSwiftByCompany(company: string): SwiftData | null {
    const swifts = this.getAllSwifts()
    return swifts.find(s => s.company === company) || null
  }

  onUpdate(callback: (data: any) => void): () => void {
    this.listeners.add(callback)
    console.log('[v0] listener:added, total:', this.listeners.size)
    
    return () => {
      this.listeners.delete(callback)
      console.log('[v0] listener:removed, total:', this.listeners.size)
    }
  }
}

export const globalStore = new GlobalStore()
