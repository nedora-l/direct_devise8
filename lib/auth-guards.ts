// Auth guards for role-based access control

export function checkKYCStatus(company: string): "pending" | "reviewing" | "approved" | "rejected" {
  if (typeof window === 'undefined') return "pending"
  
  const savedResult = localStorage.getItem(`kyc_result_${company}`)
  if (!savedResult) return "pending"
  
  const result = JSON.parse(savedResult)
  return result.status || "pending"
}

export function isKYCApproved(company: string): boolean {
  return checkKYCStatus(company) === "approved"
}

export function requireKYCApproval(company: string, redirectUrl: string = "/pme/kyc-waiting"): boolean {
  const status = checkKYCStatus(company)
  if (status !== "approved") {
    window.location.href = `${redirectUrl}?company=${encodeURIComponent(company)}`
    return false
  }
  return true
}
