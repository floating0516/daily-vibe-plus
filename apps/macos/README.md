# Daily Vibe Plus for macOS

This folder contains the native macOS companion app and WidgetKit extension for Daily Vibe Plus.

The TypeScript CLI still generates reports. The macOS app reads the stable `latest.json` file and syncs it into an App Group container so the WidgetKit extension can display it as a normal macOS-managed widget.

## Generate a report

From the CLI project:

```bash
daily-vibe analyze today --out ~/daily-vibe-reports
```

For local development from this repository:

```bash
node ../../bin/run.js analyze today --out ~/daily-vibe-reports
```

If your API provider is not connected yet, you can use a sample `~/daily-vibe-reports/latest.json` to test the app and widget UI.

## Open in Xcode

```bash
open apps/macos/DailyVibePlus.xcodeproj
```

Select a development team for both targets if Xcode asks for signing settings:

- `DailyVibePlus`
- `DailyVibePlusWidget`

Both targets must use the same App Group:

```text
group.com.dailyvibeplus.app
```

You can replace this placeholder with your own team/domain-specific App Group before distributing the app.

## Build from command line

Requires full Xcode, not only Command Line Tools.

```bash
xcodebuild \
  -project apps/macos/DailyVibePlus.xcodeproj \
  -scheme DailyVibePlus \
  -destination 'platform=macOS' \
  build
```

## Run tests

```bash
xcodebuild \
  -project apps/macos/DailyVibePlus.xcodeproj \
  -scheme DailyVibePlus \
  -destination 'platform=macOS' \
  test
```

## Use the app

1. Generate or place `latest.json` under `~/daily-vibe-reports`.
2. Launch Daily Vibe Plus.
3. Click `Choose Report Folder` and select `~/daily-vibe-reports`.
4. Click `Refresh Now`.
5. Add Daily Vibe Plus from the macOS widget gallery.

The app reads the selected folder using a security-scoped bookmark and copies `latest.json` into the shared App Group container. The WidgetKit extension reads only that shared copy.

## Architecture

```text
daily-vibe CLI
  -> scans local Claude/Codex/SpecStory sessions
  -> redacts sensitive content
  -> calls the configured LLM provider
  -> writes ~/daily-vibe-reports/latest.json

DailyVibePlus.app
  -> reads latest.json from the user-selected report folder
  -> decodes the LatestReport contract
  -> writes the same JSON snapshot into the App Group container
  -> asks WidgetKit to reload timelines

DailyVibePlusWidget.appex
  -> reads only the App Group latest.json snapshot
  -> displays the report in the macOS widget system
```

The macOS app and widget are intentionally display-only. They do not read raw session logs, do not run the Node CLI, and do not call any LLM provider.

## Troubleshooting

### Widget does not show new data

Run the CLI again, then open the app and click `Refresh Now`:

```bash
daily-vibe analyze today --out ~/daily-vibe-reports
```

WidgetKit controls background refresh timing, so the explicit refresh button is the fastest way to sync a new report during the MVP stage.

### Xcode asks for signing or App Group settings

Select the same development team for both targets:

```text
DailyVibePlus
DailyVibePlusWidget
```

Then make sure both targets contain the same App Group:

```text
group.com.dailyvibeplus.app
```

For personal local use, a Personal Team is enough. Distribution outside your machine may require a paid Apple Developer account and notarization.

### No latest.json found

Generate a report first:

```bash
daily-vibe analyze today --out ~/daily-vibe-reports
```

If the LLM provider is not connected yet, you can still test the app and widget with a sample `latest.json` in `~/daily-vibe-reports`.

## Current limitations

- The app does not run the Node CLI yet.
- The app does not call an LLM provider.
- Widget refresh timing is controlled by macOS.
- After regenerating `latest.json`, open the app and click `Refresh Now` for immediate widget sync.
- Signing and App Group setup may require selecting an Apple development team in Xcode.
