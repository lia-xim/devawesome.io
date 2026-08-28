import { parseDelimited } from "./workbench-core.js";

function cell(row, index) { return index === undefined || index === null || Number(index) < 0 ? "" : String(row[Number(index)] ?? "").trim(); }
function containsNoindex(value) { return /(?:^|[,;\s])noindex(?:[,;\s]|$)/i.test(value); }
function saysBlocked(value) { return /blocked|disallow|not allowed|false|0/i.test(value) && !/unblocked|allowed|true/i.test(value); }
function sameUrl(a, b) { try { return new URL(a).href === new URL(b, a).href; } catch { return a === b; } }

export function classifyIndexabilityRow(row, mapping) {
  const url = cell(row, mapping.url);
  const status = cell(row, mapping.status);
  const canonical = cell(row, mapping.canonical);
  const meta = cell(row, mapping.metaRobots);
  const header = cell(row, mapping.xRobotsTag);
  const robots = cell(row, mapping.robotsStatus);
  const contentType = cell(row, mapping.contentType);
  const missing = [];
  if (!url) missing.push("URL");
  if (!status) missing.push("status code");
  if (mapping.metaRobots < 0 && mapping.xRobotsTag < 0) missing.push("index directive column");
  if (mapping.robotsStatus < 0) missing.push("robots status column");
  if (missing.length) return { url: url || "(missing URL)", category: "not-enough-evidence", label: "Not enough evidence", reason: `Missing ${missing.join(", ")}` };
  const noindex = containsNoindex(meta) || containsNoindex(header);
  const blocked = saysBlocked(robots);
  const numericStatus = Number.parseInt(status, 10);
  const nonHtml = contentType && !/html|xhtml/i.test(contentType);
  const canonicalElsewhere = canonical && !sameUrl(url, canonical);
  const conflicts = [];
  if (blocked && noindex) conflicts.push("robots blocks the crawler that would need to see noindex");
  if (numericStatus >= 300 && numericStatus < 400 && canonical) conflicts.push("redirect response also declares a canonical");
  if (conflicts.length) return { url, category: "conflicting-signals", label: "Conflicting signals", reason: conflicts.join("; ") };
  if (!Number.isFinite(numericStatus) || numericStatus < 200 || numericStatus >= 300 || nonHtml) return { url, category: "non-indexable-response", label: "Non-indexable response", reason: nonHtml ? `Content type is ${contentType}` : `HTTP status is ${status}` };
  if (noindex) return { url, category: "noindex", label: "Excluded by noindex", reason: containsNoindex(meta) ? "Meta robots contains noindex" : "X-Robots-Tag contains noindex" };
  if (blocked) return { url, category: "crawl-blocked", label: "Crawl blocked", reason: `robots status is ${robots}` };
  if (canonicalElsewhere) return { url, category: "canonical-elsewhere", label: "Canonical points elsewhere", reason: `Canonical: ${canonical}` };
  return { url, category: "technically-eligible", label: "Technically eligible", reason: "The supplied response signals do not contain a technical exclusion" };
}

export function analyzeIndexabilityBatch(input, { delimiter = "auto", hasHeader = true, mapping = {} } = {}) {
  const parsed = parseDelimited(input, delimiter);
  const headers = hasHeader ? (parsed[0] || []) : Array.from({ length: Math.max(0, ...parsed.map((row) => row.length)) }, (_, index) => `Column ${index + 1}`);
  const rows = (hasHeader ? parsed.slice(1) : parsed).filter((row) => row.some((value) => String(value).trim())).map((row) => classifyIndexabilityRow(row, mapping));
  const counts = Object.fromEntries([...new Set(rows.map((row) => row.category))].map((category) => [category, rows.filter((row) => row.category === category).length]));
  return { schemaVersion: 1, headers, rows, counts, boundary: "Technically eligible does not mean indexed, selected as canonical, ranking, or receiving traffic." };
}

function csvCell(value) { const text = String(value ?? ""); return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
export function formatIndexabilityBatch(report, format = "csv") {
  if (format === "json") return JSON.stringify(report, null, 2);
  return [["url", "group", "reason"], ...report.rows.map((row) => [row.url, row.label, row.reason])].map((row) => row.map(csvCell).join(",")).join("\n");
}
