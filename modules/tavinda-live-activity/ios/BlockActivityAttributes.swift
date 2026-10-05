import ActivityKit
import Foundation

/// Must stay identical to targets/widget/BlockActivityAttributes.swift: ActivityKit matches
/// the app's and the widget extension's types by name and shape.
@available(iOS 16.1, *)
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
