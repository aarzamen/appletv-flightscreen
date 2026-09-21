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
                    .font(.system(size: 24, weight: .black, design: .monospaced))
                    .foregroundColor(Color(red: 0.0, green: 0.9, blue: 1.0))
                
                Spacer()
                
                Text(aircraft.hex)
                    .font(.system(size: 13, weight: .bold, design: .monospaced))
                    .foregroundColor(Color(red: 0.6, green: 0.7, blue: 0.8))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color.white.opacity(0.1))
                    .cornerRadius(5)
            }
            
            Text(aircraft.type)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(Color(red: 0.6, green: 0.7, blue: 0.8))
            
            Divider()
                .background(Color(red: 0.2, green: 0.3, blue: 0.4))
            
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                MetricCell(label: "ALTITUDE", value: aircraft.altitudeFormatted)
                MetricCell(label: "GROUND SPEED", value: "\(Int(aircraft.groundSpeed)) kt")
                MetricCell(label: "HEADING", value: "\(Int(aircraft.track))°")
                MetricCell(label: "SQUAWK", value: aircraft.squawk)
            }
        }
        .padding(20)
        .frame(width: 320)
        .background(Color(red: 0.06, green: 0.09, blue: 0.16).opacity(0.95))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color(red: 0.0, green: 0.9, blue: 1.0), lineWidth: 1.5)
        )
        .shadow(color: Color(red: 0.0, green: 0.9, blue: 1.0).opacity(0.3), radius: 20, x: 0, y: 6)
    }
}

private struct MetricCell: View {
    let label: String
    let value: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(Color(red: 0.45, green: 0.52, blue: 0.62))
            Text(value)
                .font(.system(size: 14, weight: .heavy, design: .monospaced))
                .foregroundColor(.white)
        }
    }
}
