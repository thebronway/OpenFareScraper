# OpenFareScraper Roadmap

*Last updated: 2026-11-19*  
*Current Version: v0.4.9*

## Overview
Tracks planned features, improvements, and technical debt for OpenFareScraper.

## Release Roadmap

### Release v0.5.0: Security & Session Management
- Add username/password authentication alongside optional `AUTH_USERNAME` / `AUTH_PASSWORD` env-managed credentials and optional auth disable flow (`AuthStatusCard`, `DisableAuthModal`).
- Add WebAuthn passkey registration, inline rename, synced badge, and login (`@simplewebauthn/server` & `@simplewebauthn/browser`), including secure-context and raw-IP hostname notices.
- Migrate from stateless HMAC cookies to SQLite-backed sessions with configurable session lifetime, device/IP inspection, single-session revoke, and sign-out-other-sessions (`ActiveSessionsCard`).

### Release v0.5.1: Update & Announcement Banners
- Add `SystemBanners` (`update` and `info`/`warning` announcement banners with `SafeRichText` links and 24-hour / permanent dismissal) plus 24-hour GitHub update sync controls in `/settings/general`.
- Expose `latestVersion`, `updateAvailable`, and active `announcements[]` in `GET /api/v1/health` so FlightSentry displays OpenFareScraper update and security notices directly in its UI.

### Release v0.5.2: Guided Onboarding Wizard
- Add URL-routed onboarding modal (`/dashboard/onboarding` and `/dashboard/onboarding/[step]`) covering Welcome, General/Proxy, Guardrails, Security/API Keys, and Setup Summary checklist.
- Support debounced auto-save, `onboardingCompleted` persistence, first-run redirect, and a **Launch Setup Wizard** trigger in `/settings/general`.

### Release v0.5.3: Polling & Live Diagnostics
- Add visibility-aware `focus` and `visibilitychange` immediate telemetry sync on `/dashboard` (pausing background polls while modals/onboarding are open).
- Add optional raw payload inspection (`includeRaw: true` / `meta.rawPayload`) in **Live Test Scrape** for debugging upstream Google Flights parser changes.

### Release v0.7.0: Monolithic Breakups
- Refactor large scraper modules (`googleFlightsScraper.ts`, `flightParser.ts`, `shoppingTokenInspector.ts`) into smaller single-responsibility units.

### Release v0.7.0
- Monolithic breakups