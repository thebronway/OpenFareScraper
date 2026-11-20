import type { Page } from 'playwright';
import { insertScrapeLog } from '@/db/logs';
import { getSettings } from '@/db/settings';
import type { ScrapeRequest, ScrapeResponse } from '@/types';
import { formatLocationDisplay } from '@/utils/coLocations';
import { supportsBasicEconomyExclusion } from '@/utils/northAmericaAirports';
import {
  openIsolatedGooglePage,
  recordBrowserScrape,
} from './browserManager';
import {
  applyScrapeFilters,
  extractDs1JsonFromHtml,
  parseItinerariesFromDom,
  parseStructuredPayload,
} from './flightParser';
import { enqueueScrape } from './queueManager';
import {
  checkPreScrapeAllowance,
  inspectForUpstreamBlock,
} from './rateLimiter';
import {
  ensureStandardEconomyFilterActive,
  isStandardEconomyActiveInDom,
} from './fareTierGuard';
import { inspectShoppingResponse } from './shoppingTokenInspector';
import { buildGoogleFlightsUrl } from './urlBuilder';

const HARD_SCRAPE_TIMEOUT_MS = 30_000;
const MAX_RAW_PAYLOAD_BYTES = 50 * 1024; // 50 KB cap

export interface ScrapeExecutionResult {
  httpStatus: number;
  response: ScrapeResponse;
}

function truncateRawPayload(chunks: string[]): string | null {
  if (chunks.length === 0) return null;
  const joined = chunks.join('\n---CHUNK---\n');
  if (Buffer.byteLength(joined, 'utf8') <= MAX_RAW_PAYLOAD_BYTES) {
    return joined;
  }
  return joined.slice(0, MAX_RAW_PAYLOAD_BYTES) + '\n...[TRUNCATED_50KB]';
}

async function dismissConsentIfPresent(page: Page): Promise<void> {
  if (!page.url().includes('consent.google.com')) {
    return;
  }

  const acceptSelectors = [
    'button[aria-label*="Accept all" i]',
    'button:has-text("Accept all")',
    'button:has-text("I agree")',
    'form[action*="consent"] button',
  ];

  for (const selector of acceptSelectors) {
    const btn = page.locator(selector).first();
    const visible = await btn.isVisible().catch(() => false);
    if (visible) {
      await Promise.all([
        page
          .waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 8000 })
          .catch(() => null),
        btn.click({ timeout: 4000 }).catch(() => null),
      ]);
      break;
    }
  }
}

function formatFlightLogLabel(req: ScrapeRequest): string | null {
  if (req.legs && req.legs.length > 0) {
    return req.legs.map((leg) => `${leg.airline}${leg.flightNumber}`).join('/');
  }
  if (req.airline || req.flightNumber) {
    return `${req.airline ?? ''}${req.flightNumber ?? ''}`;
  }
  return null;
}

async function expandMoreFlightsIfPresent(page: Page): Promise<boolean> {
  try {
    await page
      .evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      })
      .catch(() => null);
    await page.waitForTimeout(200);

    const selectorList = [
      'button[aria-label*="more flights" i]',
      'button:has-text("View more flights")',
      'button:has-text("More flights")',
    ];

    for (const selector of selectorList) {
      const candidates = page.locator(selector);
      const count = await candidates.count().catch(() => 0);

      for (let i = 0; i < count; i++) {
        const btn = candidates.nth(i);
        const visible = await btn.isVisible().catch(() => false);
        const box = visible ? await btn.boundingBox().catch(() => null) : null;
        if (visible && box && box.width > 0 && box.height > 0) {
          await btn.scrollIntoViewIfNeeded().catch(() => null);
          await btn.click({ force: true, timeout: 4000 }).catch(() => null);
          return true;
        }
      }
    }
  } catch {
    // Best-effort expansion of collapsed "Other flights" section
  }
  return false;
}

async function performBrowserScrape(
  req: ScrapeRequest,
  apiKeyId: number | null
): Promise<ScrapeExecutionResult> {
  const startedAt = Date.now();
  const routeLabel = `${formatLocationDisplay(req.origin)} -> ${formatLocationDisplay(req.destination)}`;
  const flightLabel = formatFlightLogLabel(req);

  // Re-check global pause, rate limits & circuit breaker immediately before launching a page
  const preCheck = checkPreScrapeAllowance();
  if (!preCheck.allowed) {
    const isPaused = preCheck.paused;
    const status = isPaused ? 'Paused' : 'RateLimited';
    const httpStatus = isPaused ? 503 : 429;
    const durationMs = Date.now() - startedAt;
    const response: ScrapeResponse = {
      status,
      price: null,
      currency: req.currency,
      leadingAirline: null,
      leadingFlightNumber: null,
      itineraries: [],
      errorMessage: preCheck.reason,
      meta: {
        durationMs,
        retryAfter: preCheck.retryAfter,
        rawPayload: null,
      },
    };

    insertScrapeLog({
      apiKeyId,
      route: routeLabel,
      flightNumber: flightLabel,
      departureDate: req.departureDate,
      cabinClass: req.cabinClass,
      fareTier: req.fareTier,
      status,
      statusCode: httpStatus,
      itineraryCount: 0,
      lowestPrice: null,
      currency: req.currency,
      errorMessage: preCheck.reason,
      durationMs,
      queriedAt: new Date().toISOString(),
    });

    return { httpStatus, response };
  }

  const settings = getSettings();
  const requireBasicExclusion =
    req.cabinClass === 'economy' && req.fareTier === 'Standard';
  const targetUrl = buildGoogleFlightsUrl(req, {
    excludeBasicEconomy: requireBasicExclusion,
  });
  let interceptedPayloads: string[] = [];
  let page: Page | null = null;

  const runNavigationAttempt = async (
    activePage: Page,
    navigationUrl: string,
    enforceBasicExclusion: boolean
  ) => {
    const postFilterShoppingPayloads: string[] = [];
    const allShoppingPayloads: string[] = [];
    const otherDataPayloads: string[] = [];
    const pendingShoppingReads = new Set<Promise<void>>();
    let sawUnfilteredShopping = false;
    let sawShoppingError = false;
    let moreXhrFailed = false;
    let expandingMoreFlights = false;

    const onResponse = (res: import('playwright').Response) => {
      const resUrl = res.url();
      const isShoppingRpc = resUrl.includes('GetShoppingResults');
      const isFrontendDataRpc = resUrl.includes('/_/FlightsFrontendUi/data/');
      if (!isShoppingRpc && !isFrontendDataRpc) {
        return;
      }

      // Ignore non-itinerary background RPCs (calendar price graphs, price insights, explore teasers)
      if (
        /GetCalendar|PriceInsights|Explore|Autocomplete|Location/i.test(resUrl)
      ) {
        return;
      }

      const readTask = (async () => {
        try {
          const bodyText = await res.text();
          if (!bodyText || bodyText.length <= 100) {
            return;
          }

          if (!isShoppingRpc) {
            otherDataPayloads.push(bodyText);
            return;
          }

          if (bodyText.includes('ErrorResponse')) {
            sawShoppingError = true;
            return;
          }

          allShoppingPayloads.push(bodyText);

          if (!enforceBasicExclusion) {
            postFilterShoppingPayloads.push(bodyText);
            return;
          }

          const postData = res.request().postData();
          const inspection = inspectShoppingResponse(bodyText, postData);

          if (inspection.hasExplicitExclusion || expandingMoreFlights) {
            postFilterShoppingPayloads.push(bodyText);
            return;
          }

          // Reject any GetShoppingResults payload that does not explicitly confirm
          // Basic Economy exclusion (including baseline unfiltered responses).
          sawUnfilteredShopping = true;
        } catch {
          // Ignore streaming or aborted responses
        }
      })();

      pendingShoppingReads.add(readTask);
      readTask.finally(() => pendingShoppingReads.delete(readTask));
    };

    const flushPendingShoppingReads = async () => {
      while (pendingShoppingReads.size > 0) {
        await Promise.allSettled(Array.from(pendingShoppingReads));
      }
    };

    activePage.on('response', onResponse);

    try {
      const navResponse = await activePage.goto(navigationUrl, {
        waitUntil: 'domcontentloaded',
        timeout: HARD_SCRAPE_TIMEOUT_MS,
      });
      const httpStatus = navResponse ? navResponse.status() : null;

      await dismissConsentIfPresent(activePage);

      // Wait deterministically for either flight result cards or an explicit empty-state banner
      // to render in the main view instead of guessing with fixed timeouts.
      await activePage
        .waitForFunction(
          () => {
            const main = document.querySelector('div[role="main"]');
            if (!main) return false;
            if (main.querySelector('ul.Rk10dc > li')) return true;
            const text = (main as HTMLElement).innerText || '';
            return /no\s+(?:matching\s+)?(?:flights|results)\s+found|no\s+options\s+match/i.test(
              text
            );
          },
          { timeout: HARD_SCRAPE_TIMEOUT_MS }
        )
        .catch(() => null);

      await activePage.waitForTimeout(settings.settleDelayMs);
      await flushPendingShoppingReads();

      let html = await activePage.content();
      let ds1Payload = extractDs1JsonFromHtml(html);

      // Merge all verified GetShoppingResults chunks alongside ds:1 so both
      // "Best flights" and "Other flights" (2-stop / 3-stop layovers) are retained.
      const buildCandidates = (
        filteredXhrs: string[],
        currentDs1: string | null,
        domConfirmedStandard = false
      ) => {
        if (enforceBasicExclusion) {
          const acceptedXhrs =
            filteredXhrs.length > 0
              ? filteredXhrs
              : domConfirmedStandard
                ? allShoppingPayloads
                : [];

          if (acceptedXhrs.length > 0) {
            const structured: string[] = [...acceptedXhrs];
            if (currentDs1) {
              structured.push(currentDs1);
            }
            return {
              structured,
              diagnostic: [...acceptedXhrs],
            };
          }
          const structured: string[] = [];
          if (currentDs1) {
            structured.push(currentDs1);
          }
          structured.push(...otherDataPayloads);
          return {
            structured,
            diagnostic: [
              ...structured,
              ...allShoppingPayloads,
            ],
          };
        }

        if (allShoppingPayloads.length > 0) {
          const structured: string[] = [...allShoppingPayloads];
          if (currentDs1) {
            structured.push(currentDs1);
          }
          return {
            structured,
            diagnostic: [...allShoppingPayloads],
          };
        }
        const structured: string[] = [];
        if (currentDs1) {
          structured.push(currentDs1);
        }
        structured.push(...otherDataPayloads);
        return { structured, diagnostic: [...structured] };
      };

      const initialDomStandard =
        enforceBasicExclusion && postFilterShoppingPayloads.length === 0
          ? await isStandardEconomyActiveInDom(activePage)
          : false;

      let { structured: structuredCandidates, diagnostic: rawDiagnosticPayloads } =
        buildCandidates(postFilterShoppingPayloads, ds1Payload, initialDomStandard);

      let extracted = parseStructuredPayload(structuredCandidates, req);

      // UI filter recovery: only if initial extraction yielded 0 itineraries and no verified
      // post-filter XHR arrived, verify/activate the UI filter and await its response.
      if (
        enforceBasicExclusion &&
        extracted.length === 0 &&
        postFilterShoppingPayloads.length === 0
      ) {
        const filterResponsePromise = activePage
          .waitForResponse(
            (res) =>
              res.url().includes('GetShoppingResults') && res.status() === 200,
            { timeout: Math.max(settings.settleDelayMs * 2, 5000) }
          )
          .catch(() => null);
        const uiActivated =
          await ensureStandardEconomyFilterActive(activePage);
        if (sawUnfilteredShopping || uiActivated) {
          await filterResponsePromise;
          await flushPendingShoppingReads();
          html = await activePage.content();
          ds1Payload = extractDs1JsonFromHtml(html);
          const rebuilt = buildCandidates(
            postFilterShoppingPayloads,
            ds1Payload,
            uiActivated
          );
          structuredCandidates = rebuilt.structured;
          rawDiagnosticPayloads = rebuilt.diagnostic;
          extracted = parseStructuredPayload(structuredCandidates, req);
        }
      }

      // Expand collapsed "View more flights" ("Other flights") whenever layovers are allowed
      // so 2-stop (3-leg) and 3-stop (4-leg) itineraries are included in route and leg searches.
      const needsSpecificFlightMatch = Boolean(
        (req.legs && req.legs.length >= 2) || req.flightNumber
      );
      if (
        req.maxStops !== 0 &&
        (extracted.length > 0 || needsSpecificFlightMatch)
      ) {
        const prevShoppingCount = allShoppingPayloads.length;
        const prevValidCount = enforceBasicExclusion
          ? postFilterShoppingPayloads.length
          : allShoppingPayloads.length;
        const expandTimeoutMs = Math.max(settings.settleDelayMs * 2, 10000);
        const moreRequestPromise = activePage
          .waitForRequest(
            (r) => r.url().includes('GetShoppingResults'),
            { timeout: 3000 }
          )
          .catch(() => null);
        const moreResponsePromise = activePage
          .waitForResponse(
            (res) =>
              res.url().includes('GetShoppingResults') && res.status() === 200,
            { timeout: expandTimeoutMs }
          )
          .catch(() => null);

        expandingMoreFlights = true;
        try {
          const expanded = await expandMoreFlightsIfPresent(activePage);
          if (expanded) {
            let dispatchedMoreRequest = await moreRequestPromise;
            if (!dispatchedMoreRequest) {
              const retryReqPromise = activePage
                .waitForRequest(
                  (r) => r.url().includes('GetShoppingResults'),
                  { timeout: 2000 }
                )
                .catch(() => null);
              const reclicked = await expandMoreFlightsIfPresent(activePage);
              if (reclicked) {
                dispatchedMoreRequest = await retryReqPromise;
              }
            }
            if (dispatchedMoreRequest) {
              await moreResponsePromise;
              await activePage
                .waitForLoadState('networkidle', { timeout: 5000 })
                .catch(() => null);
            }
            await flushPendingShoppingReads();
            const postValidCount = enforceBasicExclusion
              ? postFilterShoppingPayloads.length
              : allShoppingPayloads.length;
            if (dispatchedMoreRequest && postValidCount <= prevValidCount) {
              moreXhrFailed = true;
            }
            if (allShoppingPayloads.length > prevShoppingCount) {
              const domStandardAfterExpand = enforceBasicExclusion
                ? await isStandardEconomyActiveInDom(activePage)
                : false;
              const rebuiltAfterExpand = buildCandidates(
                postFilterShoppingPayloads,
                ds1Payload,
                domStandardAfterExpand
              );
              structuredCandidates = rebuiltAfterExpand.structured;
              rawDiagnosticPayloads = rebuiltAfterExpand.diagnostic;
              extracted = parseStructuredPayload(structuredCandidates, req);
            }
          }
        } finally {
          expandingMoreFlights = false;
        }
      }

      const confirmedEmptyResults = await activePage
        .evaluate(() => {
          const main = document.querySelector('div[role="main"]');
          if (!main) return false;
          if (main.querySelector('ul.Rk10dc > li')) return false;
          const text = (main as HTMLElement).innerText || '';
          return /no\s+(?:matching\s+)?(?:flights|results)\s+found|no\s+options\s+match/i.test(
            text
          );
        })
        .catch(() => false);

      const domStandard = enforceBasicExclusion
        ? await isStandardEconomyActiveInDom(activePage)
        : false;

      const shouldRetry =
        sawShoppingError ||
        moreXhrFailed ||
        extracted.length === 0;

      return {
        httpStatus,
        itineraries: extracted,
        rawPayloads: rawDiagnosticPayloads,
        shouldRetry,
        confirmedEmptyResults,
        sawShoppingError,
        unfilteredShoppingCount: Math.max(
          0,
          allShoppingPayloads.length - postFilterShoppingPayloads.length
        ),
        domStandard,
      };
    } finally {
      activePage.off('response', onResponse);
    }
  };

  try {
    page = await openIsolatedGooglePage();
    page.setDefaultTimeout(HARD_SCRAPE_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(HARD_SCRAPE_TIMEOUT_MS);

    const maxNavigationAttempts = 3;
    let primaryAttemptsRun = 1;
    let primaryAttempt = await runNavigationAttempt(
      page,
      targetUrl,
      requireBasicExclusion
    );
    for (
      let attempt = 2;
      attempt <= maxNavigationAttempts &&
      primaryAttempt.shouldRetry &&
      primaryAttempt.httpStatus !== 429 &&
      primaryAttempt.httpStatus !== 403;
      attempt++
    ) {
      primaryAttemptsRun = attempt;
      primaryAttempt = await runNavigationAttempt(
        page,
        targetUrl,
        requireBasicExclusion
      );
    }
    let itineraries = primaryAttempt.itineraries;
    interceptedPayloads = primaryAttempt.rawPayloads;
    let confirmedEmptyResults = primaryAttempt.confirmedEmptyResults;
    let sawShoppingError = primaryAttempt.sawShoppingError;
    let unfilteredShoppingCount = primaryAttempt.unfilteredShoppingCount;
    let domStandardConfirmed = primaryAttempt.domStandard;
    let attemptsRun = primaryAttemptsRun;

    if (itineraries.length === 0) {
      const domAllowed =
        !requireBasicExclusion ||
        domStandardConfirmed ||
        (await isStandardEconomyActiveInDom(page));
      if (domAllowed) {
        itineraries = await parseItinerariesFromDom(page, req);
      }
    }

    const blockCheck = await inspectForUpstreamBlock(
      page,
      primaryAttempt.httpStatus,
      itineraries.length > 0
    );

    if (blockCheck.blocked) {
      const durationMs = Date.now() - startedAt;
      const response: ScrapeResponse = {
        status: 'RateLimited',
        price: null,
        currency: req.currency,
        leadingAirline: null,
        leadingFlightNumber: null,
        itineraries: [],
        errorMessage: blockCheck.reason,
        meta: {
          durationMs,
          retryAfter: blockCheck.retryAfter,
          rawPayload: req.includeRaw
            ? truncateRawPayload(interceptedPayloads)
            : null,
        },
      };

      insertScrapeLog({
        apiKeyId,
        route: routeLabel,
        flightNumber: flightLabel,
        departureDate: req.departureDate,
        cabinClass: req.cabinClass,
        fareTier: req.fareTier,
        status: 'RateLimited',
        statusCode: 429,
        itineraryCount: 0,
        lowestPrice: null,
        currency: req.currency,
        errorMessage: blockCheck.reason,
        durationMs,
        queriedAt: new Date().toISOString(),
      });

      return { httpStatus: 429, response };
    }

    // Google Flights natively supports "Economy (exclude Basic)" on US, US-territory, and Canadian routes.
    // Only run a fallback navigation on routes outside US/US-territories/Canada where Google does not
    // support excludeBasicEconomy and returned 0 results on the primary attempt.
    if (
      itineraries.length === 0 &&
      req.cabinClass === 'economy' &&
      req.fareTier === 'Standard' &&
      !supportsBasicEconomyExclusion(req.origin, req.destination)
    ) {
      const fallbackUrl = buildGoogleFlightsUrl(req, {
        excludeBasicEconomy: false,
      });
      const fallbackAttempt = await runNavigationAttempt(
        page,
        fallbackUrl,
        false
      );
      itineraries = fallbackAttempt.itineraries;
      interceptedPayloads = fallbackAttempt.rawPayloads;
      confirmedEmptyResults = fallbackAttempt.confirmedEmptyResults;
      sawShoppingError = fallbackAttempt.sawShoppingError;
      unfilteredShoppingCount = fallbackAttempt.unfilteredShoppingCount;
      domStandardConfirmed = fallbackAttempt.domStandard;
      attemptsRun += 1;

      const fallbackBlockCheck = await inspectForUpstreamBlock(
        page,
        fallbackAttempt.httpStatus,
        itineraries.length > 0
      );

      if (fallbackBlockCheck.blocked) {
        const durationMs = Date.now() - startedAt;
        const response: ScrapeResponse = {
          status: 'RateLimited',
          price: null,
          currency: req.currency,
          leadingAirline: null,
          leadingFlightNumber: null,
          itineraries: [],
          errorMessage: fallbackBlockCheck.reason,
          meta: {
            durationMs,
            retryAfter: fallbackBlockCheck.retryAfter,
            rawPayload: req.includeRaw
              ? truncateRawPayload(interceptedPayloads)
              : null,
          },
        };

        insertScrapeLog({
          apiKeyId,
          route: routeLabel,
          flightNumber: flightLabel,
          departureDate: req.departureDate,
          cabinClass: req.cabinClass,
          fareTier: req.fareTier,
          status: 'RateLimited',
          statusCode: 429,
          itineraryCount: 0,
          lowestPrice: null,
          currency: req.currency,
          errorMessage: fallbackBlockCheck.reason,
          durationMs,
          queriedAt: new Date().toISOString(),
        });

        return { httpStatus: 429, response };
      }
    }

    const rawItineraryCount = itineraries.length;
    const filtered = applyScrapeFilters(itineraries, req);
    const durationMs = Date.now() - startedAt;

    if (filtered.length === 0) {
      if (rawItineraryCount === 0 && !confirmedEmptyResults) {
        const emptyDiagnostic = `Google Flights returned 0 parseable itineraries across ${attemptsRun} attempt(s) without an empty-results notice (shoppingError=${sawShoppingError}, unfilteredXhrs=${unfilteredShoppingCount}, domStandard=${domStandardConfirmed}).`;
        const response: ScrapeResponse = {
          status: 'Error',
          price: null,
          currency: req.currency,
          leadingAirline: null,
          leadingFlightNumber: null,
          itineraries: [],
          errorMessage: emptyDiagnostic,
          meta: {
            durationMs,
            retryAfter: null,
            rawPayload: req.includeRaw
              ? truncateRawPayload(interceptedPayloads)
              : null,
          },
        };

        insertScrapeLog({
          apiKeyId,
          route: routeLabel,
          flightNumber: flightLabel,
          departureDate: req.departureDate,
          cabinClass: req.cabinClass,
          fareTier: req.fareTier,
          status: 'Error',
          statusCode: 502,
          itineraryCount: 0,
          lowestPrice: null,
          currency: req.currency,
          errorMessage: emptyDiagnostic,
          durationMs,
          queriedAt: new Date().toISOString(),
        });

        return { httpStatus: 502, response };
      }

      const soldOutDiagnostic =
        rawItineraryCount > 0
          ? `0 of ${rawItineraryCount} route itineraries matched request filters.`
          : 'Google Flights confirmed no matching flights for route/date.';

      const response: ScrapeResponse = {
        status: 'SoldOut',
        price: null,
        currency: req.currency,
        leadingAirline: null,
        leadingFlightNumber: null,
        itineraries: [],
        errorMessage: null,
        meta: {
          durationMs,
          retryAfter: null,
          rawPayload: req.includeRaw
            ? truncateRawPayload(interceptedPayloads)
            : null,
        },
      };

      insertScrapeLog({
        apiKeyId,
        route: routeLabel,
        flightNumber: flightLabel,
        departureDate: req.departureDate,
        cabinClass: req.cabinClass,
        fareTier: req.fareTier,
        status: 'SoldOut',
        statusCode: 200,
        itineraryCount: 0,
        lowestPrice: null,
        currency: req.currency,
        errorMessage: soldOutDiagnostic,
        durationMs,
        queriedAt: new Date().toISOString(),
      });

      return { httpStatus: 200, response };
    }

    const best = filtered[0];
    const response: ScrapeResponse = {
      status: 'Success',
      price: best.price,
      currency: req.currency,
      leadingAirline: best.airline,
      leadingFlightNumber: best.flightNumber || null,
      itineraries: filtered,
      errorMessage: null,
      meta: {
        durationMs,
        retryAfter: null,
        rawPayload: req.includeRaw
          ? truncateRawPayload(interceptedPayloads)
          : null,
      },
    };

    insertScrapeLog({
      apiKeyId,
      route: routeLabel,
      flightNumber: flightLabel,
      departureDate: req.departureDate,
      cabinClass: req.cabinClass,
      fareTier: req.fareTier,
      status: 'Success',
      statusCode: 200,
      itineraryCount: filtered.length,
      lowestPrice: best.price,
      currency: req.currency,
      errorMessage: null,
      durationMs,
      queriedAt: new Date().toISOString(),
    });

    return { httpStatus: 200, response };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const message =
      err instanceof Error ? err.message : 'Unexpected Playwright failure.';
    const isTimeout = /timeout/i.test(message);
    const httpStatus = isTimeout ? 504 : 502;

    const response: ScrapeResponse = {
      status: 'Error',
      price: null,
      currency: req.currency,
      leadingAirline: null,
      leadingFlightNumber: null,
      itineraries: [],
      errorMessage: message,
      meta: {
        durationMs,
        retryAfter: null,
        rawPayload: req.includeRaw
          ? truncateRawPayload(interceptedPayloads)
          : null,
      },
    };

    insertScrapeLog({
      apiKeyId,
      route: routeLabel,
      flightNumber: flightLabel,
      departureDate: req.departureDate,
      cabinClass: req.cabinClass,
      fareTier: req.fareTier,
      status: 'Error',
      statusCode: httpStatus,
      itineraryCount: 0,
      lowestPrice: null,
      currency: req.currency,
      errorMessage: message,
      durationMs,
      queriedAt: new Date().toISOString(),
    });

    return { httpStatus, response };
  } finally {
    if (page) {
      await page.close().catch(() => null);
      recordBrowserScrape();
    }
  }
}

export async function executeQueuedScrape(
  req: ScrapeRequest,
  apiKeyId: number | null
): Promise<ScrapeExecutionResult> {
  // Fast-fail before queueing if global pause, hourly/daily cap, or circuit breaker is active
  const immediateCheck = checkPreScrapeAllowance();
  if (!immediateCheck.allowed) {
    const isPaused = immediateCheck.paused;
    const status = isPaused ? 'Paused' : 'RateLimited';
    const httpStatus = isPaused ? 503 : 429;
    const routeLabel = `${formatLocationDisplay(req.origin)} -> ${formatLocationDisplay(req.destination)}`;
    const flightLabel = formatFlightLogLabel(req);

    const response: ScrapeResponse = {
      status,
      price: null,
      currency: req.currency,
      leadingAirline: null,
      leadingFlightNumber: null,
      itineraries: [],
      errorMessage: immediateCheck.reason,
      meta: {
        durationMs: 0,
        retryAfter: immediateCheck.retryAfter,
        rawPayload: null,
      },
    };

    insertScrapeLog({
      apiKeyId,
      route: routeLabel,
      flightNumber: flightLabel,
      departureDate: req.departureDate,
      cabinClass: req.cabinClass,
      fareTier: req.fareTier,
      status,
      statusCode: httpStatus,
      itineraryCount: 0,
      lowestPrice: null,
      currency: req.currency,
      errorMessage: immediateCheck.reason,
      durationMs: 0,
      queriedAt: new Date().toISOString(),
    });

    return { httpStatus, response };
  }

  return enqueueScrape(() => performBrowserScrape(req, apiKeyId));
}