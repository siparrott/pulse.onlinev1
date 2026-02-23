/**
 * Phase 7: Automation Action DSL
 *
 * planActions:       Generates ActionPlan items from a rule + delivery context.
 * enforceConstraints: Applies caps, cooldowns, quiet hours, max reposts to filter plans.
 */

import type {
  AutomationRule,
  RuleActionDef,
  RuleConstraints,
  PostDelivery,
  EngagementRollup,
} from '@/lib/types/database';

// ── ActionPlan: what the engine wants to do ──────────────────

export interface ActionPlan {
  actionType: string;
  deliveryId: string;
  scheduleId: string;
  platformId: string;
  payload: Record<string, unknown>;
  reason: string;
}

export interface ConstraintResult {
  allowedPlans: ActionPlan[];
  blockedPlans: Array<ActionPlan & { blockReason: string }>;
}

// ── ActionContext: data needed for planning ──────────────────

export interface ActionContext {
  delivery: PostDelivery;
  rollup: EngagementRollup | null;
  originalCaption: string;
  originalScheduleId: string;
  variantStorageKey: string | null;
  linkUrl: string | null;
  connectionId: string;
}

// ── ActionHistory: past actions for constraint checks ────────

export interface ActionHistory {
  /** Number of actions (any type) by this rule today */
  actionsToday: number;
  /** Number of reposts already created for this specific original delivery */
  repostsForDelivery: number;
  /** Last action timestamp for this delivery (for cooldown check) */
  lastActionForDeliveryAt: string | null;
}

// ── Plan actions from a rule + delivery context ──────────────

/**
 * Given a matched rule and a delivery context, produce action plans.
 */
export function planActions(
  rule: AutomationRule,
  ctx: ActionContext
): ActionPlan[] {
  const plans: ActionPlan[] = [];

  for (const actionDef of rule.actions) {
    const plan = buildActionPlan(actionDef, rule, ctx);
    if (plan) plans.push(plan);
  }

  return plans;
}

function buildActionPlan(
  def: RuleActionDef,
  rule: AutomationRule,
  ctx: ActionContext
): ActionPlan | null {
  const base = {
    deliveryId: ctx.delivery.id,
    scheduleId: ctx.originalScheduleId,
    platformId: rule.platform_id,
  };

  switch (def.type) {
    case 'schedule_repost':
      return {
        ...base,
        actionType: 'schedule_repost',
        payload: {
          delayHours: def.delayHours ?? 24,
          captionAppend: def.captionAppend ?? '',
          useSameMedia: def.useSameMedia ?? true,
          originalCaption: ctx.originalCaption,
          variantStorageKey: ctx.variantStorageKey,
          linkUrl: ctx.linkUrl,
          connectionId: ctx.connectionId,
        },
        reason: `Repost scheduled +${def.delayHours ?? 24}h via rule "${rule.name}"`,
      };

    case 'schedule_crosspost':
      return {
        ...base,
        actionType: 'schedule_crosspost',
        payload: {
          target: def.target ?? 'instagram',
          delayHours: def.delayHours ?? 24,
          originalCaption: ctx.originalCaption,
          variantStorageKey: ctx.variantStorageKey,
          linkUrl: ctx.linkUrl,
        },
        reason: `Crosspost to ${def.target ?? 'instagram'} via rule "${rule.name}"`,
      };

    case 'notify':
      return {
        ...base,
        actionType: 'notify',
        payload: {
          message: def.message ?? 'Automation triggered a notification.',
        },
        reason: `Notify via rule "${rule.name}"`,
      };

    case 'queue_comment_reply_suggestion':
      return {
        ...base,
        actionType: 'queue_comment_reply_suggestion',
        payload: {
          tone: def.tone ?? 'friendly',
          maxSuggestions: def.maxSuggestions ?? 3,
        },
        reason: `Comment reply suggestion via rule "${rule.name}"`,
      };

    default:
      return null;
  }
}

// ── Enforce constraints ──────────────────────────────────────

/**
 * Apply safety constraints (caps, cooldowns, quiet hours, max reposts).
 * Returns allowed and blocked plans with reasons.
 */
export function enforceConstraints(
  rule: AutomationRule,
  plans: ActionPlan[],
  history: ActionHistory
): ConstraintResult {
  const constraints = rule.constraints;
  const allowed: ActionPlan[] = [];
  const blocked: Array<ActionPlan & { blockReason: string }> = [];

  // ── Global kill switch ──
  if (process.env.AUTOMATION_DISABLED === 'true') {
    for (const plan of plans) {
      blocked.push({ ...plan, blockReason: 'AUTOMATION_DISABLED=true (global kill switch)' });
    }
    return { allowedPlans: allowed, blockedPlans: blocked };
  }

  for (const plan of plans) {
    const blockReason = checkPlanConstraints(plan, constraints, history);
    if (blockReason) {
      blocked.push({ ...plan, blockReason });
    } else {
      allowed.push(plan);
    }
  }

  return { allowedPlans: allowed, blockedPlans: blocked };
}

function checkPlanConstraints(
  plan: ActionPlan,
  constraints: RuleConstraints,
  history: ActionHistory
): string | null {
  // ── Max actions per day ──
  if (constraints.maxActionsPerDay != null) {
    if (history.actionsToday >= constraints.maxActionsPerDay) {
      return `Daily cap reached (${history.actionsToday}/${constraints.maxActionsPerDay})`;
    }
  }

  // ── Max reposts per original ──
  if (
    (plan.actionType === 'schedule_repost' || plan.actionType === 'schedule_crosspost') &&
    constraints.maxRepostsPerOriginal != null
  ) {
    if (history.repostsForDelivery >= constraints.maxRepostsPerOriginal) {
      return `Max reposts per original reached (${history.repostsForDelivery}/${constraints.maxRepostsPerOriginal})`;
    }
  }

  // ── Cooldown per post ──
  if (constraints.cooldownHoursPerPost != null && history.lastActionForDeliveryAt) {
    const lastMs = new Date(history.lastActionForDeliveryAt).getTime();
    const cooldownMs = constraints.cooldownHoursPerPost * 60 * 60 * 1000;
    const now = Date.now();
    if (now - lastMs < cooldownMs) {
      const remainHours = ((lastMs + cooldownMs - now) / (1000 * 60 * 60)).toFixed(1);
      return `Cooldown active (${remainHours}h remaining)`;
    }
  }

  return null; // No constraint violation
}

/**
 * Adjust a timestamp for quiet hours. If `scheduledFor` falls within quiet hours,
 * shift it to the next allowed time (e.g., end of quiet period + buffer).
 */
export function adjustForQuietHours(
  scheduledFor: Date,
  quietHours: { start: string; end: string; timezone: string } | undefined
): Date {
  if (!quietHours) return scheduledFor;

  // Parse HH:MM times
  const [startH, startM] = quietHours.start.split(':').map(Number);
  const [endH, endM] = quietHours.end.split(':').map(Number);

  // Work in UTC for simplicity (timezone offset could be added later)
  const hour = scheduledFor.getUTCHours();
  const minute = scheduledFor.getUTCMinutes();
  const timeMinutes = hour * 60 + minute;
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  let inQuietHours = false;

  if (startMinutes <= endMinutes) {
    // Same day range (e.g., 02:00 - 06:00)
    inQuietHours = timeMinutes >= startMinutes && timeMinutes < endMinutes;
  } else {
    // Overnight range (e.g., 21:00 - 07:00)
    inQuietHours = timeMinutes >= startMinutes || timeMinutes < endMinutes;
  }

  if (inQuietHours) {
    // Shift to end of quiet period + 2 hours (e.g., 09:00)
    const shifted = new Date(scheduledFor);
    if (startMinutes > endMinutes && timeMinutes >= startMinutes) {
      // We're in the evening portion of an overnight quiet window — shift to next day's end
      shifted.setUTCDate(shifted.getUTCDate() + 1);
    }
    shifted.setUTCHours(endH, endM, 0, 0);
    // Add a 2-hour buffer after quiet hours end
    shifted.setUTCHours(shifted.getUTCHours() + 2);
    return shifted;
  }

  return scheduledFor;
}
