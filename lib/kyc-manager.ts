import type { KYCProfile, KYCDocument, UBOInformation } from "./types"
import { storageManager } from "./storage-utils"
import { audit } from "./audit-logger"

export class KYCManager {
  private profiles: Map<string, KYCProfile> = new Map()

  constructor() {
    this.loadProfiles()
  }

  /**
   * Create new KYC profile
   */
  createProfile(
    companyId: string,
    userId: string,
    profileData: Partial<KYCProfile>
  ): KYCProfile {
    const profile: KYCProfile = {
      id: `KYC-${Date.now()}`,
      companyId,
      legalName: profileData.legalName || "",
      commercialName: profileData.commercialName || "",
      registrationNumber: profileData.registrationNumber || "",
      taxId: profileData.taxId || "",
      businessType: profileData.businessType || "",
      businessSector: profileData.businessSector || "",
      foundingDate: profileData.foundingDate || "",
      headOfficeAddress: profileData.headOfficeAddress || "",
      operationalCity: profileData.operationalCity || "",
      operationalCountry: profileData.operationalCountry || "MA",
      documents: [],
      uboInformation: [],
      complianceStatus: "pending",
      amlStatus: "green",
      amlRiskScore: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.profiles.set(profile.id, profile)
    this.saveProfiles()

    audit(userId, "pme", "KYC_SUBMITTED", "kyc_profile", profile.id, {
      companyId,
      legalName: profile.legalName,
    })

    return profile
  }

  /**
   * Add document to KYC profile
   */
  addDocument(
    kycId: string,
    userId: string,
    documentType: KYCDocument["documentType"],
    fileName: string,
    fileSize: number,
    mimeType: string,
    expiryDate?: string
  ): KYCDocument {
    const profile = this.profiles.get(kycId)
    if (!profile) throw new Error(`KYC profile ${kycId} not found`)

    const document: KYCDocument = {
      id: `DOC-${Date.now()}`,
      companyId: profile.companyId,
      documentType,
      fileName,
      uploadDate: new Date().toISOString(),
      expiryDate,
      status: "pending",
      fileSize,
      mimeType,
      checksum: this.generateChecksum(fileName),
    }

    profile.documents.push(document)
    profile.updatedAt = new Date().toISOString()
    this.profiles.set(kycId, profile)
    this.saveProfiles()

    audit(userId, "pme", "DOCUMENT_UPLOADED", "kyc_document", document.id, {
      kycId,
      documentType,
      fileName,
    })

    return document
  }

  /**
   * Update document status
   */
  updateDocumentStatus(
    kycId: string,
    documentId: string,
    status: "verified" | "rejected" | "expired",
    verificationNote?: string
  ): KYCDocument | null {
    const profile = this.profiles.get(kycId)
    if (!profile) return null

    const document = profile.documents.find((d) => d.id === documentId)
    if (!document) return null

    document.status = status
    document.verificationDate = new Date().toISOString()
    document.verificationNote = verificationNote

    profile.updatedAt = new Date().toISOString()
    this.profiles.set(kycId, profile)
    this.saveProfiles()

    return document
  }

  /**
   * Add UBO information
   */
  addUBO(kycId: string, uboData: Partial<UBOInformation>): UBOInformation {
    const profile = this.profiles.get(kycId)
    if (!profile) throw new Error(`KYC profile ${kycId} not found`)

    const ubo: UBOInformation = {
      id: `UBO-${Date.now()}`,
      firstName: uboData.firstName || "",
      lastName: uboData.lastName || "",
      nationality: uboData.nationality || "",
      identityNumber: uboData.identityNumber || "",
      ownershipPercentage: uboData.ownershipPercentage || 0,
      role: uboData.role || "",
    }

    profile.uboInformation.push(ubo)
    profile.updatedAt = new Date().toISOString()
    this.profiles.set(kycId, profile)
    this.saveProfiles()

    return ubo
  }

  /**
   * Verify KYC profile (admin action)
   */
  verifyProfile(kycId: string, adminId: string, notes?: string): KYCProfile | null {
    const profile = this.profiles.get(kycId)
    if (!profile) return null

    // Check all required documents are verified
    const requiredDocs = ["rc", "ice", "patente"]
    const verified = requiredDocs.every((type) =>
      profile.documents.some((d) => d.documentType === type && d.status === "verified")
    )

    if (!verified) {
      throw new Error("Not all required documents are verified")
    }

    profile.complianceStatus = "approved"
    profile.lastReviewDate = new Date().toISOString()
    profile.expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    profile.updatedAt = new Date().toISOString()

    this.profiles.set(kycId, profile)
    this.saveProfiles()

    audit(adminId, "admin", "KYC_VERIFIED", "kyc_profile", profile.id, {
      companyId: profile.companyId,
      notes,
    })

    return profile
  }

  /**
   * Reject KYC profile
   */
  rejectProfile(kycId: string, adminId: string, reason: string): KYCProfile | null {
    const profile = this.profiles.get(kycId)
    if (!profile) return null

    profile.complianceStatus = "rejected"
    profile.lastReviewDate = new Date().toISOString()
    profile.updatedAt = new Date().toISOString()

    this.profiles.set(kycId, profile)
    this.saveProfiles()

    audit(adminId, "admin", "KYC_REJECTED", "kyc_profile", profile.id, {
      companyId: profile.companyId,
      reason,
    })

    return profile
  }

  /**
   * Get profile by company
   */
  getProfileByCompany(companyId: string): KYCProfile | null {
    const profiles = Array.from(this.profiles.values())
    return profiles.find((p) => p.companyId === companyId) || null
  }

  /**
   * Get profile by ID
   */
  getProfile(kycId: string): KYCProfile | null {
    return this.profiles.get(kycId) || null
  }

  /**
   * Get all pending profiles
   */
  getPendingProfiles(): KYCProfile[] {
    return Array.from(this.profiles.values()).filter((p) => p.complianceStatus === "pending")
  }

  /**
   * Calculate AML risk score
   */
  calculateAMLScore(profile: KYCProfile): number {
    let score = 0

    // Red flags
    if (!profile.businessType) score += 15
    if (!profile.operationalCity) score += 10
    if (profile.uboInformation.length === 0) score += 20

    // Check for suspicious patterns (example)
    const highRiskSectors = ["virtual", "crypto", "remittance"]
    if (highRiskSectors.some((s) => profile.businessSector.toLowerCase().includes(s))) {
      score += 30
    }

    return Math.min(score, 100)
  }

  /**
   * Update AML status
   */
  updateAMLStatus(kycId: string, riskScore: number): void {
    const profile = this.profiles.get(kycId)
    if (!profile) return

    profile.amlRiskScore = riskScore
    profile.amlStatus = riskScore > 70 ? "red" : riskScore > 50 ? "amber" : "green"
    profile.updatedAt = new Date().toISOString()

    this.profiles.set(kycId, profile)
    this.saveProfiles()
  }

  /**
   * Generate checksum for file integrity
   */
  private generateChecksum(fileName: string): string {
    let hash = 0
    for (let i = 0; i < fileName.length; i++) {
      const char = fileName.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16)
  }

  private saveProfiles(): void {
    const data = Array.from(this.profiles.values())
    storageManager.set("kyc_profiles", data)
  }

  private loadProfiles(): void {
    const data = storageManager.get<KYCProfile[]>("kyc_profiles", [])
    if (data) {
      this.profiles = new Map(data.map((p) => [p.id, p]))
    }
  }
}

export const kycManager = new KYCManager()
