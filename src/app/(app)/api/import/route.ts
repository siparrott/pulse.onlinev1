import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import {
  parseCSV,
  validateAndPreview,
} from '@/lib/csv/parser';
import type { ColumnMapping } from '@/lib/types/database';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const channelId = formData.get('channel_id') as string;
    const mappingJson = formData.get('mapping') as string;

    if (!file || !channelId || !mappingJson) {
      return NextResponse.json(
        { error: 'Missing required fields: file, channel_id, mapping' },
        { status: 400 }
      );
    }

    const mapping: ColumnMapping = JSON.parse(mappingJson);
    const text = await file.text();
    const rows = parseCSV(text);
    const preview = validateAndPreview(rows, mapping, channelId);

    if (preview.validRows === 0) {
      return NextResponse.json(
        { error: 'No valid rows to import', errors: preview.errors },
        { status: 400 }
      );
    }

    // Insert valid posts
    const postsToInsert = preview.posts.map((post) => ({
      ...post,
      status: 'draft',
      governance_status: 'unreviewed',
      governance_score: 0,
      governance_refusals: [],
    }));

    const { data, error } = await supabase
      .from('publisher_posts')
      .insert(postsToInsert)
      .select();

    if (error) throw error;

    // Log import event
    await supabase.from('publisher_governance_events').insert({
      channel_id: channelId,
      event_type: 'csv_import',
      payload: {
        filename: file.name,
        total_rows: preview.totalRows,
        valid_rows: preview.validRows,
        invalid_rows: preview.invalidRows,
        imported_at: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      message: `Successfully imported ${data.length} posts`,
      imported: data.length,
      skipped: preview.invalidRows,
      errors: preview.errors,
    });
  } catch (error) {
    console.error('Error importing CSV:', error);
    return NextResponse.json(
      { error: 'Failed to import CSV' },
      { status: 500 }
    );
  }
}
