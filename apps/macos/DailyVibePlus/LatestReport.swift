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
}
