/**
 * API Budget Monitor
 * Monitors external API usage and budget limits
 */

import { logger } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/server'
import { redis } from '@/lib/redis/client'

export interface APIBudgetConfig {
  serviceName: string
  dailyBudgetUsd: number
  monthlyBudgetUsd: number
  warningThreshold: number // 0.8 = 80%
  criticalThreshold: number // 0.95 = 95%
  requestsPerMinute: number
  requestsPerHour: number
  requestsPerDay: number
  costPerRequest: number
  costPerToken: number
  costPerMb: number
  isActive: boolean
  autoDisableOnBudgetExceeded: boolean
}

export interface APIUsageStats {
  serviceName: string
  totalCost: number
  totalRequests: number
  avgDailyCost: number
  avgResponseTime: number
  errorRate: number
}

export interface BudgetStatus {
  serviceName: string
  period: 'daily' | 'monthly'
  budgetLimit: number
  currentUsage: number
  usagePercentage: number
  status: 'normal' | 'warning' | 'critical'
  daysRemaining: number
}

export interface APIUsageLog {
  serviceName: string
  endpoint: string
  method: string
  requestUrl?: string
  responseStatus?: number
  costUsd: number
  tokensUsed: number
  responseTimeMs?: number
  userId?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
}

export class APIBudgetMonitor {
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
   * Log API usage
   */
  async logAPIUsage(log: APIUsageLog): Promise<string | null> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase.rpc('log_api_usage', {
        p_service_name: log.serviceName,
        p_endpoint: log.endpoint,
        p_method: log.method,
        p_request_url: log.requestUrl,
        p_response_status: log.responseStatus,
        p_cost_usd: log.costUsd,
        p_tokens_used: log.tokensUsed,
        p_response_time_ms: log.responseTimeMs,
        p_user_id: log.userId,
        p_session_id: log.sessionId,
        p_ip_address: log.ipAddress,
        p_user_agent: log.userAgent,
      })

      if (error) {
        logger.error('Error logging API usage:', error)
        return null
      }

      return data as string | null
    } catch (error) {
      logger.error('Failed to log API usage:', error)
      return null
    }
  }

  /**
   * Check budget status for a service
   */
  async checkBudgetStatus(
    serviceName: string,
    period: 'daily' | 'monthly' = 'daily'
  ): Promise<BudgetStatus | null> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase.rpc('check_budget_status', {
        p_service_name: serviceName,
        p_period: period,
      })

      if (error || !data || !Array.isArray(data) || data.length === 0) {
        return null
      }

      const status = data[0] as {
        service_name: string
        period: string
        budget_limit: string
        current_usage: string
        usage_percentage: string
        status: string
        days_remaining: string
      }
      return {
        serviceName: status.service_name,
        period: status.period as 'daily' | 'monthly',
        budgetLimit: parseFloat(status.budget_limit),
        currentUsage: parseFloat(status.current_usage),
        usagePercentage: parseFloat(status.usage_percentage),
        status: status.status as 'normal' | 'warning' | 'critical',
        daysRemaining: parseInt(status.days_remaining),
      }
    } catch (error) {
      logger.error('Failed to check budget status:', error)
      return null
    }
  }

  /**
   * Get daily usage for a service
   */
  async getDailyUsage(
    serviceName: string,
    date: Date = new Date()
  ): Promise<{
    totalCost: number
    totalRequests: number
    totalTokens: number
    avgResponseTime: number
    errorCount: number
  }> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase.rpc('get_daily_api_usage', {
        p_service_name: serviceName,
        p_date: date.toISOString().split('T')[0],
      })

      if (error || !data || !Array.isArray(data) || data.length === 0) {
        return {
          totalCost: 0,
          totalRequests: 0,
          totalTokens: 0,
          avgResponseTime: 0,
          errorCount: 0,
        }
      }

      const usage = data[0] as {
        total_cost: string
        total_requests: string
        total_tokens: string
        avg_response_time: string
        error_count: string
      }
      return {
        totalCost: parseFloat(usage.total_cost) || 0,
        totalRequests: parseInt(usage.total_requests) || 0,
        totalTokens: parseInt(usage.total_tokens) || 0,
        avgResponseTime: parseFloat(usage.avg_response_time) || 0,
        errorCount: parseInt(usage.error_count) || 0,
      }
    } catch (error) {
      logger.error('Failed to get daily usage:', error)
      return {
        totalCost: 0,
        totalRequests: 0,
        totalTokens: 0,
        avgResponseTime: 0,
        errorCount: 0,
      }
    }
  }

  /**
   * Get monthly usage for a service
   */
  async getMonthlyUsage(
    serviceName: string,
    year: number = new Date().getFullYear(),
    month: number = new Date().getMonth() + 1
  ): Promise<{
    totalCost: number
    totalRequests: number
    totalTokens: number
    avgResponseTime: number
    errorCount: number
  }> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase.rpc('get_monthly_api_usage', {
        p_service_name: serviceName,
        p_year: year,
        p_month: month,
      })

      if (error || !data || !Array.isArray(data) || data.length === 0) {
        return {
          totalCost: 0,
          totalRequests: 0,
          totalTokens: 0,
          avgResponseTime: 0,
          errorCount: 0,
        }
      }

      const usage = data[0] as {
        total_cost: string
        total_requests: string
        total_tokens: string
        avg_response_time: string
        error_count: string
      }
      return {
        totalCost: parseFloat(usage.total_cost) || 0,
        totalRequests: parseInt(usage.total_requests) || 0,
        totalTokens: parseInt(usage.total_tokens) || 0,
        avgResponseTime: parseFloat(usage.avg_response_time) || 0,
        errorCount: parseInt(usage.error_count) || 0,
      }
    } catch (error) {
      logger.error('Failed to get monthly usage:', error)
      return {
        totalCost: 0,
        totalRequests: 0,
        totalTokens: 0,
        avgResponseTime: 0,
        errorCount: 0,
      }
    }
  }

  /**
   * Get usage statistics for all services
   */
  async getUsageStats(daysBack: number = 7): Promise<APIUsageStats[]> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase.rpc('get_api_usage_stats', {
        p_days_back: daysBack,
      })

      if (error || !data || !Array.isArray(data)) {
        return []
      }

      return data.map(
        (stat: {
          service_name: string
          total_cost: string | number
          total_requests: string | number
          avg_daily_cost: string | number
          avg_response_time: string | number
          error_rate: string | number
        }) => ({
          serviceName: stat.service_name,
          totalCost: parseFloat(String(stat.total_cost)) || 0,
          totalRequests: parseInt(String(stat.total_requests)) || 0,
          avgDailyCost: parseFloat(String(stat.avg_daily_cost)) || 0,
          avgResponseTime: parseFloat(String(stat.avg_response_time)) || 0,
          errorRate: parseFloat(String(stat.error_rate)) || 0,
        })
      )
    } catch (error) {
      logger.error('Failed to get usage stats:', error)
      return []
    }
  }

  /**
   * Get top endpoints by cost
   */
  async getTopEndpointsByCost(
    serviceName: string,
    daysBack: number = 7,
    limit: number = 10
  ): Promise<
    {
      endpoint: string
      totalCost: number
      totalRequests: number
      avgCostPerRequest: number
    }[]
  > {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase.rpc('get_top_endpoints_by_cost', {
        p_service_name: serviceName,
        p_days_back: daysBack,
        p_limit: limit,
      })

      if (error || !data || !Array.isArray(data)) {
        return []
      }

      return data.map((endpoint: unknown) => {
        if (!endpoint || typeof endpoint !== 'object') {
          return {
            endpoint: '',
            totalCost: 0,
            totalRequests: 0,
            avgCostPerRequest: 0,
          }
        }
        const endpointRecord = endpoint as Record<string, unknown>
        return {
          endpoint: String(endpointRecord.endpoint ?? ''),
          totalCost: parseFloat(String(endpointRecord.total_cost ?? 0)) || 0,
          totalRequests: parseInt(String(endpointRecord.total_requests ?? 0)) || 0,
          avgCostPerRequest: parseFloat(String(endpointRecord.avg_cost_per_request ?? 0)) || 0,
        }
      })
    } catch (error) {
      logger.error('Failed to get top endpoints:', error)
      return []
    }
  }

  /**
   * Get user API usage
   */
  async getUserUsage(
    userId: string,
    daysBack: number = 30
  ): Promise<
    {
      serviceName: string
      totalCost: number
      totalRequests: number
      lastUsed: Date
    }[]
  > {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase.rpc('get_user_api_usage', {
        p_user_id: userId,
        p_days_back: daysBack,
      })

      if (error || !data || !Array.isArray(data)) {
        return []
      }

      return data.map((usage: unknown) => {
        if (!usage || typeof usage !== 'object') {
          return {
            serviceName: '',
            totalCost: 0,
            totalRequests: 0,
            lastUsed: new Date(),
          }
        }
        const usageRecord = usage as Record<string, unknown>
        return {
          serviceName: String(usageRecord.service_name ?? ''),
          totalCost: parseFloat(String(usageRecord.total_cost ?? 0)) || 0,
          totalRequests: parseInt(String(usageRecord.total_requests ?? 0)) || 0,
          lastUsed: new Date(String(usageRecord.last_used ?? '')),
        }
      })
    } catch (error) {
      logger.error('Failed to get user usage:', error)
      return []
    }
  }

  /**
   * Check if service should be rate limited
   */
  async shouldRateLimit(serviceName: string): Promise<boolean> {
    try {
      const budgetStatus = await this.checkBudgetStatus(serviceName, 'daily')
      if (!budgetStatus) {
        return false
      }

      // Rate limit if usage is above critical threshold
      return budgetStatus.status === 'critical'
    } catch (error) {
      logger.error('Failed to check rate limit:', error)
      return false
    }
  }

  /**
   * Send budget alert
   */
  async sendBudgetAlert(
    serviceName: string,
    status: 'warning' | 'critical',
    usage: number,
    limit: number
  ): Promise<void> {
    try {
      const alert = {
        serviceName,
        status,
        usage,
        limit,
        percentage: (usage / limit) * 100,
        timestamp: new Date().toISOString(),
      }

      // Store alert in Redis for immediate notification
      await redis.setex(
        `budget_alert:${serviceName}:${Date.now()}`,
        3600, // 1 hour TTL
        JSON.stringify(alert)
      )

      // In production, you would also:
      // 1. Send email to admins
      // 2. Send Slack notification
      // 3. Create support ticket
      logger.warn(`Budget alert for ${serviceName}:`, alert)
    } catch (error) {
      logger.error('Failed to send budget alert:', error)
    }
  }

  /**
   * Monitor all services for budget alerts
   */
  async monitorBudgetAlerts(): Promise<void> {
    try {
      const services = ['google_maps', 'news_api', 'reddit_api', 'openai']

      for (const service of services) {
        const dailyStatus = await this.checkBudgetStatus(service, 'daily')
        const monthlyStatus = await this.checkBudgetStatus(service, 'monthly')

        if (dailyStatus && dailyStatus.status !== 'normal') {
          await this.sendBudgetAlert(
            service,
            dailyStatus.status,
            dailyStatus.currentUsage,
            dailyStatus.budgetLimit
          )
        }

        if (monthlyStatus && monthlyStatus.status !== 'normal') {
          await this.sendBudgetAlert(
            service,
            monthlyStatus.status,
            monthlyStatus.currentUsage,
            monthlyStatus.budgetLimit
          )
        }
      }
    } catch (error) {
      logger.error('Failed to monitor budget alerts:', error)
    }
  }

  /**
   * Get budget configuration
   */
  async getBudgetConfig(serviceName: string): Promise<APIBudgetConfig | null> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase
        .from('api_budget_config')
        .select('*')
        .eq('service_name', serviceName)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        return null
      }

      const config = data as {
        service_name: string
        daily_budget_usd: string | number
        monthly_budget_usd: string | number
        warning_threshold: string | number
        critical_threshold: string | number
        requests_per_minute: number
        requests_per_hour: number
        requests_per_day: number
        cost_per_request: string | number
        cost_per_token: string | number
        cost_per_mb: string | number
        is_active: boolean
        auto_disable_on_budget_exceeded: boolean
      }

      return {
        serviceName: config.service_name,
        dailyBudgetUsd: parseFloat(String(config.daily_budget_usd)),
        monthlyBudgetUsd: parseFloat(String(config.monthly_budget_usd)),
        warningThreshold: parseFloat(String(config.warning_threshold)),
        criticalThreshold: parseFloat(String(config.critical_threshold)),
        requestsPerMinute: config.requests_per_minute,
        requestsPerHour: config.requests_per_hour,
        requestsPerDay: config.requests_per_day,
        costPerRequest: parseFloat(String(config.cost_per_request)),
        costPerToken: parseFloat(String(config.cost_per_token)),
        costPerMb: parseFloat(String(config.cost_per_mb)),
        isActive: config.is_active,
        autoDisableOnBudgetExceeded: config.auto_disable_on_budget_exceeded,
      }
    } catch (error) {
      logger.error('Failed to get budget config:', error)
      return null
    }
  }

  /**
   * Update budget configuration
   */
  async updateBudgetConfig(
    serviceName: string,
    updates: Partial<APIBudgetConfig>
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()

      const { error } = await supabase
        .from('api_budget_config')
        .update(updates)
        .eq('service_name', serviceName)

      if (error) {
        logger.error('Error updating budget config:', error)
        return false
      }

      return true
    } catch (error) {
      logger.error('Failed to update budget config:', error)
      return false
    }
  }

  /**
   * Calculate estimated cost for API call
   */
  async calculateAPICost(
    serviceName: string,
    _endpoint: string,
    tokensUsed?: number,
    dataTransferred?: number
  ): Promise<number> {
    try {
      const config = await this.getBudgetConfig(serviceName)
      if (!config) {
        return 0
      }

      let cost = config.costPerRequest

      if (tokensUsed) {
        cost += tokensUsed * config.costPerToken
      }

      if (dataTransferred) {
        cost += (dataTransferred / (1024 * 1024)) * config.costPerMb
      }

      return cost
    } catch (error) {
      logger.error('Failed to calculate API cost:', error)
      return 0
    }
  }
}

// Export singleton instance
export const apiBudgetMonitor = new APIBudgetMonitor()
