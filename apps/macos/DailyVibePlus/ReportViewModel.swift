import AppKit
import Foundation
import SwiftUI

@MainActor
final class ReportViewModel: ObservableObject {
    @Published private(set) var errorMessage: String?
    @Published private(set) var isLoading = false
    @Published private(set) var report: LatestReport?
    @Published private(set) var selectedReportDirectoryPath: String?

    private let store: ReportStore

    init(store: ReportStore = ReportStore()) {
        self.store = store
        self.selectedReportDirectoryPath = store.selectedReportDirectoryPath
    }

    func refresh() {
        guard selectedReportDirectoryPath != nil else {
            errorMessage = nil
            report = nil
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            report = try store.loadAndSyncLatestReport()
        } catch {
            report = nil
            errorMessage = error.localizedDescription
        }

        selectedReportDirectoryPath = store.selectedReportDirectoryPath
        isLoading = false
    }

    func chooseReportDirectory() {
        let panel = NSOpenPanel()
        panel.title = "Choose Daily Vibe Reports Folder"
        panel.message = "Select the folder that contains latest.json, usually ~/daily-vibe-reports."
        panel.canChooseDirectories = true
        panel.canChooseFiles = false
        panel.allowsMultipleSelection = false
        panel.canCreateDirectories = true

        if panel.runModal() == .OK, let url = panel.url {
            do {
                try store.saveReportDirectoryBookmark(url)
                selectedReportDirectoryPath = url.path
                refresh()
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    func revealReportDirectoryInFinder() {
        guard let path = selectedReportDirectoryPath else { return }
        NSWorkspace.shared.activateFileViewerSelecting([URL(fileURLWithPath: path)])
    }
}
