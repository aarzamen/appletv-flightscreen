# FlightScreen TV for Apple TV (tvOS)

A high-performance, native Apple TV (tvOS) live ADS-B radar and flight tracking screen designed for desk monitors and ambient living room displays.

Built natively in **SwiftUI** with **MapKit**, **TimelineView Canvas**, and the **Siri Remote Focus Engine**, porting over the full architecture from `tv-flightscreen`.

---

## Features

- **Native MapKit Rendering**: High-frame-rate, hardware-accelerated vector mapping with instant toggling between **Dark Map Mode** (`.standard`) and **Satellite Photo Mode** (`.imagery`).
- **60 FPS Real-time Radar Sweep**: Native SwiftUI `TimelineView(.animation)` and `Canvas` rendering 4 concentric distance rings (15, 30, 45, 60 NM), crosshairs, and an animated emerald radar sweep beam.
- **Live ADS-B Telemetry**: Direct async/await client-side polling from `api.adsb.lol` with live flight level callouts (`FL240`, `GND`), ground speed, track heading rotation, and squawk codes.
- **Cockpit Telemetry HUD**: Top cockpit status bar displaying live aircraft count, radar range, active base map style, and live feed connection status.
- **Aircraft Target Inspection**: Floating glass HUD card displaying targeted aircraft flight number, aircraft model, exact altitude, speed, squawk, and heading.
- **Siri Remote Two-Mode Ergonomics**:
  - **Map Mode (Default)**: Touch surface / Clickpad pans across the sky; Center Clickpad tap cycles targeted aircraft.
  - **Toolbar Mode**: Holding Center Clickpad (or pressing Play/Pause) enters Toolbar Mode, shifting focus to the bottom row (`[+ Zoom]`, `[− Zoom]`, `[🎯 Center]`, `[🗺️ Map Style]`, `[📍 Station]`).
  - **Back to Pan**: Pressing **Menu / Back** on the Siri Remote immediately exits Toolbar Mode back to map panning.

---

## Project Structure

```
appletv-flightscreen/
├── project.yml                       # Declarative XcodeGen configuration
├── FlightScreenTV.xcodeproj          # Native Xcode project
├── FlightScreenTV/
│   ├── App/
│   │   └── FlightScreenTVApp.swift   # @main tvOS SwiftUI entrypoint
│   ├── Models/
│   │   ├── Aircraft.swift            # Codable ADS-B model + math helpers
│   │   └── Station.swift             # Radar station presets (LAX, SFO, JFK, etc.)
│   ├── Services/
│   │   └── AdsbService.swift         # Async/await live ADS-B network service
│   ├── Views/
│   │   ├── ContentView.swift         # Main layout & Siri Remote key coordinator
│   │   ├── RadarMapView.swift        # MapKit base map (Dark / Satellite toggle)
│   │   ├── RadarSweepOverlay.swift   # 60 FPS Canvas radar sweep & rings
│   │   ├── AircraftMarkerView.swift  # Heading-rotated aircraft symbol & badge
│   │   ├── TargetDetailHUD.swift     # Selected aircraft telemetry card
│   │   ├── TopHUDBar.swift           # Cockpit header
│   │   └── ToolbarControlsView.swift # Two-mode toolbar with tvOS focus states
│   └── Resources/
│       ├── Assets.xcassets/          # tvOS layered AppIcon & AccentColor
│       └── Info.plist                # tvOS bundle configuration
└── scripts/
    ├── build.sh                      # CLI build script with xcodebuild
    └── generate-project.sh           # Regenerates .xcodeproj with xcodegen
```

---

## Building & Deploying

### Option 1: Open in Xcode
1. Double-click `FlightScreenTV.xcodeproj` to open in Xcode.
2. Select your Apple TV (or Apple TV Simulator) from the run destination dropdown.
3. Your development team is already pre-configured:
   - **Team**: `Aaron Arzamendi (434HG698U6)`
   - **Bundle Identifier**: `com.flightscreen.tvos`
4. Press **⌘R** to build and run.

### Option 2: Command Line (`xcodebuild`)
```bash
# Build for Apple TV Simulator
./scripts/build.sh appletvsimulator "generic/platform=tvOS Simulator"

# Build for Physical Apple TV
./scripts/build.sh appletvos "generic/platform=tvOS"
```

### Option 3: Regenerating the Xcode Project
If you add or rename source files, regenerate the project cleanly at any time:
```bash
./scripts/generate-project.sh
```

---

## Siri Remote Navigation Cheatsheet

| Siri Remote Action | Map Mode (Default) | Toolbar Mode (Active) |
|---|---|---|
| **Touch Surface / Clickpad** | Pan radar map | Navigate between buttons (Left / Right) |
| **Center Clickpad Tap** | Target / cycle aircraft | Execute focused button action |
| **Center Clickpad Hold (450ms)** | Enter Toolbar Mode | Exit Toolbar Mode |
| **Play / Pause** | Toggle Toolbar Mode | Toggle Toolbar Mode |
| **Back / Menu (<)** | Deselect aircraft | **Exit Toolbar Mode & Return to Pan** |

---

## Station Presets Included

1. **Ventura / LAX Basin** (34.2800° N, 119.2900° W)
2. **San Francisco Bay** (37.6213° N, 122.3790° W)
3. **Seattle / Tacoma** (47.4502° N, 122.3088° W)
4. **New York / JFK** (40.6413° N, 73.7781° W)
5. **Chicago O'Hare** (41.9742° N, 87.9073° W)
6. **Denver Metro** (39.8561° N, 104.6737° W)
