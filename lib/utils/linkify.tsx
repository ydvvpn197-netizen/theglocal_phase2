import React from 'react'

/**
 * URL regex pattern that matches:
 * - http:// and https:// URLs
 * - www. URLs
 * - Domain names with common TLDs
 * - URLs with paths, query parameters, and fragments
 */
const URL_REGEX =
  /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi

/**
 * Converts URLs in text to clickable links
 * @param text - The text to process for URLs
 * @returns React element with clickable links
 */
export function linkifyText(text: string): React.ReactNode {
  if (!text || typeof text !== 'string') {
    return text
  }

  const parts = text.split(URL_REGEX)

  return parts.map((part, index) => {
    // Check if this part is a URL
    if (URL_REGEX.test(part)) {
      // Reset regex lastIndex for next iteration
      URL_REGEX.lastIndex = 0

      // Normalize URL - add https:// if missing protocol
      let href = part
      if (part.startsWith('www.')) {
        href = `https://${part}`
      } else if (!part.startsWith('http://') && !part.startsWith('https://')) {
        // Handle domain-only URLs
        href = `https://${part}`
      }

      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-primary hover:text-brand-primary/80 hover:underline transition-colors"
          onClick={(e) => e.stopPropagation()} // Prevent card click when link is clicked
        >
          {part}
        </a>
      )
    }

    // Regular text
    return part
  })
}

/**
 * Validates if a string is a valid URL
 * @param url - String to validate
 * @returns boolean indicating if string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    try {
      // Try with https:// prefix for domain-only URLs
      new URL(`https://${url}`)
      return true
    } catch {
      return false
    }
  }
}

/**
 * Extracts the first URL from text
 * @param text - Text to search for URLs
 * @returns First URL found or null
 */
export function extractFirstUrl(text: string): string | null {
  if (!text || typeof text !== 'string') {
    return null
  }

  const match = text.match(URL_REGEX)
  return match ? match[0] : null
}
