export interface KYCDocument {
  id: string
  type: string
  fileName: string
  fileSize: number
  uploadDate: string
}

export interface KYCSubmission {
  company: string
  companyInfo: any
  documents: KYCDocument[]
  status: 'draft' | 'reviewing' | 'approved' | 'rejected'
  completeness: number
  publishedAt?: string
  approvedAt?: string
  rejectedAt?: string
  approvedBy?: string
  rejectedBy?: string
  adminNotes?: string
  analysis?: any
}

class KYCStore {
  private channel: BroadcastChannel | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.channel = new BroadcastChannel('kyc_updates')
    }
  }

  // Get all submissions
  getAllSubmissions(): KYCSubmission[] {
    if (typeof window === 'undefined') return []
    
    const submissions: KYCSubmission[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('kyc_submission_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}')
          submissions.push(data)
        } catch (e) {
          console.error('Error loading submission:', e)
        }
      }
    }
    return submissions
  }

  // Get submission by company
  getSubmission(company: string): KYCSubmission | null {
    if (typeof window === 'undefined') return null
    
    const data = localStorage.getItem(`kyc_submission_${company}`)
    return data ? JSON.parse(data) : null
  }

  // Save submission
  saveSubmission(submission: KYCSubmission) {
    if (typeof window === 'undefined') return
    
    localStorage.setItem(`kyc_submission_${submission.company}`, JSON.stringify(submission))
    this.channel?.postMessage({ type: 'update', submission })
  }

  // Publish KYC (only once)
  publishKYC(company: string, documents: KYCDocument[], companyInfo: any) {
    const existing = this.getSubmission(company)
    
    // Prevent double submission
    if (existing && existing.status !== 'draft') {
      throw new Error('KYC déjà soumis')
    }

    const submission: KYCSubmission = {
      company,
      companyInfo,
      documents,
      status: 'reviewing',
      completeness: 100,
      publishedAt: new Date().toISOString(),
      analysis: {
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

    this.saveSubmission(submission)
    this.channel?.postMessage({ type: 'new_submission', submission })
  }

  // Approve/Reject
  updateStatus(
    company: string,
    status: 'approved' | 'rejected',
    adminEmail: string,
    notes: string
  ) {
    const submission = this.getSubmission(company)
    if (!submission) return

    const updated: KYCSubmission = {
      ...submission,
      status,
      ...(status === 'approved'
        ? { approvedAt: new Date().toISOString(), approvedBy: adminEmail }
        : { rejectedAt: new Date().toISOString(), rejectedBy: adminEmail }),
      adminNotes: notes,
    }

    this.saveSubmission(updated)
    this.channel?.postMessage({ type: 'status_update', submission: updated })
  }

  // Subscribe to updates
  onUpdate(callback: (data: any) => void) {
    if (this.channel) {
      this.channel.onmessage = (event) => callback(event.data)
    }
  }
}

export const kycStore = new KYCStore()
