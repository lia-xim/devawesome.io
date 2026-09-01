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
import { createRunManifest, stableJson, verifyRunManifest } from "../../public/workbench-run-manifests.js";
import { buildCrawlPlan } from "../../public/crawl-plan-core.js";
import { analyzeIndexabilityBatch } from "../../public/indexability-batch-core.js";
import { analyzeMcpSession } from "../../public/mcp-session-core.js";
import { createRecipe, preflightRecipe } from "../../public/workbench-recipes.js";
import { mappingForColumn, profileTabularInput } from "../../public/workbench-tabular.js";

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const resultPath = join(root, "reports", "field-tests", "workbench-core-contract-2026-08-28.json");
const capture = process.argv.includes("--capture");
const cases = [];
const fixture = (...parts) => join(root, "public", "fixtures", ...parts);
const normalizeLineEndings = (value) => value.replace(/\r\n?/g, "\n");
const keywordInput = await readFile(fixture("keyword-import-conflicts.input.csv"), "utf8");
const keywordExpected = normalizeLineEndings(await readFile(fixture("keyword-import-conflicts.expected.csv"), "utf8")).trim();
const keywordRecipe = JSON.parse(await readFile(fixture("keyword-import-conflicts.recipe.json"), "utf8"));
const crawlInput = await readFile(fixture("crawl-scope.input.txt"), "utf8");
const crawlExpected = normalizeLineEndings(await readFile(fixture("crawl-scope.expected.txt"), "utf8")).trim();
const crawlExcludedExpected = normalizeLineEndings(await readFile(fixture("crawl-scope.excluded.csv"), "utf8")).trim();
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

runCase("crawl-plan-groups", "Does the crawl plan preserve the winning robots rule and every non-target group?", () => {
  const prepared = prepareCrawlList("https://example.com/public\nhttps://example.com/private/report\nhttps://example.com/file.pdf\nnot-a-url", { mode: "lines" });
  const plan = buildCrawlPlan(prepared, { robots: "User-agent: *\nDisallow: /private/", userAgent: "Googlebot" });
  assert.equal(plan.counts.allowed, 1);
  assert.equal(plan.counts.blocked, 1);
  assert.equal(plan.counts.resource, 1);
  assert.equal(plan.counts.invalid, 1);
  assert.equal(plan.rows.find((row) => row.category === "blocked").winningRule, "Disallow: /private/");
  return { counts: plan.counts, winningRule: plan.rows.find((row) => row.category === "blocked").winningRule };
});

runCase("recipe-column-preflight", "Does a recipe identify a moved column by name instead of silently reusing its old position?", () => {
  const source = profileTabularInput("keyword,volume,intent\nseo audit,100,info", { mode: ",", hasHeader: true });
  const recipe = createRecipe("keyword-import", { keywordColumn: 0 }, { columnMappings: [mappingForColumn("keywordColumn", "Keyword column", source.profiles[0])], workflowVersion: "2.0.0", compatibleWorkflowVersions: ["2.x"] });
  const reordered = profileTabularInput("volume,keyword,intent\n100,seo audit,info", { mode: ",", hasHeader: true });
  const preflight = preflightRecipe(recipe, { workflowVersion: "2.0.0", profiles: reordered.profiles });
  assert.equal(preflight.canApply, true);
  assert.equal(preflight.resolvedSettings.keywordColumn, 1);
  assert.ok(preflight.messages.some((message) => message.text.includes("moved from column 1 to 2")));
  return { canApply: preflight.canApply, resolvedKeywordColumn: preflight.resolvedSettings.keywordColumn, messages: preflight.messages.length };
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

runCase("batch-indexability", "Does a crawler export separate technical eligibility from noindex, robots, canonical, and conflicting signals?", () => {
  const input = "URL,Status,Canonical,Meta,X-Robots,Robots,Content Type\nhttps://example.com/,200,https://example.com/,index,,Allowed,text/html\nhttps://example.com/a,200,https://example.com/a,noindex,,Allowed,text/html\nhttps://example.com/b,200,https://example.com/b,noindex,,Blocked,text/html\nhttps://example.com/c,200,https://example.com/other,index,,Allowed,text/html";
  const report = analyzeIndexabilityBatch(input, { delimiter: ",", hasHeader: true, mapping: { url: 0, status: 1, canonical: 2, metaRobots: 3, xRobotsTag: 4, robotsStatus: 5, contentType: 6 } });
  assert.equal(report.counts["technically-eligible"], 1);
  assert.equal(report.counts.noindex, 1);
  assert.equal(report.counts["conflicting-signals"], 1);
  assert.equal(report.counts["canonical-elsewhere"], 1);
  return { counts: report.counts, boundary: report.boundary };
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

runCase("mcp-session-pairing", "Does the MCP session analyzer pair messages and expose unanswered and orphaned IDs?", () => {
  const input = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2026-07-28", capabilities: { sampling: {} } } },
    { jsonrpc: "2.0", id: 1, result: { protocolVersion: "2026-07-28", capabilities: { tools: {} } } },
    { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
    { jsonrpc: "2.0", id: 9, error: { code: -32601, message: "Unknown request" } },
  ].map((value) => JSON.stringify(value)).join("\n");
  const report = analyzeMcpSession(input, { protocolVersion: "2026-07-28" });
  assert.equal(report.summary.pairs, 1);
  assert.equal(report.summary.unansweredRequests, 1);
  assert.equal(report.summary.orphanResponses, 1);
  assert.equal(report.summary.errors, 1);
  assert.deepEqual(report.capabilities.server, ["tools"]);
  return { summary: report.summary, versions: report.negotiatedVersions, capabilities: report.capabilities };
});

try {
  const manifest = await createRunManifest({
    workflow: "keyword-import",
    workflowVersion: "2.0.0",
    sourceType: "fixture",
    settings: { mode: ",", hasHeader: true },
    input: "private keyword,10",
    output: "private keyword",
    outputFormat: "csv",
    summary: { outputRows: 1 },
  });
  const serialized = JSON.stringify(manifest);
  assert.equal(manifest.kind, "devawesome-workbench-run-manifest");
  assert.equal(manifest.receipts.input.sha256, "ea32a2bd236f7c540f8112f89dd1cb3a37e5f83771e6d78a51cb3d3d6afaf942");
  assert.equal(manifest.receipts.output.sha256, "4b2589a030d1c1733ebfb4bce2a89c40283e264c707762cd1b0c3e74478f8b1e");
  assert.equal(stableJson({ z: 1, a: { y: 2, b: 3 } }), '{"a":{"b":3,"y":2},"z":1}');
  assert.ok(!serialized.includes("private keyword"));
  const match = await verifyRunManifest(manifest, { input: "private keyword,10", output: "private keyword" });
  const changed = await verifyRunManifest(manifest, { input: "private keyword,10", output: "changed output" });
  assert.equal(match.status, "MATCH");
  assert.equal(changed.status, "OUTPUT CHANGED");
  cases.push({ id: "run-manifest-privacy", question: "Does a run manifest bind input, settings, and output without embedding source or export contents?", status: "passed", observed: { inputBytes: manifest.receipts.input.bytes, outputBytes: manifest.receipts.output.bytes, hashes: 3, rawContentsIncluded: false } });
} catch (error) {
  cases.push({ id: "run-manifest-privacy", question: "Does a run manifest bind input, settings, and output without embedding source or export contents?", status: "failed", observed: { error: error.message } });
}

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
