'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Upload, Trash2, Save, Play, CheckCircle, XCircle, AlertTriangle, Sparkles, Download, Package, Image as ImageIcon, Clock, Send, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchPost, updatePost as updatePostStorage, fetchAssets, saveAsset, deleteAsset, updateAssetRole, fetchChannels } from '@/lib/storage/posts';
import { validatePost } from '@/lib/governance/validator';
import { SocialPreview } from '@/components/composer/social-preview';
import { analyzeImageFile } from '@/lib/utils/image-analyzer';
import { analyzePlatformRisks } from '@/lib/constants/platform-specs';
import { getVariantTargets, generateAllVariants } from '@/lib/utils/variant-generator';
import { validateVariantAsset, applyChannelGovernanceProfile } from '@/lib/governance/asset-validator';
import { logVariantGenerationStart, logVariantGenerated, logVariantGovernance, logVariantGenerationComplete } from '@/lib/utils/variant-audit';
import { ENABLE_AI_VARIANTS } from '@/lib/config/feature-flags';
import { fetchBrandPack } from '@/lib/storage/brand-packs';
import { composeImagePrompt, validateBrandPackForAI } from '@/lib/ai/prompt-composer';
import { logAIPromptComposed, logAIImageGenerated, logAIImageBlockedBrandViolation } from '@/lib/utils/brand-pack-audit';
import type { PublisherPost, PublisherAsset, AssetRole, GovernanceStatus, PublisherChannel, Platform, ContentType, VisualVariant, PostVariant, SourceImage } from '@/lib/types/database';
import { allSpecs, platformToSpecId, type PlatformSpecId } from '@/lib/platforms/specs';

const ASSET_ROLE_OPTIONS = [
  { value: 'decorative', label: 'Decorative' },
  { value: 'proof', label: 'Proof (for claims)' },
  { value: 'educational', label: 'Educational' },
  { value: 'ui', label: 'UI Screenshot' },
];

const CONTENT_TYPE_OPTIONS = [
  { value: 'static', label: 'Static Image' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'reel', label: 'Reel/Video' },
  { value: 'text', label: 'Text Only' },
];

const PLATFORM_OPTIONS = ['instagram', 'twitter', 'linkedin', 'facebook', 'tiktok', 'youtube', 'pinterest'];

const EMPTY_POST: PublisherPost & { channel_name: string } = {
  id: '',
  channel_id: '',
  channel_name: '',
  date: '',
  scheduled_at: null,
  platform_targets: [],
  content_type: 'static',
  theme: null,
  caption: '',
  cta: null,
  hashtags: null,
  status: 'draft',
  governance_status: 'unreviewed',
  governance_score: 0,
  governance_refusals: [],
  governance_unlock_path: null,
  visual_handling: 'single',
  media_aspect_ratio: null,
  media_risk_by_platform: {},
  visual_variants: [],
  visual_variant_mode: 'auto',
  variant_generation_status: 'idle',
  variant_last_generated_at: null,
  // Phase 4: Deterministic variant builder
  source_image: null,
  selected_platforms: [],
  variant_strategy: 'single_image',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const DEMO_ASSETS: PublisherAsset[] = [];

export default function ComposerPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;

  const [post, setPost] = useState(EMPTY_POST);
  const [assets, setAssets] = useState<PublisherAsset[]>(DEMO_ASSETS);
  const [channels, setChannels] = useState<PublisherChannel[]>([]);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiProgress, setAiProgress] = useState<{ done: number; total: number } | null>(null);
  const [aiContext, setAiContext] = useState('');
  const [aiGeneratedVariants, setAiGeneratedVariants] = useState<VisualVariant[]>([]);
  const aiPreviewRef = useRef<HTMLDivElement>(null);

  // Phase 4: Deterministic variant builder state
  const [builtVariants, setBuiltVariants] = useState<PostVariant[]>([]);
  const [buildingVariants, setBuildingVariants] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [selectedSpecIds, setSelectedSpecIds] = useState<PlatformSpecId[]>([]);
  const variantGridRef = useRef<HTMLDivElement>(null);

  // Phase 5: Scheduling state
  const [connections, setConnections] = useState<Array<{ id: string; platform_id: string; account_label: string; status: string }>>([]);
  const [connectionIdsByPlatform, setConnectionIdsByPlatform] = useState<Record<string, string>>({});
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [dryRun, setDryRun] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  useEffect(() => {
    async function loadPost() {
      setLoading(true);
      try {
        const [loaded, loadedAssets, loadedChannels] = await Promise.all([
          fetchPost(postId),
          fetchAssets(postId),
          fetchChannels(),
        ]);
        setChannels(loadedChannels);
        if (loaded) {
          setPost({
            ...loaded,
            channel_name: loaded.channel_name || '',
            // Ensure Phase 1 fields exist with defaults
            visual_handling: loaded.visual_handling || 'single',
            media_aspect_ratio: loaded.media_aspect_ratio ?? null,
            media_risk_by_platform: loaded.media_risk_by_platform || {},
            // Ensure Phase 2 fields exist with defaults
            visual_variants: loaded.visual_variants || [],
            visual_variant_mode: loaded.visual_variant_mode || 'auto',
            variant_generation_status: loaded.variant_generation_status || 'idle',
            variant_last_generated_at: loaded.variant_last_generated_at || null,
            // Phase 4 defaults
            source_image: loaded.source_image || null,
            selected_platforms: loaded.selected_platforms || [],
            variant_strategy: loaded.variant_strategy || 'single_image',
          });
          setAssets(loadedAssets);

          // Phase 4: auto-select platform specs from post targets
          const autoSpecs: PlatformSpecId[] = [];
          for (const p of loaded.platform_targets || []) {
            const specId = platformToSpecId(p as string, loaded.content_type);
            if (specId && !autoSpecs.includes(specId)) autoSpecs.push(specId);
          }
          setSelectedSpecIds(autoSpecs);

          // Phase 4: load persisted variants
          if (loaded.variant_strategy === 'platform_safe') {
            try {
              const res = await fetch(`/api/posts/${postId}/variants`);
              if (res.ok) {
                const data = await res.json();
                if (data.variants?.length) setBuiltVariants(data.variants);
              }
            } catch { /* ignore */ }
          }
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error('Error loading post:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    loadPost();
  }, [postId]);

  // Phase 5: Fetch connections for scheduling
  useEffect(() => {
    async function loadConnections() {
      try {
        const res = await fetch('/api/connections');
        if (res.ok) {
          const data = await res.json();
          setConnections(data.connections || []);
        }
      } catch { /* ignore */ }
    }
    loadConnections();
  }, []);

  const handleFieldChange = (field: keyof PublisherPost, value: string | string[]) => {
    setPost((prev) => ({ ...prev, [field]: value }));
  };

  const handlePlatformToggle = (platform: string) => {
    const platforms = post.platform_targets as string[];
    const updated = platforms.includes(platform)
      ? platforms.filter((p) => p !== platform)
      : [...platforms, platform];
    
    // Recalculate platform risks if we have aspect ratio
    const risks = post.media_aspect_ratio !== null
      ? analyzePlatformRisks(
          post.media_aspect_ratio,
          updated as Platform[],
          post.content_type as ContentType
        )
      : {};
    
    setPost((prev) => ({
      ...prev,
      platform_targets: updated as Platform[],
      media_risk_by_platform: risks,
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      // Convert to base64 data URL for persistence
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const asset: PublisherAsset = {
        id: crypto.randomUUID(),
        channel_id: post.channel_id,
        post_id: post.id,
        storage_path: dataUrl,
        filename: file.name,
        mime_type: file.type,
        file_size: file.size,
        role: 'decorative',
        quality_status: 'unreviewed',
        notes: null,
        created_at: new Date().toISOString(),
      };

      const saved = await saveAsset(asset, dataUrl);
      setAssets((prev) => [...prev, saved]);

      // Phase 1: Analyze aspect ratio for first asset only
      if (assets.length === 0) {
        const dimensions = await analyzeImageFile(file);
        if (dimensions) {
          const risks = analyzePlatformRisks(
            dimensions.aspectRatio,
            post.platform_targets as Platform[],
            post.content_type as ContentType
          );
          setPost((prev) => ({
            ...prev,
            media_aspect_ratio: dimensions.aspectRatio,
            media_risk_by_platform: risks,
          }));
        } else if (file.type.startsWith('video/')) {
          // Video: set as unknown
          const risks = analyzePlatformRisks(
            null,
            post.platform_targets as Platform[],
            post.content_type as ContentType
          );
          setPost((prev) => ({
            ...prev,
            media_aspect_ratio: null,
            media_risk_by_platform: risks,
          }));
        }
      }
    }
  };

  const handleAssetRoleChange = (assetId: string, role: AssetRole) => {
    setAssets((prev) =>
      prev.map((a) => (a.id === assetId ? { ...a, role } : a))
    );
    updateAssetRole(assetId, role);
  };

  const handleRemoveAsset = async (assetId: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
    await deleteAsset(assetId);
  };

  // Generate AI images — direct mode (calls OpenAI synchronously)
  const handleGenerateAIImage = async () => {
    setGeneratingAI(true);
    setAiError(null);
    setAiProgress(null);
    setAiGeneratedVariants([]);

    try {
      // 1. Get channel first (needed for product_code in Brand Pack lookup)
      const channel = channels.find((c) => c.id === post.channel_id);
      if (!channel) {
        setAiError('Channel not found');
        setGeneratingAI(false);
        return;
      }

      // 2. Load Brand Pack (pass product_code for UUID→default ID mapping)
      const brandPack = await fetchBrandPack(post.channel_id, channel.product_code);
      
      // 3. Validate Brand Pack completeness
      const validation = validateBrandPackForAI(brandPack);
      if (!validation.valid) {
        setAiError(`Brand Pack incomplete: ${validation.missingFields.join(', ')}. Complete Brand Pack in Channel settings.`);
        setGeneratingAI(false);
        return;
      }

      // 4. Compose AI prompts for each target
      const targets = getVariantTargets(post.platform_targets as Platform[], post.content_type as ContentType);
      if (targets.length === 0) {
        setAiError('No platform variants needed for selected platforms');
        setGeneratingAI(false);
        return;
      }

      setAiProgress({ done: 0, total: targets.length });

      const newVariants: VisualVariant[] = [];

      // Generate each target sequentially to avoid rate limits
      for (const target of targets) {
        try {
          const promptComponents = composeImagePrompt({
            brandPack: brandPack!,
            caption: post.caption,
            theme: post.theme || '',
            channelCode: channel.product_code,
            platformKey: target.platformKey,
            targetAspect: target.targetAspect,
            contentType: post.content_type as ContentType,
            userContext: aiContext,
          });

          // Log prompt composition
          await logAIPromptComposed(post.channel_id, post.id, {
            brandPackId: promptComponents.metadata.brandPackId,
            brandPackVersion: promptComponents.metadata.brandPackVersion,
            platformKey: target.platformKey,
            targetAspect: target.targetAspect,
            systemPromptLength: promptComponents.systemPrompt.length,
            stylePromptLength: promptComponents.stylePrompt.length,
            contextPromptLength: promptComponents.contextPrompt.length,
            safetyPromptLength: promptComponents.safetyPrompt.length,
          });

          const response = await fetch('/api/generate-variant-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: promptComponents.fullPrompt,
              platformKey: target.platformKey,
              targetAspect: target.targetAspect,
              channelId: post.channel_id,
              postId: post.id,
              postCaption: post.caption,
              channelCode: channel.product_code,
              brandPackJson: JSON.stringify(brandPack),
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error(`AI generation failed for ${target.platformKey}:`, errorData.message);
            setAiProgress((prev) => prev ? { ...prev, done: prev.done + 1 } : prev);
            continue; // Skip this target, try next
          }

          const result = await response.json();

          // Build variant from direct response
          const variantId = crypto.randomUUID();
          const width = result.width || 1024;
          const height = result.height || 1024;

          const variant: Partial<VisualVariant> = {
            id: variantId,
            platformKey: target.platformKey,
            targetAspect: target.targetAspect,
            method: 'ai',
            sourceAssetId: 'ai-generated',
            fileName: `ai-${target.platformKey}-${Date.now()}.png`,
            mimeType: result.mimeType || 'image/png',
            width,
            height,
            aspectRatio: width / height,
            dataUrl: result.dataUrl,
            analysis: result.visionVerdict ? {
              vision: result.visionVerdict,
              checkedAt: new Date().toISOString(),
            } : undefined,
            createdAt: new Date().toISOString(),
          };

          // Run governance validation
          let governanceResult = validateVariantAsset(
            variant,
            channel,
            width / height,
            brandPack
          );

          // Merge vision issues into governance
          if (result.visionIssues && result.visionIssues.length > 0) {
            const existingCodes = new Set(governanceResult.issues.map((i: { code: string }) => i.code));
            for (const issue of result.visionIssues) {
              if (!existingCodes.has(issue.code as string)) {
                governanceResult.issues.push(issue as VisualVariant['governance']['issues'][0]);
              }
            }
            if (result.visionStatus === 'blocked') {
              governanceResult.status = 'blocked';
            } else if (result.visionStatus === 'warn' && governanceResult.status === 'ok') {
              governanceResult.status = 'warn';
            }
          }

          governanceResult = applyChannelGovernanceProfile(governanceResult, channel);

          const finalVariant: VisualVariant = {
            ...variant as VisualVariant,
            governance: governanceResult,
            analysis: variant.analysis,
          };

          newVariants.push(finalVariant);

          // Update preview in real-time as each variant completes
          setAiGeneratedVariants([...newVariants]);

          // Auto-scroll to the images on first variant
          if (newVariants.length === 1) {
            setTimeout(() => {
              aiPreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          }

          // Log
          await logAIImageGenerated(post.channel_id, post.id, variantId, {
            brandPackId: brandPack!.id!,
            brandPackVersion: promptComponents.metadata.brandPackVersion,
            platformKey: target.platformKey,
            targetAspect: target.targetAspect,
            width,
            height,
          });
        } catch (targetError) {
          console.error(`AI generation failed for ${target.platformKey}:`, targetError);
        }

        setAiProgress((prev) => prev ? { ...prev, done: prev.done + 1 } : prev);
      }

      // 5. Update post with completed variants
      if (newVariants.length > 0) {
        const updatedVariants = [...post.visual_variants, ...newVariants];
        setPost((prev) => ({
          ...prev,
          visual_variants: updatedVariants,
          visual_handling: 'variants',
          variant_generation_status: 'ready',
          variant_last_generated_at: new Date().toISOString(),
        }));

        // Save with the known new variants (avoid stale closure)
        try {
          const variantsForStorage = updatedVariants.map((v) => {
            if (v?.dataUrl && v.dataUrl.length > 1000 && !v.dataUrl.startsWith('placeholder:')) {
              const { dataUrl, ...rest } = v;
              return { ...rest, dataUrl: `placeholder:ai-${v.platformKey || 'img'}` };
            }
            return v;
          });

          await updatePostStorage(post.id, {
            visual_variants: variantsForStorage,
            visual_handling: 'variants',
            variant_generation_status: 'ready',
            variant_last_generated_at: new Date().toISOString(),
          });
        } catch (saveErr) {
          console.warn('Auto-save after AI generation failed (non-fatal):', saveErr);
        }
      } else {
        setAiError('No variants could be generated. Check console for details.');
      }
    } catch (error: unknown) {
      console.error('AI generation error:', error);
      const message = error instanceof Error ? error.message : 'AI generation failed';
      setAiError(message);
    } finally {
      setGeneratingAI(false);
      setAiProgress(null);
    }
  };

  // Phase 2: Generate platform-specific variants
  const handleGenerateVariants = async () => {
    if (assets.length === 0) {
      alert('Please upload an image first');
      return;
    }

    if (post.platform_targets.length === 0) {
      alert('Please select at least one platform');
      return;
    }

    // Get primary asset (first image)
    const primaryAsset = assets.find((a) => a.mime_type?.startsWith('image/'));
    if (!primaryAsset) {
      alert('No image assets found. Video variants not yet supported.');
      return;
    }

    // Get channel for governance
    const channel = channels.find((c) => c.id === post.channel_id);
    if (!channel) {
      alert('Channel not found');
      return;
    }

    setPost((prev) => ({ ...prev, variant_generation_status: 'generating' }));

    try {
      // Log audit: generation start
      await logVariantGenerationStart(
        post.channel_id,
        post.id,
        channel.product_code,
        post.platform_targets as string[],
        {
          id: primaryAsset.id,
          fileName: primaryAsset.filename,
          mimeType: primaryAsset.mime_type || '',
          aspectRatio: post.media_aspect_ratio || undefined,
        },
        post.visual_variant_mode
      );

      // Get variant targets
      const targets = getVariantTargets(
        post.platform_targets as Platform[],
        post.content_type as ContentType
      );

      // Generate variants
      const generatedVariants = await generateAllVariants(
        primaryAsset.storage_path,
        targets,
        post.id,
        primaryAsset.id
      );

      // Apply governance to each variant
      const newVariants: VisualVariant[] = [];
      for (const generated of generatedVariants) {
        const variantId = crypto.randomUUID();
        
        // Create variant object
        const variant: Partial<VisualVariant> = {
          id: variantId,
          platformKey: generated.fileName.split('_')[1], // Extract from filename
          targetAspect: generated.fileName.split('_')[2]?.replace(/-/g, ':') || '',
          method: generated.method,
          sourceAssetId: primaryAsset.id,
          fileName: generated.fileName,
          mimeType: generated.mimeType,
          width: generated.width,
          height: generated.height,
          aspectRatio: generated.aspectRatio,
          dataUrl: generated.dataUrl,
          createdAt: new Date().toISOString(),
        };

        // Run governance
        let governanceResult = validateVariantAsset(
          variant,
          channel,
          post.media_aspect_ratio || 1
        );
        governanceResult = applyChannelGovernanceProfile(governanceResult, channel);

        // Add governance to variant
        const completeVariant: VisualVariant = {
          ...variant as VisualVariant,
          governance: governanceResult,
        };

        newVariants.push(completeVariant);

        // Log audit: variant generated
        await logVariantGenerated(post.channel_id, post.id, completeVariant);

        // Log audit: variant governance
        await logVariantGovernance(
          post.channel_id,
          post.id,
          variantId,
          governanceResult
        );
      }

      // Log audit: generation complete
      await logVariantGenerationComplete(
        post.channel_id,
        post.id,
        targets.length,
        newVariants.length,
        targets.length - newVariants.length
      );

      // Update post with variants
      setPost((prev) => ({
        ...prev,
        visual_variants: newVariants,
        variant_generation_status: newVariants.length === targets.length ? 'ready' : 'partial',
        variant_last_generated_at: new Date().toISOString(),
      }));

      // Auto-save
      await handleSave();
    } catch (error) {
      console.error('Error generating variants:', error);
      
      // Log audit: generation failed
      await logVariantGenerationComplete(
        post.channel_id,
        post.id,
        0,
        0,
        1,
        error instanceof Error ? error.message : 'Unknown error'
      );

      setPost((prev) => ({ ...prev, variant_generation_status: 'failed' }));
      alert('Failed to generate variants. Please try again.');
    }
  };

  const handleDeleteVariant = (variantId: string) => {
    setPost((prev) => ({
      ...prev,
      visual_variants: prev.visual_variants.filter((v) => v.id !== variantId),
    }));
  };

  // ── Phase 4: Deterministic Variant Builder ──────────────────

  /** Upload source image to Supabase Storage and set source_image metadata */
  const handleSourceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Read dimensions client-side
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    const img = await new Promise<HTMLImageElement>((resolve) => {
      const i = new window.Image();
      i.onload = () => resolve(i);
      i.src = dataUrl;
    });

    const storagePath = `posts/${post.id}/source/${file.name}`;

    // Build source_image metadata
    const sourceImage: SourceImage = {
      storageKey: storagePath,
      width: img.naturalWidth,
      height: img.naturalHeight,
      format: file.type.split('/')[1] || 'unknown',
      bytes: file.size,
    };

    // Try uploading to Supabase Storage via server route
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', storagePath);

      const res = await fetch('/api/upload-source', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn('Server upload failed, metadata saved locally:', err.error);
      }
    } catch (err) {
      console.warn('Server upload unavailable, metadata saved locally:', err);
    }

    // Always update local state (persists via handleSave → updatePostStorage)
    setPost((prev) => ({
      ...prev,
      source_image: sourceImage,
      variant_strategy: 'platform_safe',
    }));

    // Also analyze aspect ratio for Phase 1 safety report
    const ar = img.naturalWidth / img.naturalHeight;
    const risks = analyzePlatformRisks(ar, post.platform_targets, post.content_type);
    setPost((prev) => ({
      ...prev,
      media_aspect_ratio: ar,
      media_risk_by_platform: risks,
    }));
  };

  /** Toggle a platform spec on/off */
  const toggleSpec = (specId: PlatformSpecId) => {
    setSelectedSpecIds((prev) =>
      prev.includes(specId)
        ? prev.filter((s) => s !== specId)
        : [...prev, specId]
    );
  };

  /** Build deterministic variants via the server API */
  const handleBuildVariants = async () => {
    if (!post.source_image?.storageKey) {
      alert('Please upload a source image first');
      return;
    }
    if (selectedSpecIds.length === 0) {
      alert('Please select at least one platform');
      return;
    }

    setBuildingVariants(true);
    setBuildError(null);

    try {
      const res = await fetch(`/api/posts/${post.id}/build-variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant_strategy: 'platform_safe',
          selected_platforms: selectedSpecIds,
          source_image: post.source_image,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Build failed');
      }

      setBuiltVariants(data.variants);
      setPost((prev) => ({
        ...prev,
        variant_strategy: 'platform_safe',
        selected_platforms: selectedSpecIds,
        variant_generation_status: 'ready',
        variant_last_generated_at: new Date().toISOString(),
      }));

      // Scroll to variant grid
      setTimeout(() => {
        variantGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setBuildError(msg);
      console.error('[build-variants]', err);
    } finally {
      setBuildingVariants(false);
    }
  };

  /** Download ZIP of all built variants */
  const handleExportZip = async () => {
    try {
      const res = await fetch(`/api/posts/${post.id}/export-variants`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `variants_${post.id.slice(0, 8)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[export-zip]', err);
      alert('Failed to export ZIP.');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      // Strip large base64 dataUrls from variants before persisting
      // (they stay in React state for display during the current session)
      const variantsForStorage = (post.visual_variants || []).map((v) => {
        if (v?.dataUrl && v.dataUrl.length > 1000 && !v.dataUrl.startsWith('placeholder:')) {
          const { dataUrl, ...rest } = v;
          return { ...rest, dataUrl: `placeholder:ai-${v.platformKey || 'img'}` };
        }
        return v;
      });

      await updatePostStorage(post.id, {
        caption: post.caption,
        cta: post.cta,
        hashtags: post.hashtags,
        date: post.date,
        content_type: post.content_type,
        theme: post.theme,
        platform_targets: post.platform_targets,
        status: post.status,
        governance_status: post.governance_status,
        governance_score: post.governance_score,
        governance_refusals: post.governance_refusals,
        governance_unlock_path: post.governance_unlock_path,
        visual_handling: post.visual_handling,
        media_aspect_ratio: post.media_aspect_ratio,
        media_risk_by_platform: post.media_risk_by_platform,
        visual_variants: variantsForStorage,
        visual_variant_mode: post.visual_variant_mode,
        variant_generation_status: post.variant_generation_status,
        variant_last_generated_at: post.variant_last_generated_at,
        // Phase 4: deterministic variant builder
        source_image: post.source_image,
        selected_platforms: post.selected_platforms,
        variant_strategy: post.variant_strategy,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Error saving post:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    try {
      // Look up the channel for this post
      const channel = channels.find((c) => c.id === post.channel_id);
      if (!channel) {
        console.error('Channel not found for post:', post.channel_id);
        setValidating(false);
        return;
      }

      // Run governance validation
      const result = validatePost(post, channel, assets);

      const postStatus = result.status === 'allowed'
        ? 'validated'
        : result.status === 'blocked'
        ? 'blocked'
        : 'needs_edits';

      // Update local state
      setPost((prev) => ({
        ...prev,
        governance_status: result.status,
        governance_score: result.score,
        governance_refusals: result.refusals,
        governance_unlock_path: result.unlock_path,
        status: postStatus as PublisherPost['status'],
      }));

      // Persist governance results to storage
      await updatePostStorage(post.id, {
        governance_status: result.status,
        governance_score: result.score,
        governance_refusals: result.refusals,
        governance_unlock_path: result.unlock_path,
        status: postStatus,
      });
    } catch (error) {
      console.error('Error validating post:', error);
    } finally {
      setValidating(false);
    }
  };

  // Phase 5: Schedule post for publishing
  const handleSchedule = async () => {
    setScheduling(true);
    setScheduleError(null);
    setScheduleSuccess(false);

    try {
      if (!scheduleDate || !scheduleTime) {
        setScheduleError('Please set both date and time.');
        return;
      }

      const selectedPlatforms = post.platform_targets as string[];
      if (!selectedPlatforms.length) {
        setScheduleError('No platforms selected.');
        return;
      }

      // Verify each platform has a connection assigned
      for (const p of selectedPlatforms) {
        if (!connectionIdsByPlatform[p]) {
          setScheduleError(`No connection assigned for ${p}.`);
          return;
        }
      }

      // Build ISO timestamp from date + time
      const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();

      // Save post first
      await handleSave();

      const res = await fetch(`/api/posts/${post.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledFor,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          selectedPlatforms,
          caption: post.caption,
          connectionIdsByPlatform,
          linkUrl: post.cta || undefined,
          dryRun,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to schedule');
      }

      setScheduleSuccess(true);
      setPost((prev) => ({ ...prev, status: 'scheduled' }));
      setTimeout(() => setScheduleSuccess(false), 3000);
    } catch (error) {
      setScheduleError(error instanceof Error ? error.message : 'Failed to schedule');
    } finally {
      setScheduling(false);
    }
  };

  const getStatusIcon = () => {
    switch (post.governance_status) {
      case 'allowed':
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'blocked':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'allowed_with_edits':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-zinc-400">Loading post...</div>
        </div>
      ) : notFound ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="text-zinc-400">Post not found</div>
          <Link href="/queue">
            <Button variant="secondary">Back to Queue</Button>
          </Link>
        </div>
      ) : (
        <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/queue">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Queue
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Edit Post</h1>
            <p className="text-zinc-400 text-sm">{post.channel_name} · {post.date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={saveSuccess ? 'primary' : 'secondary'} onClick={handleSave} disabled={saving}>
            {saveSuccess ? (
              <><CheckCircle className="h-4 w-4 mr-2" />Saved!</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : 'Save'}</>
            )}
          </Button>
          <Button onClick={handleValidate} disabled={validating}>
            <Play className="h-4 w-4 mr-2" />
            {validating ? 'Validating...' : 'Validate'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Main Editor */}
        <div className="col-span-2 space-y-6">
          {/* Caption */}
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                label="Caption"
                value={post.caption}
                onChange={(e) => handleFieldChange('caption', e.target.value)}
                rows={6}
                placeholder="Write your post caption..."
              />
              <div className="flex justify-end text-xs text-zinc-500">
                {post.caption.length} / 2200
              </div>

              <Input
                label="Call to Action"
                value={post.cta || ''}
                onChange={(e) => handleFieldChange('cta', e.target.value)}
                placeholder="e.g., Learn more at example.com"
              />

              <Input
                label="Hashtags"
                value={post.hashtags || ''}
                onChange={(e) => handleFieldChange('hashtags', e.target.value)}
                placeholder="#tag1 #tag2 #tag3"
              />
            </CardContent>
          </Card>

          {/* Assets */}
          <Card>
            <CardHeader>
              <CardTitle>Media Assets</CardTitle>
              <CardDescription>
                Upload images or videos for this post
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload Area */}
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-zinc-600 transition-colors">
                <Upload className="h-8 w-8 text-zinc-500 mb-2" />
                <span className="text-sm text-zinc-400">Click to upload</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Asset List */}
              {assets.length > 0 && (
                <div className="space-y-3">
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex items-center gap-4 p-3 bg-zinc-800 rounded-lg"
                    >
                      {asset.mime_type?.startsWith('image/') && (
                        <img
                          src={asset.storage_path}
                          alt={asset.filename}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-zinc-200">{asset.filename}</p>
                        <p className="text-xs text-zinc-500">
                          {asset.file_size ? `${(asset.file_size / 1024).toFixed(1)} KB` : ''}
                        </p>
                      </div>
                      <Select
                        value={asset.role}
                        onChange={(e) => handleAssetRoleChange(asset.id, e.target.value as AssetRole)}
                        options={ASSET_ROLE_OPTIONS}
                        className="w-36"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAsset(asset.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Image Generation */}
          <Card className="border-purple-900/50 bg-purple-950/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-400" />
                AI Image Generation
              </CardTitle>
              <CardDescription>
                Generate brand-aligned imagery using your Brand Pack
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Extra context / creative direction */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Creative Direction <span className="text-zinc-500 font-normal">(optional)</span>
                </label>
                <textarea
                  value={aiContext}
                  onChange={(e) => setAiContext(e.target.value)}
                  rows={2}
                  placeholder="e.g. Use warm sunset tones, feature a laptop on a desk, abstract geometric shapes..."
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none"
                  maxLength={500}
                />
                <div className="flex justify-end mt-1">
                  <span className="text-xs text-zinc-600">{aiContext.length}/500</span>
                </div>
              </div>

              <Button
                onClick={handleGenerateAIImage}
                disabled={!post.channel_id || generatingAI}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {generatingAI
                  ? aiProgress
                    ? `Generating ${aiProgress.done}/${aiProgress.total} variants…`
                    : 'Preparing AI generation…'
                  : aiGeneratedVariants.length > 0 || post.visual_variants.some(v => v.method === 'ai')
                  ? 'Regenerate AI Images'
                  : 'Generate AI Image'}
              </Button>

              {aiError && (
                <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded">
                  {aiError}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Generated Images Preview ── */}
          {(() => {
            const aiVariants = aiGeneratedVariants.length > 0
              ? aiGeneratedVariants
              : post.visual_variants.filter(v => v.method === 'ai');
            
            if (aiVariants.length === 0 && !generatingAI) return null;

            return (
              <div ref={aiPreviewRef}>
                <Card className="border-purple-900/30 bg-purple-950/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="h-4 w-4 text-purple-400" />
                      {generatingAI ? 'Generating Images…' : `${aiVariants.length} Generated Image${aiVariants.length !== 1 ? 's' : ''}`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Skeleton placeholders while generating */}
                    {generatingAI && aiVariants.length === 0 && (
                      <div className="grid grid-cols-2 gap-3">
                        {Array.from({ length: aiProgress?.total || 2 }).map((_, i) => (
                          <div key={i} className="aspect-square rounded-lg bg-purple-900/20 border border-purple-800/30 animate-pulse flex items-center justify-center">
                            <Sparkles className="h-6 w-6 text-purple-700/50" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actual generated images */}
                    {aiVariants.length > 0 && (
                      <div className="grid grid-cols-2 gap-3">
                        {aiVariants.map((variant) => (
                          <div
                            key={variant.id}
                            className="group relative rounded-lg overflow-hidden border border-zinc-700/50 bg-zinc-900"
                          >
                            {/* Image */}
                            {variant.dataUrl && !variant.dataUrl.startsWith('placeholder:') ? (
                              <img
                                src={variant.dataUrl}
                                alt={`${variant.platformKey} variant`}
                                className="w-full aspect-square object-cover bg-zinc-800"
                              />
                            ) : (
                              <div className="w-full aspect-square bg-zinc-800 flex items-center justify-center">
                                <div className="text-center text-zinc-500 text-xs">
                                  <Sparkles className="h-6 w-6 mx-auto mb-1 opacity-50" />
                                  Image saved
                                </div>
                              </div>
                            )}

                            {/* Overlay info */}
                            <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                              <Badge variant="default" className="text-[10px] bg-black/60 backdrop-blur-sm border-0 text-white">
                                {variant.platformKey.replace(/_/g, ' ')}
                              </Badge>
                              <Badge variant="default" className="text-[10px] bg-black/60 backdrop-blur-sm border-0 text-white">
                                {variant.targetAspect}
                              </Badge>
                            </div>

                            {/* Governance badge */}
                            {variant.governance && (
                              <div className="absolute top-2 right-2">
                                <Badge
                                  variant="default"
                                  className={`text-[10px] backdrop-blur-sm border-0 ${
                                    variant.governance.status === 'ok'
                                      ? 'bg-emerald-600/80 text-white'
                                      : variant.governance.status === 'warn'
                                      ? 'bg-amber-600/80 text-white'
                                      : 'bg-red-600/80 text-white'
                                  }`}
                                >
                                  {variant.governance.status === 'ok' ? '✓ OK' : variant.governance.status === 'warn' ? '⚠ Warn' : '✗ Blocked'}
                                </Badge>
                              </div>
                            )}

                            {/* Bottom info bar */}
                            <div className="p-2 bg-zinc-900 border-t border-zinc-800">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-zinc-400">{variant.width}×{variant.height}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    handleDeleteVariant(variant.id);
                                    setAiGeneratedVariants(prev => prev.filter(v => v.id !== variant.id));
                                  }}
                                  className="h-6 w-6 p-0 text-zinc-500 hover:text-red-400"
                                  title="Remove variant"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              {/* Governance issues summary */}
                              {variant.governance?.issues?.length > 0 && (
                                <div className="mt-1.5 space-y-0.5">
                                  {variant.governance.issues.slice(0, 2).map((issue, i) => (
                                    <div key={i} className={`text-[10px] ${issue.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`}>
                                      {issue.severity === 'error' ? '✗' : '⚠'} {issue.message}
                                    </div>
                                  ))}
                                  {variant.governance.issues.length > 2 && (
                                    <div className="text-[10px] text-zinc-500">
                                      +{variant.governance.issues.length - 2} more issue(s)
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Show skeleton for remaining while generating */}
                        {generatingAI && aiProgress && aiVariants.length < aiProgress.total && (
                          Array.from({ length: aiProgress.total - aiVariants.length }).map((_, i) => (
                            <div key={`skel-${i}`} className="aspect-square rounded-lg bg-purple-900/20 border border-purple-800/30 animate-pulse flex items-center justify-center">
                              <Sparkles className="h-6 w-6 text-purple-700/50" />
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {/* Phase 1: Visual Handling */}
          {assets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Visual Handling</CardTitle>
                <CardDescription>
                  Choose how to handle media across platforms
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Multiple assets notice */}
                {assets.length > 1 && (
                  <div className="text-xs text-amber-400 bg-amber-500/10 p-2 rounded">
                    Multiple assets detected — Phase 1 checks first asset only
                  </div>
                )}

                {/* Video notice */}
                {assets.some(a => a.mime_type?.startsWith('video/')) && (
                  <div className="text-xs text-zinc-400 bg-zinc-800 p-2 rounded">
                    Video ratio checks coming soon
                  </div>
                )}

                {/* Visual handling options */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleFieldChange('visual_handling', 'single')}
                    className={`w-full p-3 text-left rounded-lg border transition-colors ${
                      post.visual_handling === 'single'
                        ? 'bg-emerald-600/10 border-emerald-600 text-white'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <div className="font-medium text-sm">Use one image (may crop)</div>
                    <div className="text-xs text-zinc-500 mt-1">
                      Your image will be used across all platforms
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFieldChange('visual_handling', 'variants')}
                    className={`w-full p-3 text-left rounded-lg border transition-colors ${
                      post.visual_handling === 'variants'
                        ? 'bg-emerald-600/10 border-emerald-600 text-white'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm">Generate platform-safe visuals automatically</div>
                      <Badge variant="default" className="text-xs">Phase 2</Badge>
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      AI will create optimized variants for each platform
                    </div>
                  </button>
                </div>

                {/* Phase 2: Variant generation controls */}
                {post.visual_handling === 'variants' && (
                  <div className="pt-3 border-t border-zinc-800 space-y-3">
                    {/* Generation mode toggle */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Generation mode:</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleFieldChange('visual_variant_mode', 'auto')}
                          className={`px-2 py-1 rounded border text-xs ${
                            post.visual_variant_mode === 'auto'
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                          }`}
                        >
                          Safe auto-crop
                        </button>
                        <button
                          type="button"
                          disabled={!ENABLE_AI_VARIANTS}
                          onClick={() => ENABLE_AI_VARIANTS && handleFieldChange('visual_variant_mode', 'ai')}
                          className={`px-2 py-1 rounded border text-xs ${
                            post.visual_variant_mode === 'ai' && ENABLE_AI_VARIANTS
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'
                          }`}
                        >
                          AI generation (beta)
                        </button>
                      </div>
                    </div>

                    {/* Generate button */}
                    <Button
                      onClick={handleGenerateVariants}
                      disabled={post.variant_generation_status === 'generating'}
                      className="w-full"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {post.variant_generation_status === 'generating'
                        ? 'Generating variants...'
                        : post.visual_variants.length > 0
                        ? 'Regenerate variants'
                        : 'Generate variants'}
                    </Button>

                    {/* Status indicator */}
                    {post.variant_generation_status !== 'idle' && (
                      <div className={`text-xs p-2 rounded ${
                        post.variant_generation_status === 'ready'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : post.variant_generation_status === 'failed'
                          ? 'bg-red-500/10 text-red-400'
                          : post.variant_generation_status === 'generating'
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {post.variant_generation_status === 'ready' && '✓ All variants generated successfully'}
                        {post.variant_generation_status === 'failed' && '✗ Generation failed'}
                        {post.variant_generation_status === 'generating' && '⟳ Generating variants...'}
                        {post.variant_generation_status === 'partial' && '⚠ Some variants failed'}
                      </div>
                    )}
                  </div>
                )}

                {/* Platform safety report (Phase 1) */}
                {post.platform_targets.length > 0 && post.media_risk_by_platform && Object.keys(post.media_risk_by_platform).length > 0 && (
                  <div className="pt-3 border-t border-zinc-800">
                    <div className="text-xs font-medium text-zinc-400 mb-2">Platform safety report</div>
                    <div className="flex flex-wrap gap-2">
                      {post.platform_targets.map((platform) => {
                        const risk = post.media_risk_by_platform[platform];
                        return (
                          <div
                            key={platform}
                            className={`px-2 py-1 text-xs rounded border ${
                              risk === 'ok'
                                ? 'border-zinc-700 text-zinc-400'
                                : risk === 'warn'
                                ? 'border-amber-500 text-amber-400'
                                : 'border-zinc-800 text-zinc-600'
                            }`}
                          >
                            {platform}: {risk === 'ok' ? 'OK' : risk === 'warn' ? 'May crop' : 'Unknown'}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Helper text */}
                <div className="text-xs text-zinc-500 leading-relaxed">
                  Cropping risk isn't a design issue — it's a platform rule. Phase 2 generates platform-safe variants automatically.
                </div>
              </CardContent>
            </Card>
          )}

          {/* Phase 2: Platform Variants */}
          {post.visual_handling === 'variants' && post.visual_variants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Platform Variants</CardTitle>
                <CardDescription>
                  {post.visual_variants.length} variant{post.visual_variants.length !== 1 ? 's' : ''} generated
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {post.visual_variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="flex items-start gap-3 p-3 bg-zinc-800 rounded-lg"
                    >
                      {/* Thumbnail */}
                      {(variant.dataUrl || variant.storagePath) && (
                        <img
                          src={variant.dataUrl || ''}
                          alt={variant.platformKey}
                          className="w-16 h-16 object-cover rounded"
                          onError={(e) => {
                            // Signed URL may have expired — try re-signing
                            if (variant.storagePath && !e.currentTarget.dataset.retried) {
                              e.currentTarget.dataset.retried = 'true';
                              fetch('/api/sign-url', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ storagePath: variant.storagePath }),
                              })
                                .then((r) => r.json())
                                .then((data) => {
                                  if (data.signedUrl) {
                                    e.currentTarget.src = data.signedUrl;
                                  }
                                })
                                .catch(() => {}); // silently fail
                            }
                          }}
                        />
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-zinc-200">
                            {variant.platformKey.replace(/_/g, ' ')}
                          </span>
                          <Badge variant="info" className="text-xs">
                            {variant.method}
                          </Badge>
                          <span className="text-xs text-zinc-500">
                            {variant.targetAspect}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-500">
                          {variant.width}×{variant.height}
                        </div>

                        {/* Governance status */}
                        <div className={`text-xs mt-1 ${
                          variant.governance.status === 'ok'
                            ? 'text-emerald-400'
                            : variant.governance.status === 'warn'
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}>
                          {variant.governance.status === 'ok' && '✓ OK'}
                          {variant.governance.status === 'warn' && `⚠ ${variant.governance.issues.length} warning(s)`}
                          {variant.governance.status === 'blocked' && `✗ Blocked`}
                        </div>

                        {/* Vision check status (AI variants only) */}
                        {variant.method === 'ai' && variant.analysis?.vision && (
                          <div className="mt-2 p-2 rounded bg-zinc-900/50 border border-zinc-700/50">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-xs font-medium text-zinc-300">Vision Checks:</span>
                              {variant.governance.status === 'ok' && (
                                <Badge variant="default" className="text-[10px] bg-emerald-600/20 text-emerald-400 border-emerald-600/30">
                                  Passed ✓
                                </Badge>
                              )}
                              {variant.governance.status === 'warn' && (
                                <Badge variant="default" className="text-[10px] bg-amber-600/20 text-amber-400 border-amber-600/30">
                                  Warnings ⚠
                                </Badge>
                              )}
                              {variant.governance.status === 'blocked' && (
                                <Badge variant="default" className="text-[10px] bg-red-600/20 text-red-400 border-red-600/30">
                                  Blocked ✗
                                </Badge>
                              )}
                              {variant.analysis.vision.confidence === 'low' && (
                                <span className="text-[10px] text-zinc-500">(low confidence)</span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-500 space-y-0.5">
                              {variant.analysis.vision.containsText && <div>• Text detected</div>}
                              {variant.analysis.vision.containsPeople && (
                                <div>• People detected ({variant.analysis.vision.peopleType})</div>
                              )}
                              {variant.analysis.vision.containsLogosOrWatermarks && <div>• Logos/watermarks detected</div>}
                              {variant.analysis.vision.motifsDetected.length > 0 && (
                                <div>• Forbidden motifs: {variant.analysis.vision.motifsDetected.join(', ')}</div>
                              )}
                              {variant.analysis.vision.riskNotes.length > 0 && (
                                <div className="text-zinc-600">
                                  Notes: {variant.analysis.vision.riskNotes.join('; ')}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Governance issues */}
                        {variant.governance.issues.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {variant.governance.issues.map((issue, i) => (
                              <div key={i} className="text-xs text-zinc-400">
                                <span className={`font-medium ${issue.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`}>
                                  {issue.severity === 'error' ? '✗' : '⚠'} {issue.message}
                                </span>
                                <div className="text-zinc-500 pl-3">Fix: {issue.fix}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Fix action buttons for AI variants with issues */}
                        {variant.method === 'ai' && variant.governance.status !== 'ok' && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleGenerateAIImage}
                              disabled={generatingAI}
                              className="text-xs h-6 px-2 text-purple-400 hover:text-purple-300 hover:bg-purple-900/30"
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              Regenerate
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                handleDeleteVariant(variant.id);
                                setPost((prev) => ({ ...prev, visual_variant_mode: 'auto' }));
                              }}
                              className="text-xs h-6 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
                            >
                              Switch to Auto-Crop
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/channels`)}
                              className="text-xs h-6 px-2 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700/30"
                            >
                              Edit Brand Pack
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteVariant(variant.id)}
                          className="text-red-400 hover:text-red-300"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Phase 4: Deterministic Variant Builder ───────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Platform-Safe Variant Builder
                <Badge variant="default" className="text-xs">Phase 4</Badge>
              </CardTitle>
              <CardDescription>
                Upload a source image, select platforms, and build pixel-perfect variants. No AI — deterministic crop/resize only.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Source image upload */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Source Image
                </label>
                {post.source_image ? (
                  <div className="flex items-center justify-between bg-zinc-800 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <ImageIcon className="h-5 w-5 text-emerald-400" />
                      <div>
                        <p className="text-sm text-zinc-200">{post.source_image.storageKey.split('/').pop()}</p>
                        <p className="text-xs text-zinc-500">{post.source_image.width}×{post.source_image.height} · {post.source_image.format} · {(post.source_image.bytes / 1024).toFixed(0)} KB</p>
                      </div>
                    </div>
                    <label className="cursor-pointer text-xs text-zinc-400 hover:text-white">
                      Replace
                      <input type="file" accept="image/*" className="hidden" onChange={handleSourceImageUpload} />
                    </label>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 py-6 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-zinc-500 transition-colors">
                    <Upload className="h-5 w-5 text-zinc-500" />
                    <span className="text-sm text-zinc-400">Upload source image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleSourceImageUpload} />
                  </label>
                )}
              </div>

              {/* Platform spec selection */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Target Platforms ({selectedSpecIds.length} selected)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {allSpecs().map((spec) => (
                    <button
                      key={spec.id}
                      type="button"
                      onClick={() => toggleSpec(spec.id)}
                      className={`flex items-center justify-between px-3 py-2 text-left rounded-lg border text-xs transition-colors ${
                        selectedSpecIds.includes(spec.id)
                          ? 'bg-emerald-600/10 border-emerald-600 text-white'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      <span>{spec.label}</span>
                      <span className="text-zinc-500">{spec.width}×{spec.height}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Build button */}
              <Button
                onClick={handleBuildVariants}
                disabled={buildingVariants || !post.source_image || selectedSpecIds.length === 0}
                className="w-full"
              >
                {buildingVariants ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                    Building {selectedSpecIds.length} variant{selectedSpecIds.length !== 1 ? 's' : ''}...
                  </>
                ) : builtVariants.length > 0 ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Rebuild Variants
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Build Platform-Safe Visuals
                  </>
                )}
              </Button>

              {/* Build error */}
              {buildError && (
                <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded">
                  ✗ {buildError}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Phase 4: Built Variants Grid */}
          {builtVariants.length > 0 && (
            <div ref={variantGridRef}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{builtVariants.length} Built Variant{builtVariants.length !== 1 ? 's' : ''}</CardTitle>
                    <CardDescription>Deterministic crop/resize — ready to download</CardDescription>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleExportZip}>
                    <Download className="h-4 w-4 mr-1.5" />
                    Download Pack (.zip)
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {builtVariants.map((v) => (
                    <div key={v.id} className="bg-zinc-800 rounded-lg overflow-hidden">
                      {/* Preview */}
                      {v.publicUrl && (
                        <img
                          src={v.publicUrl}
                          alt={v.platformId}
                          className="w-full h-32 object-cover"
                        />
                      )}
                      {!v.publicUrl && (
                        <div className="w-full h-32 flex items-center justify-center bg-zinc-900 text-zinc-600">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}
                      {/* Info */}
                      <div className="p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-zinc-200">
                            {v.platformId.replace(/_/g, ' ')}
                          </span>
                          <Badge variant="default" className="text-[10px]">crop</Badge>
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {v.width}×{v.height} · {v.format} · {(v.bytes / 1024).toFixed(0)} KB
                        </div>
                        {v.upscaleWarning && (
                          <div className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Source smaller than target
                          </div>
                        )}
                        {/* Download individual */}
                        {v.publicUrl && (
                          <a
                            href={v.publicUrl}
                            download
                            className="block mt-2 text-center text-[11px] text-emerald-400 hover:text-emerald-300"
                          >
                            Download
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Governance Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Governance
                {getStatusIcon()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Status</span>
                  <Badge
                    variant={
                      post.governance_status === 'allowed'
                        ? 'success'
                        : post.governance_status === 'blocked'
                        ? 'error'
                        : post.governance_status === 'allowed_with_edits'
                        ? 'warning'
                        : 'default'
                    }
                  >
                    {post.governance_status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Score</span>
                  <span
                    className={`text-xl font-bold ${
                      post.governance_score >= 80
                        ? 'text-emerald-400'
                        : post.governance_score >= 50
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}
                  >
                    {post.governance_score}
                  </span>
                </div>

                {post.governance_refusals.length > 0 && (
                  <div className="pt-3 border-t border-zinc-800 space-y-2">
                    {post.governance_refusals.map((refusal, i) => (
                      <div
                        key={i}
                        className={`text-xs p-2 rounded ${
                          refusal.severity === 'error'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {refusal.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Phase 5: Scheduling */}
          <Card className="border-blue-900/50 bg-blue-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-blue-400" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Per-platform connection picker */}
              {(post.platform_targets as string[]).length > 0 ? (
                <>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-zinc-400">
                      Connection per Platform
                    </label>
                    {(post.platform_targets as string[]).map((platform) => {
                      const platformConns = connections.filter(
                        (c) => c.platform_id === platform && c.status === 'connected'
                      );
                      return (
                        <div key={platform} className="flex items-center gap-2">
                          <span className="text-xs text-zinc-300 w-16 truncate capitalize">
                            {platform}
                          </span>
                          {platformConns.length > 0 ? (
                            <select
                              value={connectionIdsByPlatform[platform] || ''}
                              onChange={(e) =>
                                setConnectionIdsByPlatform((prev) => ({
                                  ...prev,
                                  [platform]: e.target.value,
                                }))
                              }
                              className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 focus:border-blue-500 focus:outline-none"
                            >
                              <option value="">Select…</option>
                              {platformConns.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.account_label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-zinc-600 italic">
                              No connection
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Date & time pickers */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Date</label>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Time</label>
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-600">
                    Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                  </div>

                  {/* Dry-run toggle */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dryRun}
                      onChange={(e) => setDryRun(e.target.checked)}
                      className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-xs text-zinc-300">Dry-run mode</span>
                    <span className="text-[10px] text-zinc-600">(simulated)</span>
                  </label>

                  {/* Schedule button */}
                  <Button
                    onClick={handleSchedule}
                    disabled={scheduling || post.status === 'scheduled'}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {scheduling ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Scheduling…</>
                    ) : scheduleSuccess ? (
                      <><CheckCircle className="h-4 w-4 mr-2" />Scheduled!</>
                    ) : post.status === 'scheduled' ? (
                      <><Clock className="h-4 w-4 mr-2" />Already Scheduled</>
                    ) : (
                      <><Send className="h-4 w-4 mr-2" />Schedule Post</>
                    )}
                  </Button>

                  {scheduleError && (
                    <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded">
                      {scheduleError}
                    </div>
                  )}
                  {scheduleSuccess && (
                    <div className="text-xs text-emerald-400 bg-emerald-500/10 p-2 rounded">
                      Post scheduled successfully!
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-zinc-500 italic">
                  Select platforms first in Settings below.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Post Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Date"
                type="date"
                value={post.date}
                onChange={(e) => handleFieldChange('date', e.target.value)}
              />

              <Select
                label="Content Type"
                value={post.content_type}
                onChange={(e) => handleFieldChange('content_type', e.target.value)}
                options={CONTENT_TYPE_OPTIONS}
              />

              <Input
                label="Theme"
                value={post.theme || ''}
                onChange={(e) => handleFieldChange('theme', e.target.value)}
                placeholder="e.g., Product Launch"
              />

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Platforms
                </label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map((platform) => (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => handlePlatformToggle(platform)}
                      className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                        post.platform_targets.includes(platform as any)
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {platform}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Social Preview */}
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                See how your post will appear on each platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SocialPreview
                caption={post.caption}
                channelName={post.channel_name}
                hashtags={post.hashtags}
                cta={post.cta}
                platforms={post.platform_targets}
                assets={assets}
                date={post.date}
                variants={post.visual_variants}
              />
            </CardContent>
          </Card>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
