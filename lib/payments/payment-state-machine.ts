/**
 * Payment State Machine
 * Manages payment transaction states and transitions
 */

import { logger } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export type PaymentStatus =
  | 'created'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'

export interface PaymentTransaction {
  id: string
  userId: string
  artistId?: string
  subscriptionId?: string
  amount: number
  currency: string
  paymentMethod: 'razorpay' | 'paypal'
  status: PaymentStatus
  previousStatus?: PaymentStatus
  stateTransitions: PaymentStateTransition[]
  externalPaymentId?: string
  externalOrderId?: string
  externalSubscriptionId?: string
  idempotencyKey: string
  retryCount: number
  maxRetries: number
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  failedAt?: Date
  refundedAt?: Date
  metadata: Record<string, unknown>
  errorMessage?: string
  errorCode?: string
}

export interface PaymentStateTransition {
  fromStatus: PaymentStatus
  toStatus: PaymentStatus
  timestamp: Date
  externalPaymentId?: string
  errorMessage?: string
  errorCode?: string
}

export interface CreatePaymentParams {
  userId: string
  artistId?: string
  subscriptionId?: string
  amount: number
  currency: string
  paymentMethod: 'razorpay' | 'paypal'
  idempotencyKey?: string
  metadata?: Record<string, unknown>
}

export class PaymentStateMachine {
  private supabase: Awaited<ReturnType<typeof createClient>> | null = null

  constructor() {
    // Will be initialized in methods
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  /**
   * Create a new payment transaction
   */
  async createPayment(params: CreatePaymentParams): Promise<string> {
    const supabase = await this.getSupabase()

    const idempotencyKey = params.idempotencyKey || this.generateIdempotencyKey()

    const { data, error } = await supabase.rpc('create_payment_transaction', {
      p_user_id: params.userId,
      p_artist_id: params.artistId,
      p_subscription_id: params.subscriptionId,
      p_amount: params.amount,
      p_currency: params.currency,
      p_payment_method: params.paymentMethod,
      p_idempotency_key: idempotencyKey,
      p_metadata: params.metadata || {},
    })

    if (error) {
      logger.error('Error creating payment transaction:', error)
      throw new Error('Failed to create payment transaction')
    }

    return data
  }

  /**
   * Update payment status with validation
   */
  async updatePaymentStatus(
    transactionId: string,
    newStatus: PaymentStatus,
    options: {
      externalPaymentId?: string
      errorMessage?: string
      errorCode?: string
      metadata?: Record<string, unknown>
    } = {}
  ): Promise<boolean> {
    const supabase = await this.getSupabase()

    const { data, error } = await supabase.rpc('update_payment_status', {
      p_transaction_id: transactionId,
      p_new_status: newStatus,
      p_external_payment_id: options.externalPaymentId,
      p_error_message: options.errorMessage,
      p_error_code: options.errorCode,
      p_metadata: options.metadata,
    })

    if (error) {
      logger.error('Error updating payment status:', error)
      return false
    }

    return data === true
  }

  /**
   * Get payment transaction by ID
   */
  async getPayment(transactionId: string): Promise<PaymentTransaction | null> {
    const supabase = await this.getSupabase()

    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', transactionId)
      .single()

    if (error || !data) {
      return null
    }

    return this.mapPaymentTransaction(data)
  }

  /**
   * Get payment by external payment ID
   */
  async getPaymentByExternalId(
    externalPaymentId: string,
    paymentMethod: 'razorpay' | 'paypal'
  ): Promise<PaymentTransaction | null> {
    const supabase = await this.getSupabase()

    const { data, error } = await supabase.rpc('get_payment_by_external_id', {
      p_external_payment_id: externalPaymentId,
      p_payment_method: paymentMethod,
    })

    if (error || !data || data.length === 0) {
      return null
    }

    const payment = data[0] as Record<string, unknown>
    return this.mapPaymentTransaction(payment)
  }

  /**
   * Get failed payments eligible for retry
   */
  async getFailedPaymentsForRetry(hoursAgo: number = 1): Promise<PaymentTransaction[]> {
    const supabase = await this.getSupabase()

    const { data, error } = await supabase.rpc('get_failed_payments_for_retry', {
      p_hours_ago: hoursAgo,
    })

    if (error || !data) {
      return []
    }

    return data.map((payment: unknown) => this.mapPaymentTransaction(payment))
  }

  /**
   * Retry failed payment
   */
  async retryPayment(transactionId: string): Promise<boolean> {
    const payment = await this.getPayment(transactionId)
    if (!payment || payment.status !== 'failed') {
      return false
    }

    // Check if retry limit exceeded
    if (payment.retryCount >= payment.maxRetries) {
      logger.warn(`Payment ${transactionId} has exceeded retry limit`)
      return false
    }

    // Update retry count
    const supabase = await this.getSupabase()
    const { error } = await supabase
      .from('payment_transactions')
      .update({
        retry_count: payment.retryCount + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId)

    if (error) {
      logger.error('Error updating retry count:', error)
      return false
    }

    // Reset status to pending for retry
    return await this.updatePaymentStatus(transactionId, 'pending')
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(userId?: string): Promise<{
    total: number
    completed: number
    failed: number
    pending: number
    totalAmount: number
  }> {
    const supabase = await this.getSupabase()

    let query = supabase.from('payment_transactions').select('status, amount')

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error || !data) {
      return { total: 0, completed: 0, failed: 0, pending: 0, totalAmount: 0 }
    }

    const stats = data.reduce(
      (acc, payment) => {
        acc.total++
        acc.totalAmount += payment.amount

        switch (payment.status) {
          case 'completed':
            acc.completed++
            break
          case 'failed':
            acc.failed++
            break
          case 'pending':
          case 'processing':
            acc.pending++
            break
        }

        return acc
      },
      { total: 0, completed: 0, failed: 0, pending: 0, totalAmount: 0 }
    )

    return stats
  }

  /**
   * Validate state transition
   */
  isValidTransition(currentStatus: PaymentStatus, newStatus: PaymentStatus): boolean {
    const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
      created: ['pending', 'processing', 'failed'],
      pending: ['processing', 'completed', 'failed'],
      processing: ['completed', 'failed'],
      completed: ['refunded'],
      failed: ['pending', 'processing'], // Allow retry
      refunded: [], // No transitions from refunded
    }

    return validTransitions[currentStatus]?.includes(newStatus) || false
  }

  /**
   * Generate idempotency key
   */
  private generateIdempotencyKey(): string {
    return crypto.randomBytes(16).toString('hex')
  }

  /**
   * Map database record to PaymentTransaction
   */
  private mapPaymentTransaction(data: unknown): PaymentTransaction {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid payment data')
    }
    const record = data as Record<string, unknown>
    return {
      id: String(record.id ?? ''),
      userId: String(record.user_id ?? ''),
      artistId: record.artist_id ? String(record.artist_id) : undefined,
      subscriptionId: record.subscription_id ? String(record.subscription_id) : undefined,
      amount: Number(record.amount ?? 0),
      currency: String(record.currency ?? ''),
      paymentMethod: String(record.payment_method ?? 'razorpay') as 'razorpay' | 'paypal',
      status: String(record.status ?? 'created') as PaymentStatus,
      previousStatus: record.previous_status
        ? (String(record.previous_status) as PaymentStatus)
        : undefined,
      stateTransitions: Array.isArray(record.state_transitions)
        ? (record.state_transitions as PaymentStateTransition[])
        : [],
      externalPaymentId: record.external_payment_id
        ? String(record.external_payment_id)
        : undefined,
      externalOrderId: record.external_order_id ? String(record.external_order_id) : undefined,
      externalSubscriptionId: record.external_subscription_id
        ? String(record.external_subscription_id)
        : undefined,
      idempotencyKey: String(record.idempotency_key ?? ''),
      retryCount: Number(record.retry_count ?? 0),
      maxRetries: Number(record.max_retries ?? 3),
      createdAt: record.created_at ? new Date(String(record.created_at)) : new Date(),
      updatedAt: record.updated_at ? new Date(String(record.updated_at)) : new Date(),
      completedAt: record.completed_at ? new Date(String(record.completed_at)) : undefined,
      failedAt: record.failed_at ? new Date(String(record.failed_at)) : undefined,
      refundedAt: record.refunded_at ? new Date(String(record.refunded_at)) : undefined,
      metadata:
        record.metadata && typeof record.metadata === 'object'
          ? (record.metadata as Record<string, unknown>)
          : {},
      errorMessage: record.error_message ? String(record.error_message) : undefined,
      errorCode: record.error_code ? String(record.error_code) : undefined,
    }
  }

  /**
   * Get payment history for user
   */
  async getPaymentHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<PaymentTransaction[]> {
    const supabase = await this.getSupabase()

    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error || !data) {
      return []
    }

    return data.map((payment: unknown) => this.mapPaymentTransaction(payment))
  }

  /**
   * Clean up old failed payments
   */
  async cleanupOldFailedPayments(daysOld: number = 30): Promise<number> {
    const supabase = await this.getSupabase()

    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)

    const { data, error } = await supabase
      .from('payment_transactions')
      .delete()
      .eq('status', 'failed')
      .lt('created_at', cutoffDate.toISOString())
      .select('id')

    if (error) {
      logger.error('Error cleaning up old failed payments:', error)
      return 0
    }

    return data?.length || 0
  }
}

// Export singleton instance
export const paymentStateMachine = new PaymentStateMachine()
