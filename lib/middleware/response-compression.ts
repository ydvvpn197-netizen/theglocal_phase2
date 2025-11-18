/**
 * Response Compression Middleware
 * Handles gzip and brotli compression for API responses
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { constants } from 'zlib'

export interface CompressionConfig {
  enabled: boolean
  minSize: number // Minimum size in bytes to compress
  gzipLevel: number // 1-9, higher = better compression
  brotliLevel: number // 1-11, higher = better compression
  supportedTypes: string[]
  cacheControl: string
}

const DEFAULT_CONFIG: CompressionConfig = {
  enabled: true,
  minSize: 1024, // 1KB
  gzipLevel: 6,
  brotliLevel: 4,
  supportedTypes: [
    'application/json',
    'application/javascript',
    'text/css',
    'text/html',
    'text/plain',
    'text/xml',
    'application/xml',
    'application/rss+xml',
    'application/atom+xml',
    'image/svg+xml',
  ],
  cacheControl: 'public, max-age=3600',
}

export class ResponseCompression {
  private config: CompressionConfig

  constructor(config: Partial<CompressionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Compress response if needed
   */
  async compressResponse(request: NextRequest, response: NextResponse): Promise<NextResponse> {
    if (!this.config.enabled) {
      return response
    }

    const contentType = response.headers.get('content-type') || ''
    const contentLength = response.headers.get('content-length')
    const contentLengthNum = contentLength ? parseInt(contentLength) : 0

    // Check if response should be compressed
    if (!this.shouldCompress(contentType, contentLengthNum)) {
      return response
    }

    // Get response body
    const body = await response.text()

    if (body.length < this.config.minSize) {
      return response
    }

    // Check client support
    const acceptEncoding = request.headers.get('accept-encoding') || ''
    const supportsBrotli = acceptEncoding.includes('br')
    const supportsGzip = acceptEncoding.includes('gzip')

    let compressedBody: Buffer
    let encoding: string

    if (supportsBrotli) {
      compressedBody = await this.compressBrotli(body)
      encoding = 'br'
    } else if (supportsGzip) {
      compressedBody = await this.compressGzip(body)
      encoding = 'gzip'
    } else {
      return response
    }

    // Create new response with compressed body
    const compressedResponse = new NextResponse(compressedBody.toString(), {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers),
    })

    // Set compression headers
    compressedResponse.headers.set('content-encoding', encoding)
    compressedResponse.headers.set('content-length', compressedBody.length.toString())
    compressedResponse.headers.set('vary', 'accept-encoding')

    // Set ETag for caching
    const etag = this.generateETag(compressedBody)
    compressedResponse.headers.set('etag', etag)

    // Set cache control
    compressedResponse.headers.set('cache-control', this.config.cacheControl)

    return compressedResponse
  }

  /**
   * Check if response should be compressed
   */
  private shouldCompress(contentType: string, contentLength: number): boolean {
    // Check content type
    const isSupportedType = this.config.supportedTypes.some((type) => contentType.includes(type))

    if (!isSupportedType) {
      return false
    }

    // Check content length
    if (contentLength > 0 && contentLength < this.config.minSize) {
      return false
    }

    return true
  }

  /**
   * Compress content using gzip
   */
  private async compressGzip(content: string): Promise<Buffer> {
    const { gzip } = await import('zlib')

    return new Promise((resolve, reject) => {
      gzip(content, { level: this.config.gzipLevel }, (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      })
    })
  }

  /**
   * Compress content using brotli
   */
  private async compressBrotli(content: string): Promise<Buffer> {
    const { brotliCompress } = await import('zlib')

    return new Promise((resolve, reject) => {
      brotliCompress(
        content,
        {
          params: {
            [constants.BROTLI_PARAM_QUALITY]: this.config.brotliLevel,
          },
        },
        (error, result) => {
          if (error) {
            reject(error)
          } else {
            resolve(result)
          }
        }
      )
    })
  }

  /**
   * Generate ETag for content
   */
  private generateETag(content: Buffer): string {
    const hash = createHash('md5').update(content).digest('hex')
    return `"${hash}"`
  }

  /**
   * Check if client supports compression
   */
  static supportsCompression(request: NextRequest): boolean {
    const acceptEncoding = request.headers.get('accept-encoding') || ''
    return acceptEncoding.includes('gzip') || acceptEncoding.includes('br')
  }

  /**
   * Get compression ratio
   */
  static getCompressionRatio(originalSize: number, compressedSize: number): number {
    if (originalSize === 0) return 0
    return ((originalSize - compressedSize) / originalSize) * 100
  }

  /**
   * Estimate compression savings
   */
  static estimateSavings(contentType: string, contentLength: number): number {
    const compressionRatios: Record<string, number> = {
      'application/json': 0.7,
      'text/html': 0.8,
      'text/css': 0.9,
      'application/javascript': 0.8,
      'text/plain': 0.6,
    }

    const ratio = compressionRatios[contentType] || 0.5
    return Math.round(contentLength * ratio)
  }
}

// Export singleton instance
export const responseCompression = new ResponseCompression()

/**
 * Middleware function for response compression
 */
export async function compressResponseMiddleware(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  return responseCompression.compressResponse(request, response)
}

/**
 * Utility function to check if content should be compressed
 */
export function shouldCompressContent(
  contentType: string,
  contentLength: number,
  config: Partial<CompressionConfig> = {}
): boolean {
  const compression = new ResponseCompression(config)
  return compression['shouldCompress'](contentType, contentLength)
}

/**
 * Utility function to get compression statistics
 */
export function getCompressionStats(): {
  enabled: boolean
  minSize: number
  supportedTypes: string[]
  cacheControl: string
} {
  return {
    enabled: responseCompression['config'].enabled,
    minSize: responseCompression['config'].minSize,
    supportedTypes: responseCompression['config'].supportedTypes,
    cacheControl: responseCompression['config'].cacheControl,
  }
}
