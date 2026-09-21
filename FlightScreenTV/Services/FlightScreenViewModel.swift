import SwiftUI
import MapKit
import Combine

@MainActor
public final class FlightScreenViewModel: ObservableObject {
    @Published public var stationIndex: Int = 0
    @Published public var isSatellite: Bool = false
    @Published public var isToolbarActive: Bool = false
    @Published public var currentZoomDistance: Double = 120_000
    @Published public var currentCenter: CLLocationCoordinate2D = Station.presets[0].coordinate
    @Published public var cameraPosition: MapCameraPosition = .camera(
        MapCamera(
            centerCoordinate: Station.presets[0].coordinate,
            distance: 120_000,
            heading: 0,
            pitch: 0
        )
    )
    
    // Smooth 60/120 FPS Panning Accumulator for Siri Remote Touchpad
    private var panAccumulatorX: Double = 0
    private var panAccumulatorY: Double = 0
    private var isPanFlushScheduled: Bool = false
    
    public var currentStation: Station {
        Station.presets[stationIndex]
    }
    
    public var calculatedRangeNm: Int {
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
    
    public init() {}
    
    public func updateCameraPosition() {
        cameraPosition = .camera(
            MapCamera(
                centerCoordinate: currentCenter,
                distance: currentZoomDistance,
                heading: 0,
                pitch: 0
            )
        )
    }
    
    /// Throttled continuous pan handler for Siri Remote analog touch surface
    public func handleContinuousPan(dx: Double, dy: Double) {
        guard !isToolbarActive else { return }
        panAccumulatorX += dx
        panAccumulatorY += dy
        
        if !isPanFlushScheduled {
            isPanFlushScheduled = true
            // Flush accumulated movement at display frame interval (~16ms) to eliminate MapKit thrashing
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.016) { [weak self] in
                guard let self = self else { return }
                self.flushContinuousPan()
                self.isPanFlushScheduled = false
            }
        }
    }
    
    private func flushContinuousPan() {
        guard abs(panAccumulatorX) > 0.001 || abs(panAccumulatorY) > 0.001 else {
            panAccumulatorX = 0
            panAccumulatorY = 0
            return
        }
        
        let scale = (currentZoomDistance / 111_000.0) * 0.035
        let latRad = currentCenter.latitude * .pi / 180.0
        let cosLat = max(0.15, cos(latRad))
        
        currentCenter.longitude += (panAccumulatorX * scale / cosLat)
        currentCenter.latitude += (panAccumulatorY * scale)
        
        panAccumulatorX = 0
        panAccumulatorY = 0
        
        updateCameraPosition()
    }
    
    /// Step pan handler for remote D-pad directional clicks
    public func handleDirectionalPan(_ direction: MoveCommandDirection) {
        let stepLat = panStepLat
        let stepLon = panStepLon
        withAnimation(.easeOut(duration: 0.16)) {
            switch direction {
            case .up:
                currentCenter.latitude += stepLat
            case .down:
                currentCenter.latitude -= stepLat
            case .left:
                currentCenter.longitude -= stepLon
            case .right:
                currentCenter.longitude += stepLon
            @unknown default:
                break
            }
            updateCameraPosition()
        }
    }
    
    public func zoomIn() {
        zoom(by: 0.7)
    }
    
    public func zoomOut() {
        zoom(by: 1.4)
    }
    
    private func zoom(by factor: Double) {
        currentZoomDistance = max(15_000, min(600_000, currentZoomDistance * factor))
        withAnimation(.easeInOut(duration: 0.35)) {
            updateCameraPosition()
        }
    }
    
    public func snapToCenter(selectedAircraft: Aircraft?) {
        if let target = selectedAircraft {
            // If already centered on target, toggle back to station
            let isAlreadyOnTarget = abs(currentCenter.latitude - target.coordinate.latitude) < 0.001
                && abs(currentCenter.longitude - target.coordinate.longitude) < 0.001
            if isAlreadyOnTarget {
                currentCenter = currentStation.coordinate
            } else {
                currentCenter = target.coordinate
            }
        } else {
            currentCenter = currentStation.coordinate
        }
        withAnimation(.easeInOut(duration: 0.6)) {
            updateCameraPosition()
        }
    }
    
    public func cycleStation(adsbService: AdsbService) {
        stationIndex = (stationIndex + 1) % Station.presets.count
        let nextStation = currentStation
        currentCenter = nextStation.coordinate
        adsbService.updateStation(nextStation)
        withAnimation(.easeInOut(duration: 0.8)) {
            updateCameraPosition()
        }
    }
    
    public func toggleMapStyle() {
        withAnimation(.easeInOut(duration: 0.25)) {
            isSatellite.toggle()
        }
    }
    
    public func selectNextAircraft(adsbService: AdsbService) {
        withAnimation(.spring(response: 0.38, dampingFraction: 0.82)) {
            adsbService.selectNext()
        }
        
        if let target = adsbService.selectedAircraft {
            let rangeDeg = (currentZoomDistance / 111_000.0) * 0.42
            let dLat = abs(target.coordinate.latitude - currentCenter.latitude)
            let dLon = abs(target.coordinate.longitude - currentCenter.longitude)
            
            // If the target is outside or near the boundary of the visible screen, smoothly glide to frame it
            if dLat > rangeDeg || dLon > rangeDeg {
                withAnimation(.easeInOut(duration: 0.5)) {
                    currentCenter = target.coordinate
                    updateCameraPosition()
                }
            }
        }
    }
}
