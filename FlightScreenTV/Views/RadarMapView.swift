import SwiftUI
import MapKit

public struct RadarMapView: View {
    public let station: Station
    public let aircraft: [Aircraft]
    public let selectedAircraft: Aircraft?
    public let isSatellite: Bool
    public let onSelectAircraft: (Aircraft) -> Void
    
    @Binding public var cameraPosition: MapCameraPosition
    
    public init(
        station: Station,
        aircraft: [Aircraft],
        selectedAircraft: Aircraft?,
        isSatellite: Bool,
        cameraPosition: Binding<MapCameraPosition>,
        onSelectAircraft: @escaping (Aircraft) -> Void
    ) {
        self.station = station
        self.aircraft = aircraft
        self.selectedAircraft = selectedAircraft
        self.isSatellite = isSatellite
        self._cameraPosition = cameraPosition
        self.onSelectAircraft = onSelectAircraft
    }
    
    public var body: some View {
        ZStack {
            Map(position: $cameraPosition) {
                // Aircraft Live Pins
                ForEach(aircraft) { ac in
                    Annotation(ac.callsign, coordinate: ac.coordinate) {
                        AircraftMarkerView(
                            aircraft: ac,
                            isSelected: ac.hex == selectedAircraft?.hex,
                            onTap: { onSelectAircraft(ac) }
                        )
                    }
                }
            }
            .mapStyle(isSatellite ? .imagery(elevation: .realistic) : .standard(elevation: .flat, pointsOfInterest: .excludingAll, showsTraffic: false))
            .preferredColorScheme(.dark)
            
            // Concentric Range Rings & 60 FPS Sweep Beam Overlay
            RadarSweepOverlay(radiusNm: 60)
        }
    }
}
