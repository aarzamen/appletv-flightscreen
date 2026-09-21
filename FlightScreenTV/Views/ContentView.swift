import SwiftUI
import MapKit

public struct ContentView: View {
    @StateObject private var adsbService = AdsbService()
    
    @State private var stationIndex: Int = 0
    @State private var isSatellite: Bool = false
    @State private var isToolbarActive: Bool = false
    @State private var currentZoomDistance: Double = 120_000
    @State private var currentCenter: CLLocationCoordinate2D = Station.presets[0].coordinate
    
    @FocusState private var isMapFocused: Bool
    
    @State private var cameraPosition: MapCameraPosition = .camera(
        MapCamera(
            centerCoordinate: Station.presets[0].coordinate,
            distance: 120_000,
            heading: 0,
            pitch: 0
        )
    )
    
    private var currentStation: Station {
        Station.presets[stationIndex]
    }
    
    private var calculatedRangeNm: Int {
        max(10, min(240, Int(round(currentZoomDistance / 2000.0))))
    }
    
    private var panStepLat: Double {
        (currentZoomDistance / 111_000.0) * 0.16
    }
    
    private var panStepLon: Double {
        let latRad = currentCenter.latitude * .pi / 180.0
        let cosLat = max(0.15, cos(latRad))
        return (currentZoomDistance / (111_000.0 * cosLat)) * 0.16
    }
    
    public var body: some View {
        ZStack(alignment: .top) {
            // Background Live Radar Map
            RadarMapView(
                station: currentStation,
                aircraft: adsbService.aircraft,
                selectedAircraft: adsbService.selectedAircraft,
                isSatellite: isSatellite,
                rangeNm: Double(calculatedRangeNm),
                cameraPosition: $cameraPosition,
                onSelectAircraft: { ac in
                    adsbService.selectedAircraft = ac
                }
            )
            .ignoresSafeArea()
            .focusable(!isToolbarActive)
            .focusEffectDisabled()
            .focused($isMapFocused)
            .onTapGesture {
                withAnimation(.easeInOut(duration: 0.2)) {
                    adsbService.selectNext()
                }
            }
            .onMoveCommand { direction in
                guard !isToolbarActive else { return }
                handleDirectionalPan(direction)
            }
            
            // Cockpit Telemetry Header
            TopHUDBar(
                stationName: currentStation.name,
                liveTracksCount: adsbService.aircraft.count,
                rangeNm: calculatedRangeNm,
                isSatellite: isSatellite,
                feedStatus: adsbService.statusMessage
            )
            
            // Selected Aircraft HUD Card
            if let selected = adsbService.selectedAircraft {
                HStack {
                    TargetDetailHUD(aircraft: selected)
                        .padding(.top, 110)
                        .padding(.leading, 48)
                        .transition(.move(edge: .leading).combined(with: .opacity))
                    Spacer()
                }
            }
            
            // Bottom Action & Toolbar Bar
            VStack {
                Spacer()
                ToolbarControlsView(
                    isToolbarActive: isToolbarActive,
                    isSatellite: isSatellite,
                    onZoomIn: { zoomMap(by: 0.7) },
                    onZoomOut: { zoomMap(by: 1.4) },
                    onCenter: { snapHome() },
                    onToggleMapStyle: { isSatellite.toggle() },
                    onCycleStation: { cycleStation() },
                    onExitToolbar: {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            isToolbarActive = false
                            isMapFocused = true
                        }
                    }
                )
            }
        }
        .onAppear {
            isMapFocused = true
            SiriRemoteManager.shared.onPanDelta = { [self] dx, dy in
                guard !isToolbarActive else { return }
                let scale = (currentZoomDistance / 111_000.0) * 0.04
                let latRad = currentCenter.latitude * .pi / 180.0
                let cosLat = max(0.15, cos(latRad))
                currentCenter.longitude += (dx * scale / cosLat)
                currentCenter.latitude += (dy * scale)
                updateCameraPosition()
            }
        }
        .onChange(of: isToolbarActive) { active in
            if !active {
                isMapFocused = true
            }
        }
        // Siri Remote Key Handlers
        .onExitCommand {
            // tvOS Menu/Back button
            if isToolbarActive {
                withAnimation(.easeInOut(duration: 0.2)) {
                    isToolbarActive = false
                    isMapFocused = true
                }
            } else if adsbService.selectedAircraft != nil {
                withAnimation(.easeInOut(duration: 0.2)) {
                    adsbService.deselect()
                }
            }
        }
        .onPlayPauseCommand {
            // Play/Pause button toggles Toolbar Mode
            withAnimation(.easeInOut(duration: 0.2)) {
                isToolbarActive.toggle()
                if !isToolbarActive {
                    isMapFocused = true
                }
            }
        }
        // Long Press gesture on center clickpad to toggle Toolbar Mode
        .onLongPressGesture(minimumDuration: 0.45) {
            withAnimation(.easeInOut(duration: 0.2)) {
                isToolbarActive.toggle()
                if !isToolbarActive {
                    isMapFocused = true
                }
            }
        }
        // Direct KeyPress Handlers for Siri Remote & Hardware Keyboards
        .onKeyPress(.return) {
            if !isToolbarActive {
                withAnimation(.easeInOut(duration: 0.2)) {
                    adsbService.selectNext()
                }
                return .handled
            }
            return .ignored
        }
        .onKeyPress(.upArrow) {
            if isToolbarActive {
                withAnimation(.easeInOut(duration: 0.2)) {
                    isToolbarActive = false
                    isMapFocused = true
                }
                return .handled
            } else {
                handleDirectionalPan(.up)
                return .handled
            }
        }
        .onKeyPress(.downArrow) {
            if !isToolbarActive {
                handleDirectionalPan(.down)
                return .handled
            }
            return .ignored
        }
        .onKeyPress(.leftArrow) {
            if !isToolbarActive {
                handleDirectionalPan(.left)
                return .handled
            }
            return .ignored
        }
        .onKeyPress(.rightArrow) {
            if !isToolbarActive {
                handleDirectionalPan(.right)
                return .handled
            }
            return .ignored
        }
        .preferredColorScheme(.dark)
    }
    
    private func handleDirectionalPan(_ direction: MoveCommandDirection) {
        withAnimation(.easeOut(duration: 0.18)) {
            switch direction {
            case .up:
                currentCenter.latitude += panStepLat
            case .down:
                currentCenter.latitude -= panStepLat
            case .left:
                currentCenter.longitude -= panStepLon
            case .right:
                currentCenter.longitude += panStepLon
            @unknown default:
                break
            }
            updateCameraPosition()
        }
    }
    
    private func updateCameraPosition() {
        cameraPosition = .camera(
            MapCamera(
                centerCoordinate: currentCenter,
                distance: currentZoomDistance,
                heading: 0,
                pitch: 0
            )
        )
    }
    
    private func zoomMap(by factor: Double) {
        currentZoomDistance = max(20_000, min(600_000, currentZoomDistance * factor))
        withAnimation(.easeInOut(duration: 0.35)) {
            updateCameraPosition()
        }
    }
    
    private func snapHome() {
        currentCenter = currentStation.coordinate
        withAnimation(.easeInOut(duration: 0.6)) {
            updateCameraPosition()
        }
    }
    
    private func cycleStation() {
        stationIndex = (stationIndex + 1) % Station.presets.count
        let nextStation = Station.presets[stationIndex]
        currentCenter = nextStation.coordinate
        adsbService.updateStation(nextStation)
        withAnimation(.easeInOut(duration: 0.8)) {
            updateCameraPosition()
        }
    }
}
