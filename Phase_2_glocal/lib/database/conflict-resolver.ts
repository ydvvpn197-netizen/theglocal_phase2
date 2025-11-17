/**
 * Conflict Resolver
 * Handles data conflicts and implements resolution strategies
 */

import { logger } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/server'

export interface ConflictResolution {
  id: string
  tableName: string
  recordId: string
  conflictType: 'update' | 'delete' | 'insert'
  conflictData: Record<string, unknown>
  resolutionStrategy: 'last_write_wins' | 'first_write_wins' | 'merge' | 'manual'
  resolvedBy?: string
  resolvedAt?: Date
  resolutionData?: Record<string, unknown>
  status: 'pending' | 'resolved' | 'escalated'
}

export interface ConflictResolutionConfig {
  autoResolveConflicts: boolean
  defaultStrategy: 'last_write_wins' | 'first_write_wins' | 'merge'
  escalationThreshold: number
  notificationEnabled: boolean
}

const DEFAULT_CONFIG: ConflictResolutionConfig = {
  autoResolveConflicts: true,
  defaultStrategy: 'last_write_wins',
  escalationThreshold: 3,
  notificationEnabled: true,
}

export class ConflictResolver {
  private config: ConflictResolutionConfig

  constructor(config: Partial<ConflictResolutionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Resolve update conflict
   */
  async resolveUpdateConflict(
    tableName: string,
    recordId: string,
    currentData: Record<string, unknown>,
    incomingData: Record<string, unknown>,
    strategy?: 'last_write_wins' | 'first_write_wins' | 'merge'
  ): Promise<ConflictResolution> {
    const conflictId = this.generateConflictId()
    const resolutionStrategy = strategy || this.config.defaultStrategy

    const conflict: ConflictResolution = {
      id: conflictId,
      tableName,
      recordId,
      conflictType: 'update',
      conflictData: {
        current: currentData,
        incoming: incomingData,
        timestamp: new Date().toISOString(),
      },
      resolutionStrategy,
      status: 'pending',
    }

    if (this.config.autoResolveConflicts) {
      const resolvedData = await this.applyResolutionStrategy(conflict, currentData, incomingData)

      if (resolvedData) {
        conflict.status = 'resolved'
        conflict.resolvedAt = new Date()
        conflict.resolutionData = resolvedData
      } else {
        conflict.status = 'escalated'
      }
    }

    await this.logConflict(conflict)
    return conflict
  }

  /**
   * Resolve delete conflict
   */
  async resolveDeleteConflict(
    tableName: string,
    recordId: string,
    currentData: Record<string, unknown>,
    deleteReason: string
  ): Promise<ConflictResolution> {
    const conflictId = this.generateConflictId()

    const conflict: ConflictResolution = {
      id: conflictId,
      tableName,
      recordId,
      conflictType: 'delete',
      conflictData: {
        current: currentData,
        deleteReason,
        timestamp: new Date().toISOString(),
      },
      resolutionStrategy: 'last_write_wins',
      status: 'pending',
    }

    if (this.config.autoResolveConflicts) {
      // For delete conflicts, we typically allow the delete
      conflict.status = 'resolved'
      conflict.resolvedAt = new Date()
      conflict.resolutionData = { action: 'delete' }
    }

    await this.logConflict(conflict)
    return conflict
  }

  /**
   * Resolve insert conflict
   */
  async resolveInsertConflict(
    tableName: string,
    recordId: string,
    existingData: Record<string, unknown>,
    incomingData: Record<string, unknown>
  ): Promise<ConflictResolution> {
    const conflictId = this.generateConflictId()

    const conflict: ConflictResolution = {
      id: conflictId,
      tableName,
      recordId,
      conflictType: 'insert',
      conflictData: {
        existing: existingData,
        incoming: incomingData,
        timestamp: new Date().toISOString(),
      },
      resolutionStrategy: 'last_write_wins',
      status: 'pending',
    }

    if (this.config.autoResolveConflicts) {
      // For insert conflicts, we typically use the incoming data
      conflict.status = 'resolved'
      conflict.resolvedAt = new Date()
      conflict.resolutionData = incomingData
    }

    await this.logConflict(conflict)
    return conflict
  }

  /**
   * Apply resolution strategy
   */
  private async applyResolutionStrategy(
    conflict: ConflictResolution,
    currentData: Record<string, unknown>,
    incomingData: Record<string, unknown>
  ): Promise<Record<string, unknown> | null> {
    switch (conflict.resolutionStrategy) {
      case 'last_write_wins':
        return this.lastWriteWins(currentData, incomingData)

      case 'first_write_wins':
        return this.firstWriteWins(currentData, incomingData)

      case 'merge':
        return this.mergeData(currentData, incomingData)

      default:
        return null
    }
  }

  /**
   * Last write wins strategy
   */
  private lastWriteWins(
    currentData: Record<string, unknown>,
    incomingData: Record<string, unknown>
  ): Record<string, unknown> {
    // Compare timestamps if available
    const currentTimestamp = (currentData?.updated_at || currentData?.created_at) as
      | string
      | undefined
    const incomingTimestamp = (incomingData?.updated_at || incomingData?.created_at) as
      | string
      | undefined

    if (currentTimestamp && incomingTimestamp) {
      return new Date(incomingTimestamp) > new Date(currentTimestamp) ? incomingData : currentData
    }

    // Default to incoming data if no timestamps
    return incomingData
  }

  /**
   * First write wins strategy
   */
  private firstWriteWins(
    currentData: Record<string, unknown>,
    incomingData: Record<string, unknown>
  ): Record<string, unknown> {
    // Compare timestamps if available
    const currentTimestamp = currentData.updated_at || currentData.created_at
    const incomingTimestamp = incomingData.updated_at || incomingData.created_at

    if (
      currentTimestamp &&
      incomingTimestamp &&
      typeof currentTimestamp !== 'object' &&
      typeof incomingTimestamp !== 'object'
    ) {
      const currentDate =
        typeof currentTimestamp === 'string' || typeof currentTimestamp === 'number'
          ? new Date(currentTimestamp)
          : null
      const incomingDate =
        typeof incomingTimestamp === 'string' || typeof incomingTimestamp === 'number'
          ? new Date(incomingTimestamp)
          : null

      if (currentDate && incomingDate) {
        return currentDate < incomingDate ? currentData : incomingData
      }
    }

    // Default to current data if no timestamps
    return currentData
  }

  /**
   * Merge data strategy
   */
  private mergeData(
    currentData: Record<string, unknown>,
    incomingData: Record<string, unknown>
  ): Record<string, unknown> {
    const merged = { ...currentData }

    for (const [key, value] of Object.entries(incomingData)) {
      if (value !== null && value !== undefined) {
        if (typeof value === 'object' && typeof merged[key] === 'object') {
          merged[key] = { ...merged[key], ...value }
        } else {
          merged[key] = value
        }
      }
    }

    return merged
  }

  /**
   * Log conflict for manual resolution
   */
  private async logConflict(conflict: ConflictResolution): Promise<void> {
    try {
      const supabase = await createClient()

      await supabase.from('conflict_resolutions').insert({
        id: conflict.id,
        table_name: conflict.tableName,
        record_id: conflict.recordId,
        conflict_type: conflict.conflictType,
        conflict_data: conflict.conflictData,
        resolution_strategy: conflict.resolutionStrategy,
        resolved_by: conflict.resolvedBy,
        resolved_at: conflict.resolvedAt,
        resolution_data: conflict.resolutionData,
        status: conflict.status,
      })
    } catch (error) {
      logger.error('Failed to log conflict:', error)
    }
  }

  /**
   * Get pending conflicts
   */
  async getPendingConflicts(tableName?: string, limit: number = 50): Promise<ConflictResolution[]> {
    try {
      const supabase = await createClient()

      let query = supabase
        .from('conflict_resolutions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (tableName) {
        query = query.eq('table_name', tableName)
      }

      const { data, error } = await query

      if (error || !data) {
        return []
      }

      return data.map(this.mapConflictResolution)
    } catch (error) {
      logger.error('Failed to get pending conflicts:', error)
      return []
    }
  }

  /**
   * Resolve conflict manually
   */
  async resolveConflictManually(
    conflictId: string,
    resolvedBy: string,
    resolutionData: Record<string, unknown>
  ): Promise<boolean> {
    try {
      const supabase = await createClient()

      const { error } = await supabase
        .from('conflict_resolutions')
        .update({
          status: 'resolved',
          resolved_by: resolvedBy,
          resolved_at: new Date().toISOString(),
          resolution_data: resolutionData,
        })
        .eq('id', conflictId)

      if (error) {
        logger.error('Failed to resolve conflict:', error)
        return false
      }

      return true
    } catch (error) {
      logger.error('Failed to resolve conflict:', error)
      return false
    }
  }

  /**
   * Escalate conflict
   */
  async escalateConflict(conflictId: string, reason: string): Promise<boolean> {
    try {
      const supabase = await createClient()

      const { error } = await supabase
        .from('conflict_resolutions')
        .update({
          status: 'escalated',
          escalation_reason: reason,
          escalated_at: new Date().toISOString(),
        })
        .eq('id', conflictId)

      if (error) {
        logger.error('Failed to escalate conflict:', error)
        return false
      }

      return true
    } catch (error) {
      logger.error('Failed to escalate conflict:', error)
      return false
    }
  }

  /**
   * Get conflict statistics
   */
  async getConflictStats(daysBack: number = 7): Promise<{
    totalConflicts: number
    resolvedConflicts: number
    pendingConflicts: number
    escalatedConflicts: number
    avgResolutionTime: number
  }> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('conflict_resolutions')
        .select('status, created_at, resolved_at')
        .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())

      if (error || !data) {
        return {
          totalConflicts: 0,
          resolvedConflicts: 0,
          pendingConflicts: 0,
          escalatedConflicts: 0,
          avgResolutionTime: 0,
        }
      }

      const stats = data.reduce(
        (acc, conflict) => {
          acc.totalConflicts++

          switch (conflict.status) {
            case 'resolved':
              acc.resolvedConflicts++
              if (conflict.resolved_at) {
                const resolutionTime =
                  new Date(conflict.resolved_at).getTime() - new Date(conflict.created_at).getTime()
                acc.totalResolutionTime += resolutionTime
              }
              break
            case 'pending':
              acc.pendingConflicts++
              break
            case 'escalated':
              acc.escalatedConflicts++
              break
          }

          return acc
        },
        {
          totalConflicts: 0,
          resolvedConflicts: 0,
          pendingConflicts: 0,
          escalatedConflicts: 0,
          totalResolutionTime: 0,
        }
      )

      return {
        ...stats,
        avgResolutionTime:
          stats.resolvedConflicts > 0 ? stats.totalResolutionTime / stats.resolvedConflicts : 0,
      }
    } catch (error) {
      logger.error('Failed to get conflict stats:', error)
      return {
        totalConflicts: 0,
        resolvedConflicts: 0,
        pendingConflicts: 0,
        escalatedConflicts: 0,
        avgResolutionTime: 0,
      }
    }
  }

  /**
   * Generate conflict ID
   */
  private generateConflictId(): string {
    return `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Map database record to ConflictResolution
   */
  private mapConflictResolution(data: unknown): ConflictResolution {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid conflict resolution data')
    }
    const record = data as Record<string, unknown>

    // Type guards for union types
    const conflictType = record.conflict_type
    const isValidConflictType = (type: unknown): type is 'update' | 'delete' | 'insert' => {
      return type === 'update' || type === 'delete' || type === 'insert'
    }

    const resolutionStrategy = record.resolution_strategy
    const isValidResolutionStrategy = (
      strategy: unknown
    ): strategy is 'last_write_wins' | 'first_write_wins' | 'merge' | 'manual' => {
      return (
        strategy === 'last_write_wins' ||
        strategy === 'first_write_wins' ||
        strategy === 'merge' ||
        strategy === 'manual'
      )
    }

    const status = record.status
    const isValidStatus = (s: unknown): s is 'pending' | 'resolved' | 'escalated' => {
      return s === 'pending' || s === 'resolved' || s === 'escalated'
    }

    return {
      id: String(record.id ?? ''),
      tableName: String(record.table_name ?? ''),
      recordId: String(record.record_id ?? ''),
      conflictType: isValidConflictType(conflictType) ? conflictType : ('update' as const),
      conflictData:
        record.conflict_data && typeof record.conflict_data === 'object'
          ? (record.conflict_data as Record<string, unknown>)
          : {},
      resolutionStrategy: isValidResolutionStrategy(resolutionStrategy)
        ? resolutionStrategy
        : ('last_write_wins' as const),
      resolvedBy: record.resolved_by ? String(record.resolved_by) : undefined,
      resolvedAt: record.resolved_at ? new Date(String(record.resolved_at)) : undefined,
      resolutionData:
        record.resolution_data && typeof record.resolution_data === 'object'
          ? (record.resolution_data as Record<string, unknown>)
          : undefined,
      status: isValidStatus(status) ? status : ('pending' as const),
    }
  }
}

// Export singleton instance
export const conflictResolver = new ConflictResolver()

/**
 * Utility function to resolve update conflict
 */
export async function resolveUpdateConflict(
  tableName: string,
  recordId: string,
  currentData: Record<string, unknown>,
  incomingData: Record<string, unknown>,
  strategy?: 'last_write_wins' | 'first_write_wins' | 'merge'
): Promise<ConflictResolution> {
  return conflictResolver.resolveUpdateConflict(
    tableName,
    recordId,
    currentData,
    incomingData,
    strategy
  )
}

/**
 * Utility function to resolve delete conflict
 */
export async function resolveDeleteConflict(
  tableName: string,
  recordId: string,
  currentData: Record<string, unknown>,
  deleteReason: string
): Promise<ConflictResolution> {
  return conflictResolver.resolveDeleteConflict(tableName, recordId, currentData, deleteReason)
}

/**
 * Utility function to resolve insert conflict
 */
export async function resolveInsertConflict(
  tableName: string,
  recordId: string,
  existingData: Record<string, unknown>,
  incomingData: Record<string, unknown>
): Promise<ConflictResolution> {
  return conflictResolver.resolveInsertConflict(tableName, recordId, existingData, incomingData)
}
