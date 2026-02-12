# Phase 1: Platform-Safe Media Detection

## Overview
Phase 1 implements platform-safe media detection with governance warnings and a visual handling fork. This scaffolds the governance-first approach for Phase 2 AI variant generation.

## What Was Implemented

### 1. Core Utilities

#### Platform Specifications (`src/lib/constants/platform-specs.ts`)
- Safe aspect ratio windows for each platform:
  - Instagram Feed: 0.80 to 1.91 (4:5 to 1.91:1)
  - Instagram Reels: 0.55 to 0.60 (9:16)
  - TikTok: 0.55 to 0.60 (9:16)
  - Twitter/X: 1.70 to 1.91 (16:9)
  - LinkedIn: 1.50 to 1.91
  - Facebook: 1.50 to 1.91
  - YouTube Thumbnail: 1.70 to 1.91 (16:9)
  - Pinterest: 0.60 to 0.75 (2:3)

- Functions:
  - `getPlatformSpecKey()` - Maps platform names to spec keys based on content type
  - `checkAspectRatioSafety()` - Determines if ratio is safe ('ok' | 'warn' | 'unknown')
  - `analyzePlatformRisks()` - Analyzes all selected platforms
  - `getPlatformAspectRatioLabel()` - Human-readable labels

#### Image Analyzer (`src/lib/utils/image-analyzer.ts`)
- `getImageDimensions()` - Extracts width, height, aspect ratio from images
- `analyzeImageFile()` - Analyzes File objects (returns null for non-images)
- `analyzeAssetByPath()` - Analyzes by storage path/data URL
- `formatAspectRatio()` - Formats ratios as readable strings (e.g., "16:9")

### 2. Data Model Extensions

#### Post Schema Updates
Added three new fields to `PublisherPost`:

```typescript
visual_handling: 'single' | 'variants'  // Default: 'single'
media_aspect_ratio: number | null        // Computed on upload
media_risk_by_platform: Record<string, 'ok' | 'warn' | 'unknown'>
```

Updated files:
- `src/lib/types/database.ts` - TypeScript interface
- `src/lib/schemas/post.ts` - Zod validation schema
- `supabase/schema.sql` - Database table definition
- `supabase/migrations/001_add_visual_handling.sql` - Migration script

### 3. Composer Integration

#### Upload Flow Enhancement
Modified `handleFileUpload` in composer to:
1. Analyze image dimensions for first asset
2. Calculate aspect ratio
3. Determine platform-specific cropping risks
4. Handle videos as 'unknown'
5. Persist results to post state

#### Platform Toggle Enhancement
Updated `handlePlatformToggle` to:
- Recalculate risks when platforms change
- Update `media_risk_by_platform` in real-time

#### Visual Handling UI Card
New card displayed when assets exist:
- **Option 1**: "Use one image (may crop)" - Enabled, default
- **Option 2**: "Generate platform-safe visuals automatically" - Disabled, "Coming soon" badge
- **Platform Safety Report**: Color-coded chips per platform
  - OK: Zinc border, subtle
  - May crop: Amber border, warning
  - Unknown: Gray, minimal
- **Helper text**: "Cropping risk isn't a design issue — it's a platform rule."
- **Multi-asset notice**: "Multiple assets detected — Phase 1 checks first asset only"
- **Video notice**: "Video ratio checks coming soon"

### 4. Governance Integration

#### New Validation Function
`checkPlatformMediaRequirements()` in `validator.ts`:
- Only applies when `visual_handling === 'single'`
- Finds platforms with 'warn' risk
- Adds warnings with -10 score penalty per platform (capped at -30)
- Message: "This image may be cropped on: [platforms]"

Integrated into all three profile validators:
- `validateStrict()`
- `validateStandard()`
- `validateExperimental()`

#### Scoring Impact
- Each warned platform: -10 points
- Maximum penalty: -30 points (3 platforms)
- Status: `allowed_with_edits` (not blocked)

### 5. Storage Layer Updates

Updated `src/lib/storage/posts.ts`:
- Added default values for new fields in `savePosts()`
- Automatic handling via spread operators in `updatePost()`

## User Flow

1. **User uploads image** → Aspect ratio detected and persisted
2. **User selects platforms** → Risk analysis runs automatically
3. **Warnings appear** → Governance panel shows cropping warnings
4. **User chooses handling**:
   - Keep "Use one image" → Warnings persist, score penalty applied
   - Select "Generate variants" (future) → Warnings removed when Phase 2 ships
5. **Validation runs** → Score reflects platform mismatches
6. **Post can still publish** → Warnings don't block, just inform

## Testing Scenarios

### Scenario 1: Wide Image (2:1 ratio)
- Upload 2000x1000 image
- Select: Instagram, TikTok, Twitter
- Expected:
  - Instagram Feed: WARN (too wide, outside 0.80-1.91)
  - TikTok: WARN (vertical platform, needs 9:16)
  - Twitter: OK (close to 16:9)
- Governance: 2 warnings, -20 score penalty

### Scenario 2: Vertical Image (9:16 ratio)
- Upload 1080x1920 image (0.5625 ratio)
- Select: TikTok, Instagram, Twitter
- Content type: Reel
- Expected:
  - TikTok: OK (perfect 9:16)
  - Instagram Reels: OK (perfect for reels)
  - Twitter: WARN (too tall for 16:9)
- Governance: 1 warning, -10 score penalty

### Scenario 3: Square Image (1:1 ratio)
- Upload 1080x1080 image
- Select: Instagram, Pinterest, Facebook
- Expected:
  - Instagram: OK (within 0.80-1.91)
  - Pinterest: WARN (too square, needs 2:3 tall)
  - Facebook: OK (within 1.50-1.91)
- Governance: 1 warning, -10 score penalty

### Scenario 4: Video Upload
- Upload any video file
- Select: Any platforms
- Expected:
  - All platforms: UNKNOWN
  - Notice: "Video ratio checks coming soon"
- Governance: Warnings for unknowns

### Scenario 5: Multiple Assets
- Upload 3 images
- Expected:
  - Only first image analyzed
  - Notice: "Multiple assets detected — Phase 1 checks first asset only"

## Phase 2 Readiness

The implementation sets up clean scaffolding for Phase 2:

1. **Data model ready**: `visual_handling: 'variants'` awaits implementation
2. **UI slot reserved**: "Generate variants" button ready to enable
3. **Governance hooks in place**: Switch to `variants` will remove warnings
4. **Platform specs defined**: Clear requirements for generation logic
5. **Risk assessment working**: Knows exactly which platforms need variants

## Files Created/Modified

### New Files
- `src/lib/constants/platform-specs.ts`
- `src/lib/utils/image-analyzer.ts`
- `supabase/migrations/001_add_visual_handling.sql`
- `PHASE1_IMPLEMENTATION.md` (this file)

### Modified Files
- `src/lib/types/database.ts`
- `src/lib/schemas/post.ts`
- `src/lib/governance/validator.ts`
- `src/lib/storage/posts.ts`
- `src/app/(app)/composer/[postId]/page.tsx`
- `supabase/schema.sql`

## Known Limitations (Phase 1)

1. **First asset only**: Multiple assets only check the first one
2. **Videos unsupported**: Treated as 'unknown', no dimension detection
3. **No variant generation**: "Generate variants" button disabled
4. **Client-side only**: Image analysis happens in browser
5. **No caching**: Re-analyzes on every page load if aspect ratio missing
6. **Basic ratio matching**: No consideration for safe zones or UI overlays

## Database Migration

To apply the schema changes:

```sql
-- Run the migration
\i supabase/migrations/001_add_visual_handling.sql
```

For existing posts, the migration sets defaults:
- `visual_handling = 'single'`
- `media_aspect_ratio = NULL`
- `media_risk_by_platform = {}`

## Development Notes

### Aspect Ratio Calculation
```typescript
aspectRatio = width / height

// Examples:
// 1920x1080 (16:9) = 1.777
// 1080x1920 (9:16) = 0.5625
// 1080x1080 (1:1) = 1.0
// 1080x1350 (4:5) = 0.8
```

### Platform Mapping Logic
- Instagram + Reel content → Check `instagram_reels` (9:16)
- Instagram + Static content → Check `instagram_feed` (0.80-1.91)
- Twitter → Maps to `x_twitter` (1.70-1.91)
- YouTube + Video → Check `youtube_thumbnail` (16:9)

### Governance Score Calculation
```typescript
// Base score: 100
// Each error: -25
// Each warning: -10
// Platform warnings: -10 per platform (max 3)

// Example:
// 3 platforms with warnings = -30
// Final score: 70 (allowed_with_edits)
```

## Next Steps (Phase 2)

1. **AI Integration**: Connect to image generation API
2. **Variant Generation**: Implement aspect ratio transformation
3. **Enable UI**: Remove "Coming soon" badge, wire up button
4. **Storage**: Store generated variants alongside original
5. **Publishing**: Use correct variant per platform
6. **Analytics**: Track usage and success rates

## Success Criteria (Phase 1) ✓

- [x] Detect image aspect ratios on upload
- [x] Show platform-by-platform risk assessment
- [x] Display visual handling fork UI
- [x] Add governance warnings (not blocks)
- [x] Persist user's choice on post
- [x] No compilation errors
- [x] Dev server runs successfully
- [x] Schema migration created
- [x] All profile validators integrated
- [x] "Coming soon" state for Phase 2
