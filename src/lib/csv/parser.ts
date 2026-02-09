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
  linkedin: 'linkedin',
  li: 'linkedin',
  facebook: 'facebook',
  fb: 'facebook',
  tiktok: 'tiktok',
  tt: 'tiktok',
  youtube: 'youtube',
  yt: 'youtube',
  pinterest: 'pinterest',
  pin: 'pinterest',
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
    { key: 'date', patterns: [/^date$/i, /publish.*date/i, /scheduled/i] },
    { key: 'platform_targets', patterns: [/^platform/i, /channel/i, /network/i] },
    { key: 'content_type', patterns: [/^type$/i, /content.*type/i, /format/i] },
    { key: 'theme', patterns: [/^theme$/i, /topic/i, /category/i] },
    { key: 'caption', patterns: [/^caption$/i, /^text$/i, /^copy$/i, /^content$/i, /^post$/i] },
    { key: 'cta', patterns: [/^cta$/i, /call.*action/i, /action/i] },
    { key: 'hashtags', patterns: [/^hashtag/i, /^tags$/i] },
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

function parsePlatforms(value: string): Platform[] {
  const platforms: Platform[] = [];
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

export function validateAndPreview(
  rows: CSVRow[],
  mapping: ColumnMapping,
  channelId: string
): ImportPreview {
  const posts: PostFormData[] = [];
  const errors: { row: number; message: string }[] = [];
  let validRows = 0;
  let invalidRows = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed + header row
    
    try {
      // Parse date
      const dateValue = row[mapping.date];
      const date = parseDate(dateValue);
      if (!date) {
        throw new Error(`Invalid date: "${dateValue}"`);
      }
      
      // Parse platforms
      const platformValue = row[mapping.platform_targets];
      const platforms = parsePlatforms(platformValue);
      if (platforms.length === 0) {
        throw new Error(`No valid platforms: "${platformValue}"`);
      }
      
      // Parse content type
      const contentTypeValue = row[mapping.content_type];
      const contentType = parseContentType(contentTypeValue);
      if (!contentType) {
        throw new Error(`Invalid content type: "${contentTypeValue}"`);
      }
      
      // Get caption
      const caption = row[mapping.caption];
      if (!caption || caption.trim().length === 0) {
        throw new Error('Caption is empty');
      }
      
      // Build post data
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
