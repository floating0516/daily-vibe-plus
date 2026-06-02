# Daily Vibe Plus

**English** | [中文](README_CN.md)

Daily Vibe Plus is a command-line tool for turning local AI coding sessions into daily or weekly work reports. It reads local Claude Code, Codex CLI, Codex VS Code, and SpecStory history files, redacts sensitive content, and uses your configured LLM provider to generate readable summaries.

This fork focuses on safer defaults and better operator control: dry runs, source filters, config checks, interactive setup, stronger redaction, and raw data output only when explicitly requested.

## Features

- Daily and range-based report generation.
- Knowledge extraction from problems, fixes, tool output, and implementation notes.
- Redaction for API keys, tokens, credentials, emails, JWTs, cloud keys, and private keys.
- Recursive redaction for message content, metadata, tool runs, and file diffs.
- Dry-run and preview modes that scan and estimate work without calling an LLM.
- Source selection for Claude Code, Codex CLI, Codex VS Code, and SpecStory.
- Project filters, exclude filters, and minimum event filtering.
- OpenAI, Anthropic, and OpenAI-compatible generic providers.
- Config validation through `daily-vibe config test`.
- Interactive setup through `daily-vibe init`.
- Raw `data.json` output is disabled by default.
- Stable `latest.md` and `latest.json` output for native app and desktop integrations.
- Native macOS app and WidgetKit extension for system-managed widgets.
- Desktop widget integration for lightweight local preview.

## Installation

```bash
pnpm install
pnpm run build
```

For local development, run commands from the repository root:

```bash
node ./bin/run.js --help
```

If you publish or install the package globally, the CLI command remains:

```bash
daily-vibe
```

## Quick start

### 1. Configure an LLM provider

OpenAI:

```bash
daily-vibe config set --provider openai --api-key sk-your-api-key --model gpt-4o-mini
```

Anthropic:

```bash
daily-vibe config set --provider anthropic --api-key sk-ant-your-api-key --model claude-3-haiku-20240307
```

OpenAI-compatible provider:

```bash
daily-vibe config set \
  --provider generic \
  --base-url https://api.example.com/v1 \
  --api-key sk-your-api-key \
  --model your-model
```

You can also use the interactive setup wizard:

```bash
daily-vibe init
```

### 2. Check configuration

Local checks only:

```bash
daily-vibe config test --skip-llm
```

Include an LLM smoke test:

```bash
daily-vibe config test
```

JSON output:

```bash
daily-vibe config test --skip-llm --json
```

### 3. Preview before generating reports

Dry run for today:

```bash
daily-vibe analyze today --dry-run
```

Dry run as parseable JSON:

```bash
daily-vibe analyze today --dry-run --json
```

Preview Claude Code only:

```bash
daily-vibe analyze today --source claude-code --dry-run --preview
```

### 4. Generate reports

Generate today's report:

```bash
daily-vibe analyze today --out ./reports
```

Generate a date range:

```bash
daily-vibe analyze range --from 2026-05-01 --to 2026-05-07 --out ./reports
```

Write raw analysis data explicitly:

```bash
daily-vibe analyze today --out ./reports --raw-data
```

When `--out` is used, Daily Vibe Plus also writes stable latest-report files by default:

```text
./reports/latest.md
./reports/latest.json
```

Disable this behavior with:

```bash
daily-vibe analyze today --out ./reports --no-latest
```

## Commands

### `daily-vibe init`

Interactively creates or updates `~/.daily-vibe/config.json`.

It collects:

- LLM provider.
- Model.
- Base URL.
- API key.
- Output directory.
- Timezone.
- Enabled sources.
- Whether raw `data.json` should be written by default.
- Whether redaction should be enabled.

### `daily-vibe config set`

Sets or displays LLM configuration.

```bash
daily-vibe config set --provider generic --base-url https://api.example.com/v1 --api-key sk-your-api-key --model your-model
daily-vibe config set --show
```

### `daily-vibe config test`

Validates configuration, redaction regexes, source availability, and optionally LLM connectivity.

```bash
daily-vibe config test --skip-llm
daily-vibe config test --json
```

### `daily-vibe sources scan`

Scans for local supported data sources.

```bash
daily-vibe sources scan
```

Supported sources:

- `claude-code`: `~/.claude/projects/**/*.jsonl`
- `specstory`: `**/.specstory/history/**/*.md` and `**/.specstory/history/**/*.jsonl`
- `codex-cli`: `~/.codex/sessions/**/*.jsonl` and `~/.codex/history/**/*.jsonl`
- `codex-vscode`: Codex-related VS Code global storage files

### `daily-vibe analyze today`

Analyzes today's local sessions.

```bash
daily-vibe analyze today [options]
```

Important options:

```text
--dry-run                 Scan, filter, redact, and estimate chunks without LLM calls or writes
--preview                 Show a session preview
--json                    Output JSON
--out <directory>         Write reports to a directory
--raw-data                Also write data.json
--source <source>         Include a source; repeatable
--project <project>       Include a project; repeatable
--exclude-project <name>  Exclude a project; repeatable
--min-events <number>     Only include sessions with at least this many events
--provider <provider>     Override provider
--base-url <url>          Override provider base URL
--model <model>           Override model
--no-redact               Disable redaction
--no-latest               Do not write latest.md and latest.json
--no-progress             Disable progress output
```

Examples:

```bash
daily-vibe analyze today --dry-run --json
daily-vibe analyze today --source claude-code --project my-project --dry-run
daily-vibe analyze today --out ./reports
daily-vibe analyze today --out ./reports --raw-data
```

### `daily-vibe analyze range`

Analyzes a date range.

```bash
daily-vibe analyze range --from 2026-05-01 --to 2026-05-07 --out ./reports
```

The range command supports the same analysis, filter, redaction, provider, JSON, preview, and raw-data options as `analyze today`.

### `daily-vibe widget export`

Exports a desktop widget or local dashboard that reads `latest.json`.

```bash
daily-vibe widget export --target ubersicht --report-dir ~/daily-vibe-reports
daily-vibe widget export --target html --out ~/daily-vibe-widget --report-dir ~/daily-vibe-reports
```

Important options:

```text
--target <target>        html, ubersicht, or all
--report-dir <dir>      Directory containing latest.json
--out <dir>             Output directory for the HTML dashboard
--ubersicht-dir <dir>   Übersicht widgets directory
--force                 Overwrite existing widget files
```

The widget export does not call an LLM. It only installs files that read the stable `latest.json` generated later by `daily-vibe analyze today --out`.

### `daily-vibe redact test`

Tests redaction rules against input text or a file.

```bash
daily-vibe redact test "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abc.def"
daily-vibe redact test --file ./sample.txt
```

## Output files

By default, analysis writes the dated report files:

- `daily.md`
- `knowledge.md`

When `--out` is used, it also maintains stable integration files:

- `latest.md`
- `latest.json`

`data.json` contains structured session details and is not written by default. Use `--raw-data` or set `output.writeRawData` to `true` only when you explicitly need it.

## Configuration

The default config path is:

```text
~/.daily-vibe/config.json
```

Example:

```json
{
  "llm": {
    "provider": "generic",
    "apiKey": "sk-your-api-key",
    "baseUrl": "https://api.example.com/v1",
    "model": "your-model"
  },
  "outputDir": "reports",
  "output": {
    "writeLatest": true,
    "writeRawData": false
  },
  "sources": {
    "enabled": ["claude-code", "specstory", "codex-cli", "codex-vscode"]
  },
  "redact": {
    "enabled": true,
    "patterns": []
  },
  "timezone": "Asia/Taipei"
}
```

Configuration can also be loaded through cosmiconfig-compatible files, but `~/.daily-vibe/config.json` is the primary path used by the CLI config commands.

## Privacy and security notes

Daily Vibe Plus reads local AI coding session logs. These logs may contain prompts, tool output, file paths, code snippets, tokens, credentials, private URLs, and other sensitive data.

Recommended workflow:

1. Run `daily-vibe sources scan`.
2. Run `daily-vibe analyze today --dry-run --preview`.
3. Use `--source`, `--project`, `--exclude-project`, and `--min-events` to narrow the input.
4. Generate reports only after previewing the scope.
5. Avoid `--raw-data` unless you need structured debugging data.
6. Do not commit generated reports or raw data to public repositories.

Redaction reduces risk but is not a guarantee. The configured LLM provider receives the redacted session content used for summary generation.

## Native macOS app and WidgetKit

Daily Vibe Plus now has three layers:

```text
daily-vibe CLI
  -> generates ~/daily-vibe-reports/latest.json

DailyVibePlus macOS app
  -> reads latest.json from the selected report folder
  -> syncs a safe snapshot into the App Group container

DailyVibePlusWidget
  -> reads the App Group snapshot
  -> displays it as a normal macOS-managed WidgetKit widget
```

The native app lives under:

```text
apps/macos
```

Recommended local setup:

1. Generate or place a report at `~/daily-vibe-reports/latest.json`:

   ```bash
   daily-vibe analyze today --out ~/daily-vibe-reports
   ```

2. Open the Xcode project:

   ```bash
   open apps/macos/DailyVibePlus.xcodeproj
   ```

3. In Xcode, select the same development team and App Group for both targets:

   ```text
   DailyVibePlus
   DailyVibePlusWidget
   ```

   Default App Group:

   ```text
   group.com.dailyvibeplus.app
   ```

4. Run `DailyVibePlus`, choose `~/daily-vibe-reports`, then click `Refresh Now`.

5. Add `Daily Vibe Plus` from the macOS widget gallery.

Command-line build:

```bash
xcodebuild \
  -project apps/macos/DailyVibePlus.xcodeproj \
  -scheme DailyVibePlus \
  -destination 'platform=macOS' \
  build
```

Command-line tests:

```bash
xcodebuild \
  -project apps/macos/DailyVibePlus.xcodeproj \
  -scheme DailyVibePlus \
  -destination 'platform=macOS' \
  test
```

The macOS app and widget do not read raw Claude Code or Codex sessions and do not call any LLM provider. They only display the stable `latest.json` generated by the CLI. See `apps/macos/README.md` for signing, App Group, and usage details.

## Desktop widget integration

The native macOS app and WidgetKit extension are the main path for a system-managed widget. The desktop widget integration is kept as a lightweight local preview or fallback when you do not want to configure Xcode signing and App Groups yet.

It uses Übersicht to place a small report card directly on the desktop.

Install Übersicht:

```bash
brew install --cask ubersicht
```

Export the widget:

```bash
daily-vibe widget export --target ubersicht --report-dir ~/daily-vibe-reports
```

Generate or refresh the latest report when your LLM provider is connected:

```bash
daily-vibe analyze today --out ~/daily-vibe-reports
```

The widget reads only `~/daily-vibe-reports/latest.json`. If your API provider is not working yet, the widget will show a missing-report state until that file exists.

See `integrations/desktop-widget/README.md` for details.


## Development

Install dependencies:

```bash
pnpm install
```

Build:

```bash
pnpm run build
```

Run tests:

```bash
pnpm exec mocha "test/**/*.test.ts"
```

Run lint:

```bash
pnpm run lint
```

Run the full test script:

```bash
pnpm test
```

## Repository

This repository is a clean-history upgrade based on the Daily Vibe project. It keeps the CLI name `daily-vibe` for compatibility while using the package and repository name `daily-vibe-plus`.
