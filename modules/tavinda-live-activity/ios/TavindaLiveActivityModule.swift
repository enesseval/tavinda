import ActivityKit
import ExpoModulesCore

/// The block to show, as sent from JS (src/services/liveActivity.ts).
struct BlockPayload: Record {
  @Field var blockId: Int = 0
  @Field var kind: String = "other"
  @Field var name: String = ""
  /// Real-clock times in ms since 1970.
  @Field var startMs: Double = 0
  @Field var endMs: Double = 0
}

public class TavindaLiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TavindaLiveActivity")

    /// False on iOS < 16.2 or when the user turned Live Activities off for the app.
    Function("isSupported") { () -> Bool in
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    /// Makes the Live Activities match `payload`: ends every other block's activity,
    /// updates the matching one, or starts it. `nil` ends them all. Safe to call often.
    Function("sync") { (payload: BlockPayload?) in
      if #available(iOS 16.2, *) {
        LiveActivitySync.apply(payload)
      }
    }
  }
}

@available(iOS 16.2, *)
enum LiveActivitySync {
  static func apply(_ payload: BlockPayload?) {
    let current = Activity<BlockActivityAttributes>.activities.filter {
      $0.activityState == .active || $0.activityState == .stale
    }

    for activity in current where payload == nil || activity.attributes.blockId != payload!.blockId {
      Task {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
    }

    guard let p = payload, ActivityAuthorizationInfo().areActivitiesEnabled else { return }

    let state = BlockActivityAttributes.ContentState(name: p.name, startMs: p.startMs, endMs: p.endMs)
    // After its end time the block shows as stale until the app closes it.
    let stale = Date(timeIntervalSince1970: p.endMs / 1000).addingTimeInterval(60)
    let content = ActivityContent(state: state, staleDate: stale)

    if let existing = current.first(where: { $0.attributes.blockId == p.blockId }) {
      if existing.content.state != state {
        Task {
          await existing.update(content)
        }
      }
      return
    }

    do {
      _ = try Activity.request(
        attributes: BlockActivityAttributes(blockId: p.blockId, kind: p.kind),
        content: content,
        pushType: nil
      )
    } catch {
      // Not allowed right now (e.g. app in background or too many activities); nothing to do.
    }
  }
}
