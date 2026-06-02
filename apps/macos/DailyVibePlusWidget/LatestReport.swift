import Foundation

struct LatestReport: Codable, Equatable {
    struct ReportFiles: Codable, Equatable {
        let daily: String?
        let knowledge: String?
        let latestMarkdown: String?
        let rawData: String?
    }

    struct Stats: Codable, Equatable {
        let chunks: Int?
        let totalEvents: Int
        let totalProblems: Int
        let totalSessions: Int
    }

    let blockers: [String]
    let date: String
    let files: ReportFiles
    let highlights: [String]
    let stats: Stats
    let summary: String
    let title: String
    let updatedAt: String

    var updatedDate: Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: updatedAt) ?? ISO8601DateFormatter().date(from: updatedAt)
    }

    static var placeholder: LatestReport {
        LatestReport(
            blockers: [],
            date: "Today",
            files: ReportFiles(daily: nil, knowledge: nil, latestMarkdown: nil, rawData: nil),
            highlights: ["Generate a report with daily-vibe analyze today"],
            stats: Stats(chunks: nil, totalEvents: 0, totalProblems: 0, totalSessions: 0),
            summary: "Your latest Daily Vibe Plus report will appear here.",
            title: "Daily Vibe Plus Latest Report",
            updatedAt: ISO8601DateFormatter().string(from: Date())
        )
    }
}
