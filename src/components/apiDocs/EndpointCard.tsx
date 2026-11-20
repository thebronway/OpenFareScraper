'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import EndpointTryConsole from './EndpointTryConsole';
import type { ApiEndpointDoc, HttpMethod } from './types';

interface Props {
  endpoint: ApiEndpointDoc;
  apiKey: string;
  authHeaderMode: 'bearer' | 'x-api-key';
  baseUrl: string;
  defaultExpanded?: boolean;
}

function getMethodBadgeStyle(method: HttpMethod): string {
  switch (method) {
    case 'GET':
      return 'bg-sky-950/80 border-sky-700/70 text-sky-300';
    case 'POST':
      return 'bg-emerald-950/80 border-emerald-700/70 text-emerald-300';
    case 'PATCH':
      return 'bg-amber-950/80 border-amber-700/70 text-amber-300';
    case 'DELETE':
      return 'bg-rose-950/80 border-rose-700/70 text-rose-300';
  }
}

export default function EndpointCard({
  endpoint,
  apiKey,
  authHeaderMode,
  baseUrl,
  defaultExpanded = false,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-gunmetal-card border border-gunmetal-border rounded-xl overflow-hidden transition-colors">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full min-h-[44px] px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left hover:bg-gunmetal-canvas/50 transition-colors cursor-pointer"
      >
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gunmetal-muted flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gunmetal-muted flex-shrink-0" />
          )}
          <span
            className={`px-2 py-0.5 rounded border font-mono font-bold text-xs w-16 text-center flex-shrink-0 ${getMethodBadgeStyle(
              endpoint.method
            )}`}
          >
            {endpoint.method}
          </span>
          <code className="text-xs sm:text-sm font-mono font-semibold text-slate-100 break-all">
            {endpoint.path}
          </code>
        </div>

        <div className="flex items-center gap-2.5 pl-6 sm:pl-0 flex-shrink-0">
          <span className="text-xs text-gunmetal-muted truncate max-w-md">
            {endpoint.summary}
          </span>
          <span className="px-2 py-0.5 rounded border border-gunmetal-border bg-gunmetal-canvas text-[10px] font-semibold uppercase tracking-wide text-slate-300">
            {endpoint.tag}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gunmetal-border/80 space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            {endpoint.description}
          </p>

          {endpoint.bodyFields && endpoint.bodyFields.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Request Body Fields
              </h4>
              <div className="border border-gunmetal-border rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gunmetal-canvas/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-gunmetal-border">
                    <tr>
                      <th className="px-3 py-2">Field</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Required</th>
                      <th className="px-3 py-2">Default</th>
                      <th className="px-3 py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gunmetal-border">
                    {endpoint.bodyFields.map((field) => (
                      <tr key={field.name}>
                        <td className="px-3 py-2 font-mono text-slate-100 whitespace-nowrap">
                          {field.name}
                        </td>
                        <td className="px-3 py-2 font-mono text-sky-300 whitespace-nowrap">
                          {field.type}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {field.required ? (
                            <span className="text-rose-300 font-semibold">Yes</span>
                          ) : (
                            <span className="text-gunmetal-muted">No</span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-gunmetal-muted whitespace-nowrap">
                          {field.defaultLabel ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-300">
                          {field.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Responses:
            </span>
            {endpoint.responseCodes.map((rc) => (
              <span
                key={rc.status}
                className="px-2 py-0.5 rounded bg-gunmetal-canvas border border-gunmetal-border text-[11px] font-mono text-slate-300"
              >
                {rc.status} · {rc.description}
              </span>
            ))}
          </div>

          <EndpointTryConsole
            endpoint={endpoint}
            apiKey={apiKey}
            authHeaderMode={authHeaderMode}
            baseUrl={baseUrl}
          />
        </div>
      )}
    </div>
  );
}