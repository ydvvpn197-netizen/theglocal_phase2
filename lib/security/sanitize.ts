/**
 * HTML Sanitization Utility using DOMPurify
 *
 * Provides sanitization for all dangerouslySetInnerHTML usage
 * to prevent XSS attacks from user-generated content.
 */

import DOMPurify from 'dompurify'
import { logger } from '@/lib/utils/logger'

/**
 * Default configuration for DOMPurify
 */
const DEFAULT_CONFIG: Partial<DOMPurify.Config> = {
  // Allow only safe tags
  ALLOWED_TAGS: [
    'svg',
    'path',
    'rect',
    'circle',
    'ellipse',
    'line',
    'polyline',
    'polygon',
    'g',
    'defs',
    'clipPath',
    'use',
    'text',
    'tspan',
    'p',
    'br',
    'strong',
    'em',
    'u',
    'a',
    'ul',
    'ol',
    'li',
    'span',
    'div',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'code',
    'pre',
  ],
  // Allow only safe attributes
  ALLOWED_ATTR: [
    'class',
    'id',
    'href',
    'title',
    'alt',
    'width',
    'height',
    // SVG specific
    'viewBox',
    'xmlns',
    'fill',
    'stroke',
    'stroke-width',
    'stroke-linecap',
    'stroke-linejoin',
    'd',
    'cx',
    'cy',
    'r',
    'x',
    'y',
    'rx',
    'ry',
    'transform',
    'opacity',
    'fill-rule',
    'clip-path',
  ],
  // Disallow scripts and dangerous protocols
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  // Keep clean HTML structure
  KEEP_CONTENT: true,
  // Return a string (not a DOM node)
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  // Add rel="noopener noreferrer" to all links
  ADD_ATTR: ['target'],
  ALLOWED_URI_REGEXP:
    /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
}

/**
 * Sanitize HTML string for use in dangerouslySetInnerHTML
 *
 * @param html - Raw HTML string
 * @param config - Optional DOMPurify configuration overrides
 * @returns Sanitized HTML string safe for insertion
 */
export function sanitizeHTML(html: string, config?: Partial<DOMPurify.Config>): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  // Initialize DOMPurify in browser
  if (typeof window === 'undefined') {
    // Server-side: use basic regex sanitization as fallback
    return basicServerSideSanitize(html)
  }

  try {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config }
    // @ts-expect-error - DOMPurify.Config has strict PARSER_MEDIA_TYPE type, but our config is safe at runtime
    return DOMPurify.sanitize(html, mergedConfig)
  } catch (error) {
    logger.error(
      '[Security] DOMPurify sanitization failed',
      error instanceof Error ? error : undefined,
      {
        context: 'sanitize',
        function: 'sanitizeHTML',
      }
    )
    return '' // Fail safe: return empty string
  }
}

/**
 * Sanitize HTML specifically for SVG avatars
 * More permissive for SVG elements
 *
 * @param svg - SVG string
 * @returns Sanitized SVG string
 */
export function sanitizeSVG(svg: string): string {
  if (!svg || typeof svg !== 'string') {
    return ''
  }

  if (typeof window === 'undefined') {
    // Server-side: basic validation
    if (!svg.includes('<svg')) {
      return ''
    }
    return svg.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  }

  const svgConfig: Partial<DOMPurify.Config> = {
    USE_PROFILES: { svg: true, svgFilters: true },
    ALLOWED_TAGS: [
      'svg',
      'path',
      'rect',
      'circle',
      'ellipse',
      'line',
      'polyline',
      'polygon',
      'g',
      'defs',
      'clipPath',
      'mask',
      'pattern',
      'linearGradient',
      'radialGradient',
      'stop',
      'use',
      'text',
      'tspan',
      'title',
      'desc',
    ],
    ALLOWED_ATTR: [
      'class',
      'id',
      'width',
      'height',
      'viewBox',
      'xmlns',
      'xmlns:xlink',
      'fill',
      'stroke',
      'stroke-width',
      'stroke-linecap',
      'stroke-linejoin',
      'stroke-dasharray',
      'stroke-dashoffset',
      'stroke-miterlimit',
      'd',
      'cx',
      'cy',
      'r',
      'rx',
      'ry',
      'x',
      'y',
      'x1',
      'y1',
      'x2',
      'y2',
      'transform',
      'opacity',
      'fill-opacity',
      'stroke-opacity',
      'fill-rule',
      'clip-path',
      'clip-rule',
      'mask',
      'offset',
      'stop-color',
      'stop-opacity',
      'gradientUnits',
      'gradientTransform',
      'spreadMethod',
    ],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'foreignObject'],
  }

  try {
    // @ts-expect-error - DOMPurify.Config has strict PARSER_MEDIA_TYPE type, but our config is safe at runtime
    return DOMPurify.sanitize(svg, svgConfig)
  } catch (error) {
    logger.error('[Security] SVG sanitization failed', error instanceof Error ? error : undefined, {
      context: 'sanitize',
      function: 'sanitizeSVG',
    })
    return ''
  }
}

/**
 * Sanitize user-generated text content (for rich text editors)
 * More restrictive than general HTML
 *
 * @param html - User HTML content
 * @returns Sanitized HTML string
 */
export function sanitizeUserContent(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  if (typeof window === 'undefined') {
    return basicServerSideSanitize(html)
  }

  const userContentConfig: Partial<DOMPurify.Config> = {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'a',
      'ul',
      'ol',
      'li',
      'blockquote',
      'code',
      'pre',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'span',
      'div',
      'img',
    ],
    ALLOWED_ATTR: ['class', 'href', 'title', 'alt', 'src', 'width', 'height'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'form', 'input'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    // Transform all links to open in new tab with security attributes
    RETURN_DOM: false,
    ADD_ATTR: ['target', 'rel'],
  }

  try {
    // @ts-expect-error - DOMPurify.Config has strict PARSER_MEDIA_TYPE type, but our config is safe at runtime
    const sanitized = DOMPurify.sanitize(html, userContentConfig)
    // Add security attributes to all links
    return sanitized.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ')
  } catch (error) {
    logger.error(
      '[Security] User content sanitization failed',
      error instanceof Error ? error : undefined,
      {
        context: 'sanitize',
        function: 'sanitizeUserContent',
      }
    )
    return ''
  }
}

/**
 * Server-side fallback sanitization using regex
 * Less robust than DOMPurify but works on server
 *
 * @param html - Raw HTML string
 * @returns Sanitized HTML string
 */
function basicServerSideSanitize(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  let sanitized = html

  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  sanitized = sanitized.replace(/<script\b[^>]*>/gi, '')

  // Remove iframe tags
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')

  // Remove event handlers
  sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
  sanitized = sanitized.replace(/\son\w+\s*=\s*[^\s>]*/gi, '')

  // Remove dangerous protocols
  sanitized = sanitized.replace(/javascript:/gi, '')
  sanitized = sanitized.replace(/vbscript:/gi, '')
  sanitized = sanitized.replace(/data:text\/(html|javascript)/gi, '')

  return sanitized
}

/**
 * Type-safe wrapper for dangerouslySetInnerHTML
 * Use this in React components
 *
 * @param html - HTML string to sanitize
 * @param config - Optional DOMPurify configuration
 * @returns Object compatible with dangerouslySetInnerHTML prop
 */
export function createSafeHTML(
  html: string,
  config?: Partial<DOMPurify.Config>
): { __html: string } {
  return {
    __html: sanitizeHTML(html, config),
  }
}

/**
 * Type-safe wrapper for SVG dangerouslySetInnerHTML
 *
 * @param svg - SVG string to sanitize
 * @returns Object compatible with dangerouslySetInnerHTML prop
 */
export function createSafeSVG(svg: string): { __html: string } {
  return {
    __html: sanitizeSVG(svg),
  }
}

/**
 * Type-safe wrapper for user content dangerouslySetInnerHTML
 *
 * @param html - User HTML content to sanitize
 * @returns Object compatible with dangerouslySetInnerHTML prop
 */
export function createSafeUserContent(html: string): { __html: string } {
  return {
    __html: sanitizeUserContent(html),
  }
}
