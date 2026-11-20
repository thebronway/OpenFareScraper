'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Loader2, Play, Terminal } from 'lucide-react';
import type { ApiEndpointDoc } from './types';

interface Props {
  endpoint: ApiEndpointDoc;
  apiKey: string;
  authHeaderMode: 'bearer' | 'x-api-key';
  baseUrl: string;
}

export default function EndpointTryConsole({
  endpoint,
  apiKey,
  authHeaderMode,
  baseUrl,
}: Props) {
  const [paramValues, setParamValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    endpoint.parameters.forEach((p) => {
      initial[p.name] = p.defaultValue ?? '';
    });
    return initial;
  });

  const [bodyText, setBodyText] = useState<string>(endpoint.exampleBody ?? '');
  const [executing, setExecuting] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [result, setResult] = useState<{
    status: number;
    durationMs: number;
    retryAfter: string | null;
    body: string;
  } | null>(null);

  useEffect(() => {
    if (endpoint.exampleBody && endpoint.exampleBody.includes('__FUTURE_DATE__')) {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      setBodyText(endpoint.exampleBody.replace('__FUTURE_DATE__', futureDate));
    }
  }, [endpoint.exampleBody]);

  const resolvedUrl = useMemo(() => {
    let resolvedPath = endpoint.path;
    const queryParts: string[] = [];

    endpoint.parameters.forEach((param) => {
      const val = (paramValues[param.name] || '').trim();
      if (param.in === 'path') {
        resolvedPath = resolvedPath.replace(
          `{${param.name}}`,
          encodeURIComponent(val || '1')
        );
      } else if (val) {
        queryParts.push(
          `${encodeURIComponent(param.name)}=${encodeURIComponent(val)}`
        );
      }
    });

    const querySuffix =
      queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return `${baseUrl}${resolvedPath}${querySuffix}`;
  }, [baseUrl, endpoint.path, endpoint.parameters, paramValues]);

  const curlSnippet = useMemo(() => {
    const displayKey = apiKey.trim() || 'ofs_YOUR_API_KEY';
    const authFlag =
      authHeaderMode === 'bearer'
        ? `-H "Authorization: Bearer ${displayKey}"`
        : `-H "X-API-Key: ${displayKey}"`;

    const parts = [`curl -X ${endpoint.method}`, authFlag];
    if (endpoint.method !== 'GET' && endpoint.method !== 'DELETE' && bodyText.trim()) {
      parts.push('-H "Content-Type: application/json"');
      const compactBody = bodyText.trim().replace(/'/g, "'\\''");
      parts.push(`-d '${compactBody}'`);
    }
    parts.push(`"${resolvedUrl}"`);
    return parts.join(' \\\n  ');
  }, [apiKey, authHeaderMode, bodyText, endpoint.method, resolvedUrl]);

  const handleCopyCurl = async () => {
    try {
      await navigator.clipboard.writeText(curlSnippet);
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleExecute = async () => {
    if (executing) return;
    setExecuting(true);
    setResult(null);

    const headers: Record<string, string> = {};
    if (apiKey.trim()) {
      if (authHeaderMode === 'bearer') {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      } else {
        headers['X-API-Key'] = apiKey.trim();
      }
    }

    const hasBody =
      endpoint.method !== 'GET' &&
      endpoint.method !== 'DELETE' &&
      bodyText.trim().length > 0;
    if (hasBody) {
      headers['Content-Type'] = 'application/json';
    }

    const startMs = performance.now();
    try {
      const targetUrlObj = new URL(resolvedUrl);
      const relativeTarget = `${targetUrlObj.pathname}${targetUrlObj.search}`;

      const res = await fetch(relativeTarget, {
        method: endpoint.method,
        headers,
        body: hasBody ? bodyText : undefined,
      });

      const durationMs = Math.max(1, Math.round(performance.now() - startMs));
      const rawText = await res.text();
      let formattedBody = rawText;
      try {
        formattedBody = JSON.stringify(JSON.parse(rawText), null, 2);
      } catch {
        // Keep raw response if non-JSON
      }

      setResult({
        status: res.status,
        durationMs,
        retryAfter: res.headers.get('retry-after'),
        body: formattedBody,
      });
    } catch (err) {
      const durationMs = Math.max(1, Math.round(performance.now() - startMs));
      setResult({
        status: 0,
        durationMs,
        retryAfter: null,
        body: err instanceof Error ? err.message : 'Network error executing request',
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-gunmetal-border space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-sky-400" />
          <span>Interactive Request Console</span>
        </span>
        <button
          type="button"
          onClick={handleCopyCurl}
          className="min-h-[44px] sm:min-h-[36px] px-3 sm:px-2.5 py-1.5 rounded-md bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-xs font-semibold text-slate-300 hover:text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          {copiedCurl ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copied cURL</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-sky-400" />
              <span>Copy cURL</span>
            </>
          )}
        </button>
      </div>

      {endpoint.method !== 'GET' && endpoint.method !== 'DELETE' && (
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300">
            JSON Request Body
          </label>
          <textarea
            rows={8}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            className="w-full p-3 rounded-lg bg-gunmetal-canvas border border-gunmetal-border font-mono text-xs text-slate-100 focus:outline-none focus:border-slate-500"
          />
        </div>
      )}

      <div className="p-3 rounded-lg bg-gunmetal-canvas border border-gunmetal-border overflow-x-auto">
        <pre className="text-[11px] font-mono text-slate-300 whitespace-pre">
          {curlSnippet}
        </pre>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[11px] text-gunmetal-muted">
          {apiKey.trim()
            ? 'Using API key entered at top of page'
            : 'Tip: Paste an ofs_... API key in the top bar to test authenticated calls'}
        </span>
        <button
          type="button"
          disabled={executing}
          onClick={handleExecute}
          className="min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-lg bg-slate-800/75 hover:bg-slate-700/85 border border-slate-500/80 hover:border-slate-400 text-xs sm:text-sm font-semibold text-slate-100 hover:text-white shadow-sm inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
        >
          {executing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>Send Request</span>
            </>
          )}
        </button>
      </div>

      {result && (
        <div className="rounded-lg border border-gunmetal-border bg-gunmetal-canvas overflow-hidden">
          <div className="px-3 py-2 border-b border-gunmetal-border flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                  result.status >= 200 && result.status < 300
                    ? 'bg-emerald-950/80 border border-emerald-700/70 text-emerald-300'
                    : result.status >= 400
                      ? 'bg-rose-950/80 border border-rose-700/70 text-rose-300'
                      : 'bg-amber-950/80 border border-amber-700/70 text-amber-300'
                }`}
              >
                HTTP {result.status || 'ERR'}
              </span>
              <span className="text-gunmetal-muted font-mono">
                {result.durationMs} ms
              </span>
            </div>
            {result.retryAfter !== null && (
              <span className="text-[11px] font-mono text-amber-300">
                Retry-After: {result.retryAfter}
              </span>
            )}
          </div>
          <pre className="p-3 text-xs font-mono text-slate-200 overflow-x-auto max-h-96">
            {result.body}
          </pre>
        </div>
      )}
    </div>
  );
}