import Foundation
import WidgetKit

enum ReportStoreError: LocalizedError {
    case appGroupUnavailable
    case bookmarkResolutionFailed
    case invalidJson(String)
    case latestJsonMissing(URL)
    case noReportDirectorySelected

    var errorDescription: String? {
        switch self {
        case .appGroupUnavailable:
            return "The shared app group container is unavailable. Check App Group signing settings."
        case .bookmarkResolutionFailed:
            return "Could not access the selected report directory. Please choose it again."
        case .invalidJson(let message):
            return "latest.json could not be decoded: \(message)"
        case .latestJsonMissing(let url):
            return "latest.json was not found at \(url.path)."
        case .noReportDirectorySelected:
            return "No report directory selected."
        }
    }
}

final class ReportStore {
    static let appGroupIdentifier = "group.com.dailyvibeplus.app"

    private let bookmarkKey = "dailyVibe.reportDirectoryBookmark"
    private let selectedPathKey = "dailyVibe.reportDirectoryPath"
    private let fileManager: FileManager
    private let userDefaults: UserDefaults

    init(userDefaults: UserDefaults = .standard, fileManager: FileManager = .default) {
        self.userDefaults = userDefaults
        self.fileManager = fileManager
    }

    var selectedReportDirectoryPath: String? {
        userDefaults.string(forKey: selectedPathKey)
    }

    func saveReportDirectoryBookmark(_ directoryURL: URL) throws {
        let bookmark = try directoryURL.bookmarkData(
            options: [.withSecurityScope],
            includingResourceValuesForKeys: nil,
            relativeTo: nil
        )
        userDefaults.set(bookmark, forKey: bookmarkKey)
        userDefaults.set(directoryURL.path, forKey: selectedPathKey)
    }

    func loadAndSyncLatestReport() throws -> LatestReport {
        let directoryURL = try resolveReportDirectory()
        let didStart = directoryURL.startAccessingSecurityScopedResource()
        defer {
            if didStart {
                directoryURL.stopAccessingSecurityScopedResource()
            }
        }

        let latestURL = directoryURL.appendingPathComponent("latest.json")
        guard fileManager.fileExists(atPath: latestURL.path) else {
            throw ReportStoreError.latestJsonMissing(latestURL)
        }

        let data = try Data(contentsOf: latestURL)
        let report: LatestReport
        do {
            report = try JSONDecoder().decode(LatestReport.self, from: data)
        } catch {
            throw ReportStoreError.invalidJson(error.localizedDescription)
        }

        try syncToAppGroup(data)
        WidgetCenter.shared.reloadAllTimelines()
        return report
    }

    private func resolveReportDirectory() throws -> URL {
        guard let bookmark = userDefaults.data(forKey: bookmarkKey) else {
            throw ReportStoreError.noReportDirectorySelected
        }

        var isStale = false
        do {
            let url = try URL(
                resolvingBookmarkData: bookmark,
                options: [.withSecurityScope],
                relativeTo: nil,
                bookmarkDataIsStale: &isStale
            )
            if isStale {
                try saveReportDirectoryBookmark(url)
            }
            return url
        } catch {
            throw ReportStoreError.bookmarkResolutionFailed
        }
    }

    private func syncToAppGroup(_ data: Data) throws {
        guard let containerURL = fileManager.containerURL(forSecurityApplicationGroupIdentifier: Self.appGroupIdentifier) else {
            throw ReportStoreError.appGroupUnavailable
        }

        let destinationURL = containerURL.appendingPathComponent("latest.json")
        try data.write(to: destinationURL, options: [.atomic])
    }
}
