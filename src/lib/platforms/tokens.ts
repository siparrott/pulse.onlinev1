/**
 * Phase 5: Token Management
 *
 * Helpers for encrypting/decrypting OAuth tokens and
 * refreshing them when expired.
 *
 * Server-only — never import from client components.
 */

import { decrypt, encrypt, isEncryptionConfigured } from '@/lib/encryption';
import { createServerClient } from '@/lib/supabase/client';
import type { UserPlatformConnection } from '@/lib/types/database';

/**
 * Decrypt an access token from a connection row.
 * Returns the raw bearer token string.
 */
export function decryptAccessToken(connection: UserPlatformConnection): string {
  if (!isEncryptionConfigured()) {
    // In dev mode without encryption, tokens are stored as plaintext
    return connection.access_token_encrypted;
  }
  return decrypt(connection.access_token_encrypted);
}

/**
 * Decrypt a refresh token from a connection row.
 */
export function decryptRefreshToken(connection: UserPlatformConnection): string | null {
  if (!connection.refresh_token_encrypted) return null;
  if (!isEncryptionConfigured()) {
    return connection.refresh_token_encrypted;
  }
  return decrypt(connection.refresh_token_encrypted);
}

/**
 * Encrypt a token for storage.
 */
export function encryptToken(plaintext: string): string {
  if (!isEncryptionConfigured()) {
    // In dev mode without encryption key, store as-is
    return plaintext;
  }
  return encrypt(plaintext);
}

/**
 * Check if connection's access token is expired.
 */
export function isTokenExpired(connection: UserPlatformConnection): boolean {
  if (!connection.token_expires_at) return false;
  return new Date(connection.token_expires_at) <= new Date();
}

/**
 * Stub for token refresh. Per-platform implementations would
 * call the platform's /oauth/token endpoint with the refresh_token.
 *
 * Returns true if tokens were refreshed, false if not needed or not supported.
 */
export async function rotateTokensIfNeeded(
  connection: UserPlatformConnection
): Promise<boolean> {
  if (!isTokenExpired(connection)) return false;

  const refreshToken = decryptRefreshToken(connection);
  if (!refreshToken) {
    // Mark connection as expired if no refresh token
    const supabase = createServerClient();
    await supabase
      .from('user_platform_connections')
      .update({ status: 'expired' })
      .eq('id', connection.id);
    return false;
  }

  // Per-platform refresh logic would go here.
  // For Phase 5, we mark it as expired — real refresh implemented per-platform.
  console.warn(`[tokens] Token expired for connection ${connection.id} (${connection.platform_id}). Refresh not yet implemented.`);

  const supabase = createServerClient();
  await supabase
    .from('user_platform_connections')
    .update({ status: 'expired' })
    .eq('id', connection.id);

  return false;
}
