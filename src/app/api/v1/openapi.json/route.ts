import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/utils/apiKeyAuth';
import packageInfo from '../../../../../package.json';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = authenticateApiKey(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const origin = req.nextUrl.origin;

  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'OpenFareScraper REST API',
      version: packageInfo.version,
      description:
        'Authenticated headless Chromium Google Flights scraper microservice REST API with serial FIFO queue execution, native Basic vs. Standard fare filtering, and multi-leg itinerary extraction.',
    },
    servers: [
      {
        url: origin,
        description: 'Current OpenFareScraper Instance',
      },
    ],
    security: [{ BearerAuth: [] }, { ApiKeyHeader: [] }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'ofs_<64_hex>',
        },
        ApiKeyHeader: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
    },
    paths: {
      '/api/v1/health': {
        get: {
          tags: ['System'],
          summary: 'Get engine liveness, queue depth, and rolling quota telemetry',
          responses: {
            '200': { description: 'Health and quota telemetry returned' },
            '401': { description: 'Missing, invalid, or revoked API key' },
          },
        },
      },
      '/api/v1/scrape': {
        post: {
          tags: ['Scraper'],
          summary: 'Execute a one-way Google Flights scrape query',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['origin', 'destination', 'departureDate'],
                  properties: {
                    origin: {
                      oneOf: [
                        { type: 'string', pattern: '^[A-Z]{3}$' },
                        {
                          type: 'array',
                          minItems: 1,
                          maxItems: 8,
                          items: { type: 'string', pattern: '^[A-Z]{3}$' },
                        },
                      ],
                    },
                    destination: {
                      oneOf: [
                        { type: 'string', pattern: '^[A-Z]{3}$' },
                        {
                          type: 'array',
                          minItems: 1,
                          maxItems: 8,
                          items: { type: 'string', pattern: '^[A-Z]{3}$' },
                        },
                      ],
                    },
                    departureDate: { type: 'string', format: 'date' },
                    cabinClass: {
                      type: 'string',
                      enum: ['economy', 'premium_economy', 'business', 'first'],
                      default: 'economy',
                    },
                    fareTier: {
                      type: 'string',
                      enum: ['Basic', 'Standard'],
                      default: 'Standard',
                    },
                    currency: { type: 'string', pattern: '^[A-Z]{3}$', default: 'USD' },
                    maxStops: { type: 'integer', minimum: 0, maximum: 3 },
                    airline: { type: 'string', pattern: '^[A-Z0-9]{2}$' },
                    flightNumber: { type: 'string' },
                    legs: { type: 'array', minItems: 2, maxItems: 4 },
                    includedAirlines: {
                      type: 'array',
                      maxItems: 20,
                      items: { type: 'string', pattern: '^[A-Z0-9]{2}$' },
                    },
                    excludedAirlines: {
                      type: 'array',
                      maxItems: 20,
                      items: { type: 'string', pattern: '^[A-Z0-9]{2}$' },
                    },
                    includeRaw: { type: 'boolean', default: false },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Scrape completed (Success or SoldOut)' },
            '400': { description: 'Request payload failed Zod validation' },
            '401': { description: 'Unauthorized' },
            '429': { description: 'Rolling quota exhausted or circuit breaker active' },
            '502': { description: 'Upstream Google Flights block or navigation error' },
            '503': { description: 'Global pause active' },
          },
        },
      },
      '/api/v1/openapi.json': {
        get: {
          tags: ['System'],
          summary: 'Retrieve machine-readable OpenAPI 3.1 specification',
          responses: {
            '200': { description: 'OpenAPI 3.1 JSON document' },
            '401': { description: 'Unauthorized' },
          },
        },
      },
    },
  };

  return NextResponse.json(spec, { status: 200 });
}