/**
 * Phase 7: Meta Preset Automation Rules
 *
 * Three production-ready presets for Facebook Page automations.
 */

import type { RuleConditions, RuleActionDef, RuleConstraints } from '@/lib/types/database';

export interface AutomationPreset {
  id: string;
  name: string;
  description: string;
  platformId: string;
  conditions: RuleConditions;
  actions: RuleActionDef[];
  constraints: RuleConstraints;
  requiresApproval: boolean;
}

export const META_PRESETS: AutomationPreset[] = [
  {
    id: 'second-chance-repost',
    name: 'Second Chance Repost (Low Reach)',
    description:
      'Automatically schedules a repost when a Facebook post has low reach after 20-30 hours. Great for giving content a second chance with a fresh audience.',
    platformId: 'facebook',
    conditions: {
      when: 'after_publish',
      window: { hoursSincePublishMin: 20, hoursSincePublishMax: 30 },
      metrics: [
        { field: 'reach', op: '<', value: 500 },
        { field: 'impressions', op: '<', value: 800 },
      ],
      platform: 'facebook',
    },
    actions: [
      {
        type: 'schedule_repost',
        delayHours: 24,
        captionAppend: 'Quick reminder 👇',
        useSameMedia: true,
      },
    ],
    constraints: {
      maxRepostsPerOriginal: 1,
      cooldownHoursPerPost: 72,
      maxActionsPerDay: 2,
    },
    requiresApproval: true,
  },
  {
    id: 'winner-amplifier',
    name: 'Winner Amplifier (High Engagement)',
    description:
      'Amplifies high-performing posts by scheduling a reshare. Triggers when engagement rate or shares exceed thresholds within 8-18 hours.',
    platformId: 'facebook',
    conditions: {
      when: 'after_publish',
      window: { hoursSincePublishMin: 8, hoursSincePublishMax: 18 },
      metrics: [
        { field: 'engagementRate', op: '>=', value: 0.05 },
        { field: 'shares', op: '>=', value: 5 },
      ],
      platform: 'facebook',
    },
    actions: [
      {
        type: 'schedule_repost',
        delayHours: 48,
        captionAppend: 'This one popped off—saving it here.',
        useSameMedia: true,
      },
    ],
    constraints: {
      maxRepostsPerOriginal: 1,
      maxActionsPerDay: 1,
    },
    requiresApproval: true,
  },
  {
    id: 'silent-failure-alert',
    name: 'Silent Failure Alert',
    description:
      'Sends an in-app notification when a post is underperforming badly (very low reach and likes) within 6-12 hours. No auto-action—just an alert.',
    platformId: 'facebook',
    conditions: {
      when: 'after_publish',
      window: { hoursSincePublishMin: 6, hoursSincePublishMax: 12 },
      metrics: [
        { field: 'reach', op: '<', value: 100 },
        { field: 'likes', op: '<', value: 3 },
      ],
      logic: 'and',
      platform: 'facebook',
    },
    actions: [
      {
        type: 'notify',
        message:
          'Facebook post is underperforming. Consider a repost tomorrow morning.',
      },
    ],
    constraints: {
      maxActionsPerDay: 3,
    },
    requiresApproval: false,
  },
];

export function getPresetById(id: string): AutomationPreset | undefined {
  return META_PRESETS.find((p) => p.id === id);
}
