import assert from "node:assert/strict";
import { arch, platform, release } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  analyzeMcpMessage,
  compareMcpPair,
  diagnoseIndexability,
  formatKeywordImport,
  prepareCrawlList,
  prepareKeywordImport,
  resolveRobotsPath,
  testRobots,
} from "../../public/workbench-core.js";

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const resultPath = join(root, "reports", "field-tests", "workbench-core-contract-2026-08-28.json");
const capture = process.argv.includes("--capture");
const cases = [];

function runCase(id, question, execute) {
  try {
    const observed = execute();
    cases.push({ id, question, status: "passed", observed });
  } catch (error) {
    cases.push({ id, question, status: "failed", observed: { error: error.message } });
  }
}

runCase("keyword-table", "Does table mapping preserve selected columns while cleaning keyword rows?", () => {
  const input = 'keyword,volume,list\n"running shoes, women",1200,Commercial\nTrail Running Shoes,800,Commercial\ntrail running shoes,800,Commercial\n/,0,Noise';
  const result = prepareKeywordImport(input, { mode: ",", hasHeader: true, keywordColumn: 0, retainedColumns: [1, 2], ignoreCase: true, stripNoise: true, whitespace: true });
  assert.equal(result.rows.length, 2);
  assert.equal(result.duplicates, 1);
  assert.equal(result.ignored, 1);
  assert.deepEqual(result.rows[0], { keyword: "running shoes, women", values: ["1200", "Commercial"], source: ["running shoes, women", "1200", "Commercial"] });
  assert.match(formatKeywordImport(result, "contextter"), /^keyword,volume,list/m);
  return { cleanRows: result.rows.length, duplicatesRemoved: result.duplicates, noiseRowsRemoved: result.ignored, retainedHeaders: result.retainedHeaders };
});

runCase("crawl-sitemap", "Does sitemap extraction normalize tracking and group the remaining URLs?", () => {
  const input = '<urlset><url><loc>https://example.com/</loc></url><url><loc>https://example.com/page/?utm_source=test#top</loc></url><url><loc>https://EXAMPLE.com/page</loc></url><url><loc>not a url</loc></url></urlset>';
  const result = prepareCrawlList(input, { mode: "sitemap", queryMode: "tracking", addHttps: true, stripFragment: true, stripTrailing: true });
  assert.deepEqual(result.entries.map((entry) => entry.normalized), ["https://example.com/", "https://example.com/page"]);
  assert.equal(result.duplicates, 1);
  assert.equal(result.invalid.length, 1);
  assert.deepEqual(result.hosts, [{ host: "example.com", count: 2 }]);
  return { uniqueUrls: result.entries.length, duplicatesRemoved: result.duplicates, invalidEntries: result.invalid.length, hosts: result.hosts };
});

runCase("robots-longest-match", "Does the robots evaluator select the longest applicable rule and Allow on an equal tie?", () => {
  const rules = "User-agent: *\nDisallow: /private\nAllow: /private/public";
  const path = resolveRobotsPath("https://example.com/private/public/page");
  const result = testRobots(rules, "Googlebot", path);
  assert.equal(result.allowed, true);
  assert.equal(result.rule, "Allow: /private/public");
  return { path, group: result.group, winningRule: result.rule, allowed: result.allowed };
});

runCase("indexability-noindex", "Does the debugger treat a 200 response with noindex as technically blocked?", () => {
  const result = diagnoseIndexability({ status: "200", canonical: "self", meta: "noindex", header: "index", robots: "allowed" });
  assert.equal(result.state, "blocked");
  assert.match(result.title, /noindex/);
  return { state: result.state, verdict: result.title };
});

runCase("mcp-correction", "Does the MCP lab identify and repair core tools/call structure?", () => {
  const input = { id: 7, method: "tools/call", params: { name: "crawl_page", arguments: "https://example.com" } };
  const result = analyzeMcpMessage(input);
  assert.equal(result.type, "tools-call-request");
  assert.equal(result.valid, false);
  assert.equal(result.corrected.jsonrpc, "2.0");
  assert.deepEqual(result.corrected.params.arguments, {});
  const pair = compareMcpPair({ jsonrpc: "2.0", id: 7, method: "tools/list", params: {} }, { jsonrpc: "2.0", id: 8, result: { tools: [] } });
  assert.equal(pair.valid, false);
  return { detectedType: result.type, errors: result.issues.filter((entry) => entry.level === "error").length, correctedArgumentsType: typeof result.corrected.params.arguments, mismatchedPairDetected: !pair.valid };
});

const allPassed = cases.every((entry) => entry.status === "passed");
if (!allPassed) {
  console.error(JSON.stringify(cases, null, 2));
  process.exit(1);
}

const recorded = {
  schemaVersion: 1,
  id: "workbench-core-contract",
  status: "passed",
  capturedAt: capture ? new Date().toISOString() : null,
  editor: "Matthias Ramahi",
  technicalReview: "Not independently reviewed",
  environment: { platform: platform(), osRelease: release(), architecture: arch(), node: process.version },
  command: "corepack pnpm field-test:workbench",
  cases,
  limits: [
    "These deterministic fixtures exercise parsing and decision logic. They do not crawl a live URL, query a search engine, or contact an MCP server.",
    "The Contextter CSV assertion covers the verified keyword header and retained columns; the receiving importer still requires a user-reviewed column mapping.",
    "Robots, canonical, and indexability results remain bounded to the values supplied to the local functions.",
  ],
};

if (capture) {
  await mkdir(dirname(resultPath), { recursive: true });
  await writeFile(resultPath, JSON.stringify(recorded, null, 2) + "\n", "utf8");
  console.log("Captured workbench core contract:", resultPath);
} else {
  const saved = JSON.parse(await readFile(resultPath, "utf8"));
  assert.equal(saved.status, "passed");
  assert.deepEqual(saved.cases.map((entry) => entry.id), cases.map((entry) => entry.id));
  assert.ok(saved.cases.every((entry) => entry.status === "passed"));
  console.log("Workbench core contract passed: keyword mapping, crawl normalization, robots matching, indexability diagnosis, and MCP correction matched the saved fixtures.");
}
