import SwiftUI
import MapKit

public struct RadarMapView: View {
    public let station: Station
    public let aircraft: [Aircraft]
    public let selectedAircraft: Aircraft?
    public let isSatellite: Bool
    public let rangeNm: Double
    public let onSelectAircraft: (Aircraft) -> Void
    
    @Binding public var cameraPosition: MapCameraPosition
    
    public init(
        station: Station,
        aircraft: [Aircraft],
        selectedAircraft: Aircraft?,
        isSatellite: Bool,
        rangeNm: Double = 60.0,
        cameraPosition: Binding<MapCameraPosition>,
        onSelectAircraft: @escaping (Aircraft) -> Void
    ) {
        self.station = station
        self.aircraft = aircraft
        self.selectedAircraft = selectedAircraft
        self.isSatellite = isSatellite
        self.rangeNm = rangeNm
        self._cameraPosition = cameraPosition
        self.onSelectAircraft = onSelectAircraft
    }
    
    public var body: some View {
        ZStack {
            Map(position: $cameraPosition) {
                // Aircraft Live Pins with custom badge only (no duplicate title)
                ForEach(aircraft) { ac in
                    Annotation("", coordinate: ac.coordinate) {
                        AircraftMarkerView(
                            aircraft: ac,
                            isSelected: ac.hex == selectedAircraft?.hex,
                            onTap: { onSelectAircraft(ac) }
                        )
                    }
                }
            }
            .mapStyle(isSatellite ? .hybrid(elevation: .realistic, pointsOfInterest: .excludingAll, showsTraffic: false) : .standard(elevation: .flat, pointsOfInterest: .excludingAll, showsTraffic: false))
            .mapControlVisibility(.hidden)
            .preferredColorScheme(.dark)
            
            // Concentric Range Rings & 60 FPS Sweep Beam Overlay
            RadarSweepOverlay(radiusNm: rangeNm)
        }
    }
}
