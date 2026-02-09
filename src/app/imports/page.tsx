'use client';

import { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Download, Database, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  parseCSV,
  detectColumns,
  suggestMapping,
  validateAndPreview,
  generateSampleCSV,
} from '@/lib/csv/parser';
import { fetchChannels, savePosts, getStorageMode } from '@/lib/storage/posts';
import type { CSVRow, ColumnMapping, ImportPreview, PublisherChannel } from '@/lib/types/database';

type Step = 'select' | 'upload' | 'map' | 'preview' | 'complete';

export default function ImportsPage() {
  const [step, setStep] = useState<Step>('select');
  const [channels, setChannels] = useState<PublisherChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [storageMode, setStorageMode] = useState<'supabase' | 'local'>('local');

  useEffect(() => {
    fetchChannels().then(setChannels);
    setStorageMode(getStorageMode());
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCSV(text);
      const cols = detectColumns(rows);
      const suggestedMapping = suggestMapping(cols);

      setCsvData(rows);
      setColumns(cols);
      setMapping(suggestedMapping);
      setStep('map');
    };
    reader.readAsText(file);
  }, []);

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    setMapping((prev) => ({
      ...prev,
      [field]: value || undefined,
    }));
  };

  const handleValidate = () => {
    if (!isValidMapping(mapping)) return;

    const result = validateAndPreview(csvData, mapping as ColumnMapping, selectedChannel);
    setPreview(result);
    setStep('preview');
  };

  const handleImport = async () => {
    if (!preview || preview.validRows === 0) return;

    setImporting(true);

    try {
      // Actually save posts using storage service
      const savedPosts = await savePosts(preview.posts);
      
      setImportResult({
        imported: savedPosts.length,
        errors: preview.errors.map(e => e.message),
      });
      setStep('complete');
    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        imported: 0,
        errors: ['Failed to save posts. Please try again.'],
      });
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadSample = () => {
    const csv = generateSampleCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-calendar.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setStep('select');
    setSelectedChannel('');
    setCsvData([]);
    setColumns([]);
    setMapping({});
    setPreview(null);
    setImportResult(null);
  };

  const isValidMapping = (m: Partial<ColumnMapping>): m is ColumnMapping => {
    return !!(m.date && m.platform_targets && m.content_type && m.caption);
  };

  const channelOptions = [
    { value: '', label: 'Select a channel...' },
    ...channels.map((c) => ({ value: c.id, label: `${c.name} (${c.product_code})` })),
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Import Calendar</h1>
          <p className="text-zinc-400 mt-1">
            Upload a 120-day content calendar CSV for any channel
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {storageMode === 'local' ? (
            <Badge variant="warning" className="flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              Local Storage
            </Badge>
          ) : (
            <Badge variant="success" className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              Supabase
            </Badge>
          )}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {(['select', 'upload', 'map', 'preview', 'complete'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s
                  ? 'bg-emerald-600 text-white'
                  : ['select', 'upload', 'map', 'preview', 'complete'].indexOf(step) > i
                  ? 'bg-emerald-600/30 text-emerald-400'
                  : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {i + 1}
            </div>
            {i < 4 && (
              <div
                className={`w-12 h-0.5 ${
                  ['select', 'upload', 'map', 'preview', 'complete'].indexOf(step) > i
                    ? 'bg-emerald-600/50'
                    : 'bg-zinc-800'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step: Select Channel */}
      {step === 'select' && (
        <Card>
          <CardHeader>
            <CardTitle>Select Channel</CardTitle>
            <CardDescription>
              Choose which product channel this calendar belongs to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Channel"
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              options={channelOptions}
            />
            <div className="flex gap-3">
              <Button
                onClick={() => setStep('upload')}
                disabled={!selectedChannel}
              >
                Continue
              </Button>
              <Button variant="secondary" onClick={handleDownloadSample}>
                <Download className="h-4 w-4 mr-2" />
                Download Sample CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV</CardTitle>
            <CardDescription>
              Upload your content calendar CSV file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-zinc-600 transition-colors">
              <Upload className="h-12 w-12 text-zinc-500 mb-3" />
              <span className="text-sm text-zinc-400">
                Click to upload or drag and drop
              </span>
              <span className="text-xs text-zinc-600 mt-1">CSV files only</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <div className="mt-4">
              <Button variant="secondary" onClick={() => setStep('select')}>
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Map Columns */}
      {step === 'map' && (
        <Card>
          <CardHeader>
            <CardTitle>Map Columns</CardTitle>
            <CardDescription>
              Match your CSV columns to the required fields. Found {csvData.length} rows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Date *"
                value={mapping.date || ''}
                onChange={(e) => handleMappingChange('date', e.target.value)}
                options={[
                  { value: '', label: 'Select column...' },
                  ...columns.map((c) => ({ value: c, label: c })),
                ]}
              />
              <Select
                label="Platform *"
                value={mapping.platform_targets || ''}
                onChange={(e) => handleMappingChange('platform_targets', e.target.value)}
                options={[
                  { value: '', label: 'Select column...' },
                  ...columns.map((c) => ({ value: c, label: c })),
                ]}
              />
              <Select
                label="Content Type *"
                value={mapping.content_type || ''}
                onChange={(e) => handleMappingChange('content_type', e.target.value)}
                options={[
                  { value: '', label: 'Select column...' },
                  ...columns.map((c) => ({ value: c, label: c })),
                ]}
              />
              <Select
                label="Caption *"
                value={mapping.caption || ''}
                onChange={(e) => handleMappingChange('caption', e.target.value)}
                options={[
                  { value: '', label: 'Select column...' },
                  ...columns.map((c) => ({ value: c, label: c })),
                ]}
              />
              <Select
                label="Theme (optional)"
                value={mapping.theme || ''}
                onChange={(e) => handleMappingChange('theme', e.target.value)}
                options={[
                  { value: '', label: 'Select column...' },
                  ...columns.map((c) => ({ value: c, label: c })),
                ]}
              />
              <Select
                label="CTA (optional)"
                value={mapping.cta || ''}
                onChange={(e) => handleMappingChange('cta', e.target.value)}
                options={[
                  { value: '', label: 'Select column...' },
                  ...columns.map((c) => ({ value: c, label: c })),
                ]}
              />
              <Select
                label="Hashtags (optional)"
                value={mapping.hashtags || ''}
                onChange={(e) => handleMappingChange('hashtags', e.target.value)}
                options={[
                  { value: '', label: 'Select column...' },
                  ...columns.map((c) => ({ value: c, label: c })),
                ]}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={handleValidate} disabled={!isValidMapping(mapping)}>
                Validate & Preview
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Preview */}
      {step === 'preview' && preview && (
        <Card>
          <CardHeader>
            <CardTitle>Import Preview</CardTitle>
            <CardDescription>
              Review the import results before confirming
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-zinc-800 rounded-lg text-center">
                <div className="text-2xl font-bold text-white">{preview.totalRows}</div>
                <div className="text-sm text-zinc-400">Total Rows</div>
              </div>
              <div className="p-4 bg-emerald-900/30 rounded-lg text-center">
                <div className="text-2xl font-bold text-emerald-400">{preview.validRows}</div>
                <div className="text-sm text-zinc-400">Valid</div>
              </div>
              <div className="p-4 bg-red-900/30 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-400">{preview.invalidRows}</div>
                <div className="text-sm text-zinc-400">Invalid</div>
              </div>
            </div>

            {preview.errors.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-red-400">Errors</h3>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {preview.errors.slice(0, 10).map((error, i) => (
                    <div key={i} className="text-sm text-zinc-400">
                      <span className="text-red-400">Row {error.row}:</span> {error.message}
                    </div>
                  ))}
                  {preview.errors.length > 10 && (
                    <div className="text-sm text-zinc-500">
                      ...and {preview.errors.length - 10} more errors
                    </div>
                  )}
                </div>
              </div>
            )}

            {preview.validRows > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-zinc-300">Sample Posts</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {preview.posts.slice(0, 5).map((post, i) => (
                    <div key={i} className="p-3 bg-zinc-800 rounded-lg text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="info">{post.date}</Badge>
                        <Badge>{post.content_type}</Badge>
                        {post.platform_targets.map((p) => (
                          <Badge key={p} variant="default">{p}</Badge>
                        ))}
                      </div>
                      <p className="text-zinc-300 line-clamp-2">{post.caption}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep('map')}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={preview.validRows === 0 || importing}
              >
                {importing ? 'Importing...' : `Import ${preview.validRows} Posts`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Complete */}
      {step === 'complete' && importResult && (
        <Card className="border-emerald-800">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Import Complete!</h2>
            <p className="text-zinc-400 mb-2">
              Successfully imported {importResult.imported} posts to the queue.
            </p>
            <p className="text-zinc-500 text-sm mb-6">
              {storageMode === 'local' 
                ? 'Posts saved to browser localStorage (configure Supabase for persistence)'
                : 'Posts saved to Supabase database'}
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="secondary" onClick={handleReset}>
                Import Another
              </Button>
              <Button onClick={() => window.location.href = '/calendar'}>
                View Calendar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
