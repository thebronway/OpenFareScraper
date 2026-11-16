# FlightSentry-Scraper Roadmap

*Last updated: 2026-11-14*  
*Current Version: v0.4.2*

## Overview
This document tracks planned improvements, enhancements, and technical debt for FlightSentry-Scraper

## Release Roadmap

### Release v0.4.5
- App full rename to OpenFareScraper, from every refernce to github, still include references to FlightSentry, but the app needs its own identity. 

### Release v0.4.6: Branding
- Follow Design Guide
- Use two main pages (with all proper relative routing)
    - Dashbord /dashboard
    - Settings /settings
- Settings
    - General (proxy, tz, update) (settings/general)
    - Guardrails (settings/guardrails)
    - Security (password, api keys, still want to see usage on the dashboard)(settings/security)

### Release v0.4.7:
- Secutiry update
    - Username/password
    - Passkey

### Release v0.4.8: API doucmention
- Like the main site, tranform the current API documention into a page

### Release v0.4.9: Banners
- Add update / annoucment banner mechanism, similar to main app
- Send update availble / banners to main app, so main app knows there is an update, they can go and update (for broken fuctionaility/secutity)

### Release v0.5.0
- Polling

### Release v0.6.0
- Monolithic breakups