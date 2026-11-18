# OpenFareScraper Roadmap

*Last updated: 2026-11-16*  
*Current Version: v0.4.5*

## Overview
Tracks planned features, improvements, and technical debt for OpenFareScraper.

## Release Roadmap

### Release v0.4.6:
- Support for layover flights, right now, when the main app sends a request for a layover flight, it sends two itineraries openfarescaper only sends back one itinerary. So multi-flight itineraries can have up to three or four legs. Before coming up with a plan, we will do testing with API keys provided by me.

### Release v0.4.7: Branding
- Follow Design Guide
- Use two main pages (with all proper relative routing)
    - Dashbord /dashboard
    - Settings /settings
- Settings
    - General (proxy, tz, update) (settings/general)
    - Guardrails (settings/guardrails)
    - Security (password, api keys, still want to see api key usage on the dashboard, but send to setting sto create? maybe. no flashes)(settings/security)

### Release v0.4.8:
- Secutiry update
    - Username/password
    - Passkey

### Release v0.4.9 API doucmention
- Like the main site, tranform the current API documention into a page

### Release v0.5.0: Banners
- Add update / annoucment banner mechanism, similar to main app
- Send update availble / banners to main app, so main app knows there is an update, they can go and update (for broken fuctionaility/secutity)

### Release v0.5.1
- Like the main site, create an onboarding modal

### Release v0.5.2
- Polling

### Release v0.7.0
- Monolithic breakups