import Foundation
import GameController
import Combine

@MainActor
public final class SiriRemoteManager: ObservableObject {
    public static let shared = SiriRemoteManager()
    
    public var onPanDelta: ((Double, Double) -> Void)?
    
    private var cancellables = Set<AnyCancellable>()
    
    private init() {
        setupObserver()
        pollControllers()
    }
    
    private func setupObserver() {
        NotificationCenter.default.publisher(for: .GCControllerDidConnect)
            .sink { [weak self] notif in
                if let controller = notif.object as? GCController {
                    self?.configureController(controller)
                }
            }
            .store(in: &cancellables)
    }
    
    private func pollControllers() {
        for controller in GCController.controllers() {
            configureController(controller)
        }
    }
    
    private func configureController(_ controller: GCController) {
        if let micro = controller.microGamepad {
            micro.reportsAbsoluteDpadValues = false
            micro.dpad.valueChangedHandler = { [weak self] (_, x, y) in
                guard abs(x) > 0.04 || abs(y) > 0.04 else { return }
                DispatchQueue.main.async {
                    self?.onPanDelta?(Double(x), Double(y))
                }
            }
        }
    }
}
