# SwiftBar integration

This directory contains a SwiftBar plugin that displays the latest Daily Vibe Plus report in the macOS menu bar.

## Install SwiftBar

```bash
brew install --cask swiftbar
```

Or download it from:

```text
https://github.com/swiftbar/SwiftBar
```

## Generate a latest report

Run Daily Vibe Plus once with an output directory:

```bash
daily-vibe analyze today --out ~/daily-vibe-reports
```

This creates:

```text
~/daily-vibe-reports/latest.md
~/daily-vibe-reports/latest.json
```

## Install the plugin

Create a SwiftBar plugin directory:

```bash
mkdir -p ~/SwiftBarPlugins
```

Copy the plugin:

```bash
cp integrations/swiftbar/daily-vibe-plus.5m.sh ~/SwiftBarPlugins/
chmod +x ~/SwiftBarPlugins/daily-vibe-plus.5m.sh
```

Open SwiftBar and select:

```text
~/SwiftBarPlugins
```

The `5m` filename suffix tells SwiftBar to refresh the plugin every five minutes.

## Configure paths

By default, the plugin reads:

```text
~/daily-vibe-reports/latest.json
```

You can override it with environment variables in SwiftBar plugin settings or by editing the script:

```bash
DAILY_VIBE_REPORT_DIR=/path/to/reports
DAILY_VIBE_BIN=/path/to/daily-vibe
```

## Menu actions

The plugin supports:

- Opening the latest markdown report.
- Opening the report folder.
- Regenerating today's report.
- Showing highlights, blockers, and basic stats.

## Recommended workflow

1. Run `daily-vibe init`.
2. Run `daily-vibe config test --skip-llm`.
3. Run `daily-vibe analyze today --out ~/daily-vibe-reports`.
4. Install this SwiftBar plugin.
5. Later, combine it with `daily-vibe schedule set --time 22:00 --out ~/daily-vibe-reports` when the schedule command is available.
