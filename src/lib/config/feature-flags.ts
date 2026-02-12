/**
 * Phase 2: Feature Flags Configuration
 * Controls availability of experimental features
 */

// Feature flag for AI-powered variant generation
// Set to true to enable AI generation mode (requires image_gen integration)
export const ENABLE_AI_VARIANTS = process.env.NEXT_PUBLIC_ENABLE_AI_VARIANTS === 'true' || false;

// Feature flag for advanced crop controls
export const ENABLE_ADVANCED_CROP = process.env.NEXT_PUBLIC_ENABLE_ADVANCED_CROP === 'true' || false;

// Development mode flags
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
export const VERBOSE_AUDIT_LOGS = process.env.NEXT_PUBLIC_VERBOSE_AUDIT === 'true' || IS_DEVELOPMENT;
