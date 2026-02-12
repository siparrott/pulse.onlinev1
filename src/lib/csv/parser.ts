import type {
  CSVRow,
  ColumnMapping,
  ImportPreview,
  PostFormData,
  ContentType,
  Platform,
} from '@/lib/types/database';

const CONTENT_TYPE_ALIASES: Record<string, ContentType> = {
  reel: 'reel',
  reels: 'reel',
  video: 'reel',
  static: 'static',
  image: 'static',
  photo: 'static',
  carousel: 'carousel',
  gallery: 'carousel',
  text: 'text',
  'text only': 'text',
  tweet: 'text',
};

const PLATFORM_ALIASES: Record<string, Platform> = {
  instagram: 'instagram',
  ig: 'instagram',
  insta: 'instagram',
  twitter: 'twitter',
  x: 'twitter',
  'x thread': 'twitter',
  linkedin: 'linkedin',
  'linkedin post': 'linkedin',
  li: 'linkedin',
  facebook: 'facebook',
  fb: 'facebook',
  tiktok: 'tiktok',
  tt: 'tiktok',
  youtube: 'youtube',
  yt: 'youtube',
  pinterest: 'pinterest',
  pin: 'pinterest',
  blog: 'linkedin',                  // Blog articles map to linkedin as platform
  'blog article': 'linkedin',
  'short video': 'youtube',
  'short video / veo': 'youtube',
  veo: 'youtube',
};

export function parseCSV(text: string): CSVRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]);
  
  // Parse rows
  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: CSVRow = {};
    
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || '';
    }
    
    rows.push(row);
  }
  
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  
  result.push(current.trim());
  return result;
}

export function detectColumns(rows: CSVRow[]): string[] {
  if (rows.length === 0) return [];
  return Object.keys(rows[0]);
}

export function suggestMapping(columns: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {};
  
  const patterns: { key: keyof ColumnMapping; patterns: RegExp[] }[] = [
    { key: 'date', patterns: [/^date$/i, /publish.*date/i, /scheduled/i, /^day$/i] },
    { key: 'platform_targets', patterns: [/^platform/i, /^channel$/i, /network/i] },
    { key: 'content_type', patterns: [/^type$/i, /content.*type/i, /^format$/i] },
    { key: 'theme', patterns: [/^theme$/i, /^primary theme$/i, /topic/i, /category/i] },
    { key: 'caption', patterns: [/^caption$/i, /^text$/i, /^copy$/i, /^content$/i, /^post$/i, /^content focus$/i, /^content.focus$/i] },
    { key: 'cta', patterns: [/^cta$/i, /call.*action/i, /^action$/i] },
    { key: 'hashtags', patterns: [/^hashtag/i, /^tags$/i] },
    { key: 'week', patterns: [/^week$/i, /^week\s*#?$/i, /^week\s*num/i] },
    { key: 'notes', patterns: [/^notes/i, /^angle$/i, /^notes\s*\/\s*angle$/i, /^description$/i] },
  ];
  
  for (const { key, patterns: regexPatterns } of patterns) {
    for (const col of columns) {
      for (const regex of regexPatterns) {
        if (regex.test(col)) {
          mapping[key] = col;
          break;
        }
      }
      if (mapping[key]) break;
    }
  }
  
  return mapping;
}

function parseDate(value: string): string | null {
  // Try various date formats
  const formats = [
    // ISO format
    /^(\d{4})-(\d{2})-(\d{2})$/,
    // US format
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // UK format
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // European format with dots
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
  ];
  
  // ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  
  // US/UK format MM/DD/YYYY or DD/MM/YYYY - assume MM/DD/YYYY
  const usMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try parsing with Date object
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  return null;
}

function parseContentType(value: string): ContentType | null {
  const normalized = value.toLowerCase().trim();
  return CONTENT_TYPE_ALIASES[normalized] || null;
}

/**
 * Maps combined channel/format values like "Short Video / Veo" → content type
 */
const CHANNEL_CONTENT_TYPE_MAP: Record<string, ContentType> = {
  'linkedin post': 'text',
  'blog article': 'text',
  'short video': 'reel',
  'short video / veo': 'reel',
  'veo': 'reel',
  'x thread': 'text',
};

function deriveContentTypeFromChannel(channelValue: string): ContentType | null {
  const normalized = channelValue.toLowerCase().trim();
  return CHANNEL_CONTENT_TYPE_MAP[normalized] || null;
}

function parsePlatforms(value: string): Platform[] {
  const platforms: Platform[] = [];

  // First try matching the entire value (e.g. "LinkedIn Post", "Short Video / Veo")
  const fullNormalized = value.toLowerCase().trim();
  const fullMatch = PLATFORM_ALIASES[fullNormalized];
  if (fullMatch) {
    return [fullMatch];
  }

  // Then try splitting by delimiters
  const parts = value.toLowerCase().split(/[,;|&]+/);
  
  for (const part of parts) {
    const normalized = part.trim();
    const platform = PLATFORM_ALIASES[normalized];
    if (platform && !platforms.includes(platform)) {
      platforms.push(platform);
    }
  }
  
  return platforms;
}

/**
 * Parse week number from strings like "Week 1", "Week 12", "W3", "1"
 */
function parseWeekNumber(value: string): number | null {
  const match = value.trim().match(/(?:week\s*)?(\d+)/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 52) return num;
  }
  return null;
}

/**
 * Calculate a date from a week number, starting from a given start date.
 * Each week gets a specific day of that week (distributed by row index within the week).
 */
function dateFromWeek(weekNum: number, startDate: Date, indexInWeek: number): string {
  const date = new Date(startDate);
  // Week 1 starts on startDate, Week 2 starts 7 days later, etc.
  date.setDate(date.getDate() + (weekNum - 1) * 7 + indexInWeek);
  return date.toISOString().split('T')[0];
}

export function validateAndPreview(
  rows: CSVRow[],
  mapping: ColumnMapping,
  channelId: string,
  importStartDate?: string
): ImportPreview {
  const posts: PostFormData[] = [];
  const errors: { row: number; message: string }[] = [];
  let validRows = 0;
  let invalidRows = 0;

  // Determine start date for week-based imports
  const startDate = importStartDate ? new Date(importStartDate) : new Date();

  // Track how many rows we've seen per week (to spread dates within weeks)
  const weekRowCounters = new Map<number, number>();
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed + header row
    
    try {
      // ── Parse date (with week-based fallback) ──
      let date: string | null = null;

      // 1) Try the mapped date column first
      const dateValue = row[mapping.date];
      if (dateValue && dateValue.trim()) {
        date = parseDate(dateValue);
      }

      // 2) Fall back to week column → generate dates
      if (!date && mapping.week) {
        const weekValue = row[mapping.week];
        if (weekValue) {
          const weekNum = parseWeekNumber(weekValue);
          if (weekNum !== null) {
            const count = weekRowCounters.get(weekNum) || 0;
            weekRowCounters.set(weekNum, count + 1);
            date = dateFromWeek(weekNum, startDate, count);
          }
        }
      }

      if (!date) {
        throw new Error(`No valid date and no Week column to derive one. Value: "${dateValue || ''}"`);
      }
      
      // ── Parse platforms ──
      const platformValue = row[mapping.platform_targets];
      const platforms = parsePlatforms(platformValue);
      if (platforms.length === 0) {
        throw new Error(`No valid platforms: "${platformValue}"`);
      }
      
      // ── Parse content type (with channel-based fallback) ──
      let contentType: ContentType | null = null;

      // 1) Try the mapped content_type column
      if (mapping.content_type) {
        const contentTypeValue = row[mapping.content_type];
        if (contentTypeValue && contentTypeValue.trim()) {
          contentType = parseContentType(contentTypeValue);
        }
      }

      // 2) Fall back: derive from the platform/channel column value
      if (!contentType) {
        const platformRawValue = row[mapping.platform_targets];
        if (platformRawValue) {
          contentType = deriveContentTypeFromChannel(platformRawValue);
        }
      }

      // 3) Final fallback: default to 'static'
      if (!contentType) {
        contentType = 'static';
      }
      
      // ── Get caption (with auto-generation fallback) ──
      let caption = '';
      if (mapping.caption) {
        caption = (row[mapping.caption] || '').trim();
      }

      // Auto-generate caption from theme + channel if empty
      if (!caption) {
        const theme = mapping.theme ? (row[mapping.theme] || '').trim() : '';
        const notes = mapping.notes ? (row[mapping.notes] || '').trim() : '';
        const channelLabel = platformValue || '';

        if (theme) {
          caption = `[${theme}] ${channelLabel}`;
          if (notes) caption += ` — ${notes}`;
        } else {
          caption = `${channelLabel} post`;
          if (notes) caption += ` — ${notes}`;
        }
      }
      
      // ── Build post data ──
      const post: PostFormData = {
        channel_id: channelId,
        date,
        platform_targets: platforms,
        content_type: contentType,
        caption: caption.trim(),
      };
      
      // Optional fields
      if (mapping.theme && row[mapping.theme]) {
        post.theme = row[mapping.theme].trim();
      }
      if (mapping.cta && row[mapping.cta]) {
        post.cta = row[mapping.cta].trim();
      }
      if (mapping.hashtags && row[mapping.hashtags]) {
        post.hashtags = row[mapping.hashtags].trim();
      }
      
      posts.push(post);
      validRows++;
    } catch (error) {
      invalidRows++;
      errors.push({
        row: rowNum,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  return {
    totalRows: rows.length,
    validRows,
    invalidRows,
    errors,
    posts,
  };
}

export function generateSampleCSV(): string {
  return `Date,Platform,Content Type,Theme,Caption,CTA,Hashtags
2026-02-10,instagram,static,Product Launch,"Introducing our newest feature - designed to help you work smarter, not harder.",Learn more at example.com,#productivity #workflow
2026-02-12,"instagram, twitter",carousel,Tips,"5 ways to boost your efficiency today. Swipe through for our top tips!",Save this post for later,#tips #efficiency
2026-02-14,linkedin,text,Thought Leadership,"We believe great tools should get out of your way. Here's how we're making that happen...",Read the full story,#innovation
2026-02-16,instagram,reel,Behind The Scenes,"A quick look at how we build features you love 🎬",Follow for more,#behindthescenes #dev`;
}
