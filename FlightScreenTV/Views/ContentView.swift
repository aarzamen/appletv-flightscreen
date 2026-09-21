import SwiftUI
import MapKit

public struct ContentView: View {
    @StateObject private var adsbService = AdsbService()
    
    @State private var stationIndex: Int = 0
    @State private var isSatellite: Bool = false
    @State private var isToolbarActive: Bool = false
    @State private var currentZoomDistance: Double = 120_000
    
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
    
    public var body: some View {
        ZStack(alignment: .top) {
            // Background Live Radar Map
            RadarMapView(
                station: currentStation,
                aircraft: adsbService.aircraft,
                selectedAircraft: adsbService.selectedAircraft,
                isSatellite: isSatellite,
                cameraPosition: $cameraPosition,
                onSelectAircraft: { ac in
                    adsbService.selectedAircraft = ac
                }
            )
            .ignoresSafeArea()
            
            // Cockpit Telemetry Header
            TopHUDBar(
                stationName: currentStation.name,
                liveTracksCount: adsbService.aircraft.count,
                rangeNm: 60,
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
                    onCycleStation: { cycleStation() }
                )
            }
        }
        // Siri Remote Key Handlers
        .onExitCommand {
            // tvOS Menu/Back button
            if isToolbarActive {
                withAnimation(.easeInOut(duration: 0.2)) {
                    isToolbarActive = false
                }
            } else if adsbService.selectedAircraft != nil {
                adsbService.deselect()
            }
        }
        .onPlayPauseCommand {
            // Play/Pause button toggles Toolbar Mode
            withAnimation(.easeInOut(duration: 0.2)) {
                isToolbarActive.toggle()
            }
        }
        // Long Press gesture on center clickpad to toggle Toolbar Mode
        .onLongPressGesture(minimumDuration: 0.45) {
            withAnimation(.easeInOut(duration: 0.2)) {
                isToolbarActive.toggle()
            }
        }
    }
    
    private func zoomMap(by factor: Double) {
        currentZoomDistance = max(20_000, min(800_000, currentZoomDistance * factor))
        withAnimation(.easeInOut(duration: 0.35)) {
            cameraPosition = .camera(
                MapCamera(
                    centerCoordinate: currentStation.coordinate,
                    distance: currentZoomDistance,
                    heading: 0,
                    pitch: 0
                )
            )
        }
    }
    
    private func snapHome() {
        withAnimation(.easeInOut(duration: 0.6)) {
            cameraPosition = .camera(
                MapCamera(
                    centerCoordinate: currentStation.coordinate,
                    distance: currentZoomDistance,
                    heading: 0,
                    pitch: 0
                )
            )
        }
    }
    
    private func cycleStation() {
        stationIndex = (stationIndex + 1) % Station.presets.count
        let nextStation = Station.presets[stationIndex]
        adsbService.updateStation(nextStation)
        withAnimation(.easeInOut(duration: 0.8)) {
            cameraPosition = .camera(
                MapCamera(
                    centerCoordinate: nextStation.coordinate,
                    distance: currentZoomDistance,
                    heading: 0,
                    pitch: 0
                )
            )
        }
    }
}
