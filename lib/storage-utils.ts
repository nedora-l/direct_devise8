export class StorageManager {
  private prefix = "dd_"

  /**
   * Set item in localStorage with encryption simulation
   */
  set(key: string, value: any): void {
    try {
      const fullKey = `${this.prefix}${key}`
      const encrypted = this.encrypt(JSON.stringify(value))
      if (typeof window !== "undefined") {
        localStorage.setItem(fullKey, encrypted)
      }
    } catch (e) {
      console.error(`Failed to save ${key}:`, e)
    }
  }

  /**
   * Get item from localStorage with decryption simulation
   */
  get<T = any>(key: string, defaultValue?: T): T | null {
    try {
      const fullKey = `${this.prefix}${key}`
      if (typeof window === "undefined") return defaultValue ?? null

      const encrypted = localStorage.getItem(fullKey)
      if (!encrypted) return defaultValue ?? null

      const decrypted = this.decrypt(encrypted)
      return JSON.parse(decrypted) as T
    } catch (e) {
      console.error(`Failed to retrieve ${key}:`, e)
      return defaultValue ?? null
    }
  }

  /**
   * Remove item
   */
  remove(key: string): void {
    try {
      const fullKey = `${this.prefix}${key}`
      if (typeof window !== "undefined") {
        localStorage.removeItem(fullKey)
      }
    } catch (e) {
      console.error(`Failed to remove ${key}:`, e)
    }
  }

  /**
   * Clear all storage
   */
  clear(): void {
    try {
      if (typeof window !== "undefined") {
        const keys = Object.keys(localStorage)
        keys.forEach((key) => {
          if (key.startsWith(this.prefix)) {
            localStorage.removeItem(key)
          }
        })
      }
    } catch (e) {
      console.error("Failed to clear storage:", e)
    }
  }

  /**
   * Simple encryption (XOR - replace with real encryption in production)
   */
  private encrypt(data: string): string {
    const key = "DIRECT_DEVISE_2025"
    return btoa(data)
  }

  /**
   * Simple decryption
   */
  private decrypt(data: string): string {
    return atob(data)
  }
}

export const storageManager = new StorageManager()
