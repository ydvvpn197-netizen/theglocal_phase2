/**
 * Mass Report Detector
 * Detects and handles coordinated or suspicious reporting patterns
 */

import { logger } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/server'
export interface MassReportingEvent {
  id: string
  contentType: 'post' | 'comment' | 'artist'
  contentId: string
  reportCount: number
  uniqueReporters: number
  firstReportAt: Date
  lastReportAt: Date
  detectionThreshold: number
  timeWindowHours: number
  status: 'detected' | 'reviewed' | 'resolved' | 'dismissed'
  autoActionTaken: 'flagged' | 'hidden' | 'suspended' | 'none'
  manualReviewRequired: boolean
  reporterAnalysis: Record<string, unknown>
  suspiciousPatterns: string[]
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
  reviewedBy?: string
  resolutionNotes?: string
}

export interface ReportingPattern {
  id: string
  patternType: 'coordinated' | 'spam' | 'harassment' | 'fake'
  patternDescription: string
  minReports: number
  timeWindowMinutes: number
  reporterOverlapThreshold: number
  isActive: boolean
  confidenceThreshold: number
}

export interface MassReportingConfig {
  defaultThreshold: number
  defaultTimeWindowHours: number
  autoActionThreshold: number
  manualReviewThreshold: number
  cooldownPeriodHours: number
}

const DEFAULT_CONFIG: MassReportingConfig = {
  defaultThreshold: 5,
  defaultTimeWindowHours: 1,
  autoActionThreshold: 8,
  manualReviewThreshold: 3,
  cooldownPeriodHours: 24,
}

export class MassReportDetector {
  private config: MassReportingConfig

  constructor(config: Partial<MassReportingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Detect mass reporting for content
   */
  async detectMassReporting(
    contentType: 'post' | 'comment' | 'artist',
    contentId: string,
    threshold?: number,
    timeWindowHours?: number
  ): Promise<boolean> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase.rpc('detect_mass_reporting', {
        p_content_type: contentType,
        p_content_id: contentId,
        p_threshold: threshold || this.config.defaultThreshold,
        p_time_window_hours: timeWindowHours || this.config.defaultTimeWindowHours,
      })

      if (error) {
        logger.error('Error detecting mass reporting:', error)
        return false
      }

      return data === true
    } catch (error) {
      logger.error('Failed to detect mass reporting:', error)
      return false
    }
  }

  /**
   * Create mass reporting event
   */
  async createMassReportingEvent(
    contentType: 'post' | 'comment' | 'artist',
    contentId: string,
    threshold?: number,
    timeWindowHours?: number
  ): Promise<string | null> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase.rpc('create_mass_reporting_event', {
        p_content_type: contentType,
        p_content_id: contentId,
        p_threshold: threshold || this.config.defaultThreshold,
        p_time_window_hours: timeWindowHours || this.config.defaultTimeWindowHours,
      })

      if (error) {
        logger.error('Error creating mass reporting event:', error)
        return null
      }

      return data
    } catch (error) {
      logger.error('Failed to create mass reporting event:', error)
      return null
    }
  }

  /**
   * Get mass reporting events for review
   */
  async getEventsForReview(limit: number = 50): Promise<MassReportingEvent[]> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase.rpc('get_mass_reporting_for_review', {
        p_limit: limit,
      })

      if (error || !data) {
        return []
      }

      return data.map((event: unknown) => this.mapMassReportingEvent(event))
    } catch (error) {
      logger.error('Failed to get events for review:', error)
      return []
    }
  }

  /**
   * Resolve mass reporting event
   */
  async resolveEvent(
    eventId: string,
    resolution: 'dismissed' | 'action_taken' | 'escalated',
    reviewedBy: string,
    resolutionNotes?: string
  ): Promise<boolean> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase.rpc('resolve_mass_reporting_event', {
        p_event_id: eventId,
        p_resolution: resolution,
        p_reviewed_by: reviewedBy,
        p_resolution_notes: resolutionNotes,
      })

      if (error) {
        logger.error('Error resolving mass reporting event:', error)
        return false
      }

      return data === true
    } catch (error) {
      logger.error('Failed to resolve mass reporting event:', error)
      return false
    }
  }

  /**
   * Get mass reporting statistics
   */
  async getStatistics(daysBack: number = 7): Promise<{
    totalEvents: number
    detectedEvents: number
    resolvedEvents: number
    dismissedEvents: number
    avgReportsPerEvent: number
    mostCommonPatterns: string[]
  }> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase.rpc('get_mass_reporting_stats', {
        p_days_back: daysBack,
      })

      if (error || !data || data.length === 0) {
        return {
          totalEvents: 0,
          detectedEvents: 0,
          resolvedEvents: 0,
          dismissedEvents: 0,
          avgReportsPerEvent: 0,
          mostCommonPatterns: [],
        }
      }

      const stats = data[0]
      return {
        totalEvents: parseInt(stats.total_events) || 0,
        detectedEvents: parseInt(stats.detected_events) || 0,
        resolvedEvents: parseInt(stats.resolved_events) || 0,
        dismissedEvents: parseInt(stats.dismissed_events) || 0,
        avgReportsPerEvent: parseFloat(stats.avg_reports_per_event) || 0,
        mostCommonPatterns: stats.most_common_patterns || [],
      }
    } catch (error) {
      logger.error('Failed to get mass reporting statistics:', error)
      return {
        totalEvents: 0,
        detectedEvents: 0,
        resolvedEvents: 0,
        dismissedEvents: 0,
        avgReportsPerEvent: 0,
        mostCommonPatterns: [],
      }
    }
  }

  /**
   * Analyze reporter patterns
   */
  async analyzeReporterPatterns(
    contentId: string,
    contentType: string
  ): Promise<{
    isCoordinated: boolean
    isSpam: boolean
    isHarassment: boolean
    confidence: number
    patterns: string[]
  }> {
    try {
      const supabase = await createClient()

      // Get recent reports for this content
      const { data: reports, error } = await supabase
        .from('reports')
        .select('reported_by, created_at, reason')
        .eq('content_id', contentId)
        .eq('content_type', contentType)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false })

      if (error || !reports || reports.length === 0) {
        return {
          isCoordinated: false,
          isSpam: false,
          isHarassment: false,
          confidence: 0,
          patterns: [],
        }
      }

      const analysis = this.analyzeReportPatterns(reports)
      return analysis
    } catch (error) {
      logger.error('Failed to analyze reporter patterns:', error)
      return {
        isCoordinated: false,
        isSpam: false,
        isHarassment: false,
        confidence: 0,
        patterns: [],
      }
    }
  }

  /**
   * Check if content should be auto-moderated
   */
  async shouldAutoModerate(
    contentType: 'post' | 'comment' | 'artist',
    contentId: string
  ): Promise<{
    shouldModerate: boolean
    action: 'flag' | 'hide' | 'suspend' | 'none'
    confidence: number
    reason: string
  }> {
    try {
      const isMassReporting = await this.detectMassReporting(contentType, contentId)

      if (!isMassReporting) {
        return {
          shouldModerate: false,
          action: 'none',
          confidence: 0,
          reason: 'No mass reporting detected',
        }
      }

      // Analyze patterns to determine action
      const analysis = await this.analyzeReporterPatterns(contentId, contentType)

      if (analysis.isCoordinated && analysis.confidence > 0.8) {
        return {
          shouldModerate: true,
          action: 'suspend',
          confidence: analysis.confidence,
          reason: 'Coordinated mass reporting detected',
        }
      } else if (analysis.isSpam && analysis.confidence > 0.7) {
        return {
          shouldModerate: true,
          action: 'hide',
          confidence: analysis.confidence,
          reason: 'Spam reporting pattern detected',
        }
      } else if (analysis.isHarassment && analysis.confidence > 0.6) {
        return {
          shouldModerate: true,
          action: 'flag',
          confidence: analysis.confidence,
          reason: 'Harassment reporting pattern detected',
        }
      } else {
        return {
          shouldModerate: true,
          action: 'flag',
          confidence: analysis.confidence,
          reason: 'Mass reporting detected, manual review required',
        }
      }
    } catch (error) {
      logger.error('Failed to check auto-moderation:', error)
      return {
        shouldModerate: false,
        action: 'none',
        confidence: 0,
        reason: 'Error analyzing content',
      }
    }
  }

  /**
   * Get reporting patterns configuration
   */
  async getReportingPatterns(): Promise<ReportingPattern[]> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('reporting_patterns')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error || !data) {
        return []
      }

      return data.map((pattern: unknown) => this.mapReportingPattern(pattern))
    } catch (error) {
      logger.error('Failed to get reporting patterns:', error)
      return []
    }
  }

  /**
   * Update reporting pattern
   */
  async updateReportingPattern(
    patternId: string,
    updates: Partial<ReportingPattern>
  ): Promise<boolean> {
    try {
      const supabase = await createClient()

      const { error } = await supabase
        .from('reporting_patterns')
        .update(updates)
        .eq('id', patternId)

      if (error) {
        logger.error('Error updating reporting pattern:', error)
        return false
      }

      return true
    } catch (error) {
      logger.error('Failed to update reporting pattern:', error)
      return false
    }
  }

  /**
   * Analyze report patterns for suspicious behavior
   */
  private analyzeReportPatterns(reports: unknown[]): {
    isCoordinated: boolean
    isSpam: boolean
    isHarassment: boolean
    confidence: number
    patterns: string[]
  } {
    const uniqueReporters = new Set(
      reports
        .map((r) => {
          const report = r as { reported_by?: string }
          return report.reported_by
        })
        .filter((id): id is string => typeof id === 'string')
    )
    const reportCount = reports.length
    const uniqueCount = uniqueReporters.size

    // Calculate overlap ratio
    const overlapRatio = uniqueCount > 0 ? reportCount / uniqueCount : 0

    // Time analysis
    const timeSpan =
      reports.length > 1
        ? (() => {
            const first = reports[0] as { created_at?: string | Date }
            const last = reports[reports.length - 1] as { created_at?: string | Date }
            if (first.created_at && last.created_at) {
              return new Date(first.created_at).getTime() - new Date(last.created_at).getTime()
            }
            return 0
          })()
        : 0
    const reportsPerHour = timeSpan > 0 ? reportCount / (timeSpan / (1000 * 60 * 60)) : 0

    const patterns: string[] = []
    let confidence = 0

    // Check for coordinated reporting
    if (uniqueCount >= 3 && overlapRatio < 2.0 && reportsPerHour > 2) {
      patterns.push('coordinated')
      confidence += 0.4
    }

    // Check for spam reporting
    if (reportCount >= 10 && overlapRatio > 5.0) {
      patterns.push('spam')
      confidence += 0.3
    }

    // Check for harassment pattern
    if (uniqueCount >= 5 && reportCount >= 8 && reportsPerHour > 1) {
      patterns.push('harassment')
      confidence += 0.3
    }

    return {
      isCoordinated: patterns.includes('coordinated'),
      isSpam: patterns.includes('spam'),
      isHarassment: patterns.includes('harassment'),
      confidence: Math.min(confidence, 1.0),
      patterns,
    }
  }

  /**
   * Map database record to MassReportingEvent
   */
  private mapMassReportingEvent(data: unknown): MassReportingEvent {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid mass reporting event data')
    }
    const record = data as Record<string, unknown>

    // Type guards for union types
    const contentType = record.content_type
    const isValidContentType = (type: unknown): type is 'post' | 'comment' | 'artist' => {
      return type === 'post' || type === 'comment' || type === 'artist'
    }

    const status = record.status
    const isValidStatus = (s: unknown): s is 'detected' | 'reviewed' | 'resolved' | 'dismissed' => {
      return s === 'detected' || s === 'reviewed' || s === 'resolved' || s === 'dismissed'
    }

    const autoActionTaken = record.auto_action_taken
    const isValidAutoAction = (
      action: unknown
    ): action is 'flagged' | 'hidden' | 'suspended' | 'none' => {
      return (
        action === 'flagged' || action === 'hidden' || action === 'suspended' || action === 'none'
      )
    }

    return {
      id: String(record.id ?? ''),
      contentType: isValidContentType(contentType) ? contentType : ('post' as const),
      contentId: String(record.content_id ?? ''),
      reportCount: Number(record.report_count ?? 0),
      uniqueReporters: Number(record.unique_reporters ?? 0),
      firstReportAt: new Date(String(record.first_report_at ?? '')),
      lastReportAt: new Date(String(record.last_report_at ?? '')),
      detectionThreshold: Number(record.detection_threshold ?? 0),
      timeWindowHours: Number(record.time_window_hours ?? 0),
      status: isValidStatus(status) ? status : ('detected' as const),
      autoActionTaken: isValidAutoAction(autoActionTaken) ? autoActionTaken : ('none' as const),
      manualReviewRequired: Boolean(record.manual_review_required ?? false),
      reporterAnalysis: (record.reporter_analysis && typeof record.reporter_analysis === 'object'
        ? record.reporter_analysis
        : {}) as Record<string, unknown>,
      suspiciousPatterns: Array.isArray(record.suspicious_patterns)
        ? record.suspicious_patterns
        : [],
      createdAt: new Date(String(record.created_at ?? '')),
      updatedAt: new Date(String(record.updated_at ?? '')),
      resolvedAt: record.resolved_at ? new Date(String(record.resolved_at)) : undefined,
      reviewedBy: record.reviewed_by ? String(record.reviewed_by) : undefined,
      resolutionNotes: record.resolution_notes ? String(record.resolution_notes) : undefined,
    }
  }

  /**
   * Map database record to ReportingPattern
   */
  private mapReportingPattern(data: unknown): ReportingPattern {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid reporting pattern data')
    }
    const record = data as Record<string, unknown>

    // Type guard for patternType
    const patternType = record.pattern_type
    const isValidPatternType = (
      type: unknown
    ): type is 'coordinated' | 'spam' | 'harassment' | 'fake' => {
      return type === 'coordinated' || type === 'spam' || type === 'harassment' || type === 'fake'
    }

    return {
      id: String(record.id ?? ''),
      patternType: isValidPatternType(patternType) ? patternType : ('coordinated' as const),
      patternDescription: String(record.pattern_description ?? ''),
      minReports: Number(record.min_reports ?? 0),
      timeWindowMinutes: Number(record.time_window_minutes ?? 0),
      reporterOverlapThreshold: Number(record.reporter_overlap_threshold ?? 0),
      isActive: Boolean(record.is_active ?? false),
      confidenceThreshold: Number(record.confidence_threshold ?? 0),
    }
  }
}

// Export singleton instance
export const massReportDetector = new MassReportDetector()
