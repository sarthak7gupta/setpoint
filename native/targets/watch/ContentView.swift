import SwiftUI

struct ContentView: View {
  @EnvironmentObject private var session: WristSession

  var body: some View {
    ScrollView {
      VStack(spacing: 8) {
        Text(session.sets.isEmpty ? "SetPoint" : session.sets)
          .font(.caption2)
          .foregroundStyle(.secondary)
          .multilineTextAlignment(.center)

        HStack(spacing: 6) {
          SideButton(
            label: session.labelA,
            points: session.pointsA,
            serving: session.serving == "a",
            enabled: session.active && !session.complete && !session.paused && !session.overlay
          ) {
            session.send(action: "point", side: "a")
          }
          SideButton(
            label: session.labelB,
            points: session.pointsB,
            serving: session.serving == "b",
            enabled: session.active && !session.complete && !session.paused && !session.overlay
          ) {
            session.send(action: "point", side: "b")
          }
        }

        Text(session.status)
          .font(.caption2)
          .foregroundStyle(.secondary)
          .multilineTextAlignment(.center)
          .padding(.top, 2)

        HStack(spacing: 6) {
          CompactButton(title: "Fault", tint: .orange) {
            session.send(action: "fault")
          }
          .disabled(!session.active || session.complete || session.paused || session.overlay)

          CompactButton(title: "Undo", tint: .gray) {
            session.send(action: "undo")
          }
          .disabled(!session.canUndo)

          if session.paused {
            CompactButton(title: "Resume", tint: .green) {
              session.send(action: "resume")
            }
          } else {
            CompactButton(title: "Pause", tint: .blue) {
              session.send(action: "pause")
            }
            .disabled(!session.active || session.complete)
          }
        }

        if session.overlay {
          Button("Skip timer") {
            session.send(action: "skip")
          }
          .buttonStyle(.bordered)
        }
      }
      .padding(.horizontal, 4)
    }
  }
}

private struct SideButton: View {
  let label: String
  let points: String
  let serving: Bool
  let enabled: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      VStack(spacing: 2) {
        Text(label)
          .font(.caption2)
          .lineLimit(2)
          .minimumScaleFactor(0.7)
        Text(points)
          .font(.system(size: 28, weight: .bold, design: .rounded))
        if serving {
          Text("SERVE")
            .font(.system(size: 9, weight: .bold))
            .foregroundStyle(Color(red: 0.8, green: 1.0, blue: 0))
        }
      }
      .frame(maxWidth: .infinity, minHeight: 64)
    }
    .buttonStyle(.borderedProminent)
    .tint(Color(red: 0.33, green: 0.18, blue: 0.38))
    .disabled(!enabled)
  }
}

private struct CompactButton: View {
  let title: String
  let tint: Color
  let action: () -> Void

  var body: some View {
    Button(title, action: action)
      .buttonStyle(.bordered)
      .tint(tint)
      .font(.caption2)
  }
}

#if DEBUG
struct ContentView_Previews: PreviewProvider {
  static var previews: some View {
    ContentView().environmentObject(WristSession.shared)
  }
}
#endif
