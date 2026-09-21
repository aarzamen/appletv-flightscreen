# AGENT BRIEFING: Apple TV (tvOS) FlightScreen Port

This project is a clean, native tvOS port of the live flight radar display from `tv-flightscreen`.

---

## 1. Project Location & Context
- **Path**: `/Users/ama/Documents/GitHub/appletv-flightscreen`
- **Symlink**: `/Users/ama/.gemini/antigravity/scratch/appletv-flightscreen`
- **Companion Project**: `/Users/ama/Documents/GitHub/tv-flightscreen` (Android TV / Chromecast HD version)

---

## 2. Key Architecture Decisions (tvOS Specifics)
1. **No WebKit on tvOS**:
   - `WKWebView` is intentionally not available in Apple's public tvOS SDK.
   - This app is built 100% natively in **SwiftUI** using **MapKit** for vector maps and **TimelineView Canvas** for the 60 FPS radar sweep overlay.
2. **Siri Remote Focus Engine**:
   - Apple TV does not use a touchscreen or standard mouse pointer; interaction is governed by the tvOS Focus Engine.
   - In `Views/ToolbarControlsView.swift`, buttons use `@FocusState private var focusedButton: ToolbarButton?` with custom scale (`1.12`), emerald glow, and dark text on focus.
   - In `Views/ContentView.swift`:
     - `.onExitCommand`: Handles the Siri Remote **Back/Menu (<)** button. If Toolbar Mode is active, it exits back to Map Mode; if in Map Mode, it deselects any targeted aircraft.
     - `.onPlayPauseCommand`: Dedicated shortcut to toggle Toolbar Mode.
     - `.onLongPressGesture(minimumDuration: 0.45)`: Center clickpad hold toggles Toolbar Mode.
3. **Map Modes**:
   - **Dark Map**: `MapStyle.standard(elevation: .flat, pointsOfInterest: .excludingAll, showsTraffic: false)` with dark color scheme.
   - **Satellite Photo**: `MapStyle.imagery(elevation: .realistic)` or `.hybrid`.
   - Toggled dynamically via `@State private var isSatellite: Bool`.
4. **Live ADS-B Polling**:
   - `Services/AdsbService.swift` performs direct async/await fetches to `https://api.adsb.lol/v2/lat/{lat}/lon/{lon}/dist/{radiusNm}` with auto-polling every 15 seconds.

---

## 3. Developer Environment & Code Signing
- **Xcode Version**: Xcode 26.6 (Build 17F113)
- **SDK**: `appletvos26.5` / `appletvsimulator26.5`
- **Developer Team ID**: `XM6E4PUXTU`
- **Developer Identity**: `Apple Development: Aaron Arzamendi (434HG698U6)`
- **Bundle ID**: `com.aarzamen.flightscreen.tvos`
- **Xcode Project Generator**: `xcodegen` (installed at `/opt/homebrew/bin/xcodegen`)

---

## 4. Useful Commands
```bash
# Regenerate Xcode Project from project.yml
./scripts/generate-project.sh

# Build project for Simulator
./scripts/build.sh appletvsimulator "generic/platform=tvOS Simulator"

# Deploy & launch directly on physical Apple TV over Wi-Fi
./scripts/deploy.sh

# List connected Apple TV devices
xcrun devicectl list devices
```
