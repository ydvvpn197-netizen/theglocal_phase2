/**
 * OAuth Token Manager
 *
 * Centralized management for OAuth tokens from different platforms
 */

import { logger } from '@/lib/utils/logger'
import { createAdminClient } from '@/lib/supabase/server'

export interface OAuthToken {
  platform: string
  access_token: string
  refresh_token?: string
  expires_at?: Date
  token_type?: string
  scope?: string
  metadata?: Record<string, unknown>
}

/**
 * Store or update OAuth token for a platform
 */
export async function storeOAuthToken(token: OAuthToken): Promise<boolean> {
  try {
    const supabase = createAdminClient()

    const { error } = await supabase.from('oauth_tokens').upsert(
      {
        platform: token.platform,
        access_token: token.access_token,
        refresh_token: token.refresh_token || null,
        expires_at: token.expires_at?.toISOString() || null,
        token_type: token.token_type || 'Bearer',
        scope: token.scope || null,
        metadata: token.metadata || {},
      },
      {
        onConflict: 'platform', // Update if platform already exists
      }
    )

    if (error) {
      logger.error(`[OAuth Manager] Error storing token for ${token.platform}:`, error)
      return false
    }

    logger.info(`[OAuth Manager] Token stored for ${token.platform}`)
    return true
  } catch (error) {
    logger.error(`[OAuth Manager] Exception storing token:`, error)
    return false
  }
}

/**
 * Get OAuth token for a platform
 */
export async function getOAuthToken(platform: string): Promise<OAuthToken | null> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('platform', platform)
      .single()

    if (error || !data) {
      logger.info(`[OAuth Manager] No token found for ${platform}`)
      return null
    }

    return {
      platform: data.platform,
      access_token: data.access_token,
      refresh_token: data.refresh_token || undefined,
      expires_at: data.expires_at ? new Date(data.expires_at) : undefined,
      token_type: data.token_type || 'Bearer',
      scope: data.scope || undefined,
      metadata: data.metadata || {},
    }
  } catch (error) {
    logger.error(`[OAuth Manager] Exception getting token:`, error)
    return null
  }
}

/**
 * Check if token is expired or will expire soon
 */
export function isTokenExpired(token: OAuthToken, bufferMinutes: number = 5): boolean {
  if (!token.expires_at) {
    return false // If no expiration, assume it's valid
  }

  const now = new Date()
  const expiresAt = new Date(token.expires_at)
  const bufferMs = bufferMinutes * 60 * 1000

  return now.getTime() >= expiresAt.getTime() - bufferMs
}

/**
 * Delete OAuth token for a platform
 */
export async function deleteOAuthToken(platform: string): Promise<boolean> {
  try {
    const supabase = createAdminClient()

    const { error } = await supabase.from('oauth_tokens').delete().eq('platform', platform)

    if (error) {
      logger.error(`[OAuth Manager] Error deleting token for ${platform}:`, error)
      return false
    }

    logger.info(`[OAuth Manager] Token deleted for ${platform}`)
    return true
  } catch (error) {
    logger.error(`[OAuth Manager] Exception deleting token:`, error)
    return false
  }
}

/**
 * Get all stored OAuth tokens
 */
export async function getAllOAuthTokens(): Promise<OAuthToken[]> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase.from('oauth_tokens').select('*').order('platform')

    if (error || !data) {
      return []
    }

    return data.map((row) => ({
      platform: row.platform,
      access_token: row.access_token,
      refresh_token: row.refresh_token || undefined,
      expires_at: row.expires_at ? new Date(row.expires_at) : undefined,
      token_type: row.token_type || 'Bearer',
      scope: row.scope || undefined,
      metadata: row.metadata || {},
    }))
  } catch (error) {
    logger.error(`[OAuth Manager] Exception getting all tokens:`, error)
    return []
  }
}

/**
 * Refresh expired tokens (platform-specific logic should be implemented separately)
 */
export async function refreshTokenIfNeeded(
  platform: string,
  refreshFunction: (refreshToken: string) => Promise<Partial<OAuthToken> | null>
): Promise<OAuthToken | null> {
  const token = await getOAuthToken(platform)

  if (!token) {
    return null
  }

  // If token is not expired, return as-is
  if (!isTokenExpired(token)) {
    return token
  }

  // If expired but no refresh token, return null
  if (!token.refresh_token) {
    logger.warn(`[OAuth Manager] Token expired for ${platform} and no refresh token available`)
    return null
  }

  logger.info(`[OAuth Manager] Refreshing token for ${platform}`)

  // Call platform-specific refresh function
  const newTokenData = await refreshFunction(token.refresh_token)

  if (!newTokenData) {
    logger.error(`[OAuth Manager] Failed to refresh token for ${platform}`)
    return null
  }

  // Update stored token
  const updatedToken: OAuthToken = {
    ...token,
    ...newTokenData,
  }

  await storeOAuthToken(updatedToken)

  return updatedToken
}
