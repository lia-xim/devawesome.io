import { resolveRobotsPath, testRobots } from "./workbench-core.js";

const labels = {
  allowed: "Crawl allowed",
  blocked: "Blocked by robots.txt",
  "outside-scope": "Outside host scope",
  "excluded-pattern": "Excluded by pattern",
  invalid: "Invalid URL",
  resource: "Resource instead of HTML page",
  review: "Needs manual review",
};

export function buildCrawlPlan(result, { robots = "", userAgent = "Googlebot" } = {}) {
  const rows = [];
  for (const entry of result.entries || []) {
    if (entry.resourceType !== "page") {
      rows.push({ url: entry.normalized, category: "resource", label: labels.resource, reason: `Classified as ${entry.resourceType}`, userAgent, winningRule: "Not evaluated" });
      continue;
    }
    if (!robots.trim()) {
      rows.push({ url: entry.normalized, category: "review", label: labels.review, reason: "No robots.txt rules were supplied", userAgent, winningRule: "Not evaluated" });
      continue;
    }
    const robotsResult = testRobots(robots, userAgent, resolveRobotsPath(entry.normalized));
    if (!robotsResult.allowed) {
      rows.push({ url: entry.normalized, category: "blocked", label: labels.blocked, reason: `Matched user-agent group: ${robotsResult.group}`, userAgent, winningRule: robotsResult.rule });
    } else if (entry.warnings?.length) {
      rows.push({ url: entry.normalized, category: "review", label: labels.review, reason: entry.warnings.join("; "), userAgent, winningRule: robotsResult.rule });
    } else rows.push({ url: entry.normalized, category: "allowed", label: labels.allowed, reason: `Matched user-agent group: ${robotsResult.group}`, userAgent, winningRule: robotsResult.rule });
  }
  for (const entry of result.excluded || []) {
    const category = /pattern/i.test(entry.reason) ? "excluded-pattern" : "outside-scope";
    rows.push({ url: entry.normalized, category, label: labels[category], reason: entry.reason, userAgent, winningRule: "Not evaluated" });
  }
  for (const entry of result.invalid || []) rows.push({ url: entry.entry, category: "invalid", label: labels.invalid, reason: entry.reason, userAgent, winningRule: "Not evaluated" });
  const counts = Object.fromEntries(Object.keys(labels).map((key) => [key, rows.filter((row) => row.category === key).length]));
  return { schemaVersion: 1, userAgent, robotsSupplied: Boolean(robots.trim()), counts, rows };
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function formatCrawlPlan(plan, format = "csv") {
  if (format === "json") return JSON.stringify(plan, null, 2);
  return [["url", "result", "reason", "user_agent", "winning_rule"], ...plan.rows.map((row) => [row.url, row.label, row.reason, row.userAgent, row.winningRule])].map((row) => row.map(csvCell).join(",")).join("\n");
}
