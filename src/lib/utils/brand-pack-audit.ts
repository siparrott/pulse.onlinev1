/**
 * Brand Pack Audit Logging
 * Tracks all Brand Pack operations and AI generation events
 */

import { supabase } from '@/lib/supabase/client';

export async function logBrandPackCreated(
  channelId: string,
  brandPackId: string,
  brandPackData: any
) {
  try {
    await supabase.from('publisher_governance_events').insert({
      event_type: 'brand_pack_created',
      channel_id: channelId,
      payload: {
        brandPackId,
        completeness: brandPackData.completeness || 0,
        identity: brandPackData.identity,
        governanceOverrides: brandPackData.governanceOverrides,
      },
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log brand_pack_created:', error);
  }
}

export async function logBrandPackUpdated(
  channelId: string,
  brandPackId: string,
  changes: any,
  previousCompleteness: number,
  newCompleteness: number
) {
  try {
    await supabase.from('publisher_governance_events').insert({
      event_type: 'brand_pack_updated',
      channel_id: channelId,
      payload: {
        brandPackId,
        changes,
        completeness: {
          before: previousCompleteness,
          after: newCompleteness,
        },
      },
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log brand_pack_updated:', error);
  }
}

export async function logAIPromptComposed(
  channelId: string,
  postId: string,
  promptComponents: {
    brandPackId: string;
    brandPackVersion: string;
    platformKey: string;
    targetAspect: string;
    systemPromptLength: number;
    stylePromptLength: number;
    contextPromptLength: number;
    safetyPromptLength: number;
  }
) {
  try {
    await supabase.from('publisher_governance_events').insert({
      event_type: 'ai_prompt_composed',
      channel_id: channelId,
      post_id: postId,
      payload: {
        brandPackId: promptComponents.brandPackId,
        brandPackVersion: promptComponents.brandPackVersion,
        platformKey: promptComponents.platformKey,
        targetAspect: promptComponents.targetAspect,
        promptLengths: {
          system: promptComponents.systemPromptLength,
          style: promptComponents.stylePromptLength,
          context: promptComponents.contextPromptLength,
          safety: promptComponents.safetyPromptLength,
        },
      },
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log ai_prompt_composed:', error);
  }
}

export async function logAIImageGenerated(
  channelId: string,
  postId: string,
  variantId: string,
  metadata: {
    brandPackId: string;
    brandPackVersion: string;
    platformKey: string;
    targetAspect: string;
    width: number;
    height: number;
  }
) {
  try {
    await supabase.from('publisher_governance_events').insert({
      event_type: 'ai_image_generated',
      channel_id: channelId,
      post_id: postId,
      payload: {
        variantId,
        brandPackId: metadata.brandPackId,
        brandPackVersion: metadata.brandPackVersion,
        platformKey: metadata.platformKey,
        targetAspect: metadata.targetAspect,
        dimensions: {
          width: metadata.width,
          height: metadata.height,
        },
      },
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log ai_image_generated:', error);
  }
}

export async function logAIImageBlockedBrandViolation(
  channelId: string,
  postId: string,
  violation: {
    brandPackId: string;
    violationType: string;
    rule: string;
    message: string;
    fixPath: string;
  }
) {
  try {
    await supabase.from('publisher_governance_events').insert({
      event_type: 'ai_image_blocked_brand_violation',
      channel_id: channelId,
      post_id: postId,
      payload: {
        brandPackId: violation.brandPackId,
        violationType: violation.violationType,
        rule: violation.rule,
        message: violation.message,
        fixPath: violation.fixPath,
      },
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log ai_image_blocked_brand_violation:', error);
  }
}

export async function logAIImageGenerateStart(
  channelId: string,
  postId: string,
  metadata: {
    brandPackId: string;
    brandPackVersion: string;
    platformKey: string;
    targetAspect: string;
    promptHash: string;
  }
) {
  try {
    await supabase.from('publisher_governance_events').insert({
      event_type: 'ai_image_generate_start',
      channel_id: channelId,
      post_id: postId,
      payload: {
        ...metadata,
        startedAt: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log ai_image_generate_start:', error);
  }
}

export async function logAIImageFailed(
  channelId: string,
  postId: string,
  metadata: {
    brandPackId: string;
    platformKey: string;
    targetAspect: string;
    errorCode: string;
    errorMessage: string;
    fixPath: string;
  }
) {
  try {
    await supabase.from('publisher_governance_events').insert({
      event_type: 'ai_image_failed',
      channel_id: channelId,
      post_id: postId,
      payload: {
        ...metadata,
        failedAt: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log ai_image_failed:', error);
  }
}

export async function logAIVisionCheckStart(
  channelId: string,
  postId: string,
  variantId: string,
  metadata: {
    brandPackId: string;
    brandPackVersion: string;
    platformKey: string;
    targetAspect: string;
  }
) {
  try {
    await supabase.from('publisher_governance_events').insert({
      event_type: 'ai_vision_check_start',
      channel_id: channelId,
      post_id: postId,
      payload: {
        variantId,
        ...metadata,
        startedAt: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log ai_vision_check_start:', error);
  }
}

export async function logAIVisionCheckResult(
  channelId: string,
  postId: string,
  variantId: string,
  metadata: {
    brandPackId: string;
    brandPackVersion: string;
    platformKey: string;
    targetAspect: string;
    verdict: Record<string, unknown>;
    governanceOutcome: string;
    issueCount: number;
  }
) {
  try {
    await supabase.from('publisher_governance_events').insert({
      event_type: 'ai_vision_check_result',
      channel_id: channelId,
      post_id: postId,
      payload: {
        variantId,
        ...metadata,
        checkedAt: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log ai_vision_check_result:', error);
  }
}
