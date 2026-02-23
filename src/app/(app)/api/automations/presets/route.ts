/**
 * Phase 7: GET /api/automations/presets
 *
 * Returns the available preset automation rules.
 */

import { NextResponse } from 'next/server';
import { META_PRESETS } from '@/lib/automation/presets';

export async function GET() {
  return NextResponse.json({ presets: META_PRESETS });
}
