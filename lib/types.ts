export interface AuditLogEntry {
  id: string
  timestamp: string
  userId: string
  userRole: "pme" | "bank" | "admin"
  action: string
  entity: string
  entityId: string
  changes: Record<string, any>
  ipAddress?: string
  userAgent?: string
  status: "success" | "failure"
  errorMessage?: string
  details?: Record<string, any>
}

export interface SWIFTData {
  reference: string
  date: string
  amount: string
  currency: string
  senderBic: string
  senderName: string
  senderIban: string
  beneficiaryBic: string
  beneficiaryName: string
  beneficiaryIban: string
  chargesCode: string
  instructedAmount?: string
  instructedCurrency?: string
  transactionType: "MT103" | "MT202" | "UNKNOWN"
  rawContent: string
}

export interface KYCDocument {
  id: string
  companyId: string
  documentType: "rc" | "ice" | "patente" | "identity" | "ubo" | "other"
  fileName: string
  uploadDate: string
  expiryDate?: string
  status: "pending" | "verified" | "rejected" | "expired"
  verificationDate?: string
  verificationNote?: string
  fileSize: number
  mimeType: string
  checksum?: string
}

export interface KYCProfile {
  id: string
  companyId: string
  legalName: string
  commercialName: string
  registrationNumber: string
  taxId: string
  businessType: string
  businessSector: string
  foundingDate: string
  headOfficeAddress: string
  operationalCity: string
  operationalCountry: string
  documents: KYCDocument[]
  uboInformation: UBOInformation[]
  complianceStatus: "pending" | "approved" | "suspended" | "rejected"
  lastReviewDate?: string
  expiryDate?: string
  amlStatus: "green" | "amber" | "red"
  amlRiskScore: number
  createdAt: string
  updatedAt: string
}

export interface UBOInformation {
  id: string
  firstName: string
  lastName: string
  nationality: string
  identityNumber: string
  ownershipPercentage: number
  role: string
}

export interface ReverseAuction {
  id: string
  createdBy: string
  status: "draft" | "open" | "closed" | "awarded"
  description: string
  amount: number
  currency: string
  exchangeCurrency: string
  minRate: number
  maxRate: number
  startDate: string
  endDate: string
  openingDate?: string
  closingDate?: string
  awardedBankId?: string
  awardedRate?: number
  participants: BankBid[]
  conformityChecks: ConformityCheck[]
  createdAt: string
  updatedAt: string
}

export interface BankBid {
  id: string
  auctionId: string
  bankId: string
  bankName: string
  rate: number
  charges: number
  terms: string
  timestamp: string
  status: "pending" | "accepted" | "rejected" | "withdrawn"
}

export interface ConformityCheck {
  id: string
  checkType: "igoc" | "70_30" | "kyc" | "aml" | "swift" | "documents"
  status: "pending" | "passed" | "failed" | "warning"
  checkDate: string
  details: Record<string, any>
  approvedBy?: string
}

export interface Transaction {
  id: string
  companyId: string
  amount: number
  currency: string
  exchangeAmount: number
  exchangeCurrency: string
  rate: number
  charges: number
  netAmount: number
  type: "small" | "large"
  status: "pending" | "processing" | "completed" | "rejected" | "cancelled"
  swiftReference?: string
  createdAt: string
  updatedAt: string
  conformityScore: number
}

export interface NotificationEvent {
  id: string
  recipientId: string
  recipientType: "pme" | "bank" | "admin"
  channel: "email" | "whatsapp" | "sms" | "platform"
  subject: string
  message: string
  templateId?: string
  templateData?: Record<string, any>
  status: "pending" | "sent" | "read" | "failed"
  sentAt?: string
  readAt?: string
  failureReason?: string
  retryCount: number
  maxRetries: number
}

export interface SystemAlert {
  id: string
  level: "info" | "warning" | "critical" | "error"
  category: "compliance" | "security" | "performance" | "system"
  title: string
  message: string
  affectedEntityId?: string
  affectedEntityType?: string
  createdAt: string
  resolvedAt?: string
  resolvedBy?: string
  autoResolved: boolean
}

export interface ComplianceReport {
  id: string
  period: string
  generatedAt: string
  generatedBy: string
  reportType: "igoc" | "lcb_ft" | "aml" | "kycb" | "summary"
  totalOperations: number
  conformingOperations: number
  conformityRate: number
  flaggedOperations: number
  alerts: SystemAlert[]
  recommendations: string[]
}

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "KYC_SUBMITTED"
  | "KYC_VERIFIED"
  | "KYC_REJECTED"
  | "DOCUMENT_UPLOADED"
  | "AUCTION_CREATED"
  | "AUCTION_CLOSED"
  | "BID_PLACED"
  | "TRANSACTION_INITIATED"
  | "TRANSACTION_VALIDATED"
  | "TRANSACTION_COMPLETED"
  | "CONFORMITY_CHECK_FAILED"
  | "ALERT_TRIGGERED"
  | "REPORT_GENERATED"
  | "SETTINGS_CHANGED"
  | "USER_CREATED"
  | "USER_DELETED"

export type LLMProvider = "gemini" | "openai"

export interface VentilationHeader {
  ReferenceDossier: string | null
  Bureau: string | null
  Regime: string | null
  DateDocument: string | null
  Expediteur: string | null
  Destinataire: string | null
  PoidsBrutTotal_KG: number | null
  PoidsNetTotal_KG: number | null
  Devise: string | null
  TauxChange: number | null
  MontantFret: number | null
  MontantAssurance: number | null
  ValeurTotaleDeclaree: number | null
}

export interface VentilationItem {
  Sequence: number | null
  Nomenclature: string
  Designation: string
  PaysOrigine: string
  Quantite: number | null
  UniteMesure: string | null
  PoidsNet_KG: number | null
  ValeurDevise: number | null
  ValeurDeclaree_DH: number | null
  Accord: string | null
}

export interface VentilationFooter {
  TotalGeneralDeclare: number | null
}

export interface VentilationKYC {
  score: number
  status: string
}

export interface VentilationDocument {
  SourceDocument: "VENTILATION"
  PageInfo: { EstPageGarde: boolean; NumeroPageDetecte: number | null }
  Header: VentilationHeader
  Items: VentilationItem[]
  Footer: VentilationFooter
  KYC?: VentilationKYC
}
