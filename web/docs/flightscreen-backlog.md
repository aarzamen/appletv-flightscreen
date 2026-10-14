# FlightScreen — later

## SpaceX launches from Vandenberg

Status: planned; not implemented or enabled.

- [ ] Identify upcoming SpaceX launches from Vandenberg Space Force Base using a dependable launch schedule, with source links, update times, and clear handling of delays, scrubs, and cancellations.
- [ ] Add a distinctive rocket graphic and launch card with a countdown. Clearly distinguish a scheduled launch, confirmed liftoff, and any observed tracking; do not present an illustrative flight path as live telemetry.
- [ ] Add optional launch sounds, enabled through a user gesture, with mute, volume, and reduced-motion controls.
- [ ] Offer opt-in system notifications where the browser supports them. Ask permission only after the user enables launch alerts; verify iPhone/PWA support and provide an in-app fallback.
- [ ] Evaluate background Web Push with a service worker and a server-side launch monitor, so alerts do not rely on an open tab or a running Mac.
- [ ] Let the user choose advance warning times and quiet hours. Deduplicate each launch's alerts, and revise or cancel pending alerts when the schedule changes.
- [ ] Test schedule changes, time zones, denied notification permission, background delivery, offline recovery, and sound behavior on a physical iPhone before calling launch alerts reliable.

## Permanent aircraft-feed hosting

- [ ] Resolve flight-provider access for the permanent Cloudflare-hosted Site. The current hosting network receives ADSB.lol HTTP 429 and adsb.fi HTTP 403; the Mac-backed HTTPS preview can receive live traffic. Preserve provider attribution, quotas, and cooldowns. Do not substitute simulated positions or a temporary tunnel for a permanent production dependency.
