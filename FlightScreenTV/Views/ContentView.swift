import SwiftUI
import MapKit

public struct ContentView: View {
    @StateObject private var viewModel = FlightScreenViewModel()
    @StateObject private var adsbService = AdsbService()
    
    @FocusState private var isMapFocused: Bool
    
    public init() {}
    
    public var body: some View {
        ZStack(alignment: .top) {
            // Background Live Radar Map
            RadarMapView(
                station: viewModel.currentStation,
                aircraft: adsbService.aircraft,
                selectedAircraft: adsbService.selectedAircraft,
                isSatellite: viewModel.isSatellite,
                rangeNm: Double(viewModel.calculatedRangeNm),
                cameraPosition: $viewModel.cameraPosition,
                onSelectAircraft: { ac in
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                        adsbService.selectedAircraft = ac
                    }
                }
            )
            .ignoresSafeArea()
            .focusable(!viewModel.isToolbarActive)
            .focusEffectDisabled()
            .focused($isMapFocused)
            .onTapGesture {
                viewModel.selectNextAircraft(adsbService: adsbService)
            }
            .onMoveCommand { direction in
                guard !viewModel.isToolbarActive else { return }
                viewModel.handleDirectionalPan(direction)
            }
            
            // Cockpit Telemetry Header
            TopHUDBar(
                stationName: viewModel.currentStation.name,
                liveTracksCount: adsbService.aircraft.count,
                rangeNm: viewModel.calculatedRangeNm,
                isSatellite: viewModel.isSatellite,
                feedStatus: adsbService.statusMessage
            )
            
            // Selected Aircraft HUD Card
            if let selected = adsbService.selectedAircraft {
                HStack {
                    TargetDetailHUD(aircraft: selected)
                        .padding(.top, 110)
                        .padding(.leading, 48)
                        .transition(.asymmetric(
                            insertion: .move(edge: .leading).combined(with: .opacity),
                            removal: .move(edge: .leading).combined(with: .opacity)
                        ))
                    Spacer()
                }
                .animation(.spring(response: 0.35, dampingFraction: 0.8), value: adsbService.selectedAircraft)
            }
            
            // Bottom Action & Toolbar Bar
            VStack {
                Spacer()
                ToolbarControlsView(
                    isToolbarActive: viewModel.isToolbarActive,
                    isSatellite: viewModel.isSatellite,
                    selectedAircraft: adsbService.selectedAircraft,
                    onZoomIn: { viewModel.zoomIn() },
                    onZoomOut: { viewModel.zoomOut() },
                    onCenter: { viewModel.snapToCenter(selectedAircraft: adsbService.selectedAircraft) },
                    onToggleMapStyle: { viewModel.toggleMapStyle() },
                    onCycleStation: { viewModel.cycleStation(adsbService: adsbService) },
                    onExitToolbar: {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            viewModel.isToolbarActive = false
                            isMapFocused = true
                        }
                    }
                )
            }
        }
        .onAppear {
            isMapFocused = true
            SiriRemoteManager.shared.onPanDelta = { [weak viewModel] dx, dy in
                viewModel?.handleContinuousPan(dx: dx, dy: dy)
            }
        }
        .onChange(of: viewModel.isToolbarActive) { active in
            if !active {
                isMapFocused = true
            }
        }
        // Siri Remote Key Handlers
        .onExitCommand {
            // tvOS Menu/Back button (<)
            if viewModel.isToolbarActive {
                withAnimation(.easeInOut(duration: 0.2)) {
                    viewModel.isToolbarActive = false
                    isMapFocused = true
                }
            } else if adsbService.selectedAircraft != nil {
                withAnimation(.easeInOut(duration: 0.25)) {
                    adsbService.deselect()
                }
            }
        }
        .onPlayPauseCommand {
            // Dedicated Play/Pause button on Siri Remote toggles Toolbar Mode
            withAnimation(.easeInOut(duration: 0.2)) {
                viewModel.isToolbarActive.toggle()
                if !viewModel.isToolbarActive {
                    isMapFocused = true
                }
            }
        }
        .onLongPressGesture(minimumDuration: 0.45) {
            // Long Press gesture on center clickpad toggles Toolbar Mode
            withAnimation(.easeInOut(duration: 0.2)) {
                viewModel.isToolbarActive.toggle()
                if !viewModel.isToolbarActive {
                    isMapFocused = true
                }
            }
        }
        .onKeyPress(.return) {
            if !viewModel.isToolbarActive {
                viewModel.selectNextAircraft(adsbService: adsbService)
                return .handled
            }
            return .ignored
        }
        .onKeyPress(.space) {
            // Spacebar shortcut toggles Toolbar
            withAnimation(.easeInOut(duration: 0.2)) {
                viewModel.isToolbarActive.toggle()
                if !viewModel.isToolbarActive {
                    isMapFocused = true
                }
            }
            return .handled
        }
        .preferredColorScheme(.dark)
    }
}
