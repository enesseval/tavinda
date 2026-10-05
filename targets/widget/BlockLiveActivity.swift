import ActivityKit
import SwiftUI
import WidgetKit

private func symbol(for kind: String) -> String {
  switch kind {
  case "sleep": return "moon.zzz.fill"
  case "meal": return "fork.knife"
  case "rest": return "cup.and.saucer.fill"
  case "task": return "book.fill"
  default: return "circle.dashed"
  }
}

private func interval(_ state: BlockActivityAttributes.ContentState) -> ClosedRange<Date> {
  let start = Date(timeIntervalSince1970: state.startMs / 1000)
  let end = Date(timeIntervalSince1970: state.endMs / 1000)
  return start...max(end, start.addingTimeInterval(60))
}

private func clock(_ ms: Double) -> String {
  let f = DateFormatter()
  f.locale = Locale(identifier: "tr_TR")
  f.dateFormat = "HH:mm"
  return f.string(from: Date(timeIntervalSince1970: ms / 1000))
}

/// Lock screen / notification banner.
struct BlockLockScreenView: View {
  let attributes: BlockActivityAttributes
  let state: BlockActivityAttributes.ContentState

  var body: some View {
    let range = interval(state)
    VStack(alignment: .leading, spacing: 10) {
      HStack(spacing: 10) {
        Image(systemName: symbol(for: attributes.kind))
          .font(.title3)
          .frame(width: 28)
        VStack(alignment: .leading, spacing: 2) {
          Text(state.name).font(.headline).lineLimit(1)
          Text("\(clock(state.startMs))–\(clock(state.endMs))")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        Spacer(minLength: 8)
        Text(timerInterval: range, countsDown: true)
          .font(.title2.weight(.semibold))
          .monospacedDigit()
          .multilineTextAlignment(.trailing)
          .frame(maxWidth: 110, alignment: .trailing)
      }
      ProgressView(timerInterval: range, countsDown: false) {
        EmptyView()
      } currentValueLabel: {
        EmptyView()
      }
      .tint(Color("$accent"))
    }
    .padding(16)
  }
}

struct BlockLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: BlockActivityAttributes.self) { context in
      BlockLockScreenView(attributes: context.attributes, state: context.state)
        .activityBackgroundTint(Color("$widgetBackground"))
        .activitySystemActionForegroundColor(Color("$accent"))
        .widgetURL(URL(string: "tavinda://block/\(context.attributes.blockId)"))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Label {
            Text(context.state.name).lineLimit(1)
          } icon: {
            Image(systemName: symbol(for: context.attributes.kind))
          }
          .font(.headline)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(timerInterval: interval(context.state), countsDown: true)
            .font(.headline)
            .monospacedDigit()
            .multilineTextAlignment(.trailing)
            .frame(maxWidth: 80, alignment: .trailing)
        }
        DynamicIslandExpandedRegion(.bottom) {
          ProgressView(timerInterval: interval(context.state), countsDown: false) {
            EmptyView()
          } currentValueLabel: {
            EmptyView()
          }
        }
      } compactLeading: {
        Image(systemName: symbol(for: context.attributes.kind))
      } compactTrailing: {
        Text(timerInterval: interval(context.state), countsDown: true)
          .monospacedDigit()
          .multilineTextAlignment(.trailing)
          .frame(maxWidth: 48)
      } minimal: {
        Image(systemName: symbol(for: context.attributes.kind))
      }
      .widgetURL(URL(string: "tavinda://block/\(context.attributes.blockId)"))
    }
  }
}
