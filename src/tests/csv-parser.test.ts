import { describe, it, expect } from 'vitest';
import {
  parseCSV,
  detectColumns,
  suggestMapping,
  validateAndPreview,
  generateSampleCSV,
} from '@/lib/csv/parser';

describe('CSV Parser', () => {
  describe('parseCSV', () => {
    it('should parse simple CSV', () => {
      const csv = `Date,Platform,Caption
2026-02-10,instagram,Hello world
2026-02-11,twitter,Another post`;

      const rows = parseCSV(csv);

      expect(rows).toHaveLength(2);
      expect(rows[0].Date).toBe('2026-02-10');
      expect(rows[0].Platform).toBe('instagram');
      expect(rows[0].Caption).toBe('Hello world');
    });

    it('should handle quoted fields with commas', () => {
      const csv = `Date,Caption
2026-02-10,"Hello, world"`;

      const rows = parseCSV(csv);

      expect(rows[0].Caption).toBe('Hello, world');
    });

    it('should handle escaped quotes', () => {
      const csv = `Caption
"He said ""hello"""`;

      const rows = parseCSV(csv);

      expect(rows[0].Caption).toBe('He said "hello"');
    });

    it('should handle empty lines', () => {
      const csv = `Date,Caption
2026-02-10,Hello

2026-02-11,World`;

      const rows = parseCSV(csv);

      expect(rows).toHaveLength(2);
    });

    it('should return empty array for insufficient data', () => {
      expect(parseCSV('')).toHaveLength(0);
      expect(parseCSV('just,headers')).toHaveLength(0);
    });
  });

  describe('detectColumns', () => {
    it('should detect column names from rows', () => {
      const rows = [
        { Date: '2026-02-10', Platform: 'ig', Caption: 'Hello' },
      ];

      const columns = detectColumns(rows);

      expect(columns).toContain('Date');
      expect(columns).toContain('Platform');
      expect(columns).toContain('Caption');
    });

    it('should return empty array for empty input', () => {
      expect(detectColumns([])).toHaveLength(0);
    });
  });

  describe('suggestMapping', () => {
    it('should suggest mapping for common column names', () => {
      const columns = ['Date', 'Platform', 'Content Type', 'Caption', 'CTA', 'Hashtags'];

      const mapping = suggestMapping(columns);

      expect(mapping.date).toBe('Date');
      expect(mapping.platform_targets).toBe('Platform');
      expect(mapping.content_type).toBe('Content Type');
      expect(mapping.caption).toBe('Caption');
      expect(mapping.cta).toBe('CTA');
      expect(mapping.hashtags).toBe('Hashtags');
    });

    it('should handle alternative column names', () => {
      const columns = ['Publish Date', 'Channel', 'Format', 'Copy', 'Action', 'Tags'];

      const mapping = suggestMapping(columns);

      expect(mapping.date).toBe('Publish Date');
      expect(mapping.caption).toBe('Copy');
    });
  });

  describe('validateAndPreview', () => {
    const channelId = 'test-channel';
    const mapping = {
      date: 'Date',
      platform_targets: 'Platform',
      content_type: 'Type',
      caption: 'Caption',
      cta: 'CTA',
      hashtags: 'Tags',
    };

    it('should validate and preview valid rows', () => {
      const rows = [
        {
          Date: '2026-02-10',
          Platform: 'instagram',
          Type: 'static',
          Caption: 'Hello world',
          CTA: 'Learn more',
          Tags: '#hello',
        },
      ];

      const preview = validateAndPreview(rows, mapping, channelId);

      expect(preview.validRows).toBe(1);
      expect(preview.invalidRows).toBe(0);
      expect(preview.posts[0].date).toBe('2026-02-10');
      expect(preview.posts[0].platform_targets).toContain('instagram');
    });

    it('should handle multiple platforms', () => {
      const rows = [
        {
          Date: '2026-02-10',
          Platform: 'instagram, twitter, linkedin',
          Type: 'static',
          Caption: 'Multi-platform post',
        },
      ];

      const preview = validateAndPreview(rows, mapping, channelId);

      expect(preview.posts[0].platform_targets).toHaveLength(3);
      expect(preview.posts[0].platform_targets).toContain('instagram');
      expect(preview.posts[0].platform_targets).toContain('twitter');
      expect(preview.posts[0].platform_targets).toContain('linkedin');
    });

    it('should handle platform aliases', () => {
      const rows = [
        {
          Date: '2026-02-10',
          Platform: 'ig, x, li',
          Type: 'static',
          Caption: 'Using aliases',
        },
      ];

      const preview = validateAndPreview(rows, mapping, channelId);

      expect(preview.posts[0].platform_targets).toContain('instagram');
      expect(preview.posts[0].platform_targets).toContain('twitter');
      expect(preview.posts[0].platform_targets).toContain('linkedin');
    });

    it('should handle content type aliases', () => {
      const rows = [
        { Date: '2026-02-10', Platform: 'ig', Type: 'image', Caption: 'Static' },
        { Date: '2026-02-11', Platform: 'ig', Type: 'video', Caption: 'Reel' },
        { Date: '2026-02-12', Platform: 'ig', Type: 'gallery', Caption: 'Carousel' },
      ];

      const preview = validateAndPreview(rows, mapping, channelId);

      expect(preview.posts[0].content_type).toBe('static');
      expect(preview.posts[1].content_type).toBe('reel');
      expect(preview.posts[2].content_type).toBe('carousel');
    });

    it('should parse different date formats', () => {
      const rows = [
        { Date: '2026-02-10', Platform: 'ig', Type: 'static', Caption: 'ISO' },
        { Date: '02/15/2026', Platform: 'ig', Type: 'static', Caption: 'US' },
      ];

      const preview = validateAndPreview(rows, mapping, channelId);

      expect(preview.validRows).toBe(2);
      expect(preview.posts[0].date).toBe('2026-02-10');
      expect(preview.posts[1].date).toBe('2026-02-15');
    });

    it('should report errors for invalid rows', () => {
      const rows = [
        { Date: 'invalid', Platform: 'ig', Type: 'static', Caption: 'Bad date' },
        { Date: '2026-02-10', Platform: 'unknown', Type: 'static', Caption: 'Bad platform' },
        { Date: '2026-02-10', Platform: 'ig', Type: 'unknown', Caption: 'Bad type' },
        { Date: '2026-02-10', Platform: 'ig', Type: 'static', Caption: '' },
      ];

      const preview = validateAndPreview(rows, mapping, channelId);

      expect(preview.invalidRows).toBe(4);
      expect(preview.errors).toHaveLength(4);
    });

    it('should include row numbers in errors', () => {
      const rows = [
        { Date: '2026-02-10', Platform: 'ig', Type: 'static', Caption: 'Good' },
        { Date: 'bad', Platform: 'ig', Type: 'static', Caption: 'Bad' },
      ];

      const preview = validateAndPreview(rows, mapping, channelId);

      expect(preview.errors[0].row).toBe(3); // Row 3 (1-indexed + header)
    });
  });

  describe('generateSampleCSV', () => {
    it('should generate valid sample CSV', () => {
      const csv = generateSampleCSV();
      const rows = parseCSV(csv);

      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0]).toHaveProperty('Date');
      expect(rows[0]).toHaveProperty('Platform');
      expect(rows[0]).toHaveProperty('Caption');
    });
  });
});
