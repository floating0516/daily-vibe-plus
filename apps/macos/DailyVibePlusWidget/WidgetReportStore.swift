import Foundation

struct WidgetReportStore {
    static let appGroupIdentifier = "group.com.dailyvibeplus.app"

    func loadLatestReport() -> LatestReport? {
        guard let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: Self.appGroupIdentifier) else {
            return nil
        }

        let latestURL = containerURL.appendingPathComponent("latest.json")
        guard let data = try? Data(contentsOf: latestURL) else {
            return nil
        }

        return try? JSONDecoder().decode(LatestReport.self, from: data)
    }
}
