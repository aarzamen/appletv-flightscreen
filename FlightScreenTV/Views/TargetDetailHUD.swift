import SwiftUI

public struct TargetDetailHUD: View {
    public let aircraft: Aircraft
    
    public init(aircraft: Aircraft) {
        self.aircraft = aircraft
    }
    
    public var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(aircraft.callsign)
                    .font(.system(size: 26, weight: .black, design: .monospaced))
                    .foregroundColor(Color(red: 0.0, green: 0.9, blue: 1.0))
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text(aircraft.hex)
                        .font(.system(size: 12, weight: .bold, design: .monospaced))
                        .foregroundColor(Color(red: 0.7, green: 0.8, blue: 0.9))
                    if aircraft.registration != "—" && aircraft.registration != aircraft.callsign {
                        Text(aircraft.registration)
                            .font(.system(size: 11, weight: .semibold, design: .monospaced))
                            .foregroundColor(Color(red: 0.5, green: 0.6, blue: 0.7))
                    }
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.white.opacity(0.08))
                .cornerRadius(6)
            }
            
            Text(aircraft.type)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Color(red: 0.6, green: 0.7, blue: 0.8))
            
            Divider()
                .background(Color(red: 0.2, green: 0.3, blue: 0.4))
            
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
                MetricCell(label: "ALTITUDE", value: aircraft.altitudeFormatted)
                MetricCell(
                    label: "V. SPEED",
                    value: aircraft.verticalSpeedFormatted,
                    valueColor: aircraft.verticalSpeed > 150 ? Color(red: 0.0, green: 0.9, blue: 0.46) : (aircraft.verticalSpeed < -150 ? Color(red: 1.0, green: 0.7, blue: 0.2) : .white)
                )
                MetricCell(label: "GROUND SPEED", value: "\(Int(aircraft.groundSpeed)) kt")
                MetricCell(label: "HEADING", value: "\(Int(aircraft.track))°")
                MetricCell(label: "DISTANCE", value: aircraft.distanceFormatted, valueColor: Color(red: 0.22, green: 0.74, blue: 0.97))
                MetricCell(
                    label: "SQUAWK",
                    value: aircraft.squawk,
                    valueColor: aircraft.isEmergency ? Color(red: 1.0, green: 0.25, blue: 0.25) : .white
                )
            }
        }
        .padding(22)
        .frame(width: 340)
        .background(.ultraThinMaterial)
        .background(Color(red: 0.04, green: 0.07, blue: 0.14).opacity(0.88))
        .cornerRadius(18)
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(aircraft.isEmergency ? Color(red: 1.0, green: 0.25, blue: 0.25) : Color(red: 0.0, green: 0.9, blue: 1.0), lineWidth: 1.5)
        )
        .shadow(color: aircraft.isEmergency ? Color(red: 1.0, green: 0.25, blue: 0.25).opacity(0.4) : Color(red: 0.0, green: 0.9, blue: 1.0).opacity(0.35), radius: 25, x: 0, y: 8)
    }
}

private struct MetricCell: View {
    let label: String
    let value: String
    var valueColor: Color = .white
    
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(Color(red: 0.45, green: 0.52, blue: 0.62))
                .tracking(0.5)
            Text(value)
                .font(.system(size: 14, weight: .heavy, design: .monospaced))
                .foregroundColor(valueColor)
        }
    }
}
