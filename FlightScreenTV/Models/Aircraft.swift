import Foundation
import CoreLocation

public struct Aircraft: Identifiable, Equatable {
    public let id: String // hex
    public let hex: String
    public let callsign: String
    public let registration: String
    public let type: String
    public let coordinate: CLLocationCoordinate2D
    public let altitude: Int // feet
    public let groundSpeed: Double // knots
    public let track: Double // degrees
    public let verticalSpeed: Int // ft/min
    public let squawk: String
    public let distanceNm: Double?
    
    public init(
        hex: String,
        callsign: String,
        registration: String = "",
        type: String,
        latitude: Double,
        longitude: Double,
        altitude: Int,
        groundSpeed: Double,
        track: Double,
        verticalSpeed: Int = 0,
        squawk: String,
        distanceNm: Double? = nil
    ) {
        self.id = hex.uppercased()
        self.hex = hex.uppercased()
        self.callsign = callsign.isEmpty ? "UNKNOWN" : callsign.trimmingCharacters(in: .whitespacesAndNewlines)
        self.registration = registration.isEmpty ? "—" : registration.trimmingCharacters(in: .whitespacesAndNewlines)
        self.type = type.isEmpty ? "AIRCRAFT" : type
        self.coordinate = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
        self.altitude = altitude
        self.groundSpeed = groundSpeed
        self.track = track
        self.verticalSpeed = verticalSpeed
        self.squawk = squawk
        self.distanceNm = distanceNm
    }
    
    public static func == (lhs: Aircraft, rhs: Aircraft) -> Bool {
        lhs.hex == rhs.hex
    }
    
    public var isHigh: Bool { altitude > 25_000 }
    public var isLow: Bool { altitude > 0 && altitude < 10_000 }
    public var isGround: Bool { altitude == 0 }
    
    public var isEmergency: Bool {
        squawk == "7500" || squawk == "7600" || squawk == "7700"
    }
    
    public var flightLevelString: String {
        if isGround { return "GND" }
        let fl = Int((Double(altitude) / 100.0).rounded())
        return "FL\(fl)"
    }
    
    public var altitudeFormatted: String {
        if isGround { return "GROUND (0 ft)" }
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        let ftStr = formatter.string(from: NSNumber(value: altitude)) ?? "\(altitude)"
        return "\(flightLevelString) (\(ftStr) ft)"
    }
    
    public var verticalSpeedFormatted: String {
        if isGround { return "GROUND" }
        if verticalSpeed > 150 {
            return "↑ +\(verticalSpeed) fpm"
        } else if verticalSpeed < -150 {
            return "↓ \(verticalSpeed) fpm"
        } else {
            return "LEVEL (0 fpm)"
        }
    }
    
    public var distanceFormatted: String {
        guard let dst = distanceNm else { return "—" }
        return String(format: "%.1f NM", dst)
    }
}
