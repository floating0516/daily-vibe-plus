# Daily Vibe Plus

[English](README.md) | **中文**

Daily Vibe Plus 是一个命令行工具，用来把本地 AI 编程会话整理成日报或周报。它会读取 Claude Code、Codex CLI、Codex VS Code 和 SpecStory 的本地历史记录，先对敏感内容做脱敏，再使用你配置的 LLM 生成可读的工作总结。

这个升级版重点改进安全默认值和可控性：支持 dry-run、预览、数据源过滤、配置检查、交互式初始化、更强的脱敏规则，并且默认不会输出包含原始会话结构的 `data.json`。

## 功能

- 生成今日日报和日期范围报告。
- 从问题、修复、工具输出和实现记录中提取知识库内容。
- 对 API key、token、凭据、邮箱、JWT、云服务密钥和私钥做脱敏。
- 对消息内容、metadata、toolRuns 和 fileDiffs 做递归脱敏。
- dry-run 和 preview 模式可以只扫描和估算，不调用 LLM，也不写报告。
- 可以选择 Claude Code、Codex CLI、Codex VS Code 和 SpecStory 数据源。
- 支持 project、exclude-project 和 min-events 过滤。
- 支持 OpenAI、Anthropic 和 OpenAI-compatible generic provider。
- 通过 `daily-vibe config test` 检查配置。
- 通过 `daily-vibe init` 进行交互式初始化。
- 默认不写 raw `data.json`。
- 稳定输出 `latest.md` 和 `latest.json`，方便原生 App 和桌面集成读取。
- 提供原生 macOS App 和 WidgetKit extension，用于系统统一管理的小组件。
- 提供轻量桌面小组件集成，用于本地预览。

## 安装

```bash
pnpm install
pnpm run build
```

本地开发时，在仓库根目录运行：

```bash
node ./bin/run.js --help
```

如果之后发布或全局安装，CLI 命令保持为：

```bash
daily-vibe
```

## 快速开始

### 1. 配置 LLM provider

OpenAI：

```bash
daily-vibe config set --provider openai --api-key sk-your-api-key --model gpt-4o-mini
```

Anthropic：

```bash
daily-vibe config set --provider anthropic --api-key sk-ant-your-api-key --model claude-3-haiku-20240307
```

OpenAI-compatible provider：

```bash
daily-vibe config set \
  --provider generic \
  --base-url https://api.example.com/v1 \
  --api-key sk-your-api-key \
  --model your-model
```

也可以使用交互式初始化：

```bash
daily-vibe init
```

### 2. 检查配置

只做本地检查，不发网络请求：

```bash
daily-vibe config test --skip-llm
```

包含 LLM smoke test：

```bash
daily-vibe config test
```

输出 JSON：

```bash
daily-vibe config test --skip-llm --json
```

### 3. 生成前先预览

预演今日分析：

```bash
daily-vibe analyze today --dry-run
```

预演并输出可解析 JSON：

```bash
daily-vibe analyze today --dry-run --json
```

只预览 Claude Code 数据源：

```bash
daily-vibe analyze today --source claude-code --dry-run --preview
```

### 4. 生成报告

生成今日日报：

```bash
daily-vibe analyze today --out ./reports
```

生成日期范围报告：

```bash
daily-vibe analyze range --from 2026-05-01 --to 2026-05-07 --out ./reports
```

显式写出 raw data：

```bash
daily-vibe analyze today --out ./reports --raw-data
```

使用 `--out` 时，Daily Vibe Plus 默认还会维护稳定的 latest 文件：

```text
./reports/latest.md
./reports/latest.json
```

如需关闭：

```bash
daily-vibe analyze today --out ./reports --no-latest
```

## 命令说明

### `daily-vibe init`

交互式创建或更新 `~/.daily-vibe/config.json`。

它会收集：

- LLM provider。
- 模型。
- Base URL。
- API key。
- 输出目录。
- 时区。
- 启用的数据源。
- 是否默认写出 raw `data.json`。
- 是否启用脱敏。

### `daily-vibe config set`

设置或显示 LLM 配置。

```bash
daily-vibe config set --provider generic --base-url https://api.example.com/v1 --api-key sk-your-api-key --model your-model
daily-vibe config set --show
```

### `daily-vibe config test`

检查配置、脱敏正则、数据源可用性，并可选检查 LLM 连通性。

```bash
daily-vibe config test --skip-llm
daily-vibe config test --json
```

### `daily-vibe sources scan`

扫描本地支持的数据源。

```bash
daily-vibe sources scan
```

支持的数据源：

- `claude-code`: `~/.claude/projects/**/*.jsonl`
- `specstory`: `**/.specstory/history/**/*.md` 和 `**/.specstory/history/**/*.jsonl`
- `codex-cli`: `~/.codex/sessions/**/*.jsonl` 和 `~/.codex/history/**/*.jsonl`
- `codex-vscode`: VS Code global storage 中的 Codex 相关文件

### `daily-vibe analyze today`

分析今天的本地会话。

```bash
daily-vibe analyze today [options]
```

常用选项：

```text
--dry-run                 只扫描、过滤、脱敏和估算 chunk，不调用 LLM，不写文件
--preview                 显示 session 预览
--json                    输出 JSON
--out <directory>         写报告到指定目录
--raw-data                同时写出 data.json
--source <source>         包含某个数据源，可重复
--project <project>       包含某个项目，可重复
--exclude-project <name>  排除某个项目，可重复
--min-events <number>     只包含事件数至少为该值的 session
--provider <provider>     覆盖 provider
--base-url <url>          覆盖 provider base URL
--model <model>           覆盖模型
--no-redact               禁用脱敏
--no-latest               不写 latest.md 和 latest.json
--no-progress             禁用进度输出
```

示例：

```bash
daily-vibe analyze today --dry-run --json
daily-vibe analyze today --source claude-code --project my-project --dry-run
daily-vibe analyze today --out ./reports
daily-vibe analyze today --out ./reports --raw-data
```

### `daily-vibe analyze range`

分析日期范围。

```bash
daily-vibe analyze range --from 2026-05-01 --to 2026-05-07 --out ./reports
```

range 命令支持与 `analyze today` 相同的分析、过滤、脱敏、provider、JSON、preview 和 raw-data 选项。

### `daily-vibe widget export`

导出桌面小组件或本地 dashboard，用来读取 `latest.json`。

```bash
daily-vibe widget export --target ubersicht --report-dir ~/daily-vibe-reports
daily-vibe widget export --target html --out ~/daily-vibe-widget --report-dir ~/daily-vibe-reports
```

常用选项：

```text
--target <target>        html、ubersicht 或 all
--report-dir <dir>      包含 latest.json 的报告目录
--out <dir>             HTML dashboard 输出目录
--ubersicht-dir <dir>   Übersicht widgets 目录
--force                 覆盖已有 widget 文件
```

这个命令不会调用 LLM，只会安装读取 `latest.json` 的展示文件。之后再通过 `daily-vibe analyze today --out` 生成或刷新真实报告。

### `daily-vibe redact test`

测试脱敏规则。

```bash
daily-vibe redact test "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abc.def"
daily-vibe redact test --file ./sample.txt
```

## 输出文件

默认会写出日期目录中的报告文件：

- `daily.md`
- `knowledge.md`

使用 `--out` 时，还会维护稳定的集成文件：

- `latest.md`
- `latest.json`

`data.json` 包含结构化 session 细节，默认不会写出。只有在明确使用 `--raw-data`，或把 `output.writeRawData` 设置为 `true` 时才会写出。

## 配置

默认配置路径：

```text
~/.daily-vibe/config.json
```

示例：

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

也可以通过 cosmiconfig 兼容文件加载配置，但 CLI 的配置命令主要使用 `~/.daily-vibe/config.json`。

## 隐私和安全说明

Daily Vibe Plus 会读取本地 AI 编程会话日志。这些日志可能包含 prompt、工具输出、文件路径、代码片段、token、凭据、私有 URL 和其他敏感数据。

推荐使用流程：

1. 运行 `daily-vibe sources scan`。
2. 运行 `daily-vibe analyze today --dry-run --preview`。
3. 使用 `--source`、`--project`、`--exclude-project` 和 `--min-events` 缩小输入范围。
4. 确认范围后再生成报告。
5. 除非需要结构化调试数据，否则不要使用 `--raw-data`。
6. 不要把生成的 reports 或 raw data 提交到公开仓库。

脱敏可以降低风险，但不是绝对保证。配置的 LLM provider 会收到用于生成总结的已脱敏 session 内容。

## 原生 macOS App 和 WidgetKit

Daily Vibe Plus 现在由三层组成：

```text
daily-vibe CLI
  -> 生成 ~/daily-vibe-reports/latest.json

DailyVibePlus macOS App
  -> 从用户选择的报告目录读取 latest.json
  -> 把安全快照同步到 App Group 容器

DailyVibePlusWidget
  -> 读取 App Group 快照
  -> 作为 macOS 系统统一管理的 WidgetKit 小组件展示
```

原生 App 位于：

```text
apps/macos
```

推荐的本地使用流程：

1. 生成或准备 `~/daily-vibe-reports/latest.json`：

   ```bash
   daily-vibe analyze today --out ~/daily-vibe-reports
   ```

2. 打开 Xcode 项目：

   ```bash
   open apps/macos/DailyVibePlus.xcodeproj
   ```

3. 在 Xcode 中为两个 target 选择同一个开发团队和 App Group：

   ```text
   DailyVibePlus
   DailyVibePlusWidget
   ```

   默认 App Group：

   ```text
   group.com.dailyvibeplus.app
   ```

4. 运行 `DailyVibePlus`，选择 `~/daily-vibe-reports`，然后点击 `Refresh Now`。

5. 从 macOS 小组件库添加 `Daily Vibe Plus`。

命令行构建：

```bash
xcodebuild \
  -project apps/macos/DailyVibePlus.xcodeproj \
  -scheme DailyVibePlus \
  -destination 'platform=macOS' \
  build
```

命令行测试：

```bash
xcodebuild \
  -project apps/macos/DailyVibePlus.xcodeproj \
  -scheme DailyVibePlus \
  -destination 'platform=macOS' \
  test
```

macOS App 和 Widget 不读取 Claude Code 或 Codex 原始会话，也不会调用任何 LLM provider。它们只展示 CLI 生成的稳定 `latest.json`。签名、App Group 和使用细节见 `apps/macos/README.md`。

## 桌面小组件集成

原生 macOS App 和 WidgetKit extension 是系统统一管理小组件的主路径。桌面小组件集成保留为轻量本地预览或 fallback，适合暂时不想配置 Xcode 签名和 App Group 的情况。

它通过 Übersicht 在桌面上放一个小卡片。

安装 Übersicht：

```bash
brew install --cask ubersicht
```

导出 widget：

```bash
daily-vibe widget export --target ubersicht --report-dir ~/daily-vibe-reports
```

LLM provider 接好之后，生成或刷新 latest report：

```bash
daily-vibe analyze today --out ~/daily-vibe-reports
```

widget 只读取 `~/daily-vibe-reports/latest.json`。如果 API 暂时不可用，它会显示缺少报告的状态，等 `latest.json` 生成后会自动显示真实内容。

更多说明见 `integrations/desktop-widget/README.md`。


## 开发

安装依赖：

```bash
pnpm install
```

构建：

```bash
pnpm run build
```

运行测试：

```bash
pnpm exec mocha "test/**/*.test.ts"
```

运行 lint：

```bash
pnpm run lint
```

运行完整测试脚本：

```bash
pnpm test
```

## 仓库说明

这个仓库是基于 Daily Vibe 项目的 clean-history 升级版。为了兼容已有使用方式，CLI 命令仍保留为 `daily-vibe`，package 和仓库名称使用 `daily-vibe-plus`。
