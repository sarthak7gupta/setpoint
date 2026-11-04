import SwiftUI
import WatchConnectivity

@main
struct SetPointWatchApp: App {
  @StateObject private var session = WristSession.shared

  var body: some Scene {
    WindowGroup {
      ContentView()
        .environmentObject(session)
        .onAppear { session.activate() }
    }
  }
}
