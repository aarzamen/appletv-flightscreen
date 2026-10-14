# AeroDeck pilot workflow audit and implemented upgrade

Audience: civilian Cessna and glider pilot using Android. Priorities target repeated flight preparation rather than aviation-themed utilities. This release is a planning and reference workspace, not a complete electronic flight bag or certified flight instrument.

## Five highest-yield additions

1. **Airport brief.** Current FAA NASR records for 43 airports and 75 physical runways: dimensions/surface, traffic direction, true headings where available, displaced thresholds, frequencies with sector restrictions, published operating remarks, source cycle. METAR wind components use true runway headings. Density/pressure altitude are explicitly approximate, calculated only from recent reports with required fields. Secondary approach/sector frequencies are expandable.
2. **Aircraft profiles and loading.** Reusable Cessna/piston and glider templates, tail identifier, editable performance, usable fuel or glide inputs, station weights/arms and interpolated CG limits. Templates are unverified; aircraft records supply the numbers. Flights and trip briefs retain aircraft snapshots. Loading fuel is entered separately as weight; no automatic landing-weight/CG or POH performance assessment.
3. **Fuel and diversion budget.** Trip, optional destination-to-diversion leg, start/taxi, additional climb allowance, personal reserve, usable onboard fuel, arrival fuel and budget shortage/excess. Flags profile capacity conflicts and impossible wind calculations. No refueling assumed between route stops. Departure times persist as absolute instants; en-route ETA includes UTC date.
4. **Offline trip brief.** Save immutable route, aircraft/loading, airport detail, METAR/TAF, preparation checklist, and notes. Readback verifies successful storage. Export a standalone printable HTML brief; browser Print can save PDF. Offline readiness checks the complete app build. Charts, map tiles, NOTAMs and TFRs are not downloaded.
5. **Glider arrival worksheet.** Selected starting reference point and landing airport, MSL altitude, effective L/D, TAS, wind and chosen AGL arrival margin. Shows arrival MSL/AGL, estimated height loss, required starting altitude and wind-corrected groundspeed. No live location, terrain, obstacles, sink forecast, lift, polar optimization, turns or landing-site suitability assessment.

The order is a product judgment informed by ForeFlight's airport, aircraft, fuel and Pack workflows and this pilot's glider flying:

- https://foreflight.com/products/foreflight-mobile/airports/
- https://foreflight.com/products/foreflight-mobile/weight-and-balance/
- https://support.foreflight.com/hc/en-us/articles/115007885267-How-can-Start-Taxi-Takeoff-Fuel-and-Reserve-Fuel-be-adjusted-Performance-subscription
- https://foreflight.com/products/foreflight-mobile/downloads/
- https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/glider_handbook

## Bugs and inefficiencies repaired

- Unapplied route text persists across planner openings and blocks save/brief creation; applying route validates all stops.
- Empty or invalid numeric input no longer overwrites the valid saved route with zero airspeed.
- Editing a saved flight updates it; starting a new flight is explicit.
- Destination changes clear a conflicting diversion rather than quietly reporting zero diversion fuel.
- TAFs are filtered by current station selection, response races are ignored, refresh failures identify previous downloads, and expiry times remain visible. Forecasts now persist for offline snapshots.
- METAR responses/imports validate timestamps before date rendering; reconnect and bounded app-resume refresh restore current observations.
- Deletion updates UI only after storage succeeds. Backup imports restore the previous data if a write fails; failed rollback is disclosed.
- Offline builds use complete asset manifests, verified HTML dependencies, shared preparation, prior-build fallback, a six-second navigation timeout and bounded cache retention. Weather/API and external map requests are excluded.
- Map view persists across tabs. Viewport sizing removes phone/landscape minimum-height overflow. Fit route accounts for the airport-card overlay.
- Android PNG/maskable icons and Apple touch icons replace missing icon routes; install instructions cover Android.
- New airport/detail panels load on demand, avoiding a larger initial application bundle.
- CG envelope parsing rejects missing and extra values. Out-of-range weight is distinguished from absent CG data.

## Remaining product gaps

- National/global airport coverage and automated FAA-cycle ingestion: current details effective September 3, 2026; next cycle October 1, 2026. The app visibly flags overdue snapshots.
- Complete briefing feeds, native NOTAM/TFR evaluation, obstacle/terrain clearance, route-aware airspace checks and filing.
- Licensed offline charts/map downloads, background GPS and traffic/device integration.
- Aircraft-specific takeoff/landing performance tables, landing CG/fuel modeling, and glider polar/terrain integration.
- Cross-device accounts/sync and comprehensive edit/delete workflows for the legacy logbook/checklists. Export/import remains the transfer mechanism.
- Real-device Android install, airplane-mode cold launch, keyboard and landscape usability review with the pilot. Automated source/runtime tests do not establish cockpit suitability.

## Data provenance and calculation boundaries

Airport detail: https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/NASR_Subscription/2026-09-03/ (current changed CSV schema, not an older parser). Complete extraction sources/methodology retained in `lib/airport-briefs.json`.

METAR winds are true: https://aviationweather.gov/help/data/. Voice ATIS/ASOS/AWOS wind is magnetic: https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap7_section_1.html. No heading is fabricated from a runway number. L94 missing headings remain missing; L70/SZP derived headings are labeled separately.

Estimated pressure altitude uses elevation + (29.92 − altimeter inHg) × 1000. Density altitude uses pressure altitude + 120 × (temperature − ISA temperature), with ISA lapse 0.0019812 °C/ft. This dry-air approximation excludes humidity and is not aircraft performance data. The 120 factor is documented in NWS-hosted Air Force guidance: https://www.weather.gov/media/zhu/ZHU_Training_Page/Met_Tutorials/Meteorological_Techniques.pdf.

## Validation

- TypeScript type checking with generated Cloudflare runtime declarations.
- Production compilation and server-rendered page/complete offline dependency verification.
- Fourteen pilot model/data/persistence tests: fuel, glide/headwind/impossible wind, density altitude, backward compatibility, timestamp validation, CG parsing/interpolation, aircraft snapshots, pack import, escaping, rollback, and all 43 airport briefs.
- Twelve service-worker lifecycle cases in a mock network/CacheStorage runtime: offline cold launch, changed versions, failed updates, mixed assets, invalid manifests, cache exclusion, 503/stalled navigation, queried assets, concurrent success/failure and bounded retention.
- Existing UI primitive checks remain passing. No real-device or browser visual QA claimed.
