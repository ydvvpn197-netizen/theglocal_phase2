/**
 * Database Connection Pool
 * Manages Supabase connection pooling and health checks
 */

import { logger } from '@/lib/utils/logger'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface ConnectionPoolConfig {
  minConnections: number
  maxConnections: number
  connectionTimeout: number
  queryTimeout: number
  healthCheckInterval: number
  retryAttempts: number
  retryDelay: number
}

const DEFAULT_CONFIG: ConnectionPoolConfig = {
  minConnections: 5,
  maxConnections: 20,
  connectionTimeout: 30000, // 30 seconds
  queryTimeout: 5000, // 5 seconds
  healthCheckInterval: 60000, // 1 minute
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
}

export interface ConnectionHealth {
  isHealthy: boolean
  responseTime: number
  lastChecked: Date
  errorCount: number
  successCount: number
}

interface PoolConnection {
  client: ReturnType<typeof createClient>
  inUse: boolean
  lastUsed: Date | null
}

export class ConnectionPool {
  private config: ConnectionPoolConfig
  private connections: PoolConnection[] = []
  private healthStatus: ConnectionHealth
  private healthCheckInterval: NodeJS.Timeout | null = null

  constructor(config: Partial<ConnectionPoolConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.healthStatus = {
      isHealthy: true,
      responseTime: 0,
      lastChecked: new Date(),
      errorCount: 0,
      successCount: 0,
    }

    this.initializeConnections()
    this.startHealthChecks()
  }

  /**
   * Get a connection from the pool
   */
  async getConnection(): Promise<PoolConnection> {
    try {
      // Find an available connection
      let connection = this.connections.find((conn) => !conn.inUse)

      if (!connection && this.connections.length < this.config.maxConnections) {
        // Create new connection if under limit
        connection = await this.createConnection()
        this.connections.push(connection)
      }

      if (!connection) {
        // Wait for a connection to become available
        connection = await this.waitForConnection()
      }

      if (!connection) {
        throw new Error('Failed to obtain connection from pool')
      }

      connection.inUse = true
      connection.lastUsed = new Date()

      return connection
    } catch (error) {
      logger.error('Failed to get connection:', error)
      throw error
    }
  }

  /**
   * Release a connection back to the pool
   */
  async releaseConnection(connection: PoolConnection): Promise<void> {
    try {
      connection.inUse = false
    } catch (error) {
      logger.error('Failed to release connection:', error)
    }
  }

  /**
   * Execute query with connection pooling
   */
  async executeQuery<T>(
    query: (connection: PoolConnection) => Promise<T>,
    retryCount: number = 0
  ): Promise<T> {
    let connection: PoolConnection | null = null

    try {
      connection = await this.getConnection()

      // Set query timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), this.config.queryTimeout)
      })

      const queryPromise = query(connection)
      const result = await Promise.race([queryPromise, timeoutPromise])

      this.recordSuccess()
      return result
    } catch (error) {
      this.recordError()

      if (retryCount < this.config.retryAttempts) {
        logger.warn(`Query failed, retrying... (${retryCount + 1}/${this.config.retryAttempts})`)
        await this.delay(this.config.retryDelay)
        return this.executeQuery(query, retryCount + 1)
      }

      throw error
    } finally {
      if (connection) {
        await this.releaseConnection(connection)
      }
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): {
    totalConnections: number
    activeConnections: number
    availableConnections: number
    healthStatus: ConnectionHealth
  } {
    const activeConnections = this.connections.filter((conn) => conn.inUse).length
    const availableConnections = this.connections.length - activeConnections

    return {
      totalConnections: this.connections.length,
      activeConnections,
      availableConnections,
      healthStatus: this.healthStatus,
    }
  }

  /**
   * Check if pool is healthy
   */
  isHealthy(): boolean {
    return this.healthStatus.isHealthy
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    try {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval)
        this.healthCheckInterval = null
      }

      // Close all connections
      await Promise.all(this.connections.map((conn) => this.closeConnection(conn)))

      this.connections = []
    } catch (error) {
      logger.error('Failed to close connection pool:', error)
    }
  }

  /**
   * Initialize connections
   */
  private async initializeConnections(): Promise<void> {
    try {
      for (let i = 0; i < this.config.minConnections; i++) {
        const connection = await this.createConnection()
        this.connections.push(connection)
      }
    } catch (error) {
      logger.error('Failed to initialize connections:', error)
    }
  }

  /**
   * Create a new connection
   */
  private async createConnection(): Promise<PoolConnection> {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing')
      }

      const client = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
        },
        db: {
          schema: 'public',
        },
      })

      // Create wrapper with metadata
      const connection: PoolConnection = {
        client: client as ReturnType<typeof createClient>,
        inUse: false,
        lastUsed: null,
      }

      return connection
    } catch (error) {
      logger.error('Failed to create connection:', error)
      throw error
    }
  }

  /**
   * Wait for a connection to become available
   */
  private async waitForConnection(): Promise<PoolConnection> {
    const maxWaitTime = this.config.connectionTimeout
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitTime) {
      const availableConnection = this.connections.find((conn) => !conn.inUse)
      if (availableConnection) {
        return availableConnection
      }

      await this.delay(100) // Wait 100ms before checking again
    }

    throw new Error('Connection pool timeout - no available connections')
  }

  /**
   * Close a connection
   */
  private async closeConnection(connection: PoolConnection): Promise<void> {
    try {
      // Supabase client doesn't have an explicit close method
      // The connection will be garbage collected
      connection.inUse = false
    } catch (error) {
      logger.error('Failed to close connection:', error)
    }
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck()
    }, this.config.healthCheckInterval)
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const startTime = Date.now()

      // Test connection with a simple query
      await this.executeQuery(async (connection) => {
        const { data, error } = await connection.client.from('users').select('id').limit(1)

        if (error) {
          throw error
        }

        return data
      })

      const responseTime = Date.now() - startTime

      this.healthStatus = {
        isHealthy: true,
        responseTime,
        lastChecked: new Date(),
        errorCount: 0,
        successCount: this.healthStatus.successCount + 1,
      }
    } catch (error) {
      logger.error('Health check failed:', error)

      this.healthStatus = {
        isHealthy: false,
        responseTime: 0,
        lastChecked: new Date(),
        errorCount: this.healthStatus.errorCount + 1,
        successCount: this.healthStatus.successCount,
      }
    }
  }

  /**
   * Record successful operation
   */
  private recordSuccess(): void {
    this.healthStatus.successCount++
  }

  /**
   * Record error
   */
  private recordError(): void {
    this.healthStatus.errorCount++
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Global connection pool instance
let globalConnectionPool: ConnectionPool | null = null

/**
 * Get the global connection pool
 */
export function getConnectionPool(): ConnectionPool {
  if (!globalConnectionPool) {
    globalConnectionPool = new ConnectionPool()
  }
  return globalConnectionPool
}

/**
 * Initialize the global connection pool
 */
export function initializeConnectionPool(config?: Partial<ConnectionPoolConfig>): ConnectionPool {
  if (globalConnectionPool) {
    globalConnectionPool.close()
  }

  globalConnectionPool = new ConnectionPool(config)
  return globalConnectionPool
}

/**
 * Close the global connection pool
 */
export async function closeConnectionPool(): Promise<void> {
  if (globalConnectionPool) {
    await globalConnectionPool.close()
    globalConnectionPool = null
  }
}

/**
 * Execute query with connection pooling
 */
export async function executeWithPool<T>(
  query: (connection: SupabaseClient) => Promise<T>
): Promise<T> {
  const pool = getConnectionPool()
  return pool.executeQuery(async (poolConnection) => {
    return query(poolConnection.client)
  })
}
