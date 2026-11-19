import { z } from 'zod';

const IATA_AIRPORT_REGEX = /^[A-Z]{3}$/;
const IATA_CARRIER_REGEX = /^[A-Z0-9]{2}$/;
const FLIGHT_NUMBER_REGEX = /^[A-Za-z0-9]{1,8}$/;
const FLIGHT_NUMBER_LIST_REGEX = /^[A-Za-z0-9]{1,8}(?:,[A-Za-z0-9]{1,8}){0,3}$/;
const DATE_YYYY_MM_DD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDate(value: string): boolean {
  if (!DATE_YYYY_MM_DD_REGEX.test(value)) return false;
  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function isValidProxyUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === 'http:' ||
        parsed.protocol === 'https:' ||
        parsed.protocol === 'socks5:') &&
      Boolean(parsed.hostname)
    );
  } catch {
    return false;
  }
}

export const authActionSchema = z
  .discriminatedUnion('action', [
    z.object({
      action: z.literal('setup'),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters.')
        .max(128, 'Password cannot exceed 128 characters.'),
      confirmPassword: z.string(),
    }),
    z.object({
      action: z.literal('login'),
      password: z.string().min(1, 'Password is required.').max(128),
    }),
    z.object({
      action: z.literal('logout'),
    }),
  ])
  .superRefine((data, ctx) => {
    if (data.action === 'setup' && data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match.',
        path: ['confirmPassword'],
      });
    }
  });

export const createApiKeySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Key name is required.')
    .max(64, 'Key name must be 64 characters or fewer.'),
});

export const togglePauseSchema = z.object({
  paused: z.boolean(),
});

export const updateSettingsSchema = z
  .object({
    minJitterMs: z.number().int().min(500).max(60000),
    maxJitterMs: z.number().int().min(500).max(120000),
    settleDelayMs: z.number().int().min(500).max(30000),
    maxRequestsPerHour: z.number().int().min(1).max(500),
    maxRequestsPerDay: z.number().int().min(1).max(5000),
    cooldownMinutes: z.number().int().min(1).max(1440),
    browserRecycleScrapes: z.number().int().min(10).max(1000).default(100),
    proxyUrl: z
      .string()
      .trim()
      .max(512)
      .refine((val) => val === '' || isValidProxyUrl(val), {
        message: 'Proxy URL must use http://, https://, or socks5://.',
      })
      .nullable()
      .optional(),
    currentPassword: z.string().max(128).optional(),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters.')
      .max(128)
      .optional(),
    confirmNewPassword: z.string().max(128).optional(),
  })
  .refine((data) => data.maxJitterMs >= data.minJitterMs, {
    message: 'Max jitter must be greater than or equal to min jitter.',
    path: ['maxJitterMs'],
  })
  .refine((data) => data.maxRequestsPerDay >= data.maxRequestsPerHour, {
    message: 'Daily limit must be greater than or equal to hourly limit.',
    path: ['maxRequestsPerDay'],
  })
  .refine(
    (data) => {
      if (!data.newPassword) return true;
      return Boolean(data.currentPassword && data.currentPassword.length > 0);
    },
    {
      message: 'Current password is required to set a new password.',
      path: ['currentPassword'],
    }
  )
  .refine(
    (data) => {
      if (!data.newPassword) return true;
      return data.newPassword === data.confirmNewPassword;
    },
    {
      message: 'New passwords do not match.',
      path: ['confirmNewPassword'],
    }
  );

const singleAirportSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    IATA_AIRPORT_REGEX,
    'Airport code must be a 3-letter uppercase IATA code (e.g. DFW).'
  );

const airportLocationSchema = z.union([
  singleAirportSchema,
  z
    .array(singleAirportSchema)
    .min(1, 'At least 1 airport code is required.')
    .max(8, 'At most 8 unique airport codes are allowed.')
    .transform((codes) => Array.from(new Set(codes))),
]);

const scrapeLegSchema = z.object({
  airline: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      IATA_CARRIER_REGEX,
      'Leg airline must be a 2-character uppercase IATA carrier code (e.g. AA).'
    ),
  bookingAirline: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        IATA_CARRIER_REGEX,
        'Leg bookingAirline must be a 2-character uppercase IATA carrier code.'
      )
      .nullable()
      .optional()
  ),
  flightNumber: z
    .string()
    .trim()
    .toUpperCase()
    .transform((val) => val.replace(/\s+/g, ''))
    .pipe(
      z
        .string()
        .regex(
          FLIGHT_NUMBER_REGEX,
          'Leg flightNumber must be 1 to 8 alphanumeric characters.'
        )
    ),
  origin: singleAirportSchema,
  destination: singleAirportSchema,
});

export const scrapeRequestSchema = z
  .object({
    origin: airportLocationSchema,
    destination: airportLocationSchema,
    departureDate: z
      .string()
      .trim()
      .refine(isValidCalendarDate, {
        message: 'departureDate must be a valid YYYY-MM-DD date.',
      }),
    cabinClass: z
      .enum(['economy', 'premium_economy', 'business', 'first'])
      .default('economy'),
    fareTier: z.enum(['Basic', 'Standard']).default('Standard'),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter ISO code (e.g. USD).')
      .default('USD'),
    maxStops: z.number().int().min(0).max(3).optional(),
    includedAirlines: z
      .array(z.string().trim().toUpperCase().regex(IATA_CARRIER_REGEX))
      .max(20)
      .optional(),
    excludedAirlines: z
      .array(z.string().trim().toUpperCase().regex(IATA_CARRIER_REGEX))
      .max(20)
      .optional(),
    airline: z
      .string()
      .trim()
      .toUpperCase()
      .regex(IATA_CARRIER_REGEX)
      .optional(),
    flightNumber: z
      .string()
      .trim()
      .toUpperCase()
      .transform((val) => val.replace(/\s+/g, ''))
      .pipe(z.string().regex(FLIGHT_NUMBER_LIST_REGEX))
      .optional(),
    legs: z
      .array(scrapeLegSchema)
      .min(2, 'At least 2 legs are required when specifying connecting legs.')
      .max(4, 'At most 4 legs are supported.')
      .optional(),
    includeRaw: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (!data.legs || data.legs.length === 0) return;

    const originSet = new Set(
      Array.isArray(data.origin) ? data.origin : [data.origin]
    );
    if (!originSet.has(data.legs[0].origin)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `First leg origin (${data.legs[0].origin}) must match requested origin.`,
        path: ['legs', 0, 'origin'],
      });
    }

    const destSet = new Set(
      Array.isArray(data.destination) ? data.destination : [data.destination]
    );
    const lastLeg = data.legs[data.legs.length - 1];
    if (!destSet.has(lastLeg.destination)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Final leg destination (${lastLeg.destination}) must match requested destination.`,
        path: ['legs', data.legs.length - 1, 'destination'],
      });
    }

    if (data.maxStops !== undefined && data.maxStops < data.legs.length - 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `maxStops (${data.maxStops}) cannot be less than required stops (${data.legs.length - 1}) for ${data.legs.length} legs.`,
        path: ['maxStops'],
      });
    }

    for (let i = 0; i < data.legs.length; i++) {
      if (data.legs[i].origin === data.legs[i].destination) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Leg ${i + 1} origin and destination cannot be identical (${data.legs[i].origin}).`,
          path: ['legs', i, 'destination'],
        });
      }
      if (
        i < data.legs.length - 1 &&
        data.legs[i].destination !== data.legs[i + 1].origin
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Leg ${i + 1} destination (${data.legs[i].destination}) must match leg ${i + 2} origin (${data.legs[i + 1].origin}).`,
          path: ['legs', i + 1, 'origin'],
        });
      }
    }
  });