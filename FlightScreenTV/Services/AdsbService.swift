import Foundation
import Combine

@MainActor
public final class AdsbService: ObservableObject {
    @Published public var aircraft: [Aircraft] = []
    @Published public var selectedAircraft: Aircraft? = nil
    @Published public var isFetching: Bool = false
    @Published public var lastFetchSuccess: Bool = true
    @Published public var statusMessage: String = "LIVE ADS-B"
    
    private var timer: AnyCancellable?
    private var currentStation: Station
    private var radiusNm: Double
    
    public init(initialStation: Station = Station.presets[0], radiusNm: Double = 60.0) {
        self.currentStation = initialStation
        self.radiusNm = radiusNm
        startPolling()
    }
    
    public func updateStation(_ station: Station) {
        self.currentStation = station
        self.selectedAircraft = nil
        Task {
            await fetch()
        }
    }
    
    public func selectNext() {
        guard !aircraft.isEmpty else { return }
        if let current = selectedAircraft, let idx = aircraft.firstIndex(where: { $0.hex == current.hex }) {
            let nextIdx = (idx + 1) % aircraft.count
            selectedAircraft = aircraft[nextIdx]
        } else {
            selectedAircraft = aircraft.first
        }
    }
    
    public func deselect() {
        selectedAircraft = nil
    }
    
    public func startPolling() {
        timer?.cancel()
        Task {
            await fetch()
        }
        timer = Timer.publish(every: 15.0, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                guard let self = self else { return }
                Task {
                    await self.fetch()
                }
            }
    }
    
    public func stopPolling() {
        timer?.cancel()
        timer = nil
    }
    
    public func fetch() async {
        isFetching = true
        let urlString = "https://api.adsb.lol/v2/lat/\(currentStation.coordinate.latitude)/lon/\(currentStation.coordinate.longitude)/dist/\(Int(radiusNm))"
        guard let url = URL(string: urlString) else {
            isFetching = false
            return
        }
        
        var request = URLRequest(url: url)
        request.timeoutInterval = 10.0
        request.setValue("FlightScreenTV-tvOS/1.0", forHTTPHeaderField: "User-Agent")
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
                self.lastFetchSuccess = false
                self.statusMessage = "RETRYING..."
                self.isFetching = false
                return
            }
            
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let acList = json["ac"] as? [[String: Any]] {
                let parsed: [Aircraft] = acList.compactMap { dict in
                    guard let lat = (dict["lat"] as? NSNumber)?.doubleValue,
                          let lon = (dict["lon"] as? NSNumber)?.doubleValue else {
                        return nil
                    }
                    let hex = (dict["hex"] as? String) ?? ""
                    let callsign = (dict["flight"] as? String) ?? (dict["r"] as? String) ?? hex
                    let reg = (dict["r"] as? String) ?? ""
                    let type = (dict["t"] as? String) ?? "AIRCRAFT"
                    let altBaro = dict["alt_baro"]
                    var alt = 0
                    if let altNum = altBaro as? NSNumber {
                        alt = altNum.intValue
                    } else if let altStr = altBaro as? String, altStr != "ground" {
                        alt = Int(altStr) ?? 0
                    }
                    let gs = (dict["gs"] as? NSNumber)?.doubleValue ?? 0.0
                    let track = (dict["track"] as? NSNumber)?.doubleValue ?? 0.0
                    let baroRate = (dict["baro_rate"] as? NSNumber)?.intValue ?? 0
                    let squawk = (dict["squawk"] as? String) ?? "—"
                    let dst = (dict["dst"] as? NSNumber)?.doubleValue
                    
                    return Aircraft(
                        hex: hex,
                        callsign: callsign,
                        registration: reg,
                        type: type,
                        latitude: lat,
                        longitude: lon,
                        altitude: alt,
                        groundSpeed: gs,
                        track: track,
                        verticalSpeed: baroRate,
                        squawk: squawk,
                        distanceNm: dst
                    )
                }
                .sorted { ($0.distanceNm ?? 999.0) < ($1.distanceNm ?? 999.0) }
                
                self.aircraft = parsed
                self.lastFetchSuccess = true
                self.statusMessage = "LIVE ADS-B"
                
                // Refresh targeted aircraft if still in feed
                if let selected = self.selectedAircraft {
                    self.selectedAircraft = parsed.first(where: { $0.hex == selected.hex })
                }
            }
        } catch {
            self.lastFetchSuccess = false
            self.statusMessage = "RETRYING..."
        }
        isFetching = false
    }
}
