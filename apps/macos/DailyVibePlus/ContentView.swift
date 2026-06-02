import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = ReportViewModel()

    var body: some View {
        NavigationSplitView {
            List {
                Section("Report") {
                    Button("Refresh Now") {
                        viewModel.refresh()
                    }
                    Button("Choose Report Folder") {
                        viewModel.chooseReportDirectory()
                    }
                    Button("Reveal in Finder") {
                        viewModel.revealReportDirectoryInFinder()
                    }
                    .disabled(viewModel.selectedReportDirectoryPath == nil)
                }

                Section("Current Folder") {
                    Text(viewModel.selectedReportDirectoryPath ?? "No folder selected")
                        .font(.caption)
                        .textSelection(.enabled)
                }
            }
            .navigationTitle("Daily Vibe Plus")
        } detail: {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    if viewModel.isLoading {
                        ProgressView("Loading latest report...")
                    }

                    if let errorMessage = viewModel.errorMessage {
                        ErrorCard(message: errorMessage)
                    }

                    if let report = viewModel.report {
                        ReportDetailView(report: report)
                    } else if viewModel.errorMessage == nil && !viewModel.isLoading {
                        EmptyReportView()
                    }

                    CommandHintView()
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .frame(minWidth: 900, minHeight: 600)
        .onAppear {
            viewModel.refresh()
        }
    }
}

private struct ReportDetailView: View {
    let report: LatestReport

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                Text(report.title)
                    .font(.largeTitle.bold())
                Text("Date: \(report.date)")
                    .foregroundStyle(.secondary)
                Text("Updated: \(report.updatedAt)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Text(report.summary)
                .font(.title3)
                .textSelection(.enabled)

            HStack(spacing: 12) {
                StatCard(label: "Sessions", value: "\(report.stats.totalSessions)")
                StatCard(label: "Events", value: "\(report.stats.totalEvents)")
                StatCard(label: "Problems", value: "\(report.stats.totalProblems)")
                StatCard(label: "Chunks", value: "\(report.stats.chunks ?? 0)")
            }

            SectionCard(title: "Highlights", items: report.highlights, emptyText: "No highlights found.")
            SectionCard(title: "Blockers", items: report.blockers, emptyText: "No blockers found.")
        }
    }
}

private struct StatCard: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading) {
            Text(value)
                .font(.title.bold())
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

private struct SectionCard: View {
    let title: String
    let items: [String]
    let emptyText: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)

            if items.isEmpty {
                Text(emptyText)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(items, id: \.self) { item in
                    Text("• \(item)")
                        .textSelection(.enabled)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

private struct ErrorCard: View {
    let message: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Report unavailable")
                .font(.headline)
            Text(message)
                .textSelection(.enabled)
            Text("Choose the report folder that contains latest.json, or generate a report with the CLI.")
                .foregroundStyle(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.red.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

private struct EmptyReportView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("No latest report loaded")
                .font(.headline)
            Text("Choose your Daily Vibe report folder, usually ~/daily-vibe-reports.")
                .foregroundStyle(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

private struct CommandHintView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Generate latest report")
                .font(.headline)
            Text("daily-vibe analyze today --out ~/daily-vibe-reports")
                .font(.system(.body, design: .monospaced))
                .textSelection(.enabled)
            Text("After the CLI writes latest.json, open this app and click Refresh Now to sync the widget.")
                .foregroundStyle(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

#Preview {
    ContentView()
}
