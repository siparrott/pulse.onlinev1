'use client';

import { useState } from 'react';
import { ChevronRight, ChevronLeft, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { BrandPackFormInput } from '@/lib/schemas/brand-pack';
import type { GovernanceProfile } from '@/lib/types/database';

interface BrandPackWizardProps {
  governanceProfile: GovernanceProfile;
  initialData?: Partial<BrandPackFormInput>;
  onComplete: (data: BrandPackFormInput) => void;
  onCancel: () => void;
}

export function BrandPackWizard({ governanceProfile, initialData, onComplete, onCancel }: BrandPackWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<BrandPackFormInput>>(initialData || {
    identity: {
      mission: '',
      audience: '',
      brandPersonality: [],
      riskTolerance: governanceProfile === 'strict' ? 'low' : governanceProfile === 'experimental' ? 'high' : 'medium',
    },
    languageRules: {
      requiredCTA: governanceProfile === 'strict',
      requiredHashtags: governanceProfile === 'strict',
      forbiddenClaims: governanceProfile === 'strict' ? ['guaranteed', 'best', 'revolutionary'] : [],
      forbiddenComparisons: governanceProfile === 'strict',
      toneConstraints: {
        avoidSalesy: governanceProfile === 'strict',
        avoidHype: governanceProfile === 'strict',
        allowHumor: governanceProfile !== 'strict',
      },
    },
    visualRules: {
      stylePreferences: ['photography'],
      realismLevel: 'photorealistic',
      allowAIPeople: true,
      allowRealPeople: true,
      allowTextInImage: governanceProfile !== 'strict',
      colorMoodHints: [],
      forbiddenVisualMotifs: governanceProfile === 'strict' ? ['fake testimonials', 'before/after'] : [],
    },
    aiPromptAnchors: {
      imageSystemPrompt: 'Generate professional marketing imagery that aligns with brand guidelines.',
      imageStylePrompt: 'Clean, modern, high-quality visual style.',
    },
    governanceOverrides: {
      requireVariantApproval: governanceProfile === 'strict',
      escalateVisualWarnings: governanceProfile === 'strict',
    },
  });

  const personalityOptions = ['authoritative', 'calm', 'experimental', 'playful', 'technical', 'editorial'] as const;
  const styleOptions = ['photography', 'illustration', 'ui_mockup', 'abstract', 'diagram'] as const;
  const realismOptions = ['photorealistic', 'stylized', 'abstract'] as const;

  const toggleArrayItem = <T,>(arr: T[], item: T): T[] => {
    return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
  };

  const addChip = (field: string, value: string) => {
    if (!value.trim()) return;
    const current = formData.visualRules?.[field as keyof typeof formData.visualRules] as string[] || [];
    setFormData((prev) => ({
      ...prev,
      visualRules: {
        ...prev.visualRules!,
        [field]: [...current, value.trim()],
      },
    }));
  };

  const removeChip = (field: string, index: number) => {
    const current = formData.visualRules?.[field as keyof typeof formData.visualRules] as string[] || [];
    setFormData((prev) => ({
      ...prev,
      visualRules: {
        ...prev.visualRules!,
        [field]: current.filter((_, i) => i !== index),
      },
    }));
  };

  const canProceed = () => {
    if (step === 1) {
      return (
        formData.identity?.mission &&
        formData.identity.mission.length >= 10 &&
        formData.identity.audience &&
        formData.identity.brandPersonality.length > 0
      );
    }
    if (step === 3) {
      return formData.visualRules?.stylePreferences && formData.visualRules.stylePreferences.length > 0;
    }
    if (step === 4) {
      return (
        formData.aiPromptAnchors?.imageSystemPrompt &&
        formData.aiPromptAnchors.imageSystemPrompt.length >= 20 &&
        formData.aiPromptAnchors.imageStylePrompt &&
        formData.aiPromptAnchors.imageStylePrompt.length >= 20
      );
    }
    return true;
  };

  const handleComplete = () => {
    onComplete(formData as BrandPackFormInput);
  };

  const completeness = calculateCompleteness();

  function calculateCompleteness() {
    let score = 0;
    if (formData.identity?.mission && formData.identity.mission.length >= 10) score += 15;
    if (formData.identity?.audience && formData.identity.audience.length >= 5) score += 15;
    if (formData.identity?.brandPersonality && formData.identity.brandPersonality.length > 0) score += 10;
    if (formData.languageRules?.toneConstraints) score += 10;
    if (formData.visualRules?.stylePreferences && formData.visualRules.stylePreferences.length > 0) score += 15;
    if (formData.visualRules?.realismLevel) score += 10;
    if (formData.aiPromptAnchors?.imageSystemPrompt && formData.aiPromptAnchors.imageSystemPrompt.length >= 20) score += 12.5;
    if (formData.aiPromptAnchors?.imageStylePrompt && formData.aiPromptAnchors.imageStylePrompt.length >= 20) score += 12.5;
    return Math.round(score);
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Step {step} of 4</span>
          <span className={`font-medium ${completeness >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {completeness}% Complete
          </span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-emerald-600 to-emerald-400 transition-all duration-300"
            style={{ width: `${completeness}%` }}
          />
        </div>
      </div>

      {/* Step 1: Identity */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">Brand Identity</h3>
          </div>

          <Textarea
            label="Mission Statement"
            value={formData.identity?.mission || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                identity: { ...prev.identity!, mission: e.target.value },
              }))
            }
            rows={3}
            placeholder="What is the core purpose of this product? (1-2 sentences)"
            maxLength={280}
          />
          <div className="text-xs text-zinc-500 text-right">
            {formData.identity?.mission?.length || 0} / 280
          </div>

          <Input
            label="Target Audience"
            value={formData.identity?.audience || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                identity: { ...prev.identity!, audience: e.target.value },
              }))
            }
            placeholder="Who is this product for?"
            maxLength={200}
          />

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Brand Personality (max 3)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {personalityOptions.map((personality) => (
                <button
                  key={personality}
                  type="button"
                  onClick={() => {
                    const current = formData.identity?.brandPersonality || [];
                    if (current.includes(personality)) {
                      setFormData((prev) => ({
                        ...prev,
                        identity: {
                          ...prev.identity!,
                          brandPersonality: current.filter((p) => p !== personality),
                        },
                      }));
                    } else if (current.length < 3) {
                      setFormData((prev) => ({
                        ...prev,
                        identity: {
                          ...prev.identity!,
                          brandPersonality: [...current, personality],
                        },
                      }));
                    }
                  }}
                  disabled={
                    !formData.identity?.brandPersonality?.includes(personality) &&
                    (formData.identity?.brandPersonality?.length || 0) >= 3
                  }
                  className={`px-3 py-2 text-sm rounded border transition-colors ${
                    formData.identity?.brandPersonality?.includes(personality)
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {personality}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Risk Tolerance</label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map((risk) => (
                <button
                  key={risk}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      identity: { ...prev.identity!, riskTolerance: risk },
                    }))
                  }
                  className={`px-3 py-2 text-sm rounded border transition-colors ${
                    formData.identity?.riskTolerance === risk
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {risk}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Language Guardrails */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">Language Guardrails</h3>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.languageRules?.requiredCTA || false}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    languageRules: { ...prev.languageRules!, requiredCTA: e.target.checked },
                  }))
                }
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-600"
              />
              <span className="text-sm text-zinc-300">CTA Required</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.languageRules?.requiredHashtags || false}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    languageRules: { ...prev.languageRules!, requiredHashtags: e.target.checked },
                  }))
                }
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-600"
              />
              <span className="text-sm text-zinc-300">Hashtags Required</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.languageRules?.toneConstraints?.avoidHype || false}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    languageRules: {
                      ...prev.languageRules!,
                      toneConstraints: {
                        ...prev.languageRules!.toneConstraints,
                        avoidHype: e.target.checked,
                      },
                    },
                  }))
                }
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-600"
              />
              <span className="text-sm text-zinc-300">Avoid Hype Language</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.languageRules?.toneConstraints?.avoidSalesy || false}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    languageRules: {
                      ...prev.languageRules!,
                      toneConstraints: {
                        ...prev.languageRules!.toneConstraints,
                        avoidSalesy: e.target.checked,
                      },
                    },
                  }))
                }
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-600"
              />
              <span className="text-sm text-zinc-300">Avoid Sales Language</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.languageRules?.toneConstraints?.allowHumor || false}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    languageRules: {
                      ...prev.languageRules!,
                      toneConstraints: {
                        ...prev.languageRules!.toneConstraints,
                        allowHumor: e.target.checked,
                      },
                    },
                  }))
                }
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-600"
              />
              <span className="text-sm text-zinc-300">Allow Humor</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.languageRules?.forbiddenComparisons || false}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    languageRules: { ...prev.languageRules!, forbiddenComparisons: e.target.checked },
                  }))
                }
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-600"
              />
              <span className="text-sm text-zinc-300">Forbid Competitor Comparisons</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Forbidden Claims</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.languageRules?.forbiddenClaims?.map((claim, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded flex items-center gap-1"
                >
                  {claim}
                  <button
                    type="button"
                    onClick={() => {
                      const current = formData.languageRules?.forbiddenClaims || [];
                      setFormData((prev) => ({
                        ...prev,
                        languageRules: {
                          ...prev.languageRules!,
                          forbiddenClaims: current.filter((_, idx) => idx !== i),
                        },
                      }));
                    }}
                    className="hover:text-red-300"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <Input
              placeholder="Add forbidden claim (e.g., guaranteed, best)"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const value = e.currentTarget.value.trim();
                  if (value) {
                    const current = formData.languageRules?.forbiddenClaims || [];
                    setFormData((prev) => ({
                      ...prev,
                      languageRules: {
                        ...prev.languageRules!,
                        forbiddenClaims: [...current, value],
                      },
                    }));
                    e.currentTarget.value = '';
                  }
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Step 3: Visual Guardrails */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">Visual Guardrails</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Style Preferences (multi-select)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {styleOptions.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      visualRules: {
                        ...prev.visualRules!,
                        stylePreferences: toggleArrayItem(prev.visualRules?.stylePreferences || [], style),
                      },
                    }))
                  }
                  className={`px-3 py-2 text-sm rounded border transition-colors ${
                    formData.visualRules?.stylePreferences?.includes(style)
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {style.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Realism Level</label>
            <div className="grid grid-cols-3 gap-2">
              {realismOptions.map((realism) => (
                <button
                  key={realism}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      visualRules: { ...prev.visualRules!, realismLevel: realism },
                    }))
                  }
                  className={`px-3 py-2 text-sm rounded border transition-colors ${
                    formData.visualRules?.realismLevel === realism
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {realism}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.visualRules?.allowAIPeople || false}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    visualRules: { ...prev.visualRules!, allowAIPeople: e.target.checked },
                  }))
                }
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-600"
              />
              <span className="text-sm text-zinc-300">Allow AI-Generated People</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.visualRules?.allowRealPeople || false}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    visualRules: { ...prev.visualRules!, allowRealPeople: e.target.checked },
                  }))
                }
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-600"
              />
              <span className="text-sm text-zinc-300">Allow Real People Photos</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.visualRules?.allowTextInImage || false}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    visualRules: { ...prev.visualRules!, allowTextInImage: e.target.checked },
                  }))
                }
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-600"
              />
              <span className="text-sm text-zinc-300">Allow Text in Images</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Color Mood Hints</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.visualRules?.colorMoodHints?.map((hint, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded flex items-center gap-1"
                >
                  {hint}
                  <button
                    type="button"
                    onClick={() => removeChip('colorMoodHints', i)}
                    className="hover:text-blue-300"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <Input
              placeholder="Add mood hint (e.g., dark, vibrant)"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addChip('colorMoodHints', e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Forbidden Visual Motifs</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.visualRules?.forbiddenVisualMotifs?.map((motif, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded flex items-center gap-1"
                >
                  {motif}
                  <button
                    type="button"
                    onClick={() => removeChip('forbiddenVisualMotifs', i)}
                    className="hover:text-red-300"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <Input
              placeholder="Add forbidden motif (e.g., fake testimonials)"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addChip('forbiddenVisualMotifs', e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Step 4: AI Prompt Anchors */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">AI Prompt Anchors</h3>
          </div>

          <div className="text-xs text-amber-400 bg-amber-500/10 p-3 rounded mb-4">
            ⚠️ Advanced: These prompts are internal-only and control AI image generation behavior
          </div>

          <Textarea
            label="Image System Prompt"
            value={formData.aiPromptAnchors?.imageSystemPrompt || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                aiPromptAnchors: {
                  ...prev.aiPromptAnchors!,
                  imageSystemPrompt: e.target.value,
                },
              }))
            }
            rows={4}
            placeholder="Core instructions for AI image generation..."
          />

          <Textarea
            label="Image Style Prompt"
            value={formData.aiPromptAnchors?.imageStylePrompt || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                aiPromptAnchors: {
                  ...prev.aiPromptAnchors!,
                  imageStylePrompt: e.target.value,
                },
              }))
            }
            rows={3}
            placeholder="Visual style guidelines for AI..."
          />

          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <h4 className="text-sm font-medium text-zinc-300">Governance Overrides</h4>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.governanceOverrides?.requireVariantApproval || false}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    governanceOverrides: {
                      ...prev.governanceOverrides!,
                      requireVariantApproval: e.target.checked,
                    },
                  }))
                }
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-600"
              />
              <span className="text-sm text-zinc-300">Require Manual Approval for All Variants</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.governanceOverrides?.escalateVisualWarnings || false}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    governanceOverrides: {
                      ...prev.governanceOverrides!,
                      escalateVisualWarnings: e.target.checked,
                    },
                  }))
                }
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-600"
              />
              <span className="text-sm text-zinc-300">Escalate Visual Warnings to Errors</span>
            </label>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <Button variant="ghost" onClick={step === 1 ? onCancel : () => setStep(step - 1)}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>

        <div className="flex gap-2">
          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={!canProceed()} className="bg-emerald-600 hover:bg-emerald-700">
              <Check className="h-4 w-4 mr-2" />
              Complete Brand Pack
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
