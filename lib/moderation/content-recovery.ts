/**
 * Content Recovery System
 * Handles content recovery requests and restoration
 */

import { logger } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/server'

export interface ContentRecoveryRequest {
  id: string
  contentType: 'post' | 'comment' | 'artist'
  contentId: string
  requesterId: string
  reason: string
  additionalInfo?: string
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  contentSnapshot: Record<string, unknown>
  deletionReason?: string
  deletedBy?: string
  deletedAt?: Date
  reviewedBy?: string
  reviewedAt?: Date
  reviewNotes?: string
  autoApproved: boolean
  createdAt: Date
  updatedAt: Date
  expiresAt: Date
}

export interface RecoveryStats {
  totalRequests: number
  pendingRequests: number
  approvedRequests: number
  rejectedRequests: number
  expiredRequests: number
  avgProcessingTimeHours: number
}

export interface CreateRecoveryRequestParams {
  contentType: 'post' | 'comment' | 'artist'
  contentId: string
  reason: string
  additionalInfo?: string
}

export class ContentRecoveryManager {
  private supabase: Awaited<ReturnType<typeof createClient>> | null

  constructor() {
    this.supabase = null // Will be initialized in methods
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  /**
   * Create content recovery request
   */
  async createRecoveryRequest(
    requesterId: string,
    params: CreateRecoveryRequestParams
  ): Promise<string | null> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase.rpc('create_content_recovery_request', {
        p_content_type: params.contentType,
        p_content_id: params.contentId,
        p_requester_id: requesterId,
        p_reason: params.reason,
        p_additional_info: params.additionalInfo,
      })

      if (error) {
        logger.error('Error creating recovery request:', error)
        return null
      }

      return data
    } catch (error) {
      logger.error('Failed to create recovery request:', error)
      return null
    }
  }

  /**
   * Approve content recovery request
   */
  async approveRecoveryRequest(
    requestId: string,
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase.rpc('approve_content_recovery', {
        p_request_id: requestId,
        p_reviewed_by: reviewedBy,
        p_review_notes: reviewNotes,
      })

      if (error) {
        logger.error('Error approving recovery request:', error)
        return false
      }

      return data === true
    } catch (error) {
      logger.error('Failed to approve recovery request:', error)
      return false
    }
  }

  /**
   * Reject content recovery request
   */
  async rejectRecoveryRequest(
    requestId: string,
    reviewedBy: string,
    reviewNotes: string
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase.rpc('reject_content_recovery', {
        p_request_id: requestId,
        p_reviewed_by: reviewedBy,
        p_review_notes: reviewNotes,
      })

      if (error) {
        logger.error('Error rejecting recovery request:', error)
        return false
      }

      return data === true
    } catch (error) {
      logger.error('Failed to reject recovery request:', error)
      return false
    }
  }

  /**
   * Get pending recovery requests
   */
  async getPendingRequests(limit: number = 50): Promise<ContentRecoveryRequest[]> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase.rpc('get_pending_recovery_requests', {
        p_limit: limit,
      })

      if (error || !data) {
        return []
      }

      interface RecoveryRequestRow {
        [key: string]: unknown
      }
      return (data as RecoveryRequestRow[]).map((request) => this.mapRecoveryRequest(request))
    } catch (error) {
      logger.error('Failed to get pending requests:', error)
      return []
    }
  }

  /**
   * Get recovery request details
   */
  async getRecoveryRequestDetails(requestId: string): Promise<ContentRecoveryRequest | null> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase.rpc('get_recovery_request_details', {
        p_request_id: requestId,
      })

      if (error || !data || data.length === 0) {
        return null
      }

      return this.mapRecoveryRequest(data[0])
    } catch (error) {
      logger.error('Failed to get recovery request details:', error)
      return null
    }
  }

  /**
   * Get user's recovery requests
   */
  async getUserRecoveryRequests(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ContentRecoveryRequest[]> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase
        .from('content_recovery_requests')
        .select('*')
        .eq('requester_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error || !data) {
        return []
      }

      interface RecoveryRequestRow {
        [key: string]: unknown
      }
      return (data as RecoveryRequestRow[]).map((request) => this.mapRecoveryRequest(request))
    } catch (error) {
      logger.error('Failed to get user recovery requests:', error)
      return []
    }
  }

  /**
   * Get recovery statistics
   */
  async getRecoveryStats(daysBack: number = 30): Promise<RecoveryStats> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase.rpc('get_recovery_stats', {
        p_days_back: daysBack,
      })

      if (error || !data || data.length === 0) {
        return {
          totalRequests: 0,
          pendingRequests: 0,
          approvedRequests: 0,
          rejectedRequests: 0,
          expiredRequests: 0,
          avgProcessingTimeHours: 0,
        }
      }

      const stats = data[0]
      return {
        totalRequests: parseInt(stats.total_requests) || 0,
        pendingRequests: parseInt(stats.pending_requests) || 0,
        approvedRequests: parseInt(stats.approved_requests) || 0,
        rejectedRequests: parseInt(stats.rejected_requests) || 0,
        expiredRequests: parseInt(stats.expired_requests) || 0,
        avgProcessingTimeHours: parseFloat(stats.avg_processing_time_hours) || 0,
      }
    } catch (error) {
      logger.error('Failed to get recovery stats:', error)
      return {
        totalRequests: 0,
        pendingRequests: 0,
        approvedRequests: 0,
        rejectedRequests: 0,
        expiredRequests: 0,
        avgProcessingTimeHours: 0,
      }
    }
  }

  /**
   * Expire old recovery requests
   */
  async expireOldRequests(): Promise<number> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase.rpc('expire_old_recovery_requests')

      if (error) {
        logger.error('Error expiring old requests:', error)
        return 0
      }

      return data || 0
    } catch (error) {
      logger.error('Failed to expire old requests:', error)
      return 0
    }
  }

  /**
   * Check if content can be recovered
   */
  async canRecoverContent(
    contentType: 'post' | 'comment' | 'artist',
    contentId: string
  ): Promise<{
    canRecover: boolean
    reason?: string
    deletedAt?: Date
    deletedBy?: string
  }> {
    try {
      const supabase = await this.getSupabase()

      let query
      if (contentType === 'post') {
        query = supabase.from('posts').select('deleted_at, deleted_by').eq('id', contentId)
      } else if (contentType === 'comment') {
        query = supabase.from('comments').select('deleted_at, deleted_by').eq('id', contentId)
      } else if (contentType === 'artist') {
        query = supabase.from('artists').select('deleted_at, deleted_by').eq('id', contentId)
      } else {
        return { canRecover: false, reason: 'Invalid content type' }
      }

      const { data, error } = await query.single()

      if (error || !data) {
        return { canRecover: false, reason: 'Content not found' }
      }

      if (!data.deleted_at) {
        return { canRecover: false, reason: 'Content is not deleted' }
      }

      // Check if content was deleted too long ago (beyond recovery window)
      const deletedAt = new Date(data.deleted_at)
      const recoveryWindow = 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds
      if (Date.now() - deletedAt.getTime() > recoveryWindow) {
        return {
          canRecover: false,
          reason: 'Content deleted too long ago',
          deletedAt,
          deletedBy: data.deleted_by,
        }
      }

      // Check if there's already a pending recovery request
      const { data: existingRequest } = await supabase
        .from('content_recovery_requests')
        .select('id')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .eq('status', 'pending')
        .single()

      if (existingRequest) {
        return {
          canRecover: false,
          reason: 'Recovery request already exists',
          deletedAt,
          deletedBy: data.deleted_by,
        }
      }

      return {
        canRecover: true,
        deletedAt,
        deletedBy: data.deleted_by,
      }
    } catch (error) {
      logger.error('Failed to check if content can be recovered:', error)
      return { canRecover: false, reason: 'Error checking recovery eligibility' }
    }
  }

  /**
   * Auto-approve recovery requests for certain conditions
   */
  async autoApproveRecoveryRequest(requestId: string): Promise<boolean> {
    try {
      const request = await this.getRecoveryRequestDetails(requestId)
      if (!request) {
        return false
      }

      // Auto-approve if:
      // 1. Content was deleted by user themselves
      // 2. Deletion reason was accidental
      // 3. Request is made within 24 hours of deletion
      const isSelfDeletion = request.deletedBy === request.requesterId
      const isAccidentalDeletion = request.deletionReason === 'user_deleted'
      const isRecentDeletion =
        request.deletedAt &&
        Date.now() - new Date(request.deletedAt).getTime() < 24 * 60 * 60 * 1000

      if (isSelfDeletion && isAccidentalDeletion && isRecentDeletion) {
        return await this.approveRecoveryRequest(
          requestId,
          'system',
          'Auto-approved: User deleted their own content accidentally within 24 hours'
        )
      }

      return false
    } catch (error) {
      logger.error('Failed to auto-approve recovery request:', error)
      return false
    }
  }

  /**
   * Get recovery request by content
   */
  async getRecoveryRequestByContent(
    contentType: 'post' | 'comment' | 'artist',
    contentId: string
  ): Promise<ContentRecoveryRequest | null> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase
        .from('content_recovery_requests')
        .select('*')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) {
        return null
      }

      return this.mapRecoveryRequest(data)
    } catch (error) {
      logger.error('Failed to get recovery request by content:', error)
      return null
    }
  }

  /**
   * Map database record to ContentRecoveryRequest
   */
  private mapRecoveryRequest(data: unknown): ContentRecoveryRequest {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid recovery request data')
    }
    const record = data as Record<string, unknown>

    // Type guards for union types
    const contentType = record.content_type
    const isValidContentType = (type: unknown): type is 'post' | 'comment' | 'artist' => {
      return type === 'post' || type === 'comment' || type === 'artist'
    }

    const status = record.status
    const isValidStatus = (s: unknown): s is 'pending' | 'approved' | 'rejected' | 'expired' => {
      return s === 'pending' || s === 'approved' || s === 'rejected' || s === 'expired'
    }

    return {
      id: String(record.id ?? ''),
      contentType: isValidContentType(contentType) ? contentType : ('post' as const),
      contentId: String(record.content_id ?? ''),
      requesterId: String(record.requester_id ?? ''),
      reason: String(record.reason ?? ''),
      additionalInfo: record.additional_info ? String(record.additional_info) : undefined,
      status: isValidStatus(status) ? status : ('pending' as const),
      contentSnapshot: (record.content_snapshot && typeof record.content_snapshot === 'object'
        ? record.content_snapshot
        : {}) as Record<string, unknown>,
      deletionReason: record.deletion_reason ? String(record.deletion_reason) : undefined,
      deletedBy: record.deleted_by ? String(record.deleted_by) : undefined,
      deletedAt: record.deleted_at ? new Date(String(record.deleted_at)) : undefined,
      reviewedBy: record.reviewed_by ? String(record.reviewed_by) : undefined,
      reviewedAt: record.reviewed_at ? new Date(String(record.reviewed_at)) : undefined,
      reviewNotes: record.review_notes ? String(record.review_notes) : undefined,
      autoApproved: Boolean(record.auto_approved ?? false),
      createdAt: new Date(String(record.created_at ?? '')),
      updatedAt: new Date(String(record.updated_at ?? '')),
      expiresAt: new Date(String(record.expires_at ?? '')),
    }
  }
}

// Export singleton instance
export const contentRecoveryManager = new ContentRecoveryManager()
