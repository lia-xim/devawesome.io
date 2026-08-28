import assert from "node:assert/strict";
import { arch, platform, release } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  analyzeMcpMessage,
  compareMcpExpectedActual,
  compareMcpPair,
  diagnoseIndexability,
  extractIndexabilitySignals,
  formatCrawlList,
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
const fixture = (...parts) => join(root, "public", "fixtures", ...parts);
const keywordInput = await readFile(fixture("keyword-import-conflicts.input.csv"), "utf8");
const keywordExpected = (await readFile(fixture("keyword-import-conflicts.expected.csv"), "utf8")).trim();
const keywordRecipe = JSON.parse(await readFile(fixture("keyword-import-conflicts.recipe.json"), "utf8"));
const crawlInput = await readFile(fixture("crawl-scope.input.txt"), "utf8");
const crawlExpected = (await readFile(fixture("crawl-scope.expected.txt"), "utf8")).trim();
const crawlExcludedExpected = (await readFile(fixture("crawl-scope.excluded.csv"), "utf8")).trim();
const crawlRecipe = JSON.parse(await readFile(fixture("crawl-scope.recipe.json"), "utf8"));
const indexInput = JSON.parse(await readFile(fixture("indexability-evidence.input.json"), "utf8"));
const indexExpected = JSON.parse(await readFile(fixture("indexability-evidence.expected.json"), "utf8"));
const mcpExpected = await readFile(fixture("mcp-expected.json"), "utf8");
const mcpActual = await readFile(fixture("mcp-actual.json"), "utf8");

function runCase(id, question, execute) {
  try {
    const observed = execute();
    cases.push({ id, question, status: "passed", observed });
  } catch (error) {
    cases.push({ id, question, status: "failed", observed: { error: error.message } });
  }
}

runCase("keyword-conflict-review", "Does keyword cleanup expose conflicting duplicate metadata and apply the saved decision?", () => {
  const unresolved = prepareKeywordImport(keywordInput, { ...keywordRecipe.settings, duplicateStrategy: "manual", conflictResolutions: {} });
  assert.equal(unresolved.unresolvedConflicts, 1);
  assert.equal(unresolved.conflicts[0].keyword, "technical seo audit");
  const result = prepareKeywordImport(keywordInput, keywordRecipe.settings);
  assert.equal(result.rows.length, 2);
  assert.equal(result.duplicates, 2);
  assert.equal(result.ignored, 1);
  assert.equal(result.unresolvedConflicts, 0);
  assert.equal(formatKeywordImport(result, "contextter"), keywordExpected);
  return { cleanRows: result.rows.length, duplicateRows: result.duplicates, conflicts: result.conflicts.length, unresolvedBeforeDecision: unresolved.unresolvedConflicts, selectedResolution: result.conflicts[0].resolution };
});

runCase("line-mode-first-entry", "Do line-based keyword and crawl inputs keep their first entry even when a previous table setting marked the first row as a header?", () => {
  const keywords = prepareKeywordImport("first keyword\nsecond keyword", { mode: "lines", hasHeader: true });
  const urls = prepareCrawlList("https://example.com/first\nhttps://example.com/second", { mode: "lines", hasHeader: true });
  assert.deepEqual(keywords.rows.map((row) => row.keyword), ["first keyword", "second keyword"]);
  assert.deepEqual(urls.entries.map((entry) => entry.normalized), ["https://example.com/first", "https://example.com/second"]);
  return { keywordRows: keywords.rows.length, crawlTargets: urls.entries.length, firstKeyword: keywords.rows[0].keyword, firstUrl: urls.entries[0].normalized };
});

runCase("crawl-scope", "Does crawl preparation enforce host, protocol, include, and exclude rules while preserving rejection reasons?", () => {
  const result = prepareCrawlList(crawlInput, crawlRecipe.settings);
  assert.equal(formatCrawlList(result, "lines"), crawlExpected);
  assert.equal(formatCrawlList(result, "excluded"), crawlExcludedExpected);
  assert.equal(result.duplicates, 1);
  assert.equal(result.invalid.length, 1);
  assert.equal(result.excluded.length, 4);
  assert.deepEqual(result.resourceTypes, [{ type: "page", count: 1 }]);
  return { crawlTargets: result.entries.length, excludedWithReasons: result.excluded.length, duplicatesRemoved: result.duplicates, invalidEntries: result.invalid.length, resourceTypes: result.resourceTypes };
});

runCase("sitemap-index-boundary", "Does a pasted sitemap index stay separate from page crawl targets?", () => {
  const input = '<sitemapindex><sitemap><loc>https://example.com/posts.xml</loc></sitemap><sitemap><loc>https://example.com/pages.xml</loc></sitemap></sitemapindex>';
  const result = prepareCrawlList(input, { mode: "sitemap", includeSitemapFiles: false });
  assert.equal(result.sourceType, "sitemap-index");
  assert.equal(result.entries.length, 0);
  assert.equal(result.excluded.length, 2);
  return { sourceType: result.sourceType, childSitemaps: result.excluded.length, pageTargets: result.entries.length };
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

runCase("indexability-evidence-extraction", "Does pasted response evidence produce the declared status, canonical, robots, and index signals?", () => {
  const extracted = extractIndexabilitySignals(indexInput);
  assert.deepEqual(extracted.signals, indexExpected);
  assert.ok(extracted.evidence.length >= 4);
  return { signals: extracted.signals, evidenceItems: extracted.evidence.length, warnings: extracted.warnings };
});

runCase("mcp-correction", "Does the MCP lab identify and repair core tools/call structure?", () => {
  const input = { id: 7, method: "tools/call", params: { name: "crawl_page", arguments: "https://example.com" } };
  const result = analyzeMcpMessage(input, "auto", "2026-07-28");
  assert.equal(result.type, "tools-call-request");
  assert.equal(result.valid, false);
  assert.equal(result.corrected.jsonrpc, "2.0");
  assert.deepEqual(result.corrected.params.arguments, {});
  assert.equal(result.corrected.params._meta["io.modelcontextprotocol/protocolVersion"], "2026-07-28");
  const pair = compareMcpPair({ jsonrpc: "2.0", id: 7, method: "tools/list", params: {} }, { jsonrpc: "2.0", id: 8, result: { tools: [] } });
  assert.equal(pair.valid, false);
  const expectedActual = compareMcpExpectedActual(mcpExpected, mcpActual);
  assert.equal(expectedActual.valid, true);
  return { detectedType: result.type, protocolVersion: result.protocolVersion, errors: result.issues.filter((entry) => entry.level === "error").length, correctedArgumentsType: typeof result.corrected.params.arguments, mismatchedPairDetected: !pair.valid, expectedShapeMatched: expectedActual.valid };
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
    "These downloadable deterministic fixtures exercise parsing and decision logic. They do not crawl a live URL, query a search engine, or contact an MCP server.",
    "The keyword fixture proves that conflicting metadata becomes visible and requires an explicit resolution; the receiving importer still requires a user-reviewed column mapping.",
    "The MCP checks cover selected version-specific core fields and expected-shape comparison, not the complete normative schema or a real client/server exchange.",
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
