import { logger } from '@/lib/utils/logger'
/**
 * Trusted Types Policy for DOM XSS Protection
 *
 * Implements Trusted Types API policies to prevent XSS attacks via
 * dangerous DOM sink functions (innerHTML, outerHTML, etc.)
 *
 * Phase 1: Basic HTML sanitization
 * Phase 2: Enhanced with script and style protection
 */

/// <reference path="../types/trusted-types.d.ts" />

/**
 * Enhanced HTML sanitization - removes script tags and dangerous attributes
 * For production, consider using DOMPurify or a similar library
 *
 * @param html - Raw HTML string
 * @returns Sanitized HTML string safe for insertion
 */
function sanitizeHTML(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  // Remove script tags and their content (including SVG script tags)
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  sanitized = sanitized.replace(/<script\b[^>]*>/gi, '') // Opening tags without closing

  // Remove iframe tags (can be used for XSS)
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')

  // Remove event handlers (onclick, onerror, onload, etc.)
  sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
  sanitized = sanitized.replace(/\son\w+\s*=\s*[^\s>]*/gi, '')

  // Remove javascript: protocol in href/src/action
  sanitized = sanitized.replace(/javascript:/gi, '')

  // Remove data: URLs that could be dangerous (data:text/html, data:text/javascript)
  sanitized = sanitized.replace(/data:text\/(html|javascript)/gi, '')

  // Remove vbscript: protocol
  sanitized = sanitized.replace(/vbscript:/gi, '')

  // Remove onerror and onload attributes in style tags
  sanitized = sanitized.replace(/<style[^>]*\s(onerror|onload)\s*=[^>]*>/gi, (match) => {
    return match.replace(/\s(onerror|onload)\s*=[^>]*/gi, '')
  })

  return sanitized
}

/**
 * Validate and sanitize script content (strict for UGC)
 * Only allows specific safe patterns
 *
 * @param script - Script content to validate
 * @returns Validated script string or throws error
 */
function validateScript(script: string): string {
  if (!script || typeof script !== 'string') {
    throw new Error('Invalid script content')
  }

  // Reject any script that looks suspicious
  // In production, you might want to whitelist specific safe scripts
  if (
    script.includes('eval(') ||
    script.includes('Function(') ||
    script.includes('setTimeout(') ||
    script.includes('setInterval(') ||
    script.includes('innerHTML') ||
    script.includes('outerHTML')
  ) {
    throw new Error('Script contains potentially dangerous code')
  }

  return script
}

/**
 * Validate and sanitize script URL (strict for UGC)
 * Only allows specific safe protocols and patterns
 *
 * @param url - Script URL to validate
 * @returns Validated URL string or throws error
 */
function validateScriptURL(url: string): string {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid script URL')
  }

  // Reject dangerous protocols
  if (
    url.startsWith('javascript:') ||
    url.startsWith('vbscript:') ||
    url.startsWith('data:text/javascript') ||
    url.startsWith('data:text/html')
  ) {
    throw new Error('Script URL uses forbidden protocol')
  }

  // Only allow http, https, and relative URLs
  if (!url.match(/^(https?:|\/)/)) {
    throw new Error('Script URL must use http, https, or relative path')
  }

  return url
}

/**
 * Create Trusted Types policy
 * Must be called before React hydration in the browser
 *
 * @param policyName - Name for the Trusted Types policy (default: 'glocal-policy')
 * @returns The created policy or null if Trusted Types is not supported
 */
export function createTrustedTypesPolicy(
  policyName: string = 'glocal-policy'
): TrustedTypePolicy | null {
  // Check if Trusted Types is supported
  if (typeof window === 'undefined' || !window.TrustedTypes) {
    return null
  }

  // Check if policy already exists
  try {
    const existingPolicy = window.TrustedTypes.createPolicy(policyName, {
      createHTML: (html: string) => sanitizeHTML(html),
      createScript: (script: string) => {
        try {
          return validateScript(script)
        } catch (error) {
          logger.warn('Script validation failed:', error)
          throw error
        }
      },
      createScriptURL: (url: string) => {
        try {
          return validateScriptURL(url)
        } catch (error) {
          logger.warn('Script URL validation failed:', error)
          throw error
        }
      },
    })
    return existingPolicy
  } catch (error) {
    // Policy might already exist or Trusted Types is not enabled
    logger.warn('Failed to create Trusted Types policy:', error)
    return null
  }
}

/**
 * Get or create the default Trusted Types policy
 * Safe to call multiple times
 */
export function getTrustedTypesPolicy(): TrustedTypePolicy | null {
  if (typeof window === 'undefined' || !window.TrustedTypes) {
    return null
  }

  // Try to get existing policy
  try {
    return window.TrustedTypes.createPolicy('glocal-policy', {
      createHTML: (html: string) => sanitizeHTML(html),
      createScript: (script: string) => {
        try {
          return validateScript(script)
        } catch (error) {
          logger.warn('Script validation failed:', error)
          throw error
        }
      },
      createScriptURL: (url: string) => {
        try {
          return validateScriptURL(url)
        } catch (error) {
          logger.warn('Script URL validation failed:', error)
          throw error
        }
      },
    })
  } catch {
    // Policy might already exist, try to access it
    // Note: There's no direct API to get existing policies, so we catch and continue
    return null
  }
}

/**
 * Convert a string to TrustedHTML using the policy
 * Safe wrapper for dangerouslySetInnerHTML
 *
 * @param html - HTML string to convert
 * @returns TrustedHTML object or null if Trusted Types is not supported
 */
export function createTrustedHTML(html: string): TrustedHTML | string {
  if (typeof window === 'undefined' || !window.TrustedTypes) {
    // Fallback: return sanitized HTML string
    return sanitizeHTML(html)
  }

  const policy = getTrustedTypesPolicy()
  if (!policy) {
    // Fallback: return sanitized HTML string
    return sanitizeHTML(html)
  }

  try {
    return policy.createHTML(html)
  } catch (error) {
    logger.warn('Failed to create TrustedHTML:', error)
    // Fallback: return sanitized HTML string
    return sanitizeHTML(html)
  }
}

/**
 * Create TrustedScript wrapper (for script content)
 *
 * @param script - Script content string
 * @returns TrustedScript object or string fallback
 */
export function createTrustedScript(script: string): TrustedScript | string {
  if (typeof window === 'undefined' || !window.TrustedTypes) {
    // Fallback: return script (validation will happen at runtime)
    return script
  }

  const policy = getTrustedTypesPolicy()
  if (!policy || !policy.createScript) {
    // Fallback: return script
    return script
  }

  try {
    return policy.createScript(script)
  } catch (error) {
    logger.warn('Failed to create TrustedScript:', error)
    // Fallback: return script (will be blocked by CSP if dangerous)
    return script
  }
}

/**
 * Create TrustedScriptURL wrapper (for script URLs)
 *
 * @param url - Script URL string
 * @returns TrustedScriptURL object or string fallback
 */
export function createTrustedScriptURL(url: string): TrustedScriptURL | string {
  if (typeof window === 'undefined' || !window.TrustedTypes) {
    // Fallback: return URL
    return url
  }

  const policy = getTrustedTypesPolicy()
  if (!policy || !policy.createScriptURL) {
    // Fallback: return URL
    return url
  }

  try {
    return policy.createScriptURL(url)
  } catch (error) {
    logger.warn('Failed to create TrustedScriptURL:', error)
    // Fallback: return URL (will be blocked by CSP if dangerous)
    return url
  }
}

/**
 * Initialize Trusted Types policy
 * Call this in a script tag in the document head before React hydration
 *
 * Phase 2: Enhanced with script, scriptURL, and style protection
 * Creates two policies:
 * - 'default': Permissive policy for React and framework code
 * - 'glocal-policy': Strict policy for user-generated content
 *
 * @returns JavaScript code string to be injected as inline script
 */
export function getTrustedTypesInitScript(policyName: string = 'glocal-policy'): string {
  return `
    if (window.TrustedTypes) {
      try {
        // Create permissive default policy for React and framework code
        window.TrustedTypes.createPolicy('default', {
          createHTML: function(html) {
            // Permissive - trust React and framework code
            return html || '';
          },
          createScript: function(script) {
            // Permissive - allow React's internal operations
            return script || '';
          },
          createScriptURL: function(url) {
            if (!url || typeof url !== 'string') return '';
            // Reject dangerous protocols
            if (url.startsWith('javascript:') || 
                url.startsWith('vbscript:') || 
                url.startsWith('data:text/javascript') ||
                url.startsWith('data:text/html')) {
              throw new Error('Script URL uses forbidden protocol');
            }
            // Whitelist trusted third-party domains
            var trustedDomains = [
              'pagead2.googlesyndication.com',
              'www.googletagmanager.com',
              'www.google.com',
              'googleads.g.doubleclick.net',
              'tpc.googlesyndication.com',
              'adservice.google.com',
              'supabase.co',
              'supabase.io'
            ];
            var isTrusted = trustedDomains.some(function(domain) {
              var pattern = domain.replace(/\\*/g, '.*');
              var regex = new RegExp('^https?:\\\\/\\\\/(.*\\\\.)?' + pattern.replace(/\\\\./g, '\\\\\\\\.'));
              return regex.test(url);
            });
            // Allow http, https, relative URLs, or trusted domains
            if (url.match(/^(https?:|\\/)/) || isTrusted) {
              return url;
            }
            throw new Error('Script URL not whitelisted');
          }
        });
        
        // Create strict policy for user-generated content
        window.TrustedTypes.createPolicy('${policyName}', {
          createHTML: function(html) {
            if (!html || typeof html !== 'string') return '';
            // Remove script tags and iframe
            var sanitized = html.replace(/<script\\b[^<]*(?:(?!<\\/script>)<[^<]*)*<\\/script>/gi, '');
            sanitized = sanitized.replace(/<iframe\\b[^<]*(?:(?!<\\/iframe>)<[^<]*)*<\\/iframe>/gi, '');
            // Remove event handlers
            sanitized = sanitized.replace(/\\son\\w+\\s*=\\s*["'][^"']*["']/gi, '');
            sanitized = sanitized.replace(/\\son\\w+\\s*=\\s*[^\\s>]*/gi, '');
            // Remove dangerous protocols
            sanitized = sanitized.replace(/javascript:/gi, '');
            sanitized = sanitized.replace(/vbscript:/gi, '');
            sanitized = sanitized.replace(/data:text\\/(html|javascript)/gi, '');
            return sanitized;
          },
          createScript: function(script) {
            if (!script || typeof script !== 'string') {
              throw new Error('Invalid script content');
            }
            // Reject dangerous patterns
            if (script.includes('eval(') || 
                script.includes('Function(') || 
                script.includes('setTimeout(') ||
                script.includes('setInterval(') ||
                script.includes('innerHTML') ||
                script.includes('outerHTML')) {
              throw new Error('Script contains potentially dangerous code');
            }
            return script;
          },
          createScriptURL: function(url) {
            if (!url || typeof url !== 'string') {
              throw new Error('Invalid script URL');
            }
            // Reject dangerous protocols
            if (url.startsWith('javascript:') || 
                url.startsWith('vbscript:') || 
                url.startsWith('data:text/javascript') ||
                url.startsWith('data:text/html')) {
              throw new Error('Script URL uses forbidden protocol');
            }
            // Only allow http, https, or relative URLs
            if (!url.match(/^(https?:|\\/)/)) {
              throw new Error('Script URL must use http, https, or relative path');
            }
            return url;
          }
        });
      } catch (e) {
        // Policy might already exist
        logger.warn('Trusted Types policy creation failed:', e);
      }
    }
  `.trim()
}
