export const refreshFrequency = 300_000

const reportJsonPath = '__REPORT_JSON_PATH__'
const escapedPath = reportJsonPath.replaceAll('"', String.raw`\"`)

export const command = `REPORT_JSON_PATH="${escapedPath}" node -e '
const fs = require("node:fs")
const file = process.env.REPORT_JSON_PATH
try {
  if (!fs.existsSync(file)) {
    console.log(JSON.stringify({file, message: "No latest report found", status: "missing"}))
    process.exit(0)
  }
  const data = JSON.parse(fs.readFileSync(file, "utf8"))
  console.log(JSON.stringify({status: "ok", ...data}))
} catch (error) {
  console.log(JSON.stringify({file, message: String(error && error.message || error), status: "invalid"}))
}
'`

function truncate(value, max = 120) {
  if (!value) return ''
  return value.length > max ? `${value.slice(0, max - 3)}...` : value
}

function itemList(items, limit) {
  return (Array.isArray(items) ? items : []).slice(0, limit)
}

export const render = ({output}) => {
  let data
  try {
    data = JSON.parse(output || '{}')
  } catch {
    data = {message: 'Widget command returned invalid JSON', status: 'invalid'}
  }

  if (data.status === 'missing') {
    return <div className="card muted">
      <div className="title">Daily Vibe Plus</div>
      <div className="summary">No latest report found.</div>
      <div className="hint">Run: daily-vibe analyze today --out ~/daily-vibe-reports</div>
    </div>
  }

  if (data.status === 'invalid') {
    return <div className="card error">
      <div className="title">Daily Vibe Plus</div>
      <div className="summary">Could not read latest.json.</div>
      <div className="hint">{truncate(data.message, 160)}</div>
    </div>
  }

  const highlights = itemList(data.highlights, 5)
  const blockers = itemList(data.blockers, 3)
  const stats = data.stats || {}

  return <div className="card">
    <div className="header">
      <div>
        <div className="eyebrow">Daily Vibe Plus</div>
        <div className="title">{data.date || 'Latest report'}</div>
      </div>
      <div className="badge">{stats.totalSessions ?? 0} sessions</div>
    </div>

    <div className="summary">{truncate(data.summary || 'No summary available.', 180)}</div>

    {highlights.length > 0 && <div className="section">
      <div className="sectionTitle">Highlights</div>
      {highlights.map((item, index) => <div className="item" key={`h-${index}`}>{truncate(item, 110)}</div>)}
    </div>}

    {blockers.length > 0 && <div className="section blockers">
      <div className="sectionTitle">Blockers</div>
      {blockers.map((item, index) => <div className="item" key={`b-${index}`}>{truncate(item, 110)}</div>)}
    </div>}

    <div className="stats">
      <span>{stats.totalEvents ?? 0} events</span>
      <span>{stats.totalProblems ?? 0} problems</span>
    </div>
    <div className="updated">Updated: {data.updatedAt || 'unknown'}</div>
  </div>
}

export const className = `
  left: 32px;
  top: 96px;
  width: 360px;
  color: rgba(35, 39, 55, 0.92);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif;

  .card {
    position: relative;
    overflow: hidden;
    box-sizing: border-box;
    width: 360px;
    padding: 18px;
    border-radius: 30px;
    background:
      radial-gradient(circle at 12% 0%, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0) 34%),
      radial-gradient(circle at 88% 12%, rgba(184, 224, 255, 0.88), rgba(184, 224, 255, 0) 38%),
      radial-gradient(circle at 72% 100%, rgba(255, 204, 229, 0.72), rgba(255, 204, 229, 0) 42%),
      linear-gradient(145deg, rgba(255, 255, 255, 0.72), rgba(224, 237, 255, 0.54) 46%, rgba(255, 239, 247, 0.58));
    border: 1px solid rgba(255, 255, 255, 0.74);
    box-shadow:
      0 24px 60px rgba(83, 116, 160, 0.24),
      0 8px 22px rgba(177, 104, 151, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(34px) saturate(1.65);
  }

  .card::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(120deg, rgba(255, 255, 255, 0.68), rgba(255, 255, 255, 0) 32%);
  }

  .card > * {
    position: relative;
    z-index: 1;
  }

  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .eyebrow, .updated, .hint {
    color: rgba(67, 73, 93, 0.58);
    font-size: 11px;
    line-height: 1.4;
  }

  .eyebrow {
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .title {
    margin-top: 3px;
    color: rgba(26, 30, 45, 0.94);
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.03em;
  }

  .badge {
    flex: 0 0 auto;
    padding: 6px 10px;
    border-radius: 999px;
    background: linear-gradient(135deg, rgba(103, 123, 255, 0.78), rgba(180, 137, 255, 0.72));
    color: rgba(255, 255, 255, 0.96);
    box-shadow: 0 8px 18px rgba(112, 101, 220, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.34);
    font-size: 11px;
    font-weight: 700;
  }

  .summary {
    margin-top: 14px;
    color: rgba(35, 39, 55, 0.86);
    font-size: 14px;
    font-weight: 650;
    line-height: 1.5;
  }

  .section {
    margin-top: 15px;
  }

  .sectionTitle {
    margin-bottom: 8px;
    color: rgba(74, 80, 104, 0.58);
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.13em;
  }

  .item {
    margin-top: 7px;
    padding: 10px 12px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.44);
    border: 1px solid rgba(255, 255, 255, 0.54);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72), 0 8px 20px rgba(111, 141, 176, 0.12);
    color: rgba(39, 43, 58, 0.86);
    font-size: 13px;
    font-weight: 620;
    line-height: 1.38;
  }

  .blockers .item {
    background: linear-gradient(135deg, rgba(255, 245, 222, 0.62), rgba(255, 221, 235, 0.48));
    border-color: rgba(255, 255, 255, 0.56);
  }

  .stats {
    display: flex;
    gap: 10px;
    margin-top: 15px;
    color: rgba(66, 72, 94, 0.68);
    font-size: 12px;
    font-weight: 700;
  }

  .updated {
    margin-top: 10px;
    font-weight: 650;
  }

  .muted .summary, .error .summary {
    color: rgba(35, 39, 55, 0.72);
  }

  .error {
    border-color: rgba(255, 150, 150, 0.58);
  }
`
