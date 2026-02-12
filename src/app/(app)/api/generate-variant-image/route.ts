/**
 * AI Image Generation -- Direct Mode Route
 *
 * Calls OpenAI gpt-image-1 directly and returns the result
 * with base64 data URL + optional vision checks.
 *
 * This bypasses the Phase 3A worker queue, which requires
 * a running Supabase database + background worker process.
 */

import { NextRequest, NextResponse } from 'next/server';
import { safeGenerateAIImage } from '@/lib/ai/openai-image';
import { runBrandPackVisionChecks } from '@/lib/ai/vision-checks';
import type { BrandPack } from '@/lib/types/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      platformKey,
      targetAspect,
      channelId,
      postId,
      postCaption,
      channelCode,
      brandPackJson,
    } = body;

    // -- Validate required inputs
    if (!prompt || !platformKey || !targetAspect || !postId || !channelId) {
      return NextResponse.json(
        { message: 'Missing required fields: prompt, platformKey, targetAspect, postId, channelId' },
        { status: 400 }
      );
    }

    // -- Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          message: 'OPENAI_API_KEY not configured. Add it to .env.local',
          errorCode: 'config_missing',
        },
        { status: 500 }
      );
    }

    // -- Generate the image directly via OpenAI
    const result = await safeGenerateAIImage({
      prompt,
      platformKey,
      targetAspect,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          message: result.error.message,
          errorCode: result.error.code,
          fixPath: result.error.fixPath,
        },
        { status: 500 }
      );
    }

    const { data } = result;

    // -- Run optional vision checks
    let visionResult = null;
    try {
      // Brand pack is sent from the client (since server has no localStorage)
      const brandPack: BrandPack | null = brandPackJson ? JSON.parse(brandPackJson) : null;

      if (brandPack) {
        visionResult = await runBrandPackVisionChecks({
          imageBase64: data.base64,
          imageMimeType: data.mimeType,
          brandPack,
          platformKey,
          targetAspect,
          postCaption: postCaption || '',
          channelCode: channelCode || '',
        });
      }
    } catch (err) {
      console.warn('Vision checks failed (non-fatal):', err);
    }

    // -- Return the result with base64 data URL
    const dataUrl = `data:${data.mimeType};base64,${data.base64}`;
    console.log(`[AI-ROUTE] Image generated successfully. dataUrl length: ${dataUrl.length}, starts with: "${dataUrl.substring(0, 30)}", width: ${data.width}, height: ${data.height}`);

    const responsePayload = {
      status: 'done',
      dataUrl,
      width: data.width,
      height: data.height,
      mimeType: data.mimeType,
      revisedPrompt: data.revised_prompt || null,
      visionVerdict: visionResult?.verdict || null,
      visionIssues: visionResult?.issues || [],
      visionStatus: visionResult?.overallStatus || 'ok',
      platformKey,
      targetAspect,
    };

    console.log(`[AI-ROUTE] Response JSON size: ${JSON.stringify(responsePayload).length} bytes`);

    return NextResponse.json(responsePayload);
  } catch (error: unknown) {
    console.error('AI generation error:', error);
    const message = error instanceof Error ? error.message : 'AI image generation failed';
    return NextResponse.json(
      { message, errorCode: 'api_error' },
      { status: 500 }
    );
  }
}
