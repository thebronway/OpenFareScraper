'use client';

const SCRAPE_RESPONSE_FIELDS = [
  { field: 'status', type: 'string', nullable: 'No', desc: 'Execution outcome enum: "Success", "SoldOut", "RateLimited", "Paused", or "Error".' },
  { field: 'price', type: 'number | null', nullable: 'Yes', desc: 'Lowest price among sorted itineraries, or null when empty.' },
  { field: 'currency', type: 'string', nullable: 'No', desc: 'Normalized 3-letter ISO 4217 currency code of returned prices.' },
  { field: 'leadingAirline', type: 'string | null', nullable: 'Yes', desc: 'Operating 2-character IATA carrier code of itineraries[0], or null when empty.' },
  { field: 'leadingFlightNumber', type: 'string | null', nullable: 'Yes', desc: 'Flight designator of itineraries[0] (first segment), or null when empty.' },
  { field: 'itineraries', type: 'RouteItinerary[]', nullable: 'No', desc: 'Matching flight options sorted ascending by price.' },
  { field: 'errorMessage', type: 'string | null', nullable: 'Yes', desc: 'Diagnostic error or rate-limit message when status is RateLimited, Paused, or Error.' },
  { field: 'meta.durationMs', type: 'integer', nullable: 'No', desc: 'Server-side scrape execution duration in milliseconds (excluding queue wait).' },
  { field: 'meta.retryAfter', type: 'string | null', nullable: 'Yes', desc: 'ISO 8601 UTC timestamp indicating when caller may retry on RateLimited.' },
  { field: 'meta.rawPayload', type: 'string | null', nullable: 'Yes', desc: 'Truncated raw GetShoppingResults / ds:1 payload snippet (max 51,200 bytes) when includeRaw: true.' },
];

const ROUTE_ITINERARY_FIELDS = [
  { field: 'airline', type: 'string', nullable: 'No', desc: '2-character uppercase IATA carrier code (e.g. "UA", "AS", "F9").' },
  { field: 'airlineName', type: 'string', nullable: 'No', desc: 'Resolved full carrier name (e.g. "United Airlines").' },
  { field: 'flightNumber', type: 'string', nullable: 'No', desc: 'Primary flight designator (or slash-delimited multi-leg string).' },
  { field: 'origin', type: 'string', nullable: 'No', desc: '3-letter uppercase IATA departure airport code.' },
  { field: 'destination', type: 'string', nullable: 'No', desc: '3-letter uppercase IATA final arrival airport code.' },
  { field: 'price', type: 'number', nullable: 'No', desc: 'Total one-way fare in requested currency.' },
  { field: 'departureTime', type: 'string', nullable: 'No', desc: 'Local departure timestamp formatted as "YYYY-MM-DD HH:MM".' },
  { field: 'arrivalTime', type: 'string', nullable: 'No', desc: 'Local arrival timestamp formatted as "YYYY-MM-DD HH:MM".' },
  { field: 'duration', type: 'string', nullable: 'No', desc: 'Human-readable total elapsed duration (e.g. "6h 22m").' },
  { field: 'durationMinutes', type: 'integer', nullable: 'No', desc: 'Total elapsed duration in integer minutes.' },
  { field: 'stops', type: 'integer', nullable: 'No', desc: 'Number of intermediate connection stops (0 = nonstop).' },
  { field: 'isNonstop', type: 'boolean', nullable: 'No', desc: 'Convenience boolean equal to stops === 0.' },
  { field: 'layoverAirports', type: 'string[]', nullable: 'No', desc: 'Ordered 3-letter uppercase IATA codes for intermediate connection airports.' },
  { field: 'maxLayoverMinutes', type: 'integer | null', nullable: 'Yes', desc: 'Longest connection duration in minutes when stops >= 1; null when nonstop.' },
  { field: 'legs', type: 'RouteSegment[]', nullable: 'No', desc: 'Ordered operating flight segments (airline, flightNumber, origin, destination, departureTime, arrivalTime, durationMinutes).' },
];

const SCRAPE_LEG_INPUT_FIELDS = [
  { field: 'airline', type: 'string', required: 'Yes', desc: 'Operating 2-character uppercase IATA carrier code (e.g. "UA", "OO").' },
  { field: 'bookingAirline', type: 'string | null', required: 'No', desc: 'Optional marketing/codeshare carrier code (e.g. "UA" when operated by "OO").' },
  { field: 'flightNumber', type: 'string', required: 'Yes', desc: 'Segment flight designator (1–8 alphanumeric characters, e.g. "1283" or "UA1283").' },
  { field: 'origin', type: 'string', required: 'Yes', desc: '3-letter uppercase IATA departure airport code for this segment.' },
  { field: 'destination', type: 'string', required: 'Yes', desc: '3-letter uppercase IATA arrival airport code for this segment.' },
];

const STATUS_MATRIX = [
  { http: '200 OK', status: '"Success"', badge: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60', condition: 'Scrape succeeded and itineraries.length > 0.', action: 'Persist prices, update lowest fare, and evaluate alert rules.' },
  { http: '200 OK', status: '"SoldOut"', badge: 'bg-slate-800/70 text-slate-300 border-slate-700', condition: 'Google Flights loaded cleanly, but 0 itineraries matched filters.', action: 'Record SoldOut check; keep provider marked healthy.' },
  { http: '400 Bad Request', status: '"Error"', badge: 'bg-rose-950/60 text-rose-300 border-rose-800/60', condition: 'Request JSON failed Zod schema validation.', action: 'Fix caller payload; do not retry unchanged request.' },
  { http: '401 Unauthorized', status: '"Error"', badge: 'bg-rose-950/60 text-rose-300 border-rose-800/60', condition: 'Missing, malformed, or revoked Bearer / X-API-Key token.', action: 'Surface authentication error until API key is updated.' },
  { http: '429 Too Many Requests', status: '"RateLimited"', badge: 'bg-amber-950/60 text-amber-300 border-amber-800/60', condition: 'Rolling hourly/daily quota exhausted or circuit breaker active.', action: 'Respect Retry-After header and fail over to next data source.' },
  { http: '502 Bad Gateway', status: '"Error"', badge: 'bg-rose-950/60 text-rose-300 border-rose-800/60', condition: 'Chromium timeout, network error, or upstream CAPTCHA/403 block.', action: 'Log failure and fail over to next configured data source.' },
  { http: '503 Service Unavailable', status: '"Paused"', badge: 'bg-amber-950/60 text-amber-300 border-amber-800/60', condition: 'Global Pause enabled by an administrator.', action: 'Skip scraper and fail over without consuming quota.' },
];

export default function SchemaReferenceSection() {
  return (
    <div className="space-y-6 pt-2">
      <div className="bg-gunmetal-card border border-gunmetal-border rounded-xl p-4 sm:p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-100">
          HTTP Status Code &amp; Outcome Matrix
        </h3>
        <div className="border border-gunmetal-border rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gunmetal-canvas/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-gunmetal-border">
              <tr>
                <th className="px-3 py-2">HTTP Status</th>
                <th className="px-3 py-2">body.status</th>
                <th className="px-3 py-2">Condition</th>
                <th className="px-3 py-2">Consumer Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gunmetal-border">
              {STATUS_MATRIX.map((row) => (
                <tr key={`${row.http}-${row.status}`}>
                  <td className="px-3 py-2 font-mono text-slate-100 whitespace-nowrap">
                    {row.http}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded border text-[11px] font-mono font-semibold ${row.badge}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-300">{row.condition}</td>
                  <td className="px-3 py-2 text-gunmetal-muted">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gunmetal-card border border-gunmetal-border rounded-xl p-4 sm:p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-100">
          Response Schema: <code className="text-sky-300">ScrapeResponse</code>
        </h3>
        <div className="border border-gunmetal-border rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gunmetal-canvas/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-gunmetal-border">
              <tr>
                <th className="px-3 py-2">Field</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Nullable</th>
                <th className="px-3 py-2">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gunmetal-border">
              {SCRAPE_RESPONSE_FIELDS.map((row) => (
                <tr key={row.field}>
                  <td className="px-3 py-2 font-mono text-slate-100 whitespace-nowrap">
                    {row.field}
                  </td>
                  <td className="px-3 py-2 font-mono text-sky-300 whitespace-nowrap">
                    {row.type}
                  </td>
                  <td className="px-3 py-2 text-gunmetal-muted whitespace-nowrap">
                    {row.nullable}
                  </td>
                  <td className="px-3 py-2 text-slate-300">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gunmetal-card border border-gunmetal-border rounded-xl p-4 sm:p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-100">
          Itinerary Object Schema: <code className="text-sky-300">RouteItinerary</code>
        </h3>
        <div className="border border-gunmetal-border rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gunmetal-canvas/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-gunmetal-border">
              <tr>
                <th className="px-3 py-2">Field</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Nullable</th>
                <th className="px-3 py-2">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gunmetal-border">
              {ROUTE_ITINERARY_FIELDS.map((row) => (
                <tr key={row.field}>
                  <td className="px-3 py-2 font-mono text-slate-100 whitespace-nowrap">
                    {row.field}
                  </td>
                  <td className="px-3 py-2 font-mono text-sky-300 whitespace-nowrap">
                    {row.type}
                  </td>
                  <td className="px-3 py-2 text-gunmetal-muted whitespace-nowrap">
                    {row.nullable}
                  </td>
                  <td className="px-3 py-2 text-slate-300">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gunmetal-card border border-gunmetal-border rounded-xl p-4 sm:p-5 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-slate-100">
            Multi-Leg Segment Input: <code className="text-sky-300">ScrapeLegInput</code> (<code className="text-slate-300">legs[]</code>)
          </h3>
          <p className="text-xs text-gunmetal-muted mt-0.5">
            Supply 2 to 4 contiguous segments for exact multi-stop itinerary matching (takes precedence over <code className="text-slate-300">airline</code> and <code className="text-slate-300">flightNumber</code>).
          </p>
        </div>
        <div className="border border-gunmetal-border rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gunmetal-canvas/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-gunmetal-border">
              <tr>
                <th className="px-3 py-2">Field</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Required</th>
                <th className="px-3 py-2">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gunmetal-border">
              {SCRAPE_LEG_INPUT_FIELDS.map((row) => (
                <tr key={row.field}>
                  <td className="px-3 py-2 font-mono text-slate-100 whitespace-nowrap">
                    {row.field}
                  </td>
                  <td className="px-3 py-2 font-mono text-sky-300 whitespace-nowrap">
                    {row.type}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.required === 'Yes' ? (
                      <span className="text-rose-300 font-semibold">Yes</span>
                    ) : (
                      <span className="text-gunmetal-muted">No</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-300">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}