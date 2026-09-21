import SwiftUI

public struct AircraftMarkerView: View {
    public let aircraft: Aircraft
    public let isSelected: Bool
    public let onTap: () -> Void
    
    public init(aircraft: Aircraft, isSelected: Bool, onTap: @escaping () -> Void) {
        self.aircraft = aircraft
        self.isSelected = isSelected
        self.onTap = onTap
    }
    
    public var body: some View {
        Button(action: onTap) {
            VStack(spacing: 2) {
                ZStack {
                    if isSelected {
                        Circle()
                            .fill(Color(red: 0.0, green: 0.9, blue: 0.46).opacity(0.35))
                            .frame(width: 48, height: 48)
                    }
                    
                    Image(systemName: "airplane")
                        .font(.system(size: isSelected ? 26 : 20, weight: .bold))
                        .foregroundColor(iconColor)
                        .rotationEffect(.degrees(aircraft.track - 90))
                        .shadow(color: isSelected ? Color(red: 0.0, green: 0.9, blue: 0.46) : Color.black.opacity(0.8), radius: isSelected ? 8 : 3)
                }
                
                // Label Badge
                Text("\(aircraft.callsign) \(aircraft.flightLevelString)")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundColor(isSelected ? Color(red: 0.0, green: 0.9, blue: 0.46) : (aircraft.isEmergency ? Color(red: 1.0, green: 0.2, blue: 0.2) : Color(red: 0.9, green: 0.95, blue: 1.0)))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color(red: 0.04, green: 0.06, blue: 0.10).opacity(0.92))
                    .cornerRadius(4)
                    .overlay(
                        RoundedRectangle(cornerRadius: 4)
                            .stroke(isSelected ? Color(red: 0.0, green: 0.9, blue: 0.46) : (aircraft.isEmergency ? Color(red: 1.0, green: 0.2, blue: 0.2) : Color(red: 0.25, green: 0.32, blue: 0.42)), lineWidth: isSelected ? 1.5 : 1)
                    )
            }
        }
        .buttonStyle(.plain)
        .focusable(false)
    }
    
    private var iconColor: Color {
        if aircraft.isEmergency {
            return Color(red: 1.0, green: 0.25, blue: 0.25)
        } else if isSelected {
            return Color(red: 0.0, green: 0.9, blue: 0.46)
        } else if aircraft.isHigh {
            return Color(red: 0.38, green: 0.65, blue: 0.98)
        } else if aircraft.isLow {
            return Color(red: 0.0, green: 0.9, blue: 1.0)
        } else {
            return Color(red: 0.22, green: 0.74, blue: 0.97)
        }
    }
}
