import XCTest
@testable import DailyVibePlus

final class LatestReportDecodingTests: XCTestCase {
    func testDecodesCurrentLatestReportContract() throws {
        let json = """
        {
          "blockers": ["Schedule command is pending"],
          "date": "2026-05-31",
          "files": {
            "daily": "/tmp/daily.md",
            "knowledge": "/tmp/knowledge.md",
            "latestMarkdown": "/tmp/latest.md",
            "rawData": "/tmp/data.json"
          },
          "highlights": ["Added latest.json", "Added WidgetKit app"],
          "stats": {
            "chunks": 2,
            "totalEvents": 20,
            "totalProblems": 1,
            "totalSessions": 3
          },
          "summary": "Today shipped the widget integration.",
          "title": "Daily Vibe Plus Latest Report",
          "updatedAt": "2026-05-31T12:34:56.000Z"
        }
        """.data(using: .utf8)!

        let report = try JSONDecoder().decode(LatestReport.self, from: json)

        XCTAssertEqual(report.date, "2026-05-31")
        XCTAssertEqual(report.summary, "Today shipped the widget integration.")
        XCTAssertEqual(report.highlights, ["Added latest.json", "Added WidgetKit app"])
        XCTAssertEqual(report.blockers, ["Schedule command is pending"])
        XCTAssertEqual(report.stats.totalSessions, 3)
        XCTAssertEqual(report.stats.totalEvents, 20)
        XCTAssertEqual(report.stats.totalProblems, 1)
        XCTAssertEqual(report.stats.chunks, 2)
        XCTAssertNotNil(report.updatedDate)
    }

    func testIgnoresFutureAdditionalFields() throws {
        let json = """
        {
          "blockers": [],
          "date": "2026-05-31",
          "files": {},
          "highlights": [],
          "stats": {
            "totalEvents": 0,
            "totalProblems": 0,
            "totalSessions": 0
          },
          "summary": "No sessions found.",
          "title": "Daily Vibe Plus Latest Report",
          "updatedAt": "2026-05-31T12:34:56.000Z",
          "futureField": {"ignored": true}
        }
        """.data(using: .utf8)!

        let report = try JSONDecoder().decode(LatestReport.self, from: json)

        XCTAssertEqual(report.summary, "No sessions found.")
        XCTAssertNil(report.stats.chunks)
    }
}
