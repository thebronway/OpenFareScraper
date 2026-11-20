import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  getPublicSettings,
  getSettings,
  updateAdminPassword,
  updateGuardrails,
} from '@/db/settings';
import { getBrowserSessionStats } from '@/scraper/browserManager';
import {
  attachSessionCookie,
  hashPassword,
  isAdminAuthenticated,
  verifyPassword,
} from '@/utils/auth';
import { updateSettingsSchema } from '@/utils/validation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    settings: getPublicSettings(),
    browserStats: getBrowserSessionStats(),
  });
}

export async function PUT(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request body.' },
      { status: 400 }
    );
  }

  const parsed = updateSettingsSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid settings.' },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const current = getSettings();
  let rotatedSecret: string | null = null;

  if (data.newPassword) {
    if (
      !current.adminPasswordHash ||
      !data.currentPassword ||
      !verifyPassword(data.currentPassword, current.adminPasswordHash)
    ) {
      return NextResponse.json(
        { error: 'Current admin password is incorrect.' },
        { status: 401 }
      );
    }

    const newHash = hashPassword(data.newPassword);
    rotatedSecret = crypto.randomBytes(32).toString('hex');
    updateAdminPassword(newHash, rotatedSecret);
  }

  const resolvedMinJitter = data.minJitterMs ?? current.minJitterMs;
  const resolvedMaxJitter = data.maxJitterMs ?? current.maxJitterMs;
  if (resolvedMaxJitter < resolvedMinJitter) {
    return NextResponse.json(
      { error: 'Max jitter must be greater than or equal to min jitter.' },
      { status: 400 }
    );
  }

  const resolvedHourly = data.maxRequestsPerHour ?? current.maxRequestsPerHour;
  const resolvedDaily = data.maxRequestsPerDay ?? current.maxRequestsPerDay;
  if (resolvedDaily < resolvedHourly) {
    return NextResponse.json(
      { error: 'Daily limit must be greater than or equal to hourly limit.' },
      { status: 400 }
    );
  }

  updateGuardrails({
    minJitterMs: resolvedMinJitter,
    maxJitterMs: resolvedMaxJitter,
    settleDelayMs: data.settleDelayMs ?? current.settleDelayMs,
    maxRequestsPerHour: resolvedHourly,
    maxRequestsPerDay: resolvedDaily,
    cooldownMinutes: data.cooldownMinutes ?? current.cooldownMinutes,
    browserRecycleScrapes:
      data.browserRecycleScrapes ?? current.browserRecycleScrapes,
    proxyUrl: data.proxyUrl,
  });

  const res = NextResponse.json({
    ok: true,
    settings: getPublicSettings(),
    browserStats: getBrowserSessionStats(),
  });

  if (rotatedSecret) {
    attachSessionCookie(res, req, rotatedSecret);
  }

  return res;
}