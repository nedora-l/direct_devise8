import type { ReverseAuction, BankBid, ConformityCheck } from "./types"
import { storageManager } from "./storage-utils"
import { audit } from "./audit-logger"
import { ConformityChecker } from "./conformity-checker"

export class AuctionManager {
  private auctions: Map<string, ReverseAuction> = new Map()

  constructor() {
    this.loadAuctions()
  }

  /**
   * Create a new reverse auction
   */
  createAuction(
    createdBy: string,
    description: string,
    amount: number,
    currency: string,
    exchangeCurrency: string,
    minRate: number,
    maxRate: number,
    durationHours: number = 24
  ): ReverseAuction {
    const auction: ReverseAuction = {
      id: `AUC-${Date.now()}`,
      createdBy,
      status: "draft",
      description,
      amount,
      currency,
      exchangeCurrency,
      minRate,
      maxRate,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString(),
      participants: [],
      conformityChecks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.auctions.set(auction.id, auction)
    this.saveAuctions()

    audit(createdBy, "admin", "AUCTION_CREATED", "auction", auction.id, {
      amount,
      currency,
      exchangeCurrency,
    })

    return auction
  }

  /**
   * Open auction for bidding
   */
  openAuction(auctionId: string, adminId: string): ReverseAuction | null {
    const auction = this.auctions.get(auctionId)
    if (!auction) return null

    auction.status = "open"
    auction.openingDate = new Date().toISOString()
    auction.updatedAt = new Date().toISOString()

    this.auctions.set(auctionId, auction)
    this.saveAuctions()

    audit(adminId, "admin", "AUCTION_OPENED", "auction", auctionId, {
      endDate: auction.endDate,
    })

    return auction
  }

  /**
   * Place a bid on auction
   */
  placeBid(auctionId: string, bankId: string, bankName: string, rate: number, charges: number, terms: string): BankBid | null {
    const auction = this.auctions.get(auctionId)
    if (!auction) return null
    if (auction.status !== "open") return null

    // Validate rate is within bounds
    if (rate < auction.minRate || rate > auction.maxRate) {
      return null
    }

    const bid: BankBid = {
      id: `BID-${Date.now()}`,
      auctionId,
      bankId,
      bankName,
      rate,
      charges,
      terms,
      timestamp: new Date().toISOString(),
      status: "pending",
    }

    auction.participants.push(bid)
    auction.updatedAt = new Date().toISOString()
    this.auctions.set(auctionId, auction)
    this.saveAuctions()

    audit(bankId, "bank", "BID_PLACED", "auction_bid", bid.id, {
      auctionId,
      rate,
      charges,
    })

    return bid
  }

  /**
   * Close auction and select winner
   */
  closeAuction(auctionId: string, adminId: string): ReverseAuction | null {
    const auction = this.auctions.get(auctionId)
    if (!auction) return null

    auction.status = "closed"
    auction.closingDate = new Date().toISOString()

    // Find best bid (lowest rate)
    if (auction.participants.length > 0) {
      const bestBid = auction.participants.reduce((best, bid) =>
        bid.rate < best.rate ? bid : best
      )

      auction.awardedBankId = bestBid.bankId
      auction.awardedRate = bestBid.rate
      auction.status = "awarded"

      bestBid.status = "accepted"
      audit(adminId, "admin", "AUCTION_AWARDED", "auction", auctionId, {
        winningBank: bestBid.bankName,
        rate: bestBid.rate,
      })
    }

    auction.updatedAt = new Date().toISOString()
    this.auctions.set(auctionId, auction)
    this.saveAuctions()

    return auction
  }

  /**
   * Get auction
   */
  getAuction(auctionId: string): ReverseAuction | null {
    return this.auctions.get(auctionId) || null
  }

  /**
   * Get all auctions
   */
  getAllAuctions(status?: ReverseAuction["status"]): ReverseAuction[] {
    const all = Array.from(this.auctions.values())
    return status ? all.filter((a) => a.status === status) : all
  }

  /**
   * Get best bid for auction
   */
  getBestBid(auctionId: string): BankBid | null {
    const auction = this.auctions.get(auctionId)
    if (!auction || auction.participants.length === 0) return null

    return auction.participants.reduce((best, bid) => (bid.rate < best.rate ? bid : best))
  }

  /**
   * Get auction statistics
   */
  getStats() {
    const all = Array.from(this.auctions.values())
    return {
      total: all.length,
      open: all.filter((a) => a.status === "open").length,
      closed: all.filter((a) => a.status === "closed").length,
      awarded: all.filter((a) => a.status === "awarded").length,
      totalBids: all.reduce((sum, a) => sum + a.participants.length, 0),
      averageParticipants: all.length > 0 ? all.reduce((sum, a) => sum + a.participants.length, 0) / all.length : 0,
    }
  }

  private saveAuctions(): void {
    const data = Array.from(this.auctions.values())
    storageManager.set("auctions", data)
  }

  private loadAuctions(): void {
    const data = storageManager.get<ReverseAuction[]>("auctions", [])
    if (data) {
      this.auctions = new Map(data.map((a) => [a.id, a]))
    }
  }
}

export const auctionManager = new AuctionManager()
