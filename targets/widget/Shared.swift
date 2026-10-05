import Foundation
import SwiftUI
import WidgetKit

/// The app writes `snapshot` into this App Group (src/services/widget.ts).
/// The widget's bundle id is "<app id>.widget", so the group is "group.<app id>".
enum Shared {
  static var appGroup: String {
    let id = Bundle.main.bundleIdentifier ?? ""
    let suffix = ".widget"
    let app = id.hasSuffix(suffix) ? String(id.dropLast(suffix.count)) : id
    return "group.\(app)"
  }
}

struct WidgetTask: Codable, Hashable {
  let instanceId: Int
  let title: String
  let course: String?
  let courseColor: String?
  let heat: Int
  let percent: Int
  let remainingMinutes: Int
  let shareMinutes: Int
  /// Real-clock due moment in ms since 1970.
  let dueAtMs: Double
  let overdue: Bool

  var dueDate: Date { Date(timeIntervalSince1970: dueAtMs / 1000) }
}

struct WidgetBlock: Codable, Hashable {
  let name: String
  let kind: String
  let startMs: Double
  let endMs: Double
}

struct WidgetSnapshot: Codable {
  let version: Int
  let todayMinutes: Int
  let openCount: Int
  let hottest: WidgetTask?
  let top: [WidgetTask]
  let block: WidgetBlock?

  static let sample = WidgetSnapshot(
    version: 2,
    todayMinutes: 95,
    openCount: 4,
    hottest: WidgetTask(
      instanceId: 0,
      title: "Labı hazırla",
      course: "ELML",
      courseColor: "#4F8AE8",
      heat: 2,
      percent: 40,
      remainingMinutes: 50,
      shareMinutes: 30,
      dueAtMs: (Date().timeIntervalSince1970 + 2 * 86_400 + 15 * 3_600) * 1000,
      overdue: false
    ),
    top: [],
    block: nil
  )
}

func loadSnapshot() -> WidgetSnapshot? {
  guard let data = UserDefaults(suiteName: Shared.appGroup)?.data(forKey: "snapshot") else { return nil }
  return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
}

// MARK: - Look

/// Same heat scale as the app (src/theme/tokens.ts).
func heatColor(_ level: Int, _ scheme: ColorScheme) -> Color {
  let light = ["#4C9A8A", "#C9A227", "#E8833A", "#D9482B", "#A3122A"]
  let dark = ["#5FB3A1", "#D9B545", "#F0955A", "#EE6448", "#E23A4E"]
  let list = scheme == .dark ? dark : light
  return Color(hex: list[max(0, min(4, level))])
}

let heatNames = ["Serin", "Ilık", "Sıcak", "Kızgın", "Son gün"]

extension Color {
  init(hex: String) {
    var value: UInt64 = 0
    _ = Scanner(string: hex.replacingOccurrences(of: "#", with: "")).scanHexInt64(&value)
    self.init(
      red: Double((value >> 16) & 0xFF) / 255,
      green: Double((value >> 8) & 0xFF) / 255,
      blue: Double(value & 0xFF) / 255
    )
  }
}

/// '1 sa 25 dk', '40 dk' — like fmtMinutes in the app.
func minutesText(_ m: Int) -> String {
  let v = max(5, Int((Double(m) / 5).rounded()) * 5)
  if v < 60 { return "\(v) dk" }
  let h = v / 60
  let r = v % 60
  return r > 0 ? "\(h) sa \(r) dk" : "\(h) sa"
}

extension View {
  /// iOS 17 wants the background declared for the widget container; iOS 16 just paints it.
  @ViewBuilder
  func widgetBackground(_ color: Color) -> some View {
    if #available(iOS 17.0, *) {
      containerBackground(color, for: .widget)
    } else {
      background(color)
    }
  }
}
