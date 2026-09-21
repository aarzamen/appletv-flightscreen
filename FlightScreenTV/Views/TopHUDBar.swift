import SwiftUI

public struct TopHUDBar: View {
    public let stationName: String
    public let liveTracksCount: Int
    public let rangeNm: Int
    public let isSatellite: Bool
    public let feedStatus: String
    
    @State private var isPulsing: Bool = false
    
    public init(
        stationName: String,
        liveTracksCount: Int,
        rangeNm: Int = 60,
        isSatellite: Bool,
        feedStatus: String
    ) {
        self.stationName = stationName
        self.liveTracksCount = liveTracksCount
        self.rangeNm = rangeNm
        self.isSatellite = isSatellite
        self.feedStatus = feedStatus
    }
    
    public var body: some View {
        HStack(alignment: .center) {
            // Brand & Station Pill
            HStack(spacing: 12) {
                Circle()
                    .fill(Color(red: 0.0, green: 0.9, blue: 0.46))
                    .frame(width: 12, height: 12)
                    .scaleEffect(isPulsing ? 1.15 : 0.85)
                    .opacity(isPulsing ? 1.0 : 0.5)
                    .animation(Animation.easeInOut(duration: 1.2).repeatForever(autoreverses: true), value: isPulsing)
                    .onAppear { isPulsing = true }
                
                Text("FLIGHTSCREEN TV")
                    .font(.system(size: 20, weight: .black, design: .rounded))
                    .foregroundColor(.white)
                    .tracking(1.0)
                
                Text(stationName)
                    .font(.system(size: 14, weight: .bold, design: .monospaced))
                    .foregroundColor(Color(red: 0.22, green: 0.74, blue: 0.97))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color(red: 0.12, green: 0.16, blue: 0.24).opacity(0.85))
                    .cornerRadius(8)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color(red: 0.22, green: 0.74, blue: 0.97).opacity(0.3), lineWidth: 1)
                    )
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 12)
            .background(Color(red: 0.04, green: 0.06, blue: 0.10).opacity(0.88))
            .cornerRadius(14)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(Color(red: 0.2, green: 0.25, blue: 0.35).opacity(0.8), lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.5), radius: 10, x: 0, y: 4)
            
            Spacer()
            
            // Cockpit Telemetry Stats Card
            HStack(spacing: 24) {
                StatItem(label: "LIVE TRACKS", value: "\(liveTracksCount)", valueColor: Color(red: 0.0, green: 0.9, blue: 1.0))
                StatItem(label: "RANGE", value: "\(rangeNm) NM", valueColor: Color(red: 0.22, green: 0.74, blue: 0.97))
                StatItem(
                    label: "BASE MAP",
                    value: isSatellite ? "SATELLITE" : "DARK MAP",
                    valueColor: isSatellite ? Color(red: 0.96, green: 0.62, blue: 0.04) : Color(red: 0.22, green: 0.74, blue: 0.97)
                )
                StatItem(
                    label: "FEED",
                    value: feedStatus,
                    valueColor: feedStatus == "LIVE ADS-B" ? Color(red: 0.0, green: 0.9, blue: 0.46) : Color(red: 1.0, green: 0.7, blue: 0.0)
                )
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .background(Color(red: 0.04, green: 0.06, blue: 0.10).opacity(0.88))
            .cornerRadius(14)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(Color(red: 0.2, green: 0.25, blue: 0.35).opacity(0.8), lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.5), radius: 10, x: 0, y: 4)
        }
        .padding(.horizontal, 48)
        .padding(.top, 32)
    }
}

private struct StatItem: View {
    let label: String
    let value: String
    let valueColor: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(Color(red: 0.45, green: 0.52, blue: 0.62))
                .tracking(0.5)
            Text(value)
                .font(.system(size: 18, weight: .heavy, design: .monospaced))
                .foregroundColor(valueColor)
        }
    }
}
