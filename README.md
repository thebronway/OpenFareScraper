# OpenFareScraper

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-v0.4.6-green.svg)
![Docker](https://img.shields.io/docker/pulls/thebronway/openfarescraper?logo=docker)

### A Self-hosted headless Chromium Google Flights scraper microservice with a REST API. Built for [FlightSentry](https://github.com/thebronway/FlightSentry), compatible flight trackers, and custom API integrations.
Built with Next.js, Playwright, SQLite, and Docker.

Originally built to power [FlightSentry](https://github.com/thebronway/FlightSentry), **OpenFareScraper** is a standalone Google Flights REST API (`/api/v1`) for any flight tracker, fare monitor, or custom integration. Unlike basic scrapers that only read headline prices, it encodes native Google Flights protobuf (`tfs`) queries and extracts structured itinerary variables, including native **Basic vs. Standard (`Economy (exclude Basic)`)** fare filtering across airlines.

**GitHub:** [thebronway/OpenFareScraper](https://github.com/thebronway/OpenFareScraper) | [Report a Bug or Request a Feature](https://github.com/thebronway/OpenFareScraper/issues)  
**API Specs:** [API Spec](./docs/API_SPEC.MD)  
**Docker Hub:** [thebronway/openfarescraper](https://hub.docker.com/r/thebronway/openfarescraper)  
**Roadmap:** [Project Roadmap](./ROADMAP.md)  
**Changelog:** [Changelog](./CHANGELOG.md)  
**Support:** [Buy me a coffee](https://buymeacoffee.com/brianconway)

## Features
- **Native Basic vs. Standard Fare Filtering:** Encodes Google Flights' `Economy (exclude Basic)` protobuf parameter (`field 25 = 1` + `tfu=EgYIABAAGAA`), filtering out Basic Economy fares even on carriers with free carry-on bags (AA, DL, AS, B6, WN), with automatic fallback on intercontinental routes.
- **Full Itinerary Variable Extraction:** Queries single or multi-airport IATA arrays (1–8 airports per navigation) across all cabin classes (`economy`, `premium_economy`, `business`, `first`) and returns carrier codes, flight numbers, timestamps, total duration, stop counts, layover airports, max layover minutes, and per-segment legs.
- **Multi-Stop Layover Support:** Expands `"View more flights"` (`"Other flights"`) across all cabins and fare tiers to extract and match 1-stop, 2-stop, and 3-stop itineraries (up to 4 legs) via `legs[]` or multi-segment `flightNumber` strings (e.g., `"UA219/UA1283/UA669"`).
- **Headless Chromium Engine:** Persistent stealth browser context with Google consent handling, `ds:1` hydration extraction, DOM fallback, and automatic browser recycling.
- **Anti-Bot Guardrails:** Serial FIFO queue (`concurrency = 1`), randomized jitter delays, rolling hourly/daily request caps, global pause (`HTTP 503`), and automatic CAPTCHA/429/403 circuit breaker with manual reset.
- **Defense-in-Depth Security:** First-run `scrypt` admin password setup, HMAC-SHA256 `HttpOnly` session cookies (`ofs_admin_session`), login rate limiting, SHA-256 hashed `ofs_...` API keys, Zod validation, strict Google-domain `page.route()` isolation, and non-root execution.
- **Admin Console:** Web UI on port `4001` for API key management, guardrail and proxy configuration, live test scrapes, and scrape logs.

## Data Sources
OpenFareScraper queries Google Flights directly via headless Chromium and exposes `/api/v1/health` and `/api/v1/scrape` for [FlightSentry](https://github.com/thebronway/FlightSentry) and any REST API client.

## Author
Check out my other projects at [brian.conway.im](https://brian.conway.im/).
Find this or any of my other projects useful or helpful? [Support my work (Buy me a coffee)](https://buymeacoffee.com/brianconway).

## Acknowledgments
This project was coded with AI assistance, but fully reviewed, tested, and approved by hand. See [AIACKNOWLEDGMENT.md](AIACKNOWLEDGMENT.md) for details.

*This software is provided "as is", without warranty of any kind, express or implied.*