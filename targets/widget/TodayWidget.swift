import SwiftUI
import WidgetKit

struct TodayEntry: TimelineEntry {
  let date: Date
  let snapshot: WidgetSnapshot?
}

struct TodayProvider: TimelineProvider {
  func placeholder(in context: Context) -> TodayEntry {
    TodayEntry(date: Date(), snapshot: .sample)
  }

  func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
    completion(TodayEntry(date: Date(), snapshot: loadSnapshot() ?? .sample))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
    let now = Date()
    // The app pushes fresh data on every change; this is only a safety refresh.
    let next = now.addingTimeInterval(30 * 60)
    completion(Timeline(entries: [TodayEntry(date: now, snapshot: loadSnapshot())], policy: .after(next)))
  }
}

/// "2 gün 15 saat" until due (system-formatted, updates by itself), or "Gecikti".
struct DueText: View {
  let task: WidgetTask

  var body: some View {
    if task.overdue || task.dueDate <= Date() {
      Text("Gecikti")
    } else {
      Text(task.dueDate, style: .relative)
    }
  }
}

struct HeatDot: View {
  let level: Int
  @Environment(\.colorScheme) private var scheme

  var body: some View {
    Circle().fill(heatColor(level, scheme)).frame(width: 8, height: 8)
  }
}

struct SmallView: View {
  let snapshot: WidgetSnapshot?

  var body: some View {
    if let task = snapshot?.hottest {
      VStack(alignment: .leading, spacing: 4) {
        HStack(spacing: 5) {
          HeatDot(level: task.heat)
          Text(task.overdue ? "Gecikti" : heatNames[max(0, min(4, task.heat))])
            .font(.caption2.weight(.semibold))
            .foregroundStyle(.secondary)
          Spacer(minLength: 0)
          if let course = task.course {
            Text(course).font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
          }
        }
        Text(task.title)
          .font(.headline)
          .lineLimit(2)
          .minimumScaleFactor(0.85)
        Spacer(minLength: 0)
        Text("%\(100 - task.percent) kaldı")
          .font(.title3.weight(.bold))
          .monospacedDigit()
        HStack(spacing: 3) {
          DueText(task: task)
        }
        .font(.caption2)
        .foregroundStyle(.secondary)
        .lineLimit(1)
      }
    } else {
      EmptyStateView()
    }
  }
}

struct EmptyStateView: View {
  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text("Bugün temiz.").font(.headline)
      Text("Açık iş yok.").font(.caption).foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
}

struct TaskRow: View {
  let task: WidgetTask

  var body: some View {
    HStack(spacing: 6) {
      HeatDot(level: task.heat)
      Text(task.title).font(.caption.weight(.medium)).lineLimit(1)
      Spacer(minLength: 4)
      Text("%\(task.percent)").font(.caption2).monospacedDigit().foregroundStyle(.secondary)
    }
  }
}

struct MediumView: View {
  let snapshot: WidgetSnapshot?

  var body: some View {
    HStack(alignment: .top, spacing: 14) {
      SmallView(snapshot: snapshot)
      if let snapshot = snapshot, snapshot.hottest != nil {
        VStack(alignment: .leading, spacing: 7) {
          Text(snapshot.todayMinutes > 0 ? "Bugün \(minutesText(snapshot.todayMinutes)) iş" : "Bugün planlı iş yok")
            .font(.caption2.weight(.semibold))
            .foregroundStyle(.secondary)
          ForEach(snapshot.top.filter { $0.instanceId != snapshot.hottest?.instanceId }.prefix(3), id: \.instanceId) { task in
            TaskRow(task: task)
          }
          Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
    }
  }
}

/// Lock screen, under the clock.
struct RectangularView: View {
  let snapshot: WidgetSnapshot?

  var body: some View {
    if let task = snapshot?.hottest {
      VStack(alignment: .leading, spacing: 1) {
        Text(task.title).font(.headline).lineLimit(1)
        HStack(spacing: 4) {
          Text("%\(100 - task.percent) kaldı ·")
          DueText(task: task)
        }
        .font(.caption)
        .lineLimit(1)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    } else {
      Text("Bugün temiz.").font(.headline)
    }
  }
}

/// Lock screen, next to the date.
struct InlineView: View {
  let snapshot: WidgetSnapshot?

  var body: some View {
    if let task = snapshot?.hottest {
      Text("\(task.title) · %\(100 - task.percent)")
    } else {
      Text("Tavında: bugün temiz")
    }
  }
}

struct TodayWidgetView: View {
  let entry: TodayEntry
  @Environment(\.widgetFamily) private var family

  private var url: URL? {
    if let id = entry.snapshot?.hottest?.instanceId, id > 0 {
      return URL(string: "tavinda://progress/\(id)")
    }
    return URL(string: "tavinda://")
  }

  private var isAccessory: Bool {
    family == .accessoryRectangular || family == .accessoryInline || family == .accessoryCircular
  }

  var body: some View {
    Group {
      switch family {
      case .accessoryRectangular:
        RectangularView(snapshot: entry.snapshot)
      case .accessoryInline:
        InlineView(snapshot: entry.snapshot)
      case .systemMedium:
        MediumView(snapshot: entry.snapshot)
      default:
        SmallView(snapshot: entry.snapshot)
      }
    }
    .widgetURL(url)
    // Lock screen widgets take the system's own background.
    .widgetBackground(isAccessory ? Color.clear : Color("$widgetBackground"))
  }
}

struct TodayWidget: Widget {
  let kind = "TavindaToday"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: TodayProvider()) { entry in
      TodayWidgetView(entry: entry)
    }
    .configurationDisplayName("Bugün")
    .description("En sıcak işin, kalan süresi ve bugünkü işlerin.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryInline])
  }
}
