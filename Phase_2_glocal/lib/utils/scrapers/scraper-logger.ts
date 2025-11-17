import { logger } from '@/lib/utils/logger'
/**
 * Scraper Logger
 *
 * Monitors and logs scraping activities, success/failure rates, and validation metrics
 */

interface ScraperLog {
  timestamp: string
  platform: string
  action: string
  status: 'success' | 'failure' | 'warning'
  message: string
  metadata?: Record<string, unknown>
  duration?: number
}

interface ScraperMetrics {
  platform: string
  totalAttempts: number
  successCount: number
  failureCount: number
  invalidUrls: number
  rateLimitHits: number
  robotsViolations: number
  averageResponseTime: number
  lastSuccess?: string
  lastFailure?: string
}

export class ScraperLogger {
  private logs: ScraperLog[] = []
  private metrics: Map<string, ScraperMetrics> = new Map()
  private readonly maxLogs = 1000 // Keep last 1000 logs in memory

  /**
   * Log a scraping activity
   */
  log(
    platform: string,
    action: string,
    status: 'success' | 'failure' | 'warning',
    message: string,
    metadata?: Record<string, unknown>,
    duration?: number
  ) {
    const log: ScraperLog = {
      timestamp: new Date().toISOString(),
      platform,
      action,
      status,
      message,
      metadata,
      duration,
    }

    this.logs.push(log)

    // Trim logs if exceeds max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Update metrics
    this.updateMetrics(platform, status, duration)

    // Console output
    const emoji = status === 'success' ? '✓' : status === 'failure' ? '✗' : '⚠'
    const durationStr = duration ? ` (${duration}ms)` : ''
    logger.info(`[${platform}] ${emoji} ${action}: ${message}${durationStr}`)

    if (metadata && Object.keys(metadata).length > 0) {
      logger.info('  Metadata:', JSON.stringify(metadata, null, 2))
    }
  }

  /**
   * Log successful scraping
   */
  success(
    platform: string,
    action: string,
    message: string,
    metadata?: Record<string, unknown>,
    duration?: number
  ) {
    this.log(platform, action, 'success', message, metadata, duration)
  }

  /**
   * Log failed scraping
   */
  failure(
    platform: string,
    action: string,
    message: string,
    metadata?: Record<string, unknown>,
    duration?: number
  ) {
    this.log(platform, action, 'failure', message, metadata, duration)
  }

  /**
   * Log warning
   */
  warning(platform: string, action: string, message: string, metadata?: Record<string, unknown>) {
    this.log(platform, action, 'warning', message, metadata)
  }

  /**
   * Log invalid URL detection
   */
  invalidUrl(platform: string, url: string, reason: string) {
    this.log(platform, 'url_validation', 'failure', `Invalid URL: ${url}`, { reason })

    const metrics = this.getOrCreateMetrics(platform)
    metrics.invalidUrls++
  }

  /**
   * Log rate limit hit
   */
  rateLimitHit(platform: string, message: string) {
    this.log(platform, 'rate_limit', 'warning', message)

    const metrics = this.getOrCreateMetrics(platform)
    metrics.rateLimitHits++
  }

  /**
   * Log robots.txt violation
   */
  robotsViolation(platform: string, url: string) {
    this.log(platform, 'robots_check', 'warning', `Blocked by robots.txt: ${url}`)

    const metrics = this.getOrCreateMetrics(platform)
    metrics.robotsViolations++
  }

  /**
   * Update metrics for a platform
   */
  private updateMetrics(
    platform: string,
    status: 'success' | 'failure' | 'warning',
    duration?: number
  ) {
    const metrics = this.getOrCreateMetrics(platform)

    metrics.totalAttempts++

    if (status === 'success') {
      metrics.successCount++
      metrics.lastSuccess = new Date().toISOString()
    } else if (status === 'failure') {
      metrics.failureCount++
      metrics.lastFailure = new Date().toISOString()
    }

    if (duration) {
      // Calculate running average
      const totalTime = metrics.averageResponseTime * (metrics.successCount - 1)
      metrics.averageResponseTime = (totalTime + duration) / metrics.successCount
    }
  }

  /**
   * Get or create metrics for a platform
   */
  private getOrCreateMetrics(platform: string): ScraperMetrics {
    if (!this.metrics.has(platform)) {
      this.metrics.set(platform, {
        platform,
        totalAttempts: 0,
        successCount: 0,
        failureCount: 0,
        invalidUrls: 0,
        rateLimitHits: 0,
        robotsViolations: 0,
        averageResponseTime: 0,
      })
    }
    return this.metrics.get(platform)!
  }

  /**
   * Get metrics for a platform
   */
  getMetrics(platform: string): ScraperMetrics | undefined {
    return this.metrics.get(platform)
  }

  /**
   * Get metrics for all platforms
   */
  getAllMetrics(): ScraperMetrics[] {
    return Array.from(this.metrics.values())
  }

  /**
   * Get recent logs
   */
  getRecentLogs(platform?: string, limit: number = 50): ScraperLog[] {
    let logs = this.logs

    if (platform) {
      logs = logs.filter((log) => log.platform === platform)
    }

    return logs.slice(-limit)
  }

  /**
   * Get logs by status
   */
  getLogsByStatus(status: 'success' | 'failure' | 'warning', limit: number = 50): ScraperLog[] {
    return this.logs.filter((log) => log.status === status).slice(-limit)
  }

  /**
   * Generate summary report
   */
  generateReport(): string {
    const report: string[] = []
    report.push('\n=== Scraper Activity Report ===\n')

    for (const metrics of this.metrics.values()) {
      const successRate =
        metrics.totalAttempts > 0
          ? ((metrics.successCount / metrics.totalAttempts) * 100).toFixed(2)
          : '0.00'

      report.push(`Platform: ${metrics.platform}`)
      report.push(`  Total Attempts: ${metrics.totalAttempts}`)
      report.push(`  Success: ${metrics.successCount} (${successRate}%)`)
      report.push(`  Failures: ${metrics.failureCount}`)
      report.push(`  Invalid URLs: ${metrics.invalidUrls}`)
      report.push(`  Rate Limit Hits: ${metrics.rateLimitHits}`)
      report.push(`  Robots Violations: ${metrics.robotsViolations}`)
      report.push(`  Avg Response Time: ${metrics.averageResponseTime.toFixed(0)}ms`)
      if (metrics.lastSuccess) {
        report.push(`  Last Success: ${new Date(metrics.lastSuccess).toLocaleString()}`)
      }
      if (metrics.lastFailure) {
        report.push(`  Last Failure: ${new Date(metrics.lastFailure).toLocaleString()}`)
      }
      report.push('')
    }

    return report.join('\n')
  }

  /**
   * Clear logs and metrics
   */
  clear(platform?: string) {
    if (platform) {
      this.logs = this.logs.filter((log) => log.platform !== platform)
      this.metrics.delete(platform)
    } else {
      this.logs = []
      this.metrics.clear()
    }
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): ScraperLog[] {
    return [...this.logs]
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): ScraperMetrics[] {
    return this.getAllMetrics()
  }
}

// Global scraper logger instance
export const scraperLogger = new ScraperLogger()
