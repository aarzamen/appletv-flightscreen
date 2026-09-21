import SwiftUI

public struct RadarSweepOverlay: View {
    public let radiusNm: Double
    
    public init(radiusNm: Double = 60.0) {
        self.radiusNm = radiusNm
    }
    
    public var body: some View {
        ZStack {
            // Layer 1: Static Concentric Rings, Crosshairs & Range Text Labels (No per-frame re-render)
            StaticRadarGrid(radiusNm: radiusNm)
            
            // Layer 2: 60/120 FPS Rotating Sweep Beam (Minimal math, zero Text allocations)
            AnimatedSweepBeam()
        }
        .allowsHitTesting(false)
    }
}

private struct StaticRadarGrid: View {
    let radiusNm: Double
    
    var body: some View {
        Canvas { context, size in
            let center = CGPoint(x: size.width / 2.0, y: size.height / 2.0)
            let maxR = min(size.width, size.height) * 0.44
            guard maxR > 20 else { return }
            
            // 1. Draw 4 Concentric Distance Range Rings
            for ring in 1...4 {
                let r = (maxR / 4.0) * Double(ring)
                let strokeColor = (ring == 4) ? Color(red: 0.22, green: 0.74, blue: 0.97).opacity(0.45) : Color(red: 0.15, green: 0.22, blue: 0.32).opacity(0.65)
                
                var ringPath = Path()
                ringPath.addArc(center: center, radius: r, startAngle: .degrees(0), endAngle: .degrees(360), clockwise: false)
                context.stroke(ringPath, with: .color(strokeColor), lineWidth: 1)
                
                // Range Label Text
                let ringNm = Int(round((radiusNm / 4.0) * Double(ring)))
                let text = Text("\(ringNm) NM")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(Color(red: 0.58, green: 0.64, blue: 0.72).opacity(0.85))
                
                context.draw(context.resolve(text), at: CGPoint(x: center.x + 28, y: center.y - r + 8))
            }
            
            // 2. Crosshairs
            var crossPath = Path()
            crossPath.move(to: CGPoint(x: center.x, y: center.y - maxR))
            crossPath.addLine(to: CGPoint(x: center.x, y: center.y + maxR))
            crossPath.move(to: CGPoint(x: center.x - maxR, y: center.y))
            crossPath.addLine(to: CGPoint(x: center.x + maxR, y: center.y))
            context.stroke(crossPath, with: .color(Color(red: 0.2, green: 0.25, blue: 0.35).opacity(0.35)), lineWidth: 1)
            
            // 3. Center Station Point
            var stationDot = Path()
            stationDot.addArc(center: center, radius: 6, startAngle: .degrees(0), endAngle: .degrees(360), clockwise: false)
            context.fill(stationDot, with: .color(Color(red: 0.0, green: 0.9, blue: 0.46)))
            context.stroke(stationDot, with: .color(.white), lineWidth: 1.5)
        }
    }
}

private struct AnimatedSweepBeam: View {
    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let center = CGPoint(x: size.width / 2.0, y: size.height / 2.0)
                let maxR = min(size.width, size.height) * 0.44
                guard maxR > 20 else { return }
                
                let time = timeline.date.timeIntervalSinceReferenceDate
                let sweepAngle = (time * 1.4).truncatingRemainder(dividingBy: .pi * 2)
                let sweepLength: Double = 0.26 // radians
                
                var sweepPath = Path()
                sweepPath.move(to: center)
                sweepPath.addArc(
                    center: center,
                    radius: maxR,
                    startAngle: .radians(sweepAngle - sweepLength),
                    endAngle: .radians(sweepAngle),
                    clockwise: false
                )
                sweepPath.closeSubpath()
                
                let gradient = Gradient(colors: [
                    Color(red: 0.0, green: 0.9, blue: 0.46).opacity(0.22),
                    Color(red: 0.0, green: 0.9, blue: 0.46).opacity(0.0)
                ])
                context.fill(
                    sweepPath,
                    with: .radialGradient(gradient, center: center, startRadius: 0, endRadius: maxR)
                )
                
                // Leading Beam Line
                var beamPath = Path()
                beamPath.move(to: center)
                let beamX = center.x + CGFloat(cos(sweepAngle)) * maxR
                let beamY = center.y + CGFloat(sin(sweepAngle)) * maxR
                beamPath.addLine(to: CGPoint(x: beamX, y: beamY))
                context.stroke(beamPath, with: .color(Color(red: 0.0, green: 0.9, blue: 0.46)), lineWidth: 2)
            }
        }
    }
}
