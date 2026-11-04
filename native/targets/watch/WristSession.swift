import Foundation
import WatchConnectivity

/// Phone ↔ watch bridge. Protocol mirrors `shared/wrist` (setpoint-wrist).
final class WristSession: NSObject, ObservableObject, WCSessionDelegate {
  static let shared = WristSession()

  @Published var active = false
  @Published var labelA = "Side A"
  @Published var labelB = "Side B"
  @Published var pointsA = "—"
  @Published var pointsB = "—"
  @Published var sets = ""
  @Published var serving = ""
  @Published var paused = false
  @Published var overlay = false
  @Published var complete = false
  @Published var canUndo = false
  @Published var status = "Open a live match on iPhone"

  private override init() {
    super.init()
  }

  func activate() {
    guard WCSession.isSupported() else {
      status = "WatchConnectivity unavailable"
      return
    }
    let session = WCSession.default
    session.delegate = self
    session.activate()
  }

  func send(action: String, side: String? = nil) {
    var payload: [String: Any] = [
      "protocol": "setpoint-wrist",
      "version": 1,
      "kind": "command",
      "action": action,
      "at": Int(Date().timeIntervalSince1970 * 1000),
    ]
    if let side {
      payload["side"] = side
    }
    guard WCSession.default.isReachable else {
      status = "iPhone not reachable — keep SetPoint open"
      return
    }
    WCSession.default.sendMessage(payload, replyHandler: nil) { error in
      DispatchQueue.main.async {
        self.status = error.localizedDescription
      }
    }
  }

  private func applyBoard(_ message: [String: Any]) {
    guard message["protocol"] as? String == "setpoint-wrist",
          message["kind"] as? String == "board" else { return }
    DispatchQueue.main.async {
      self.active = (message["active"] as? Bool) ?? false
      self.labelA = (message["labelA"] as? String) ?? "Side A"
      self.labelB = (message["labelB"] as? String) ?? "Side B"
      self.pointsA = (message["pointsA"] as? String) ?? "—"
      self.pointsB = (message["pointsB"] as? String) ?? "—"
      self.sets = (message["sets"] as? String) ?? ""
      self.serving = (message["serving"] as? String) ?? ""
      self.paused = (message["paused"] as? Bool) ?? false
      self.overlay = (message["overlay"] as? Bool) ?? false
      self.complete = (message["complete"] as? Bool) ?? false
      self.canUndo = (message["canUndo"] as? Bool) ?? false
      if !self.active {
        self.status = "Open a live match on iPhone"
      } else if self.complete {
        self.status = "Match complete"
      } else if self.paused {
        self.status = "Paused"
      } else if self.overlay {
        self.status = "Timer — Skip or wait"
      } else {
        self.status = "Tap a side to award the point"
      }
    }
  }

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    if let error {
      DispatchQueue.main.async { self.status = error.localizedDescription }
    }
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    applyBoard(message)
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    applyBoard(applicationContext)
  }

  #if os(iOS)
  func sessionDidBecomeInactive(_ session: WCSession) {}
  func sessionDidDeactivate(_ session: WCSession) {
    session.activate()
  }
  #endif
}
