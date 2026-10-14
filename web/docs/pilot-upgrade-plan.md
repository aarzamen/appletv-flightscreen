# AeroDeck pilot workflow upgrade

Audience: a civilian Cessna and glider pilot using Android. Extend the existing public app; retain saved user data and its current audience.

The five product slices are reusable aircraft profiles, airport operating briefs, complete route fuel/alternate planning, glider arrival-height planning, and saved offline trip briefs. These connect existing map, weather, route, and checklist tools instead of adding unrelated widgets.

1. Add tested pure models in lib/pilot.ts: aircraft validation, pressure/density altitude, fuel budget, fixed-performance glide arrival. Preserve backward compatibility in Plan.
2. Add aircraft profile editor with piston/glider modes, explicit example/configuration state, performance and loading stations; apply profiles to route calculations and W&B.
3. Integrate official runway/communications snapshots with source/date labels in airport briefs, selected-runway wind components, and density altitude. Keep missing information unavailable.
4. Extend planner/navlog with alternate, departure time, fuel on board, taxi/climb allowance, reserve, and aircraft identity. Gliders omit powered-aircraft fuel fields.
5. Add glider arrival estimate across existing airport catalog; state the fixed L/D assumptions, wind and arrival margin. Do not claim terrain clearance or landability.
6. Add offline trip brief snapshots including route, aircraft, METAR/TAF times, runway reference and checklist. Repair service-worker updates and PWA icons; make cache status verifiable. Back up all new state and retain existing backup import support.
7. Repair confirmed audit defects, run domain regressions and offline-worker tests, perform production build, save the exact source version, and update the existing public publication.

Validation: independent numeric reference cases, no-data / stale weather, impossible winds, fuel deficit, invalid import, old-save migration, and service-worker update/offline failure paths. No claims of ForeFlight parity, certified navigation, complete briefing, or verified aircraft performance.
