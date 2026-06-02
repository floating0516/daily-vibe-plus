# Desktop widget integration

Daily Vibe Plus can show the latest report as a lightweight desktop widget. This is useful for previewing `latest.json` without signing the native macOS app or configuring App Groups.

The widget reads only this stable file:

```text
~/daily-vibe-reports/latest.json
```

It does not read raw Claude Code or Codex sessions and it does not call any LLM provider.

## Übersicht widget

Install Übersicht:

```bash
brew install --cask ubersicht
```

Export the widget:

```bash
daily-vibe widget export --target ubersicht --report-dir ~/daily-vibe-reports
```

If you need to overwrite an existing widget:

```bash
daily-vibe widget export --target ubersicht --report-dir ~/daily-vibe-reports --force
```

Generate or refresh the latest report:

```bash
daily-vibe analyze today --out ~/daily-vibe-reports
```

Open Übersicht and enable `daily-vibe-plus.jsx` if needed. The widget refreshes every five minutes.

## HTML dashboard

You can also export a small local HTML dashboard:

```bash
daily-vibe widget export --target html --out ~/daily-vibe-widget --report-dir ~/daily-vibe-reports
```

Open:

```text
~/daily-vibe-widget/index.html
```

Some browsers block local `file://` reads of `latest.json`. If that happens, use the Übersicht widget for the desktop experience.

## Testing without an API

The desktop widget only needs `latest.json`. If your API provider is not connected yet, you can still test the export flow and the missing-report state. Once `daily-vibe analyze today --out ~/daily-vibe-reports` succeeds, the same widget will show the real report automatically.

## Custom paths

Use `--report-dir` if your reports live somewhere else:

```bash
daily-vibe widget export --target ubersicht --report-dir /path/to/reports
```

Use `--ubersicht-dir` if Übersicht uses a non-default widgets directory:

```bash
daily-vibe widget export --target ubersicht --ubersicht-dir /path/to/widgets
```
