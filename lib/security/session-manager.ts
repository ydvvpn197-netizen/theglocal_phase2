/**
 * Session Security Manager
 * Handles session creation, validation, and security monitoring
 */

import { logger } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export interface DeviceInfo {
  userAgent?: string
  acceptLanguage?: string
  acceptEncoding?: string
  timestamp?: string
  [key: string]: unknown
}

export interface SuspiciousActivityDetails {
  [key: string]: unknown
}

export interface SessionInfo {
  sessionId: string
  userId: string
  deviceInfo?: DeviceInfo
  ipAddress?: string
  userAgent?: string
  lastActivity: Date
  expiresAt: Date
}

export interface SuspiciousActivity {
  type: 'failed_login' | 'multiple_sessions' | 'unusual_location'
  severity: 'low' | 'medium' | 'high' | 'critical'
  details?: SuspiciousActivityDetails
}

export class SessionSecurityManager {
  // Configuration constants - used in session validation logic
  private readonly maxConcurrentSessions = 3
  private readonly sessionDurationDays = 30

  // Getter methods to use the constants
  getMaxConcurrentSessions(): number {
    return this.maxConcurrentSessions
  }

  getSessionDurationDays(): number {
    return this.sessionDurationDays
  }

  /**
   * Create a new user session
   */
  async createSession(
    userId: string,
    deviceInfo?: DeviceInfo,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ sessionId: string; sessionToken: string }> {
    try {
      const supabase = await createClient()

      // Generate secure session token
      const sessionToken = this.generateSessionToken()

      const { data, error } = await supabase.rpc('create_user_session', {
        p_user_id: userId,
        p_session_token: sessionToken,
        p_device_info: deviceInfo,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
      })

      if (error) {
        logger.error('Error creating session:', error)
        throw new Error('Failed to create session')
      }

      return {
        sessionId: data,
        sessionToken,
      }
    } catch (error) {
      logger.error('Session creation failed:', error)
      throw error
    }
  }

  /**
   * Validate a session token
   */
  async validateSession(sessionToken: string): Promise<SessionInfo | null> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase.rpc('validate_session', {
        p_session_token: sessionToken,
      })

      if (error || !data || data.length === 0) {
        return null
      }

      const session = data[0] as Record<string, unknown>
      if (!session.is_valid) {
        return null
      }

      // Get full session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('id', session.session_id)
        .single()

      if (sessionError || !sessionData) {
        return null
      }

      return {
        sessionId: sessionData.id,
        userId: sessionData.user_id,
        deviceInfo: sessionData.device_info,
        ipAddress: sessionData.ip_address,
        userAgent: sessionData.user_agent,
        lastActivity: new Date(sessionData.last_activity),
        expiresAt: new Date(sessionData.expires_at),
      }
    } catch (error) {
      logger.error('Session validation failed:', error)
      return null
    }
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionToken: string, ipAddress?: string): Promise<boolean> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase.rpc('update_session_activity', {
        p_session_token: sessionToken,
        p_ip_address: ipAddress,
      })

      if (error) {
        logger.error('Error updating session activity:', error)
        return false
      }

      return data === true
    } catch (error) {
      logger.error('Failed to update session activity:', error)
      return false
    }
  }

  /**
   * Deactivate a specific session
   */
  async deactivateSession(sessionToken: string): Promise<boolean> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase.rpc('deactivate_session', {
        p_session_token: sessionToken,
      })

      if (error) {
        logger.error('Error deactivating session:', error)
        return false
      }

      return data === true
    } catch (error) {
      logger.error('Failed to deactivate session:', error)
      return false
    }
  }

  /**
   * Deactivate all sessions for a user
   */
  async deactivateAllUserSessions(userId: string): Promise<number> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase.rpc('deactivate_all_user_sessions', {
        p_user_id: userId,
      })

      if (error) {
        logger.error('Error deactivating user sessions:', error)
        return 0
      }

      return data || 0
    } catch (error) {
      logger.error('Failed to deactivate user sessions:', error)
      return 0
    }
  }

  /**
   * Detect and log suspicious activity
   */
  async detectSuspiciousActivity(
    userId: string,
    ipAddress: string,
    activityType: SuspiciousActivity['type'],
    details?: SuspiciousActivityDetails
  ): Promise<boolean> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase.rpc('detect_suspicious_activity', {
        p_user_id: userId,
        p_ip_address: ipAddress,
        p_activity_type: activityType,
        p_details: details,
      })

      if (error) {
        logger.error('Error detecting suspicious activity:', error)
        return false
      }

      return data === true
    } catch (error) {
      logger.error('Failed to detect suspicious activity:', error)
      return false
    }
  }

  /**
   * Get user's active sessions
   */
  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('last_activity', { ascending: false })

      if (error) {
        logger.error('Error fetching user sessions:', error)
        return []
      }

      return (data || []).map((session) => ({
        sessionId: session.id,
        userId: session.user_id,
        deviceInfo: session.device_info,
        ipAddress: session.ip_address,
        userAgent: session.user_agent,
        lastActivity: new Date(session.last_activity),
        expiresAt: new Date(session.expires_at),
      }))
    } catch (error) {
      logger.error('Failed to get user sessions:', error)
      return []
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase.rpc('cleanup_expired_sessions')

      if (error) {
        logger.error('Error cleaning up sessions:', error)
        return 0
      }

      return data || 0
    } catch (error) {
      logger.error('Failed to cleanup sessions:', error)
      return 0
    }
  }

  /**
   * Generate a secure session token
   */
  private generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Extract device fingerprint from request
   */
  extractDeviceInfo(request: Request): DeviceInfo {
    const userAgent = request.headers.get('user-agent') || ''
    const acceptLanguage = request.headers.get('accept-language') || ''
    const acceptEncoding = request.headers.get('accept-encoding') || ''

    return {
      userAgent,
      acceptLanguage,
      acceptEncoding,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Check if session is near expiry (within 1 day)
   */
  isSessionNearExpiry(session: SessionInfo): boolean {
    const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    return session.expiresAt < oneDayFromNow
  }

  /**
   * Get session expiry time in seconds
   */
  getSessionExpirySeconds(session: SessionInfo): number {
    const now = new Date()
    const expiry = new Date(session.expiresAt)
    return Math.max(0, Math.floor((expiry.getTime() - now.getTime()) / 1000))
  }
}

// Export singleton instance
export const sessionSecurityManager = new SessionSecurityManager()
