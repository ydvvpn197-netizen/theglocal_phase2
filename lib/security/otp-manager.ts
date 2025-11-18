/**
 * OTP Security Manager
 * Handles OTP generation, validation, and security measures
 */

import { logger } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export interface OTPConfig {
  maxAttempts: number
  lockoutDurationMinutes: number
  otpExpiryMinutes: number
  cooldownSeconds: number
}

export const DEFAULT_OTP_CONFIG: OTPConfig = {
  maxAttempts: 3,
  lockoutDurationMinutes: 15,
  otpExpiryMinutes: 5,
  cooldownSeconds: 60,
}

export class OTPSecurityManager {
  private config: OTPConfig

  constructor(config: OTPConfig = DEFAULT_OTP_CONFIG) {
    this.config = config
  }

  /**
   * Check if user can request OTP (not locked out, cooldown passed)
   */
  async canRequestOTP(identifier: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase.rpc('can_request_otp', {
        p_identifier: identifier,
      })

      if (error) {
        logger.error('Error checking OTP eligibility:', error)
        return { allowed: false, reason: 'System error' }
      }

      if (!data) {
        return { allowed: false, reason: 'Too many failed attempts. Please try again later.' }
      }

      return { allowed: true }
    } catch (error) {
      logger.error('OTP eligibility check failed:', error)
      return { allowed: false, reason: 'System error' }
    }
  }

  /**
   * Generate a secure OTP
   */
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  /**
   * Hash OTP for secure storage
   */
  hashOTP(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex')
  }

  /**
   * Verify OTP hash
   */
  verifyOTPHash(otp: string, hash: string): boolean {
    return this.hashOTP(otp) === hash
  }

  /**
   * Record OTP attempt (success or failure)
   */
  async recordAttempt(
    identifier: string,
    success: boolean
  ): Promise<{ allowed: boolean; lockedUntil?: Date }> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase.rpc('record_otp_attempt', {
        p_identifier: identifier,
        p_success: success,
      })

      if (error) {
        logger.error('Error recording OTP attempt:', error)
        return { allowed: false }
      }

      if (!data) {
        // User is now locked out
        const lockoutEnd = new Date(Date.now() + this.config.lockoutDurationMinutes * 60 * 1000)
        return { allowed: false, lockedUntil: lockoutEnd }
      }

      return { allowed: true }
    } catch (error) {
      logger.error('Failed to record OTP attempt:', error)
      return { allowed: false }
    }
  }

  /**
   * Check if user is currently locked out
   */
  async isLockedOut(identifier: string): Promise<boolean> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase.rpc('is_user_locked_out', {
        p_identifier: identifier,
      })

      if (error) {
        logger.error('Error checking lockout status:', error)
        return false
      }

      return data === true
    } catch (error) {
      logger.error('Failed to check lockout status:', error)
      return false
    }
  }

  /**
   * Get remaining lockout time in seconds
   */
  async getRemainingLockoutTime(identifier: string): Promise<number> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('otp_attempts')
        .select('locked_until')
        .eq('user_identifier', identifier)
        .single()

      if (error || !data?.locked_until) {
        return 0
      }

      const lockoutEnd = new Date(data.locked_until)
      const now = new Date()
      const remaining = Math.max(0, Math.floor((lockoutEnd.getTime() - now.getTime()) / 1000))

      return remaining
    } catch (error) {
      logger.error('Failed to get lockout time:', error)
      return 0
    }
  }

  /**
   * Clean up old OTP attempt records
   */
  async cleanupOldRecords(): Promise<number> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase.rpc('cleanup_old_otp_attempts')

      if (error) {
        logger.error('Error cleaning up OTP records:', error)
        return 0
      }

      return data || 0
    } catch (error) {
      logger.error('Failed to cleanup OTP records:', error)
      return 0
    }
  }

  /**
   * Reset user's OTP attempts (admin function)
   */
  async resetUserAttempts(identifier: string): Promise<boolean> {
    try {
      const supabase = await createClient()

      const { error } = await supabase
        .from('otp_attempts')
        .delete()
        .eq('user_identifier', identifier)

      if (error) {
        logger.error('Error resetting user attempts:', error)
        return false
      }

      return true
    } catch (error) {
      logger.error('Failed to reset user attempts:', error)
      return false
    }
  }
}

// Export singleton instance
export const otpSecurityManager = new OTPSecurityManager()
