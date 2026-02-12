/**
 * Phase 2: Audit Logging for Variant Generation
 * Logs all variant generation and governance events
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type { VisualVariant } from '@/lib/types/database';

export type VariantAuditEventType =
  | 'variant_generate_start'
  | 'variant_generated'
  | 'variant_governance'
  | 'variant_generate_complete';

export interface VariantAuditPayload {
  postId: string;
  channelCode?: string;
  platforms?: string[];
  sourceAssetId?: string;
  sourceAssetMetadata?: {
    fileName: string;
    mimeType: string;
    width?: number;
    height?: number;
    aspectRatio?: number;
  };
  variant?: {
    id: string;
    platformKey: string;
    targetAspect: string;
    method: 'crop' | 'pad' | 'ai';
    fileName: string;
    width: number;
    height: number;
    aspectRatio: number;
  };
  governanceResult?: {
    status: 'ok' | 'warn' | 'blocked';
    score: number;
    issueCount: number;
  };
  variantCount?: number;
  successCount?: number;
  failCount?: number;
  generationMode?: 'auto' | 'ai';
  timestamp: string;
  error?: string;
}

/**
 * Logs a variant generation audit event
 * Uses Supabase if configured, otherwise logs to console
 */
export async function logVariantAuditEvent(
  channelId: string,
  postId: string | null,
  eventType: VariantAuditEventType,
  payload: VariantAuditPayload
): Promise<void> {
  const auditEntry = {
    channel_id: channelId,
    post_id: postId,
    event_type: eventType,
    payload,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('publisher_governance_events').insert(auditEntry);
    } catch (error) {
      console.error('Failed to log audit event to Supabase:', error);
      // Fall through to console logging
    }
  }

  // Always log to console for development
  console.log(`[AUDIT] ${eventType}:`, payload);
}

/**
 * Logs variant generation start event
 */
export async function logVariantGenerationStart(
  channelId: string,
  postId: string,
  channelCode: string,
  platforms: string[],
  sourceAsset: {
    id: string;
    fileName: string;
    mimeType: string;
    width?: number;
    height?: number;
    aspectRatio?: number;
  },
  generationMode: 'auto' | 'ai'
): Promise<void> {
  await logVariantAuditEvent(channelId, postId, 'variant_generate_start', {
    postId,
    channelCode,
    platforms,
    sourceAssetId: sourceAsset.id,
    sourceAssetMetadata: {
      fileName: sourceAsset.fileName,
      mimeType: sourceAsset.mimeType,
      width: sourceAsset.width,
      height: sourceAsset.height,
      aspectRatio: sourceAsset.aspectRatio,
    },
    generationMode,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Logs individual variant generation event
 */
export async function logVariantGenerated(
  channelId: string,
  postId: string,
  variant: VisualVariant
): Promise<void> {
  await logVariantAuditEvent(channelId, postId, 'variant_generated', {
    postId,
    variant: {
      id: variant.id,
      platformKey: variant.platformKey,
      targetAspect: variant.targetAspect,
      method: variant.method,
      fileName: variant.fileName,
      width: variant.width,
      height: variant.height,
      aspectRatio: variant.aspectRatio,
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Logs variant governance evaluation event
 */
export async function logVariantGovernance(
  channelId: string,
  postId: string,
  variantId: string,
  governanceResult: {
    status: 'ok' | 'warn' | 'blocked';
    score: number;
    issues: Array<{ severity: string; code: string; message: string }>;
  }
): Promise<void> {
  await logVariantAuditEvent(channelId, postId, 'variant_governance', {
    postId,
    variant: { 
      id: variantId,
      platformKey: '',
      targetAspect: '',
      method: 'crop' as const,
      fileName: '',
      width: 0,
      height: 0,
      aspectRatio: 0,
    },
    governanceResult: {
      status: governanceResult.status,
      score: governanceResult.score,
      issueCount: governanceResult.issues.length,
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Logs variant generation completion event
 */
export async function logVariantGenerationComplete(
  channelId: string,
  postId: string,
  variantCount: number,
  successCount: number,
  failCount: number,
  error?: string
): Promise<void> {
  await logVariantAuditEvent(channelId, postId, 'variant_generate_complete', {
    postId,
    variantCount,
    successCount,
    failCount,
    error,
    timestamp: new Date().toISOString(),
  });
}
