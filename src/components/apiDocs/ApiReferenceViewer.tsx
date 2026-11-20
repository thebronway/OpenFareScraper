'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Clock, Search, ShieldCheck } from 'lucide-react';
import ApiAuthBar from './ApiAuthBar';
import EndpointCard from './EndpointCard';
import SchemaReferenceSection from './SchemaReferenceSection';
import type { ApiEndpointDoc } from './types';

interface Props {
  specVersion: string;
}

const ENDPOINTS: ApiEndpointDoc[] = [
  {
    id: 'health',
    tag: 'System',
    method: 'GET',
    path: '/api/v1/health',
    summary: 'Get engine liveness, queue depth & rolling quota telemetry',
    description:
      'Returns service liveness, version metadata, global pause and circuit-breaker state, current serial FIFO queue depth, and rolling 1-hour / 24-hour quota usage. Poll this endpoint before dispatching scrapes to route traffic or fail over to a metered provider.',
    parameters: [],
    responseCodes: [
      { status: 200, description: 'Telemetry returned' },
      { status: 401, description: 'Unauthorized' },
      { status: 500, description: 'Runtime error' },
    ],
  },
  {
    id: 'scrape',
    tag: 'Scraper',
    method: 'POST',
    path: '/api/v1/scrape',
    summary: 'Execute a one-way Google Flights scrape query',
    description:
      'Encodes a Google Flights protobuf (tfs) query for a single airport or 1–8 airport IATA array, executes it through the serial FIFO Chromium queue, expands multi-stop results when maxStops !== 0, applies native Standard vs. Basic fare filtering, and returns sorted itineraries.',
    parameters: [],
    bodyFields: [
      {
        name: 'origin',
        type: 'string | string[]',
        required: true,
        description:
          'Single 3-letter IATA airport code (e.g. "DCA") or array of 1–8 unique IATA codes (e.g. ["DCA", "IAD", "BWI"]).',
      },
      {
        name: 'destination',
        type: 'string | string[]',
        required: true,
        description:
          'Single 3-letter IATA airport code (e.g. "LAX") or array of 1–8 unique IATA codes.',
      },
      {
        name: 'departureDate',
        type: 'YYYY-MM-DD',
        required: true,
        description: 'One-way departure date in ISO 8601 calendar format.',
      },
      {
        name: 'cabinClass',
        type: 'string',
        required: false,
        defaultLabel: '"economy"',
        description: '"economy" | "premium_economy" | "business" | "first"',
      },
      {
        name: 'fareTier',
        type: 'string',
        required: false,
        defaultLabel: '"Standard"',
        description:
          '"Standard" (Economy exclude Basic with intercontinental fallback) or "Basic".',
      },
      {
        name: 'currency',
        type: 'string',
        required: false,
        defaultLabel: '"USD"',
        description: '3-letter ISO 4217 currency code passed to Google Flights.',
      },
      {
        name: 'maxStops',
        type: 'integer',
        required: false,
        description: 'Maximum allowed connection stops (0 = nonstop only, up to 3).',
      },
      {
        name: 'airline',
        type: 'string',
        required: false,
        description: '2-character IATA carrier code filter (e.g. "UA", "DL").',
      },
      {
        name: 'flightNumber',
        type: 'string',
        required: false,
        description:
          'Single flight number ("687" or "UA687") or comma-separated multi-leg list ("UA219,UA1283").',
      },
      {
        name: 'legs',
        type: 'ScrapeLegInput[]',
        required: false,
        description:
          'Array of 2–4 contiguous connecting segments (takes precedence over airline and flightNumber).',
      },
      {
        name: 'includedAirlines',
        type: 'string[]',
        required: false,
        description: 'Allowlist of up to 20 2-character IATA carrier codes.',
      },
      {
        name: 'excludedAirlines',
        type: 'string[]',
        required: false,
        description: 'Denylist of up to 20 2-character IATA carrier codes.',
      },
      {
        name: 'includeRaw',
        type: 'boolean',
        required: false,
        defaultLabel: 'false',
        description:
          'Include up to 51,200 bytes of raw GetShoppingResults / ds:1 payload in meta.rawPayload.',
      },
    ],
    exampleBody: JSON.stringify(
      {
        origin: 'DCA',
        destination: 'LAX',
        departureDate: '__FUTURE_DATE__',
        cabinClass: 'economy',
        fareTier: 'Standard',
        currency: 'USD',
      },
      null,
      2
    ),
    responseCodes: [
      { status: 200, description: 'Success or SoldOut' },
      { status: 400, description: 'Zod validation error' },
      { status: 401, description: 'Unauthorized' },
      { status: 429, description: 'RateLimited (Quota or Cooldown)' },
      { status: 502, description: 'Upstream Google Flights block/error' },
      { status: 503, description: 'Global Pause active' },
    ],
  },
  {
    id: 'openapi-spec',
    tag: 'System',
    method: 'GET',
    path: '/api/v1/openapi.json',
    summary: 'Get machine-readable OpenAPI 3.1 specification',
    description:
      'Returns the OpenAPI 3.1.0 JSON document describing all authenticated /api/v1/* endpoints and request schemas.',
    parameters: [],
    responseCodes: [
      { status: 200, description: 'OpenAPI 3.1 JSON document' },
      { status: 401, description: 'Unauthorized' },
    ],
  },
];

const TAG_FILTERS = ['All', 'Scraper', 'System'] as const;

export default function ApiReferenceViewer({ specVersion }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [authHeaderMode, setAuthHeaderMode] = useState<'bearer' | 'x-api-key'>(
    'bearer'
  );
  const [selectedTag, setSelectedTag] =
    useState<(typeof TAG_FILTERS)[number]>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [baseUrl, setBaseUrl] = useState('http://localhost:4001');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const filteredEndpoints = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ENDPOINTS.filter((ep) => {
      if (selectedTag !== 'All' && ep.tag !== selectedTag) {
        return false;
      }
      if (!q) return true;
      return (
        ep.path.toLowerCase().includes(q) ||
        ep.summary.toLowerCase().includes(q) ||
        ep.description.toLowerCase().includes(q) ||
        ep.method.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedTag]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-sky-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100">
              Public API Reference
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-sky-950/70 border border-sky-700/70 text-[11px] font-mono font-semibold text-sky-300">
              v{specVersion} · OpenAPI 3.1
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gunmetal-muted">
            Authenticated Google Flights REST API (<code className="text-slate-300">/api/v1/*</code>) for FlightSentry and custom flight trackers.
          </p>
        </div>

        <Link
          href="/settings/security"
          className="self-start sm:self-center min-h-[44px] sm:min-h-[38px] px-3.5 py-2 rounded-lg bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-xs font-semibold text-slate-300 hover:text-white inline-flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Security</span>
        </Link>
      </div>

      <ApiAuthBar
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        authHeaderMode={authHeaderMode}
        onAuthHeaderModeChange={setAuthHeaderMode}
        baseUrl={baseUrl}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="p-3.5 rounded-xl bg-gunmetal-card border border-gunmetal-border space-y-1">
          <p className="font-semibold text-slate-100 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Bearer &amp; Header Auth (RFC 6750)</span>
          </p>
          <p className="text-gunmetal-muted leading-relaxed">
            Authenticate every request using{' '}
            <code className="text-slate-300">Authorization: Bearer ofs_...</code> or{' '}
            <code className="text-slate-300">X-API-Key</code>. Keys are SHA-256 hashed at rest.
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-gunmetal-card border border-gunmetal-border space-y-1">
          <p className="font-semibold text-slate-100 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>Serial FIFO Queue &amp; Timeouts</span>
          </p>
          <p className="text-gunmetal-muted leading-relaxed">
            Scrapes execute sequentially (<code className="text-slate-300">concurrency = 1</code>) with jitter delays. Set consumer HTTP read timeouts to at least <strong className="text-slate-200">90,000 ms</strong>.
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-gunmetal-card border border-gunmetal-border space-y-1">
          <p className="font-semibold text-slate-100">Sliding Quotas &amp; Failover</p>
          <p className="text-gunmetal-muted leading-relaxed">
            Poll <code className="text-slate-300">GET /api/v1/health</code> first. When <code className="text-amber-300">paused</code>, <code className="text-amber-300">cooldown</code>, or <code className="text-rose-300">rate_limited</code>, fail over immediately.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {TAG_FILTERS.map((tag) => {
            const active = selectedTag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                  active
                    ? 'bg-gunmetal-border border-slate-500 text-slate-100 shadow-sm'
                    : 'bg-gunmetal-card border-gunmetal-border text-gunmetal-muted hover:text-slate-200'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-gunmetal-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter endpoints..."
            className="w-full min-h-[44px] sm:min-h-[36px] pl-8 pr-3 py-1.5 rounded-md bg-gunmetal-card border border-gunmetal-border text-sm sm:text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-500"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filteredEndpoints.length === 0 ? (
          <div className="p-6 rounded-xl bg-gunmetal-card border border-gunmetal-border text-center text-xs text-gunmetal-muted">
            No API endpoints match your current filter.
          </div>
        ) : (
          filteredEndpoints.map((ep, idx) => (
            <EndpointCard
              key={ep.id}
              endpoint={ep}
              apiKey={apiKey}
              authHeaderMode={authHeaderMode}
              baseUrl={baseUrl}
              defaultExpanded={idx === 0}
            />
          ))
        )}
      </div>

      <SchemaReferenceSection />
    </div>
  );
}