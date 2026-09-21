import Foundation
import CoreLocation

public struct Station: Identifiable, Equatable, Hashable {
    public let id: String
    public let name: String
    public let coordinate: CLLocationCoordinate2D
    public let defaultZoomDistance: Double // meters
    
    public init(id: String, name: String, latitude: Double, longitude: Double, defaultZoomDistance: Double = 120_000) {
        self.id = id
        self.name = name
        self.coordinate = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
        self.defaultZoomDistance = defaultZoomDistance
    }
    
    public static func == (lhs: Station, rhs: Station) -> Bool {
        lhs.id == rhs.id
    }
    
    public func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
    
    public static let presets: [Station] = [
        Station(id: "lax", name: "VENTURA / LAX BASIN", latitude: 34.2800, longitude: -119.2900),
        Station(id: "sfo", name: "SAN FRANCISCO BAY", latitude: 37.6213, longitude: -122.3790),
        Station(id: "sea", name: "SEATTLE / TACOMA", latitude: 47.4502, longitude: -122.3088),
        Station(id: "jfk", name: "NEW YORK / JFK", latitude: 40.6413, longitude: -73.7781),
        Station(id: "ord", name: "CHICAGO O'HARE", latitude: 41.9742, longitude: -87.9073),
        Station(id: "den", name: "DENVER METRO", latitude: 39.8561, longitude: -104.6737)
    ]
}
