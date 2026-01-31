export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthSession {
  id: string
  email: string
  name: string
  role: "pme" | "bank" | "admin"
  companyId?: string
  companyName?: string
  lastLogin?: string
  createdAt: string
}

export class AuthValidator {
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  static validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (password.length < 8) {
      errors.push("Le mot de passe doit contenir au moins 8 caractères")
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Le mot de passe doit contenir au moins une lettre majuscule")
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Le mot de passe doit contenir au moins une lettre minuscule")
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Le mot de passe doit contenir au moins un chiffre")
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  static validateLoginForm(email: string, password: string): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {}

    if (!email.trim()) {
      errors.email = "L'email est requis"
    } else if (!this.validateEmail(email)) {
      errors.email = "Format email invalide"
    }

    if (!password.trim()) {
      errors.password = "Le mot de passe est requis"
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    }
  }
}

// SessionManager removed - using NextAuth for session management
// mockUsers removed - using database for user authentication
