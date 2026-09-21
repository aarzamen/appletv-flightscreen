import SwiftUI

public struct ToolbarControlsView: View {
    public let isToolbarActive: Bool
    public let isSatellite: Bool
    public let onZoomIn: () -> Void
    public let onZoomOut: () -> Void
    public let onCenter: () -> Void
    public let onToggleMapStyle: () -> Void
    public let onCycleStation: () -> Void
    public let onExitToolbar: () -> Void
    
    @FocusState private var focusedButton: ToolbarButton?
    
    public enum ToolbarButton: Hashable {
        case zoomIn
        case zoomOut
        case center
        case mapToggle
        case station
    }
    
    public init(
        isToolbarActive: Bool,
        isSatellite: Bool,
        onZoomIn: @escaping () -> Void,
        onZoomOut: @escaping () -> Void,
        onCenter: @escaping () -> Void,
        onToggleMapStyle: @escaping () -> Void,
        onCycleStation: @escaping () -> Void,
        onExitToolbar: @escaping () -> Void = {}
    ) {
        self.isToolbarActive = isToolbarActive
        self.isSatellite = isSatellite
        self.onZoomIn = onZoomIn
        self.onZoomOut = onZoomOut
        self.onCenter = onCenter
        self.onToggleMapStyle = onToggleMapStyle
        self.onCycleStation = onCycleStation
        self.onExitToolbar = onExitToolbar
    }
    
    public var body: some View {
        HStack(alignment: .bottom) {
            // Instructions Pill
            HStack(spacing: 16) {
                if isToolbarActive {
                    Text("● MENU ACTIVE")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(Color(red: 0.0, green: 0.9, blue: 0.46))
                    KeyBadgeItem(badge: "◀ ▶", action: "Navigate")
                    KeyBadgeItem(badge: "SELECT", action: "Choose")
                    KeyBadgeItem(badge: "BACK / ▲", action: "Map Mode")
                } else {
                    KeyBadgeItem(badge: "CLICKPAD", action: "Pan Map")
                    KeyBadgeItem(badge: "SELECT", action: "Target Plane")
                    KeyBadgeItem(badge: "HOLD SELECT", action: "Menu")
                    KeyBadgeItem(badge: "BACK", action: "Deselect")
                }
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 10)
            .background(.ultraThinMaterial)
            .background(Color(red: 0.04, green: 0.06, blue: 0.10).opacity(0.85))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isToolbarActive ? Color(red: 0.0, green: 0.9, blue: 0.46).opacity(0.6) : Color(red: 0.2, green: 0.25, blue: 0.35).opacity(0.8), lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.5), radius: 10, x: 0, y: 4)
            
            Spacer()
            
            // Buttons Row
            HStack(spacing: 10) {
                TVToolbarButton(
                    title: "+ Zoom",
                    isFocused: focusedButton == .zoomIn,
                    action: onZoomIn
                )
                .focused($focusedButton, equals: .zoomIn)
                .focusable(isToolbarActive)
                
                TVToolbarButton(
                    title: "− Zoom",
                    isFocused: focusedButton == .zoomOut,
                    action: onZoomOut
                )
                .focused($focusedButton, equals: .zoomOut)
                .focusable(isToolbarActive)
                
                TVToolbarButton(
                    title: "🎯 Center",
                    isFocused: focusedButton == .center,
                    action: onCenter
                )
                .focused($focusedButton, equals: .center)
                .focusable(isToolbarActive)
                
                TVToolbarButton(
                    title: isSatellite ? "🛰️ Satellite" : "🗺️ Dark Map",
                    isFocused: focusedButton == .mapToggle,
                    action: onToggleMapStyle
                )
                .focused($focusedButton, equals: .mapToggle)
                .focusable(isToolbarActive)
                
                TVToolbarButton(
                    title: "📍 Station",
                    isFocused: focusedButton == .station,
                    action: onCycleStation
                )
                .focused($focusedButton, equals: .station)
                .focusable(isToolbarActive)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(.ultraThinMaterial)
            .background(isToolbarActive ? Color(red: 0.06, green: 0.09, blue: 0.16).opacity(0.97) : Color(red: 0.04, green: 0.06, blue: 0.10).opacity(0.85))
            .cornerRadius(14)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(isToolbarActive ? Color(red: 0.0, green: 0.9, blue: 1.0) : Color(red: 0.2, green: 0.25, blue: 0.35).opacity(0.8), lineWidth: isToolbarActive ? 2 : 1)
            )
            .shadow(color: isToolbarActive ? Color(red: 0.0, green: 0.9, blue: 1.0).opacity(0.4) : Color.black.opacity(0.5), radius: isToolbarActive ? 25 : 10, x: 0, y: 4)
        }
        .padding(.horizontal, 48)
        .padding(.bottom, 32)
        .onMoveCommand { direction in
            if isToolbarActive && direction == .up {
                onExitToolbar()
            }
        }
        .onChange(of: isToolbarActive) { active in
            if active {
                focusedButton = .zoomIn
            } else {
                focusedButton = nil
            }
        }
    }
}

private struct KeyBadgeItem: View {
    let badge: String
    let action: String
    
    var body: some View {
        HStack(spacing: 6) {
            Text(badge)
                .font(.system(size: 11, weight: .bold, design: .monospaced))
                .foregroundColor(Color(red: 0.22, green: 0.74, blue: 0.97))
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(Color(red: 0.12, green: 0.16, blue: 0.24))
                .cornerRadius(4)
                .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color(red: 0.25, green: 0.32, blue: 0.42), lineWidth: 1))
            
            Text(action)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(Color(red: 0.8, green: 0.85, blue: 0.9))
        }
    }
}

private struct TVToolbarButton: View {
    let title: String
    let isFocused: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 13, weight: isFocused ? .heavy : .semibold))
                .foregroundColor(isFocused ? Color(red: 0.04, green: 0.06, blue: 0.10) : .white)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(isFocused ? Color(red: 0.0, green: 0.9, blue: 0.46) : Color(red: 0.12, green: 0.16, blue: 0.24))
                .cornerRadius(8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(isFocused ? Color.white : Color(red: 0.2, green: 0.25, blue: 0.35), lineWidth: 1)
                )
                .scaleEffect(isFocused ? 1.12 : 1.0)
                .shadow(color: isFocused ? Color(red: 0.0, green: 0.9, blue: 0.46).opacity(0.8) : Color.clear, radius: 14)
                .animation(.easeInOut(duration: 0.15), value: isFocused)
        }
        .buttonStyle(.plain)
    }
}
