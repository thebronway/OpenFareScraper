# OpenFareScraper REST API Specification

**API Base Path:** `/api/v1`  
**Specification Standards:** OpenAPI 3.1.0 · RFC 9110 (HTTP Semantics) · RFC 6750 (Bearer Token Usage) · RFC 9457 (Problem Details) · ISO 8601 · ISO 4217 · IATA

---

## 1. Overview & Transport Architecture

OpenFareScraper exposes an authenticated JSON-over-HTTP REST API that executes headless Chromium queries against Google Flights and returns normalized itinerary pricing data.

### 1.1 Base URLs
* **Same-Host / LAN Deployment:** `http://<host>:4001/api/v1`
* **Docker Compose Internal Network:** `http://openfarescraper:4001/api/v1`

### 1.2 Protocol & Content Negotiation
* **Transport:** HTTP/1.1 or HTTP/2 (deploy behind a TLS-terminating reverse proxy if traversing untrusted networks).
* **Request Encoding:** `Content-Type: application/json; charset=utf-8` (required for `POST` endpoints).
* **Response Encoding:** `Content-Type: application/json; charset=utf-8`.
* **Character Set:** UTF-8 across all request and response payloads.

### 1.3 Execution Model & Client Timeouts
Unlike stateless REST APIs, `POST /api/v1/scrape` drives a single persistent Chromium browser context protected by anti-bot guardrails:
1. **Serial FIFO Queue (`concurrency = 1`):** Concurrent requests from one or more callers are queued in arrival order and executed strictly one at a time.
2. **Randomized Jitter:** Prior to browser navigation, the worker sleeps for a configured random interval (`minJitterMs` to `maxJitterMs`, default `4000ms`–`9000ms`).
3. **Browser Navigation & Hydration:** Chromium navigates to the constructed Google Flights `/travel/flights/search?tfs=...` URL, intercepts `GetShoppingResults` responses (expanding `"View more flights"` / `"Other flights"` when `maxStops !== 0`), and extracts `AF_initDataCallback` (`ds:1`) structured tuples with DOM fallback.

**Recommended Consumer HTTP Timeout:** Configure client read timeouts to **at least `90,000 ms` (90 seconds)** to accommodate queue wait time behind active jobs, jitter delay, and Chromium page load.

---

## 2. Authentication (`RFC 6750`)

All `/api/v1/*` endpoints require a valid API key minted in the OpenFareScraper Admin Console (`/api/admin/keys`).

### 2.1 Header Format
```http
Authorization: Bearer ofs_<64_lowercase_hex_characters>
```

### 2.2 Token Properties & Security Semantics
* **Format:** 68 characters total (`ofs_` prefix followed by 32 cryptographically random bytes encoded as 64 lowercase hex characters).
* **Storage:** The server stores only the display prefix (`ofs_xxxxxxxx`) and an unsalted SHA-256 hex digest. Raw tokens cannot be retrieved after creation.
* **Validation:** Incoming tokens are hashed with SHA-256 and matched against non-revoked keys (`revokedAt IS NULL`). Upon match, `lastUsedAt` is updated asynchronously.
* **Failure Mode:** Missing headers, non-`Bearer` schemes, malformed tokens, or revoked keys immediately return `401 Unauthorized` without entering the scrape queue.

---

## 3. Rate Limiting, Quotas & Circuit Breaker

OpenFareScraper enforces two independent protection layers before launching Chromium:

### 3.1 Rolling Window Quotas
* **Hourly Cap (`maxRequestsPerHour`):** Sliding 60-minute window (`createdAt >= now - 1 hour`). Default: `20`.
* **Daily Cap (`maxRequestsPerDay`):** Sliding 24-hour window (`createdAt >= now - 24 hours`). Default: `150`.
* **Accounting:** Every scrape attempt that passes authentication and input validation (resulting in `Success`, `SoldOut`, or `Error`) increments the rolling usage counters. Requests rejected with `400`, `401`, `429`, or `503` (Global Pause) do not consume quota.

### 3.2 Anti-Bot Circuit Breaker
* **Trigger Conditions:** Google Flights returns an HTTP `429`, HTTP `403`, or a CAPTCHA/unusual-traffic interstitial page.
* **Effect:** The scraper immediately transitions into cooldown (`circuitBreakerActive = true`), sets `cooldownUntil` to `now + cooldownMinutes` (default `60` minutes), and rejects all subsequent `POST /api/v1/scrape` requests with `429 Too Many Requests` without opening Chromium.
* **Recovery:** Automatically clears once `now >= cooldownUntil`, or immediately when an administrator clicks **Reset Cooldown** in the Admin Console.

### 3.3 Rate Limit Response Headers (`RFC 9110`)
When a request is rejected due to quota exhaustion or an active circuit breaker, the server responds with `429 Too Many Requests` and includes the `Retry-After` HTTP header containing an ISO 8601 UTC timestamp:
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 2026-11-13T15:00:00.000Z
Content-Type: application/json; charset=utf-8
```

---

## 4. Endpoint Reference

### 4.1 `GET /api/v1/health`

Returns service liveness, version metadata, circuit breaker state, current FIFO queue depth, and rolling quota consumption. Consumer applications should poll this endpoint before dispatching scrapes to determine whether to route queries to OpenFareScraper or fail over to a metered API provider.

#### Request
* **Method:** `GET`
* **Path:** `/api/v1/health`
* **Headers:** `Authorization: Bearer <api_key>` (required)
* **Query Parameters:** None
* **Request Body:** None

#### Response Schema (`200 OK`)

| Field | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `status` | `string` | No | Service health indicator: `"ok"`, `"rate_limited"`, `"cooldown"`, or `"paused"`. |
| `state` | `string` | No | Explicit operational state: `"ready"`, `"rate_limited"`, `"cooldown"`, or `"paused"`. |
| `version` | `string` | No | Semantic version of the running scraper service from `package.json` (e.g., `"0.4.8"`). |
| `apiVersion` | `string` | No | REST API major version identifier (`"v1"`). |
| `paused` | `boolean` | No | `true` when Global Pause is enabled by an administrator in the Admin Console (read-only for API key users); `false` otherwise. |
| `circuitBreakerActive` | `boolean` | No | `true` if Google anti-bot protection recently tripped cooldown; `false` otherwise. |
| `rateLimited` | `boolean` | No | `true` if rolling hourly or daily scrape quotas are exhausted while paused and cooldown are inactive. |
| `statusReason` | `string \| null` | Yes | Diagnostic reason when `state` is `"paused"`, `"rate_limited"`, or `"cooldown"`, or `null` when `"ready"`. |
| `retryAfter` | `string \| null` | Yes | ISO 8601 UTC timestamp when cooldown or rate limit resets, or `null` when `"ready"` or `"paused"`. |
| `queueDepth` | `integer` | No | Number of scrape jobs currently waiting in or executing inside the serial FIFO queue (`>= 0`). |
| `usage` | `object` | No | Live rolling quota consumption and configured limits. |
| `usage.hourlyUsed` | `integer` | No | Scrapes executed in the past 60 minutes. |
| `usage.hourlyLimit` | `integer` | No | Maximum allowed scrapes per rolling 60-minute window. |
| `usage.dailyUsed` | `integer` | No | Scrapes executed in the past 24 hours. |
| `usage.dailyLimit` | `integer` | No | Maximum allowed scrapes per rolling 24-hour window. |

#### Example Request
```bash
curl -s -X GET "http://localhost:4001/api/v1/health" \
  -H "Authorization: Bearer ofs_8f9a2c4e1b0d7a6f3e5c9b2a4d8f1e0c7b6a5d4e3f2a1b0c9d8e7f6a5b4c3d2e"
```

#### Example Response (`200 OK`)
```json
{
  "status": "ok",
  "state": "ready",
  "version": "0.4.8",
  "apiVersion": "v1",
  "paused": false,
  "circuitBreakerActive": false,
  "rateLimited": false,
  "statusReason": null,
  "retryAfter": null,
  "queueDepth": 0,
  "usage": {
    "hourlyUsed": 3,
    "hourlyLimit": 20,
    "dailyUsed": 18,
    "dailyLimit": 150
  }
}
```

#### Status Codes
* `200 OK`: Telemetry returned successfully.
* `401 Unauthorized`: Missing, invalid, or revoked Bearer API key.
* `500 Internal Server Error`: Database or internal runtime error.

### 4.2 `POST /api/v1/scrape`

Executes a one-way flight search on Google Flights for a given origin, destination, departure date, cabin class, and fare tier, returning sorted itineraries and execution diagnostics.

#### Request
* **Method:** `POST`
* **Path:** `/api/v1/scrape`
* **Headers:**
  * `Authorization: Bearer <api_key>` (required)
  * `Content-Type: application/json` (required)

#### Request Body Schema

| Field | Type | Required | Default | Constraints & Validation | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `origin` | `string \| string[]` | **Yes** | — | `^[A-Z]{3}$` or array of 1–8 unique `^[A-Z]{3}$` (trimmed, uppercased) | Single 3-letter IATA airport code (e.g., `"DFW"`) or array of 1 to 8 unique airport codes (e.g., `["DFW", "DAL"]`). Callers resolve metro clusters prior to calling `/api/v1/scrape`. |
| `destination` | `string \| string[]` | **Yes** | — | `^[A-Z]{3}$` or array of 1–8 unique `^[A-Z]{3}$` (trimmed, uppercased) | Single 3-letter IATA airport code (e.g., `"JFK"`) or array of 1 to 8 unique airport codes (e.g., `["JFK", "LGA", "EWR"]`). |
| `departureDate` | `string` | **Yes** | — | `^\d{4}-\d{2}-\d{2}$` (valid calendar date) | One-way departure date in ISO 8601 calendar format (`YYYY-MM-DD`). |
| `cabinClass` | `string` | No | `"economy"` | `"economy"` \| `"premium_economy"` \| `"business"` \| `"first"` | Target cabin class encoded into the Google Flights protobuf `tfs` payload (`1` = economy, `2` = premium_economy, `3` = business, `4` = first). |
| `fareTier` | `string` | No | `"Standard"` | `"Basic"` \| `"Standard"` | Fare restriction tier. When `cabinClass === "economy"` and `fareTier === "Standard"`, encodes Google Flights' native **Economy (exclude Basic)** filter (`tfs` root `field 25 = 1` + `tfu=EgYIABAAGAA`), with automatic fallback to standard `Economy` on intercontinental routes. |
| `currency` | `string` | No | `"USD"` | `^[A-Z]{3}$` (ISO 4217) | 3-letter currency code passed to Google Flights (`curr` parameter). |
| `maxStops` | `integer` | No | `undefined` | Integer `0` through `3` | Maximum allowed connection stops (`0` = nonstop only, `1` = 1 stop or fewer, etc.). Applied post-extraction. |
| `airline` | `string` | No | `undefined` | `^[A-Z0-9]{2}$` (trimmed, uppercased) | Single 2-character IATA carrier code filter (e.g., `"UA"`, `"F9"`, `"DL"`). |
| `flightNumber` | `string` | No | `undefined` | `^[A-Za-z0-9]{1,8}(?:,[A-Za-z0-9]{1,8}){0,3}$` (spaces stripped, uppercased) \vert{} Specific flight number filter (e.g., `"687"`, `"UA687"`, `"UA 687"`) or comma-separated ordered segment list for multi-leg itineraries (e.g., `"UA219,UA1283,UA669"`, up to 4 segments). \vert{} \vert{} `legs` \vert{} `ScrapeLegInput[]` \vert{} No \vert{} `undefined` \vert{} Array of 2–4 contiguous `ScrapeLegInput` segments \vert{} Exact multi-leg segment sequence filter (1-stop to 3-stop itineraries). Takes precedence over `airline` and `flightNumber`. \vert{} \vert{} `includedAirlines` \vert{} `string[]` \vert{} No \vert{} `undefined` \vert{} Array of up to 20 `^[A-Z0-9]{2}$` | Allowlist of 2-character IATA carrier codes. When provided and non-empty, all operating segments in `itineraries[].legs` must belong to listed carriers. |
| `excludedAirlines` | `string[]` | No | `undefined` | Array of up to 20 `^[A-Z0-9]{2}$` \vert{} Denylist of 2-character IATA carrier codes; excludes itineraries where any operating segment matches. \vert{} \vert{} `includeRaw` \vert{} `boolean` \vert{} No \vert{} `false` \vert{} Boolean \vert{} When `true`, includes up to 51,200 bytes of raw `GetShoppingResults` / `ds:1` diagnostic text in `meta.rawPayload`. \vert{}  #### `ScrapeLegInput` Object Schema (`legs[]`)  When `legs` is supplied, the request validator enforces the following structural rules: * **Length:** Minimum `2` legs (1 stop) and maximum `4` legs (3 stops). * **Boundary Airports:** `legs[0].origin` must match `origin` (or be present in `origin[]`), and `legs[legs.length - 1].destination` must match `destination` (or be present in `destination[]`). * **Contiguous Segments:** Every segment must satisfy `leg.origin !== leg.destination`, and consecutive segments must connect (`legs[i].destination === legs[i + 1].origin`). * **Stop Limit Consistency:** If `maxStops` is also provided, `maxStops` must be greater than or equal to `legs.length - 1`.  \vert{} Field \vert{} Type \vert{} Required \vert{} Constraints & Validation \vert{} Description \vert{} \vert{} :--- \vert{} :--- \vert{} :--- \vert{} :--- \vert{} :--- \vert{} \vert{} `airline` \vert{} `string` \vert{} **Yes** \vert{} `^[A-Z0-9]{2}$` (trimmed, uppercased) | Operating 2-character IATA carrier code for this segment (e.g., `"UA"`, `"OO"`). |
| `bookingAirline` | `string \| null` | No | `^[A-Z0-9]{2}$` or `null` (blank strings normalize to `null`) \vert{} Optional marketing/codeshare carrier code (e.g., `"UA"` when operated by `"OO"`). Matches if the scraped segment's operating carrier equals either `airline` or `bookingAirline`. \vert{} \vert{} `flightNumber` \vert{} `string` \vert{} **Yes** \vert{} `^[A-Za-z0-9]{1,8}$` (spaces stripped, uppercased) | Segment flight designator with or without carrier prefix (e.g., `"1283"` or `"UA1283"`). |
| `origin` | `string` | **Yes** | `^[A-Z]{3}$` (trimmed, uppercased) \vert{} 3-letter uppercase IATA departure airport code for this segment. \vert{} \vert{} `destination` \vert{} `string` \vert{} **Yes** \vert{} `^[A-Z]{3}$` (trimmed, uppercased) | 3-letter uppercase IATA arrival airport code for this segment. |

#### Protobuf `tfs` Query Construction & Filter Semantics
1. **Multi-Airport Array Encoding:** Deduplicated `origin` airport codes (1 to 8) are encoded into outbound protobuf slice `field 13`, and deduplicated `destination` airport codes (1 to 8) are encoded into `field 14` within a single Google Flights navigation (consuming **1 quota unit**). Each returned `RouteItinerary` reports the **specific operating airport** (e.g., `"DFW"` or `"DAL"` → `"JFK"`, `"LGA"`, or `"EWR"`).
2. **Basic vs. Standard Economy:**
   * `cabinClass: "economy"` + `fareTier: "Basic"` → Omits the Basic Economy exclusion flag; returns lowest available fares including Basic Economy (e.g., Frontier/United/Delta/American Basic).
   * `cabinClass: "economy"` + `fareTier: "Standard"` → Encodes root protobuf `field 25 = 1` (`Economy (exclude Basic)`) and `tfu=EgYIABAAGAA` in the Google Flights search URL. If an intercontinental route outside the US, US territories, and Canada returns `0` itineraries under `Economy (exclude Basic)`, the scraper automatically falls back to standard `Economy` within the same job.
   * For `premium_economy`, `business`, and `first`, `fareTier` has no restrictive effect.
3. **Multi-Stop Layover Expansion:** Whenever `maxStops !== 0`, the scraper clicks `"View more flights"` (`"Other flights"`) to load collapsed 1-stop, 2-stop, and 3-stop itineraries from `GetShoppingResults` before filtering.
4. **Post-Extraction Filter Precedence:** Extracted itineraries are validated and filtered in memory in the following order, then sorted ascending by `price`:
   1. `maxStops` (`item.stops <= req.maxStops`)
   2. `includedAirlines` (every operating carrier in `item.legs`, or `item.airline` when `legs` is absent, must be in `req.includedAirlines`)
   3. `excludedAirlines` (no operating carrier in `item.legs`, or `item.airline`, may appear in `req.excludedAirlines`)
   4. `legs` (when provided) — requires `item.legs.length === req.legs.length` and matches each segment in order on `origin`, `destination`, normalized `flightNumber`, and carrier (`actualLeg.airline === targetCarrier` or `actualLeg.airline === targetBookingCarrier`).
   5. `airline` / `flightNumber` (when `legs` is omitted):
      * **Comma-separated `flightNumber` (2–4 tokens, e.g., `"UA219,UA1283"`):** requires `item.legs.length === tokens.length` and matches each segment positionally on flight number and carrier prefix (`req.airline` applies to token 0 if token 0 lacks an embedded carrier prefix).
      * **Single `flightNumber` (e.g., `"687"` or `"UA687"`):** matches if **any** segment in `item.legs` matches `leg.flightNumber === normalizedTargetFlightNumber` (and `leg.airline === targetCarrier` when `airline` or a carrier prefix is supplied).
      * **Only `airline` provided:** matches `item.airline === req.airline`.

#### Response Body Schema (`ScrapeResponse`)

| Field | Type | Nullable | Present When | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `string` | No | Always | Execution outcome enum: `"Success"`, `"SoldOut"`, `"RateLimited"`, `"Paused"`, or `"Error"`. |
| `price` | `number \| null` | Yes | Always | Lowest `price` among `itineraries`, or `null` when `itineraries` is empty. |
| `currency` | `string` | No | Always | Normalized 3-letter ISO 4217 currency code of returned prices. |
| `leadingAirline` | `string \| null` | Yes | Always | Operating 2-character IATA carrier code of `itineraries[0]` (first segment), or `null` when empty. |
| `leadingFlightNumber` | `string \| null` | Yes | Always | Numeric flight designator of `itineraries[0]` (first segment), or `null` when empty/unavailable. |
| `itineraries` | `RouteItinerary[]` | No | Always | Array of matching flight options sorted ascending by `price`. Empty (`[]`) on `SoldOut`, `RateLimited`, `Paused`, or `Error`. |
| `errorMessage` | `string \| null` | Yes | Always | Diagnostic error or rate-limit message when `status` is `"RateLimited"`, `"Paused"`, or `"Error"`; `null` otherwise. |
| `meta` | `object` | No | Always | Diagnostic execution telemetry. |
| `meta.durationMs` | `integer` | No | Always | Total server-side processing time in milliseconds (excluding FIFO queue wait before execution starts). |
| `meta.retryAfter` | `string \| null` | Yes | Always | ISO 8601 UTC timestamp indicating when the caller may retry (`"RateLimited"`), or `null` otherwise. |
| `meta.rawPayload` | `string \| null` | Yes | Always | Truncated raw `GetShoppingResults` / `ds:1` payload snippet (max 51,200 bytes) when `includeRaw: true`, or `null`. |

#### `RouteItinerary` Object Schema

| Field | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `airline` | `string` | No | 2-character uppercase IATA carrier code (e.g., `"F9"`, `"AS"`, `"UA"`, `"WN"`). |
| `airlineName` | `string` | No | Resolved full carrier name (e.g., `"Frontier Airlines"`, `"Alaska Airlines"`, `"United Airlines"`). |
| `flightNumber` | `string` | No | Numeric flight designator of the primary (first) leg without carrier prefix (e.g., `"687"`, `"1422"`). May be `""` if extracted via DOM fallback. |
| `origin` | `string` | No | 3-letter uppercase IATA code of the departure airport (e.g., `"DCA"`). |
| `destination` | `string` | No | 3-letter uppercase IATA code of the final arrival airport (e.g., `"SFO"`). |
| `price` | `number` | No | Total one-way fare in `currency` (e.g., `219`). |
| `departureTime` | `string` | No | Local departure date and 24-hour time formatted as `"YYYY-MM-DD HH:MM"` (e.g., `"2026-12-13 13:40"`). |
| `arrivalTime` | `string` | No | Local arrival date and 24-hour time formatted as `"YYYY-MM-DD HH:MM"` (e.g., `"2026-12-13 19:31"`). Reflects `+1` day rollovers on overnight flights. |
| `duration` | `string` | No | Human-readable total elapsed duration (e.g., `"8h 51m"`, `"6h 22m"`, `"45m"`). |
| `durationMinutes` | `integer` | No | Total elapsed duration in integer minutes (e.g., `531`, `382`). |
| `stops` | `integer` | No | Number of intermediate stops (`0` = nonstop, `1` = 1 stop, etc.). |
| `isNonstop` | `boolean` | No | Convenience boolean equal to `stops === 0`. |
| `layoverAirports` | `string[]` | No | Ordered list of 3-letter uppercase IATA codes for intermediate connection airports (e.g., `["DEN"]`). Empty (`[]`) when `stops === 0`. |
| `maxLayoverMinutes` | `integer \| null` | Yes | Longest connection duration in integer minutes between consecutive segments when `stops >= 1`; `null` when `stops === 0`. |
| `legs` | `RouteSegment[]` | No | Ordered list of operating flight segments extracted from `ds:1` (omitted if extracted via DOM fallback). |

#### `RouteSegment` Object Schema

| Field | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `airline` | `string` | No | 2-character uppercase IATA carrier code operating this segment (e.g., `"B6"`). |
| `flightNumber` | `string` | No | Numeric flight designator without carrier prefix (e.g., `"1882"`, `"572"`). |
| `origin` | `string` | No | 3-character uppercase IATA departure airport for this segment (e.g., `"DFW"`). |
| `destination` | `string` | No | 3-character uppercase IATA arrival airport for this segment (e.g., `"FLL"`). |
| `departureTime` | `string` | No | Local segment departure timestamp formatted as `"YYYY-MM-DD HH:MM"`. |
| `arrivalTime` | `string` | No | Local segment arrival timestamp formatted as `"YYYY-MM-DD HH:MM"`. |
| `durationMinutes` | `integer` | No | Segment flight duration in integer minutes. |

### 4.3 HTTP Status Code & Outcome Matrix

| HTTP Status | `body.status` | Condition | Consumer Action |
| :--- | :--- | :--- | :--- |
| `200 OK` | `"Success"` | Scrape succeeded and `itineraries.length > 0`. | Persist prices, update lowest fare, evaluate alert rules. |
| `200 OK` | `"SoldOut"` | Google Flights loaded cleanly, but 0 itineraries matched the route/cabin/fare/airline filters. | Record `SoldOut` check; do not mark provider unhealthy. |
| `400 Bad Request` | `"Error"` | Request JSON failed Zod schema validation (invalid IATA code, past date, invalid enum). | Fix caller payload; do not retry unchanged request. |
| `401 Unauthorized` | `"Error"` | Missing, malformed, or revoked `Authorization: Bearer` API key. | Surface authentication error to user; halt queries to this source until key is updated. |
| `429 Too Many Requests` | `"RateLimited"` | Rolling hourly/daily quota exhausted **or** anti-bot circuit breaker is active. | Respect `retryAfter` / `Retry-After` header; fail over to next configured data source. |
| `500 Internal Server Error` | `"Error"` | Unhandled server or SQLite persistence exception. | Log failure and fail over to next data source. |
| `502 Bad Gateway` | `"Error"` | Chromium navigation timeout, network failure, or upstream Google Flights block/CAPTCHA (which also trips the circuit breaker). | Log failure and fail over to next data source. |
| `503 Service Unavailable` | `"Paused"` | Scraper is globally paused by an administrator. | Skip scraper and fail over to next configured data source without consuming quota. |

### 4.4 Complete Request & Response Examples

#### Example A: `200 OK` — `Success` (Multi-Airport Array & Standard Economy)
**Request:**
```json
{
  "origin": ["DCA", "IAD", "BWI"],
  "destination": ["SFO"],
  "departureDate": "2026-12-13",
  "cabinClass": "economy",
  "fareTier": "Standard",
  "currency": "USD"
}
```

**Response (`200 OK`):**
```json
{
  "status": "Success",
  "price": 219,
  "currency": "USD",
  "leadingAirline": "F9",
  "leadingFlightNumber": "687",
  "itineraries": [
    {
      "airline": "F9",
      "airlineName": "Frontier Airlines",
      "flightNumber": "687",
      "origin": "DCA",
      "destination": "SFO",
      "price": 219,
      "departureTime": "2026-12-13 13:40",
      "arrivalTime": "2026-12-13 19:31",
      "duration": "8h 51m",
      "durationMinutes": 531,
      "stops": 1,
      "isNonstop": false,
      "layoverAirports": ["DEN"],
      "maxLayoverMinutes": 59,
      "legs": [
        {
          "airline": "F9",
          "flightNumber": "687",
          "origin": "DCA",
          "destination": "DEN",
          "departureTime": "2026-12-13 13:40",
          "arrivalTime": "2026-12-13 15:46",
          "durationMinutes": 246
        },
        {
          "airline": "F9",
          "flightNumber": "411",
          "origin": "DEN",
          "destination": "SFO",
          "departureTime": "2026-12-13 16:45",
          "arrivalTime": "2026-12-13 19:31",
          "durationMinutes": 226
        }
      ]
    },
    {
      "airline": "AS",
      "airlineName": "Alaska Airlines",
      "flightNumber": "1422",
      "origin": "DCA",
      "destination": "SFO",
      "price": 269,
      "departureTime": "2026-12-13 18:59",
      "arrivalTime": "2026-12-13 22:21",
      "duration": "6h 22m",
      "durationMinutes": 382,
      "stops": 0,
      "isNonstop": true,
      "layoverAirports": [],
      "maxLayoverMinutes": null,
      "legs": [
        {
          "airline": "AS",
          "flightNumber": "1422",
          "origin": "DCA",
          "destination": "SFO",
          "departureTime": "2026-12-13 18:59",
          "arrivalTime": "2026-12-13 22:21",
          "durationMinutes": 382
        }
      ]
    }
  ],
  "errorMessage": null,
  "meta": {
    "durationMs": 4120,
    "retryAfter": null,
    "rawPayload": null
  }
}
```

#### Example B: `200 OK` — `Success` (Multi-Leg Connecting Itinerary with Codeshare)
**Request:**
```json
{
  "origin": "DCA",
  "destination": "RAP",
  "departureDate": "2027-05-27",
  "cabinClass": "economy",
  "fareTier": "Standard",
  "currency": "USD",
  "legs": [
    {
      "airline": "UA",
      "flightNumber": "219",
      "origin": "DCA",
      "destination": "ORD"
    },
    {
      "airline": "OO",
      "bookingAirline": "UA",
      "flightNumber": "5412",
      "origin": "ORD",
      "destination": "RAP"
    }
  ]
}
```

**Response (`200 OK`):**
```json
{
  "status": "Success",
  "price": 464,
  "currency": "USD",
  "leadingAirline": "UA",
  "leadingFlightNumber": "219",
  "itineraries": [
    {
      "airline": "UA",
      "airlineName": "United Airlines",
      "flightNumber": "219",
      "origin": "DCA",
      "destination": "RAP",
      "price": 464,
      "departureTime": "2027-05-27 08:30",
      "arrivalTime": "2027-05-27 12:18",
      "duration": "5h 48m",
      "durationMinutes": 348,
      "stops": 1,
      "isNonstop": false,
      "layoverAirports": ["ORD"],
      "maxLayoverMinutes": 72,
      "legs": [
        {
          "airline": "UA",
          "flightNumber": "219",
          "origin": "DCA",
          "destination": "ORD",
          "departureTime": "2027-05-27 08:30",
          "arrivalTime": "2027-05-27 09:42",
          "durationMinutes": 132
        },
        {
          "airline": "OO",
          "flightNumber": "5412",
          "origin": "ORD",
          "destination": "RAP",
          "departureTime": "2027-05-27 10:54",
          "arrivalTime": "2027-05-27 12:18",
          "durationMinutes": 144
        }
      ]
    }
  ],
  "errorMessage": null,
  "meta": {
    "durationMs": 4891,
    "retryAfter": null,
    "rawPayload": null
  }
}
```

#### Example C: `200 OK` — `SoldOut`
```json
{
  "status": "SoldOut",
  "price": null,
  "currency": "USD",
  "leadingAirline": null,
  "leadingFlightNumber": null,
  "itineraries": [],
  "errorMessage": null,
  "meta": {
    "durationMs": 3890,
    "retryAfter": null,
    "rawPayload": null
  }
}
```

#### Example D: `400 Bad Request` — Validation Error
```json
{
  "error": "Airport code must be a 3-letter uppercase IATA code (e.g. DFW).",
  "issues": [
    {
      "code": "invalid_string",
      "path": ["origin"],
      "message": "Airport code must be a 3-letter uppercase IATA code (e.g. DFW)."
    }
  ]
}
```

#### Example E: `401 Unauthorized` — Invalid or Revoked API Key
```json
{
  "error": "Unauthorized"
}
```

#### Example F: `429 Too Many Requests` — Quota Exhausted or Circuit Breaker Active
**Headers:**
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 2026-11-13T15:00:00.000Z
Content-Type: application/json; charset=utf-8
```
**Body:**
```json
{
  "status": "RateLimited",
  "price": null,
  "currency": "USD",
  "leadingAirline": null,
  "leadingFlightNumber": null,
  "itineraries": [],
  "errorMessage": "Hourly scrape limit reached (20/20).",
  "meta": {
    "durationMs": 0,
    "retryAfter": "2026-11-13T15:00:00.000Z",
    "rawPayload": null
  }
}
```

#### Example G: `502 Bad Gateway` — Empty Upstream Payload or Upstream Failure
```json
{
  "status": "Error",
  "price": null,
  "currency": "USD",
  "leadingAirline": null,
  "leadingFlightNumber": null,
  "itineraries": [],
  "errorMessage": "Google Flights returned 0 parseable itineraries across 3 attempt(s) without an empty-results notice (shoppingError=false, unfilteredXhrs=0, domStandard=false).",
  "meta": {
    "durationMs": 19840,
    "retryAfter": null,
    "rawPayload": null
  }
}
```

---

## 5. Consumer Implementation Guide (TypeScript)

When integrating OpenFareScraper into an external flight tracker (such as [**FlightSentry**](https://github.com/thebronway/FlightSentry)):

1. **Normalize Base URL:** Strip trailing slashes from the user-configured endpoint URL (e.g., `http://openfarescraper:4001`) before appending `/api/v1/health` or `/api/v1/scrape`.
2. **Pre-Flight Health Gate:** Before invoking `/api/v1/scrape`, call `GET /api/v1/health` with a short timeout (`5,000 ms`). If `paused === true`, `circuitBreakerActive === true`, `rateLimited === true`, `usage.hourlyUsed >= usage.hourlyLimit`, or `usage.dailyUsed >= usage.dailyLimit`, skip the scraper immediately and fail over to the next provider without waiting on a `429` or `503`.
3. **Route, Single-Flight, and Multi-Leg Searches:**
   * For **Route Tracking**, omit `airline`, `flightNumber`, and `legs` (optionally pass `includedAirlines` / `excludedAirlines` and `maxStops`). Pick `itineraries[0]` as the lowest fare (since `itineraries` is pre-sorted ascending by `price`).
   * For **Single-Flight Tracking**, pass both `airline` (e.g., `"UA"`) and `flightNumber` (e.g., `"1492"` or `"UA1492"`). Inspect `itineraries[0]` for that exact flight's fare.
   * For **Multi-Leg Connecting Tracking** (1 to 3 stops / 2 to 4 segments), pass `legs` with each ordered segment's `airline`, optional `bookingAirline` (for regional/codeshare flights), `flightNumber`, `origin`, and `destination`.
4. **Multi-Airport Origins/Destinations:** Resolve metropolitan or regional clusters (such as `"WAS"` → `["DCA", "IAD", "BWI"]`) in the caller before calling `/api/v1/scrape`. `itineraries[0].origin` and `itineraries[0].destination` report the exact winning operating airports (`"DCA"`, `"IAD"`, or `"BWI"`).

### 5.1 Reference TypeScript Adapter

```typescript
export interface OpenFareScraperConfig {
  baseUrl: string; // e.g. "http://openfarescraper:4001"
  apiKey: string;  // e.g. "ofs_..."
  timeoutMs?: number;
}

export interface ScraperHealthResponse {
  status: 'ok' | 'rate_limited' | 'cooldown' | 'paused';
  state: 'ready' | 'rate_limited' | 'cooldown' | 'paused';
  version: string;
  apiVersion: string;
  paused: boolean;
  circuitBreakerActive: boolean;
  rateLimited: boolean;
  statusReason: string | null;
  retryAfter: string | null;
  queueDepth: number;
  usage: {
    hourlyUsed: number;
    hourlyLimit: number;
    dailyUsed: number;
    dailyLimit: number;
  };
}
export interface ScraperLegInput {
  airline: string;
  bookingAirline?: string | null;
  flightNumber: string;
  origin: string;
  destination: string;
}

export interface ScraperQueryRequest {
  origin: string | string[];
  destination: string | string[];
  departureDate: string;
  cabinClass?: 'economy' | 'premium_economy' | 'business' | 'first';
  fareTier?: 'Basic' | 'Standard';
  currency?: string;
  maxStops?: number;
  airline?: string;
  flightNumber?: string;
  legs?: ScraperLegInput[];
  includedAirlines?: string[];
  excludedAirlines?: string[];
  includeRaw?: boolean;
}

export interface ScraperSegment {
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
}

export interface ScraperItinerary {
  airline: string;
  airlineName: string;
  flightNumber: string;
  origin: string;
  destination: string;
  price: number;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  durationMinutes: number;
  stops: number;
  isNonstop: boolean;
  layoverAirports: string[];
  maxLayoverMinutes?: number | null;
  legs?: ScraperSegment[];
}

export interface ScraperQueryResponse {
  status: 'Success' | 'SoldOut' | 'RateLimited' | 'Paused' | 'Error';
  price: number | null;
  currency: string;
  leadingAirline: string | null;
  leadingFlightNumber: string | null;
  itineraries: ScraperItinerary[];
  errorMessage: string | null;
  meta: {
    durationMs: number;
    retryAfter: string | null;
    rawPayload: string | null;
  };
}

export class OpenFareScraperClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(config: OpenFareScraperConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey.trim();
    this.timeoutMs = config.timeoutMs ?? 90_000;
  }

  async checkHealth(): Promise<ScraperHealthResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/health`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) {
      throw new Error(`Health check failed with HTTP ${res.status}`);
    }

    return (await res.json()) as ScraperHealthResponse;
  }

  async scrape(params: ScraperQueryRequest): Promise<ScraperQueryResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/scrape`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    let payload: ScraperQueryResponse | null = null;
    try {
      payload = (await res.json()) as ScraperQueryResponse;
    } catch {
      // Non-JSON upstream proxy error
    }

    if (payload && typeof payload.status === 'string') {
      return payload;
    }

    return {
      status: res.status === 429 ? 'RateLimited' : 'Error',
      price: null,
      currency: params.currency ?? 'USD',
      leadingAirline: null,
      leadingFlightNumber: null,
      itineraries: [],
      errorMessage: `Unexpected HTTP ${res.status} from OpenFareScraper`,
      meta: {
        durationMs: 0,
        retryAfter: null,
        rawPayload: null,
      },
    };
  }
}
```

---

## 6. OpenAPI 3.1.0 Specification (`openapi.yaml`)

```yaml
openapi: 3.1.0
info:
  title: OpenFareScraper API
  version: 0.4.8
  description: |
    A Self-hosted headless Chromium Google Flights scraper microservice with a REST API. Built for FlightSentry, compatible flight trackers, and custom API integrations.
  license:
    name: MIT
servers:
  - url: http://localhost:4001/api/v1
    description: Local or LAN Docker container
  - url: http://openfarescraper:4001/api/v1
    description: Internal Docker Compose network
security:
  - BearerAuth: []
paths:
  /health:
    get:
      operationId: getHealth
      summary: Retrieve scraper health, circuit breaker state, queue depth, and rolling quotas
      tags:
        - Telemetry
      responses:
        "200":
          description: Service telemetry and quota counters
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/HealthResponse"
        "401":
          description: Missing, invalid, or revoked Bearer API key
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ScrapeResponse"
        "500":
          description: Internal server error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ScrapeResponse"
  /scrape:
    post:
      operationId: scrapeFlights
      summary: Execute a one-way Google Flights search
      tags:
        - Scraping
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ScrapeRequest"
      responses:
        "200":
          description: Scrape completed (either Success with itineraries or SoldOut with empty list)
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ScrapeResponse"
        "400":
          description: Request payload failed Zod schema validation
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ScrapeResponse"
        "401":
          description: Missing, invalid, or revoked Bearer API key
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ScrapeResponse"
        "429":
          description: Rolling hourly/daily quota exhausted or anti-bot circuit breaker active
          headers:
            Retry-After:
              description: ISO 8601 UTC timestamp when the client may retry
              schema:
                type: string
                format: date-time
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ScrapeResponse"
        "500":
          description: Internal server error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ScrapeResponse"
        "502":
          description: Upstream Chromium navigation failure or Google Flights anti-bot challenge
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ScrapeResponse"
        "503":
          description: Scraper is globally paused by an administrator
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ScrapeResponse"
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: ofs_<64-hex-chars>
  schemas:
    HealthResponse:
      type: object
      required:
        - status
        - state
        - version
        - apiVersion
        - paused
        - circuitBreakerActive
        - rateLimited
        - statusReason
        - retryAfter
        - queueDepth
        - usage
      properties:
        status:
          type: string
          enum: ["ok", "rate_limited", "cooldown", "paused"]
        state:
          type: string
          enum: ["ready", "rate_limited", "cooldown", "paused"]
        version:
          type: string
          example: "0.4.8"
        apiVersion:
          type: string
          example: "v1"
        paused:
          type: boolean
        circuitBreakerActive:
          type: boolean
        rateLimited:
          type: boolean
        statusReason:
          type: ["string", "null"]
        retryAfter:
          type: ["string", "null"]
          format: date-time
        queueDepth:
          type: integer
          minimum: 0
        usage:
          type: object
          required:
            - hourlyUsed
            - hourlyLimit
            - dailyUsed
            - dailyLimit
          properties:
            hourlyUsed:
              type: integer
              minimum: 0
            hourlyLimit:
              type: integer
              minimum: 1
            dailyUsed:
              type: integer
              minimum: 0
            dailyLimit:
              type: integer
              minimum: 1
    ScrapeRequest:
      type: object
      required:
        - origin
        - destination
        - departureDate
      properties:
        origin:
          oneOf:
            - type: string
              pattern: "^[A-Z]{3}$"
            - type: array
              minItems: 1
              maxItems: 8
              uniqueItems: true
              items:
                type: string
                pattern: "^[A-Z]{3}$"
          description: Single 3-letter uppercase IATA airport code or array of 1 to 8 unique airport codes
          example: ["DFW", "DAL"]
        destination:
          oneOf:
            - type: string
              pattern: "^[A-Z]{3}$"
            - type: array
              minItems: 1
              maxItems: 8
              uniqueItems: true
              items:
                type: string
                pattern: "^[A-Z]{3}$"
          description: Single 3-letter uppercase IATA airport code or array of 1 to 8 unique airport codes
          example: ["JFK", "LGA", "EWR"]
        departureDate:
          type: string
          format: date
          pattern: "^\\d{4}-\\d{2}-\\d{2}$"
          description: One-way departure date in YYYY-MM-DD format
          example: "2026-12-13"
        cabinClass:
          type: string
          enum: ["economy", "premium_economy", "business", "first"]
          default: "economy"
        fareTier:
          type: string
          enum: ["Basic", "Standard"]
          default: "Standard"
          description: Standard encodes Google Flights' native Economy (exclude Basic) filter (field 25 = 1 + tfu=EgYIABAAGAA) with automatic intercontinental fallback
        currency:
          type: string
          pattern: "^[A-Z]{3}$"
          default: "USD"
          example: "USD"
        maxStops:
          type: integer
          minimum: 0
          maximum: 3
          description: Maximum intermediate stops allowed (0 = nonstop)
        airline:
          type: string
          pattern: "^[A-Z0-9]{2}$"
          description: 2-character uppercase IATA carrier code filter
          example: "UA"
        flightNumber:
          type: string
          pattern: "^[A-Za-z0-9]{1,8}(?:,[A-Za-z0-9]{1,8}){0,3}$"
          description: Specific flight number filter (e.g., "687" or "UA687") or comma-separated ordered segment list (up to 4 segments)
          example: "687"
        legs:
          type: array
          minItems: 2
          maxItems: 4
          description: Contiguous ordered flight segments (2 to 4 legs) for exact multi-stop itinerary matching
          items:
            $ref: "#/components/schemas/ScrapeLegInput"
        includedAirlines:
          type: array
          maxItems: 20
          items:
            type: string
            pattern: "^[A-Z0-9]{2}$"
        excludedAirlines:
          type: array
          maxItems: 20
          items:
            type: string
            pattern: "^[A-Z0-9]{2}$"
        includeRaw:
          type: boolean
          default: false
    ScrapeLegInput:
      type: object
      required:
        - airline
        - flightNumber
        - origin
        - destination
      properties:
        airline:
          type: string
          pattern: "^[A-Z0-9]{2}$"
          description: Operating 2-character uppercase IATA carrier code
          example: "OO"
        bookingAirline:
          type: ["string", "null"]
          pattern: "^[A-Z0-9]{2}$"
          description: Optional marketing/codeshare 2-character uppercase IATA carrier code
          example: "UA"
        flightNumber:
          type: string
          pattern: "^[A-Za-z0-9]{1,8}$"
          description: Segment flight designator (with or without carrier prefix)
          example: "5412"
        origin:
          type: string
          pattern: "^[A-Z]{3}$"
          example: "ORD"
        destination:
          type: string
          pattern: "^[A-Z]{3}$"
          example: "RAP"
    RouteItinerary:
      type: object
      required:
        - airline
        - airlineName
        - flightNumber
        - origin
        - destination
        - price
        - departureTime
        - arrivalTime
        - duration
        - durationMinutes
        - stops
        - isNonstop
        - layoverAirports
      properties:
        airline:
          type: string
          example: "F9"
        airlineName:
          type: string
          example: "Frontier Airlines"
        flightNumber:
          type: string
          example: "687"
        origin:
          type: string
          pattern: "^[A-Z]{3}$"
          example: "DCA"
        destination:
          type: string
          pattern: "^[A-Z]{3}$"
          example: "SFO"
        price:
          type: number
          example: 219
        departureTime:
          type: string
          pattern: "^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}$"
          example: "2026-12-13 13:40"
        arrivalTime:
          type: string
          pattern: "^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}$"
          example: "2026-12-13 19:31"
        duration:
          type: string
          example: "8h 51m"
        durationMinutes:
          type: integer
          example: 531
        stops:
          type: integer
          minimum: 0
          example: 1
        isNonstop:
          type: boolean
          example: false
        layoverAirports:
          type: array
          items:
            type: string
            pattern: "^[A-Z]{3}$"
          example: ["DEN"]
        maxLayoverMinutes:
          type: ["integer", "null"]
          minimum: 0
          description: Longest connection duration in integer minutes when stops >= 1; null when nonstop
          example: 59
        legs:
          type: array
          items:
            $ref: "#/components/schemas/RouteSegment"
    RouteSegment:
      type: object
      required:
        - airline
        - flightNumber
        - origin
        - destination
        - departureTime
        - arrivalTime
        - durationMinutes
      properties:
        airline:
          type: string
          pattern: "^[A-Z0-9]{2}$"
          example: "B6"
        flightNumber:
          type: string
          example: "1882"
        origin:
          type: string
          pattern: "^[A-Z]{3}$"
          example: "DFW"
        destination:
          type: string
          pattern: "^[A-Z]{3}$"
          example: "FLL"
        departureTime:
          type: string
          pattern: "^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}$"
          example: "2026-12-15 16:10"
        arrivalTime:
          type: string
          pattern: "^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}$"
          example: "2026-12-15 20:00"
        durationMinutes:
          type: integer
          minimum: 0
          example: 170
    ScrapeResponse:
      type: object
      required:
        - status
        - price
        - currency
        - leadingAirline
        - leadingFlightNumber
        - itineraries
        - errorMessage
        - meta
      properties:
        status:
          type: string
          enum: ["Success", "SoldOut", "RateLimited", "Paused", "Error"]
        price:
          type: ["number", "null"]
          example: 219
        currency:
          type: string
          example: "USD"
        leadingAirline:
          type: ["string", "null"]
          example: "F9"
        leadingFlightNumber:
          type: ["string", "null"]
          example: "687"
        itineraries:
          type: array
          items:
            $ref: "#/components/schemas/RouteItinerary"
        errorMessage:
          type: ["string", "null"]
        meta:
          type: object
          required:
            - durationMs
            - retryAfter
            - rawPayload
          properties:
            durationMs:
              type: integer
              example: 4120
            retryAfter:
              type: ["string", "null"]
              format: date-time
            rawPayload:
              type: ["string", "null"]
```

---

## 7. Multi-Airport Arrays & Carrier Normalization Reference

### 7.1 Multi-Airport Array Semantics

* **Caller-Side Resolution:** Callers resolve metropolitan or regional airport clusters (such as `["DCA", "IAD", "BWI"]` or `["JFK", "LGA", "EWR"]`) before invoking `POST /api/v1/scrape`.
* **Deduplication & Limits:** Each `origin` and `destination` accepts either a single 3-letter uppercase IATA code or an array of **1 to 8** unique 3-letter uppercase IATA airport codes.
* **Single-Navigation Quota Accounting:** All deduplicated `origin` codes are encoded into protobuf `field 13` and all deduplicated `destination` codes into `field 14` within a single Google Flights query, consuming **1 quota unit**.
* **Response Airport Semantics:** Returned `RouteItinerary.origin`, `RouteItinerary.destination`, and `RouteSegment.origin` / `RouteSegment.destination` fields always report the exact operating airport IATA code.

---

### 7.2 Carrier & Flight Number Normalization Rules

1. **Carrier Code (`airline`):** Normalized to 2-character uppercase IATA designator (`^[A-Z0-9]{2}$`), such as `"UA"`, `"DL"`, `"AA"`, `"AS"`, `"WN"`, `"B6"`, `"F9"`, `"NK"`.
2. **Carrier Name (`airlineName`):** Resolved from Google Flights' `ds:1` leg metadata (`firstLeg[22][3]`) or `summary[1][0]`, falling back to an internal IATA carrier lookup table when extracted via DOM cards.
3. **Flight Number (`flightNumber`):**
   * Extracted from each segment's `leg[22][1]` as the numeric designator string without carrier prefix (e.g., `"3424"` rather than `"F9 3424"` or `"F93424"`).
   * When filtering via `ScrapeRequest.flightNumber`, leading carrier prefixes and whitespace are stripped automatically (e.g., `"UA 1492"`, `"UA1492"`, and `"1492"` all normalize to `"1492"`). Single-token values match against **any** operating segment in `itinerary.legs`; comma-separated lists (2 to 4 tokens, e.g., `"UA219,UA1283"`) match `itinerary.legs` positionally.
   * For multi-segment itineraries (`stops >= 1`), top-level `itinerary.airline` and `itinerary.flightNumber` represent the **first (originating) operating flight segment**, while all segments are exposed in `itinerary.legs`.
4. **Multi-Leg Segment Matching (`legs[]`):**
   * Each `ScrapeLegInput` entry normalizes `airline`, optional `bookingAirline`, and `flightNumber` (stripping carrier prefixes and spaces) before comparing against `itinerary.legs[i]`.
   * A segment matches when `origin`, `destination`, and normalized `flightNumber` match and the scraped segment's operating `airline` equals either `leg.airline` or `leg.bookingAirline`.

---

### 7.3 End of Specification
*OpenFareScraper REST API*