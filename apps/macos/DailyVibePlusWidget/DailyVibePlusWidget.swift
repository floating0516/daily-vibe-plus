import SwiftUI
import WidgetKit

struct DailyVibeEntry: TimelineEntry {
    let date: Date
    let report: LatestReport?
}

struct DailyVibeProvider: TimelineProvider {
    private let store = WidgetReportStore()

    func placeholder(in context: Context) -> DailyVibeEntry {
        DailyVibeEntry(date: Date(), report: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (DailyVibeEntry) -> Void) {
        completion(DailyVibeEntry(date: Date(), report: store.loadLatestReport() ?? .placeholder))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DailyVibeEntry>) -> Void) {
        let entry = DailyVibeEntry(date: Date(), report: store.loadLatestReport())
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }
}

struct DailyVibePlusWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family

    let entry: DailyVibeEntry

    var body: some View {
        if let report = entry.report {
            switch family {
            case .systemSmall:
                SmallReportWidget(report: report)
            case .systemMedium:
                MediumReportWidget(report: report)
            default:
                LargeReportWidget(report: report)
            }
        } else {
            WidgetEmptyState()
        }
    }
}

struct DailyVibePlusWidget: Widget {
    let kind = "DailyVibePlusWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DailyVibeProvider()) { entry in
            DailyVibePlusWidgetEntryView(entry: entry)
                .containerBackground(.background, for: .widget)
        }
        .configurationDisplayName("Daily Vibe Plus")
        .description("Shows your latest Daily Vibe Plus report.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

private struct SmallReportWidget: View {
    let report: LatestReport

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Daily Vibe")
                .font(.headline)
            Text(report.date)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(report.summary)
                .font(.caption)
                .lineLimit(5)
            Spacer()
            Text("\(report.stats.totalSessions) sessions")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }
}

private struct MediumReportWidget: View {
    let report: LatestReport

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Daily Vibe")
                    .font(.headline)
                Spacer()
                Text(report.date)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Text(report.summary)
                .font(.caption)
                .lineLimit(3)

            HStack {
                Text("\(report.stats.totalSessions) sessions")
                Text("\(report.stats.totalEvents) events")
                Text("\(report.stats.totalProblems) problems")
            }
            .font(.caption2)
            .foregroundStyle(.secondary)

            ForEach(Array(report.highlights.prefix(2)), id: \.self) { item in
                Text("• \(item)")
                    .font(.caption2)
                    .lineLimit(1)
            }
        }
    }
}

private struct LargeReportWidget: View {
    let report: LatestReport

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Daily Vibe Plus")
                    .font(.headline)
                Spacer()
                Text(report.date)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Text(report.summary)
                .font(.caption)
                .lineLimit(4)

            Divider()

            Text("Highlights")
                .font(.caption.bold())

            ForEach(Array(report.highlights.prefix(4)), id: \.self) { item in
                Text("• \(item)")
                    .font(.caption2)
                    .lineLimit(1)
            }

            if !report.blockers.isEmpty {
                Text("Blockers")
                    .font(.caption.bold())

                ForEach(Array(report.blockers.prefix(2)), id: \.self) { item in
                    Text("• \(item)")
                        .font(.caption2)
                        .lineLimit(1)
                }
            }

            Spacer()

            Text("\(report.stats.totalSessions) sessions • \(report.stats.totalEvents) events • \(report.stats.totalProblems) problems")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }
}

private struct WidgetEmptyState: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Daily Vibe Plus")
                .font(.headline)
            Text("Open the app to choose the folder containing latest.json.")
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
        }
    }
}

#Preview(as: .systemMedium) {
    DailyVibePlusWidget()
} timeline: {
    DailyVibeEntry(date: Date(), report: .placeholder)
}
