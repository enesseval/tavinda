import ActivityKit
import Foundation

/// A running time block ("Yemek · 13:30'a kadar"). The same type is declared in the app's
/// native module (modules/tavinda-live-activity); ActivityKit matches them by shape.
struct BlockActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var name: String
    var startMs: Double
    var endMs: Double
  }

  var blockId: Int
  /// sleep | meal | rest | other | task
  var kind: String
}
