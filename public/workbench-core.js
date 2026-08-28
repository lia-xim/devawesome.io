const trackingParameter = /^(?:utm_.+|gclid|dclid|fbclid|msclkid|mc_cid|mc_eid)$/i;

function countDelimiter(line, delimiter) {
  let quoted = false;
  let count = 0;
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '"') {
      if (quoted && line[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (!quoted && line[index] === delimiter) count += 1;
  }
  return count;
}

export function detectDelimiter(input) {
  const lines = input.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim()).slice(0, 8);
  if (!lines.length) return null;
  const candidates = ["\t", ",", ";", "|"];
  const scored = candidates.map((delimiter) => {
    const counts = lines.map((line) => countDelimiter(line, delimiter));
    const positive = counts.filter((count) => count > 0);
    const consistency = positive.length > 1 && new Set(positive).size === 1 ? 2 : 0;
    return { delimiter, score: positive.reduce((sum, count) => sum + count, 0) + consistency };
  }).sort((a, b) => b.score - a.score);
  return scored[0].score > 0 ? scored[0].delimiter : null;
}

export function parseDelimited(input, mode = "auto") {
  const delimiter = mode === "lines" ? null : mode === "auto" ? detectDelimiter(input) : mode === "tab" ? "\t" : mode;
  if (!delimiter) return input.replace(/^\uFEFF/, "").split(/\r?\n/).map((value) => [value.trim()]).filter((row) => row[0]);
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  const text = input.replace(/^\uFEFF/, "");
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"') {
      if (quoted && next === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (!quoted && character === delimiter) {
      row.push(value.trim());
      value = "";
    } else if (!quoted && (character === "\n" || character === "\r")) {
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
      if (character === "\r" && next === "\n") index += 1;
    } else value += character;
  }
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function looksLikeHeader(row) {
  const known = /^(?:keyword|keywords|query|search query|search term|term|tag|list|language|country|volume|search volume|kd|difficulty|cpc|intent|url|address|page)$/i;
  return row.some((value) => known.test(value.trim()));
}

function cleanKeyword(value, options) {
  let keyword = String(value ?? "").replace(/^\uFEFF/, "").trim();
  if (options.stripNoise) {
    keyword = keyword
      .replace(/^(?:[-–—•·*▪◦]+|\d{1,4}[.)\]:-])\s+/, "")
      .replace(/^[`'“”‘’]+|[`'“”‘’]+$/g, "")
      .trim();
    if (/^[,;|/\\-]+$/.test(keyword)) return "";
  }
  if (options.whitespace) keyword = keyword.replace(/\s+/g, " ");
  if (options.caseMode === "lower") keyword = keyword.toLocaleLowerCase();
  return keyword;
}

function safeHeader(value, index) {
  return String(value || `Column ${index + 1}`).trim() || `Column ${index + 1}`;
}

export function prepareKeywordImport(input, options = {}) {
  const rows = parseDelimited(input, options.mode || "auto");
  const hasHeader = options.mode === "lines" ? false : options.hasHeader ?? looksLikeHeader(rows[0] || []);
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const headers = hasHeader ? (rows[0] || []).map(safeHeader) : Array.from({ length: width }, (_, index) => `Column ${index + 1}`);
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const keywordColumn = Math.min(Number(options.keywordColumn || 0), Math.max(width - 1, 0));
  const retainedColumns = [...new Set((options.retainedColumns || []).map(Number))].filter((index) => index >= 0 && index < width && index !== keywordColumn);
  const groups = new Map();
  const cleanedRows = [];
  const conflicts = [];
  let ignored = 0;
  let duplicates = 0;
  for (const [rowIndex, row] of dataRows.entries()) {
    const keyword = cleanKeyword(row[keywordColumn], {
      stripNoise: options.stripNoise ?? true,
      whitespace: options.whitespace ?? true,
      caseMode: options.caseMode || "preserve",
    });
    if (!keyword) { ignored += 1; continue; }
    const key = options.ignoreCase === false ? keyword : keyword.toLocaleLowerCase();
    const candidate = { keyword, values: retainedColumns.map((index) => row[index] || ""), source: row, sourceRow: rowIndex + (hasHeader ? 2 : 1) };
    if (!groups.has(key)) groups.set(key, []);
    else duplicates += 1;
    groups.get(key).push(candidate);
  }
  const requestedStrategy = options.duplicateStrategy || "manual";
  const resolutions = options.conflictResolutions || {};
  for (const [key, candidates] of groups) {
    const signatures = new Set(candidates.map((candidate) => JSON.stringify(candidate.values)));
    const hasConflict = signatures.size > 1;
    const strategy = requestedStrategy === "manual" ? resolutions[key] || "unresolved" : requestedStrategy;
    let selected = candidates[0];
    if (strategy === "last") selected = candidates[candidates.length - 1];
    if (strategy === "merge") {
      selected = {
        ...candidates[0],
        values: retainedColumns.map((_, columnIndex) => [...new Set(candidates.map((candidate) => candidate.values[columnIndex]).filter(Boolean))].join(" | ")),
      };
    }
    cleanedRows.push(selected);
    if (hasConflict) {
      conflicts.push({
        id: key,
        keyword: candidates[0].keyword,
        rows: candidates.map((candidate) => ({ sourceRow: candidate.sourceRow, keyword: candidate.keyword, values: candidate.values })),
        differingColumns: retainedColumns.map((_, index) => index).filter((index) => new Set(candidates.map((candidate) => candidate.values[index])).size > 1),
        resolution: strategy,
        unresolved: strategy === "unresolved",
      });
    }
  }
  return {
    inputRows: dataRows.length,
    headers,
    keywordColumn,
    retainedColumns,
    retainedHeaders: retainedColumns.map((index) => headers[index]),
    rows: cleanedRows,
    ignored,
    duplicates,
    conflicts,
    unresolvedConflicts: conflicts.filter((conflict) => conflict.unresolved).length,
    duplicateStrategy: requestedStrategy,
    detectedDelimiter: options.mode === "auto" ? detectDelimiter(input) : options.mode || "lines",
    hasHeader,
  };
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function formatKeywordImport(result, format = "txt") {
  if (format === "txt") return result.rows.map((row) => row.keyword).join("\n");
  const headers = [format === "contextter" ? "keyword" : result.headers[result.keywordColumn] || "keyword", ...result.retainedHeaders];
  const rows = result.rows.map((row) => [row.keyword, ...row.values]);
  if (format === "json") {
    return JSON.stringify(rows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""]))), null, 2);
  }
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function decodeXml(value) {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

export function extractUrlRows(input, options = {}) {
  const mode = options.mode || "auto";
  const xmlMatches = [...input.matchAll(/<loc(?:\s[^>]*)?>([\s\S]*?)<\/loc>/gi)].map((match) => decodeXml(match[1]));
  if (mode === "sitemap" || (mode === "auto" && xmlMatches.length)) {
    const sitemapType = /<sitemapindex(?:\s|>)/i.test(input) ? "index" : /<urlset(?:\s|>)/i.test(input) ? "urlset" : "unknown";
    return { rows: xmlMatches.map((value) => [value]), headers: ["URL"], urlColumn: 0, sourceType: sitemapType === "index" ? "sitemap-index" : "sitemap", sitemapType, inputRows: xmlMatches.length };
  }
  const rows = parseDelimited(input, mode === "table" ? "auto" : mode);
  const hasHeader = mode === "lines" ? false : options.hasHeader ?? looksLikeHeader(rows[0] || []);
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const headers = hasHeader ? (rows[0] || []).map(safeHeader) : Array.from({ length: width }, (_, index) => `Column ${index + 1}`);
  const dataRows = hasHeader ? rows.slice(1) : rows;
  return {
    rows: dataRows,
    headers,
    urlColumn: Math.min(Number(options.urlColumn || 0), Math.max(width - 1, 0)),
    sourceType: width > 1 ? "table" : "list",
    inputRows: dataRows.length,
  };
}

function compileScopePatterns(value) {
  return String(value || "").split(/[\r\n,]+/).map((entry) => entry.trim()).filter(Boolean).map((pattern) => {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*");
    return new RegExp(escaped, "i");
  });
}

function classifyUrl(url) {
  const path = url.pathname.toLowerCase();
  if (/sitemap(?:[-_.]|$)|\.xml$/i.test(path)) return "sitemap";
  if (/\.(?:png|jpe?g|gif|webp|avif|svg|ico)$/i.test(path)) return "image";
  if (/\.(?:js|mjs|cjs)$/i.test(path)) return "script";
  if (/\.css$/i.test(path)) return "stylesheet";
  if (/\.(?:pdf|docx?|xlsx?|pptx?)$/i.test(path)) return "document";
  if (/\.(?:zip|gz|tgz|rar|7z)$/i.test(path)) return "archive";
  if (/\.(?:rss|atom)$/i.test(path) || /\/(?:feed|rss)(?:\/|$)/i.test(path)) return "feed";
  return "page";
}

function unwrapUrlEntry(raw) {
  let value = String(raw ?? "").replace(/^\uFEFF/, "").trim().replace(/^(?:[-–—•·*▪◦]+|\d{1,4}[.)\]:-])\s+/, "");
  const markdown = value.match(/^\[[^\]]*\]\((https?:\/\/[^)]+)\)$/i);
  if (markdown) value = markdown[1];
  value = value.replace(/^[<`'“”‘’]+|[>`'“”‘’]+$/g, "").trim();
  const embedded = value.match(/(?:https?:\/\/|www\.)[^\s]+/i);
  if (embedded && /\s/.test(value)) value = embedded[0];
  return value.replace(/[.,]+$/, "");
}

export function normalizeUrlEntry(raw, options = {}) {
  let candidate = unwrapUrlEntry(raw);
  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(candidate)) {
    if (options.addHttps === false || !/^(?:www\.)?[^\s/]+\.[^\s]+/i.test(candidate)) throw new Error("Missing a valid HTTP or HTTPS URL");
    candidate = `https://${candidate}`;
  }
  let url;
  try { url = new URL(candidate); }
  catch { throw new Error("Could not parse this entry as a URL"); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP and HTTPS URLs are accepted");
  if (url.username || url.password) throw new Error("URLs with credentials are not accepted");
  if (!url.hostname.includes(".") && url.hostname !== "localhost") throw new Error("The hostname is incomplete");
  const warnings = [];
  if (url.protocol === "http:") warnings.push("Uses HTTP");
  if (url.port) warnings.push("Uses a non-default port");
  if (/[A-Z]/.test(url.pathname)) warnings.push("Mixed-case path");
  if (/%2f/i.test(url.pathname)) warnings.push("Contains an encoded slash");
  if (options.stripFragment !== false) url.hash = "";
  if (options.queryMode === "remove") url.search = "";
  if ((options.queryMode || "tracking") === "tracking") {
    for (const key of [...url.searchParams.keys()]) if (trackingParameter.test(key)) url.searchParams.delete(key);
  }
  if (url.search) warnings.push("Keeps query parameters");
  if (options.stripTrailing !== false && url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
  return { value: url.href, url, warnings };
}

export function prepareCrawlList(input, options = {}) {
  const parsed = extractUrlRows(input, options);
  const seen = new Set();
  const entries = [];
  const invalid = [];
  const excluded = [];
  let duplicates = 0;
  const includePatterns = compileScopePatterns(options.includePatterns);
  const excludePatterns = compileScopePatterns(options.excludePatterns);
  const scopeHost = String(options.scopeHost || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const scopeMode = options.scopeMode || "all";
  const protocolMode = options.protocolMode || "all";
  for (const row of parsed.rows) {
    const raw = row[parsed.urlColumn] || "";
    try {
      const normalized = normalizeUrlEntry(raw, options);
      if (seen.has(normalized.value)) { duplicates += 1; continue; }
      seen.add(normalized.value);
      const resourceType = classifyUrl(normalized.url);
      let exclusionReason = "";
      if (parsed.sitemapType === "index" && options.includeSitemapFiles !== true) exclusionReason = "Child sitemap from a sitemap index; not a page crawl target";
      else if (protocolMode !== "all" && normalized.url.protocol !== `${protocolMode}:`) exclusionReason = `Outside ${protocolMode.toUpperCase()} protocol scope`;
      else if (scopeHost && scopeMode === "exact" && normalized.url.hostname !== scopeHost) exclusionReason = `Outside exact host ${scopeHost}`;
      else if (scopeHost && scopeMode === "subdomains" && normalized.url.hostname !== scopeHost && !normalized.url.hostname.endsWith(`.${scopeHost}`)) exclusionReason = `Outside ${scopeHost} and its subdomains`;
      else if (includePatterns.length && !includePatterns.some((pattern) => pattern.test(normalized.value))) exclusionReason = "Does not match an include pattern";
      else if (excludePatterns.some((pattern) => pattern.test(normalized.value))) exclusionReason = "Matches an exclude pattern";
      const entry = { original: raw, normalized: normalized.value, host: normalized.url.hostname, protocol: normalized.url.protocol.replace(":", ""), path: normalized.url.pathname, query: normalized.url.search, resourceType, warnings: normalized.warnings };
      if (exclusionReason) excluded.push({ ...entry, reason: exclusionReason });
      else entries.push(entry);
    } catch (error) { invalid.push({ entry: raw, reason: error.message }); }
  }
  const hosts = [...entries.reduce((map, entry) => map.set(entry.host, (map.get(entry.host) || 0) + 1), new Map()).entries()]
    .map(([host, count]) => ({ host, count })).sort((a, b) => b.count - a.count || a.host.localeCompare(b.host));
  const suspicious = entries.filter((entry) => entry.warnings.length).map((entry) => ({ url: entry.normalized, reasons: entry.warnings }));
  const resourceTypes = [...entries.reduce((map, entry) => map.set(entry.resourceType, (map.get(entry.resourceType) || 0) + 1), new Map()).entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
  return { ...parsed, entries, invalid, excluded, duplicates, hosts, suspicious, resourceTypes };
}

export function formatCrawlList(result, format = "lines") {
  if (format === "excluded") return [["url", "reason", "resource_type"], ...(result.excluded || []).map((entry) => [entry.normalized, entry.reason, entry.resourceType])].map((row) => row.map(csvCell).join(",")).join("\n");
  if (format === "json") return JSON.stringify(result.entries.map(({ normalized, host, protocol, path, query, resourceType, warnings }) => ({ url: normalized, host, protocol, path, query, resourceType, warnings })), null, 2);
  if (format === "csv") return [["url", "host", "protocol", "path", "query", "resource_type", "warnings"], ...result.entries.map((entry) => [entry.normalized, entry.host, entry.protocol, entry.path, entry.query, entry.resourceType, entry.warnings.join("; ")])].map((row) => row.map(csvCell).join(",")).join("\n");
  return result.entries.map((entry) => entry.normalized).join("\n");
}

function parseRobots(content) {
  const groups = [];
  let agents = [];
  let rules = [];
  let rulesStarted = false;
  const flush = () => {
    if (agents.length) groups.push({ agents: [...agents], rules: [...rules] });
    agents = []; rules = []; rulesStarted = false;
  };
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/\s*#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === "user-agent") { if (rulesStarted) flush(); agents.push(value.toLowerCase()); }
    else if ((field === "allow" || field === "disallow") && agents.length) { rulesStarted = true; if (value) rules.push({ type: field, pattern: value }); }
  }
  flush();
  return groups;
}

export function resolveRobotsPath(value) {
  const target = value.trim();
  if (!target) return "/";
  if (/^https?:\/\//i.test(target)) { const url = new URL(target); return url.pathname + url.search; }
  return target.startsWith("/") ? target : "/" + target;
}

export function testRobots(content, agent, path) {
  const groups = parseRobots(content);
  const agentScore = (token) => token === "*" ? 0 : agent.toLowerCase().includes(token) ? token.length : -1;
  let best = -1;
  const selected = [];
  for (const group of groups) {
    const score = Math.max(...group.agents.map(agentScore));
    if (score > best) { best = score; selected.length = 0; if (score >= 0) selected.push(group); }
    else if (score === best && score >= 0) selected.push(group);
  }
  if (best < 0) return { allowed: true, group: "No matching user-agent group", rule: "No matching rule" };
  const ruleRegex = (pattern) => {
    const anchored = pattern.endsWith("$");
    const source = anchored ? pattern.slice(0, -1) : pattern;
    const escaped = source.replace(/[.+?^$(){}|[\]\\]/g, "\\$&").replaceAll("*", ".*");
    return new RegExp("^" + escaped + (anchored ? "$" : ""));
  };
  const matches = selected.flatMap((group) => group.rules).filter((rule) => ruleRegex(rule.pattern).test(path));
  matches.sort((a, b) => b.pattern.replaceAll("*", "").replace(/\$$/, "").length - a.pattern.replaceAll("*", "").replace(/\$$/, "").length || (a.type === "allow" ? -1 : 1));
  const winner = matches[0];
  return { allowed: !winner || winner.type === "allow", group: selected.flatMap((group) => group.agents).join(", "), rule: winner ? `${winner.type[0].toUpperCase() + winner.type.slice(1)}: ${winner.pattern}` : "No matching rule" };
}

export function diagnoseIndexability(signals) {
  let state = "eligible";
  let title = "Technically eligible";
  let detail = "The supplied signals do not block indexing. Search engines still decide whether and when to index the page.";
  if (signals.status !== "200") {
    state = "blocked";
    title = signals.status === "redirect" ? "This URL is a redirect" : "The response is not indexable";
    detail = signals.status === "redirect" ? "Check the final destination and the complete redirect chain." : "Fix the response or verify that removal is intentional.";
  } else if (signals.meta === "noindex" || signals.header === "noindex") {
    state = "blocked";
    title = "Blocked by a noindex directive";
    detail = signals.meta === "noindex" ? "The meta robots value asks search engines not to index this page." : "The X-Robots-Tag asks search engines not to index this response.";
  } else if (signals.robots === "blocked") {
    state = "warning";
    title = "Crawling is blocked";
    detail = "A crawler may be unable to fetch the page and process its current canonical or noindex directives.";
  } else if (signals.canonical === "other") {
    state = "warning";
    title = "Canonical points elsewhere";
    detail = "The supplied canonical asks search engines to consolidate signals with another URL.";
  } else if (signals.canonical === "missing") {
    state = "warning";
    title = "Eligible, with no declared canonical";
    detail = "No supplied signal blocks indexing, but the page does not declare its preferred URL in this test.";
  }
  return { state, title, detail, checks: [
    ["HTTP response", signals.status === "200" ? "Pass" : "Check"],
    ["Meta robots", signals.meta === "noindex" ? "Noindex" : "Pass"],
    ["X-Robots-Tag", signals.header === "noindex" ? "Noindex" : "Pass"],
    ["Robots access", signals.robots === "blocked" ? "Blocked" : "Allowed"],
    ["Canonical", signals.canonical === "self" ? "Self" : signals.canonical === "other" ? "Other URL" : "Missing"],
  ] };
}

function readHtmlAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match ? match[1] ?? match[2] ?? match[3] ?? "" : "";
}

export function extractIndexabilitySignals({ url = "", headers = "", html = "", robots = "", userAgent = "Googlebot" } = {}) {
  const evidence = [];
  const warnings = [];
  const signals = { status: "200", canonical: "missing", meta: "index", header: "index", robots: "allowed" };
  const statusMatch = String(headers).match(/(?:^|\n)(?:HTTP\/\S+\s+|status\s*:\s*)(\d{3})/i);
  if (statusMatch) {
    const code = Number(statusMatch[1]);
    signals.status = code >= 200 && code < 300 ? "200" : code >= 300 && code < 400 ? "redirect" : code === 404 || code === 410 ? "404" : "error";
    evidence.push(`HTTP status ${code} extracted from the pasted headers.`);
  } else warnings.push("No HTTP status line was found; 200 remains the manual default.");
  const xRobots = [...String(headers).matchAll(/(?:^|\n)x-robots-tag\s*:\s*([^\r\n]+)/gi)].map((match) => match[1]);
  if (xRobots.length) {
    signals.header = xRobots.some((value) => /(?:^|[,\s])noindex(?:[,\s]|$)/i.test(value)) ? "noindex" : "index";
    evidence.push(`X-Robots-Tag extracted: ${xRobots.join(" | ")}`);
  }
  const metaTags = [...String(html).matchAll(/<meta\b[^>]*>/gi)].map((match) => match[0]);
  const robotsMeta = metaTags.find((tag) => /^(?:robots|googlebot)$/i.test(readHtmlAttribute(tag, "name")));
  if (robotsMeta) {
    const content = readHtmlAttribute(robotsMeta, "content");
    signals.meta = /(?:^|[,\s])noindex(?:[,\s]|$)/i.test(content) ? "noindex" : "index";
    evidence.push(`Meta robots extracted: ${content || "empty content"}`);
  }
  const canonicalTag = [...String(html).matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]).find((tag) => /(?:^|\s)canonical(?:\s|$)/i.test(readHtmlAttribute(tag, "rel")));
  if (canonicalTag) {
    const href = readHtmlAttribute(canonicalTag, "href");
    try {
      const pageUrl = new URL(url);
      const canonicalUrl = new URL(href, pageUrl);
      signals.canonical = canonicalUrl.href === pageUrl.href ? "self" : "other";
      evidence.push(`Canonical extracted: ${canonicalUrl.href}`);
    } catch { warnings.push("A canonical was found, but the tested page URL or canonical URL could not be parsed."); }
  }
  if (String(robots).trim()) {
    try {
      const path = resolveRobotsPath(url || "/");
      const robotsResult = testRobots(String(robots), userAgent, path);
      signals.robots = robotsResult.allowed ? "allowed" : "blocked";
      evidence.push(`robots.txt evaluated for ${userAgent}: ${robotsResult.rule}.`);
    } catch { warnings.push("robots.txt could not be evaluated because the tested URL is invalid."); }
  }
  return { signals, evidence, warnings };
}

export function detectMcpType(message) {
  if (message && typeof message === "object" && typeof message.name === "string" && message.inputSchema) return "tool-definition";
  if (message?.result && Array.isArray(message.result.tools)) return "tools-list-response";
  if (typeof message?.method === "string") return message.method === "tools/call" ? "tools-call-request" : "request";
  if (Object.hasOwn(message || {}, "result") || Object.hasOwn(message || {}, "error")) return "response";
  return "unknown";
}

export function analyzeMcpMessage(input, declaredType = "auto", protocolVersion = "2026-07-28") {
  let message;
  try { message = typeof input === "string" ? JSON.parse(input) : input; }
  catch (error) { return { valid: false, type: "invalid-json", issues: [{ level: "error", message: `JSON parse error: ${error.message}` }], corrected: null }; }
  const type = declaredType === "auto" ? detectMcpType(message) : declaredType;
  const issues = [];
  const corrected = structuredClone(message);
  const issue = (level, text) => issues.push({ level, message: text });
  const latest = protocolVersion === "2026-07-28";
  if (["request", "tools-call-request", "response", "tools-list-response"].includes(type)) {
    if (message.jsonrpc !== "2.0") { issue("error", 'jsonrpc must be "2.0".'); corrected.jsonrpc = "2.0"; }
  }
  if (type === "request" || type === "tools-call-request") {
    if (typeof message.method !== "string" || !message.method) { issue("error", "A request needs a method string."); corrected.method = type === "tools-call-request" ? "tools/call" : "tools/list"; }
    if (message.params !== undefined && (typeof message.params !== "object" || message.params === null || Array.isArray(message.params))) { issue("error", "params must be an object when present."); corrected.params = {}; }
    if (type === "tools-call-request") {
      corrected.params ||= {};
      if (typeof message.params?.name !== "string" || !message.params.name) { issue("error", "tools/call params need a tool name."); corrected.params.name = "tool_name"; }
      if (message.params?.arguments !== undefined && (typeof message.params.arguments !== "object" || message.params.arguments === null || Array.isArray(message.params.arguments))) { issue("error", "tools/call arguments must be an object."); corrected.params.arguments = {}; }
      corrected.params.arguments ||= {};
    }
    if (latest) {
      corrected.params ||= {};
      corrected.params._meta ||= {};
      if (message.params?._meta?.["io.modelcontextprotocol/protocolVersion"] !== protocolVersion) {
        issue("error", `2026-07-28 requests need params._meta["io.modelcontextprotocol/protocolVersion"] set to "${protocolVersion}".`);
        corrected.params._meta["io.modelcontextprotocol/protocolVersion"] = protocolVersion;
      }
      if (!message.params?._meta?.["io.modelcontextprotocol/clientCapabilities"] || typeof message.params._meta["io.modelcontextprotocol/clientCapabilities"] !== "object") {
        issue("error", '2026-07-28 requests need params._meta["io.modelcontextprotocol/clientCapabilities"] as an object.');
        corrected.params._meta["io.modelcontextprotocol/clientCapabilities"] = {};
      }
    }
  } else if (type === "response" || type === "tools-list-response") {
    if (!Object.hasOwn(message, "id")) { issue("error", "A response needs the matching request id."); corrected.id = 1; }
    if (Object.hasOwn(message, "result") && Object.hasOwn(message, "error")) { issue("error", "A response cannot contain both result and error."); delete corrected.error; }
    if (!Object.hasOwn(message, "result") && !Object.hasOwn(message, "error")) { issue("error", "A response needs result or error."); corrected.result = type === "tools-list-response" ? { tools: [] } : {}; }
    if (type === "tools-list-response") {
      corrected.result ||= { tools: [] };
      if (!Array.isArray(message.result?.tools)) { issue("error", "A tools/list result needs a tools array."); corrected.result.tools = []; }
      else {
        for (const [index, tool] of message.result.tools.entries()) {
          if (!tool || typeof tool.name !== "string" || !tool.name) issue("error", `Tool ${index + 1} needs a name.`);
          if (!tool?.inputSchema || typeof tool.inputSchema !== "object" || Array.isArray(tool.inputSchema)) issue("error", `Tool ${index + 1} needs an inputSchema object.`);
        }
      }
    }
    if (latest && message.result && typeof message.result === "object" && !Array.isArray(message.result) && !message.result.resultType) issue("warning", '2026-07-28 results normally identify a resultType; an absent value is treated as "complete" for backward compatibility.');
    if (Array.isArray(message.result?.content)) {
      for (const [index, block] of message.result.content.entries()) if (!block || typeof block.type !== "string") issue("error", `Content block ${index + 1} needs a type.`);
    }
  } else if (type === "tool-definition") {
    if (typeof message.name !== "string" || !message.name) { issue("error", "A tool definition needs a name."); corrected.name = "tool_name"; }
    if (!message.inputSchema || typeof message.inputSchema !== "object" || Array.isArray(message.inputSchema)) { issue("error", "A tool definition needs an inputSchema object."); corrected.inputSchema = { type: "object", properties: {} }; }
    else if (message.inputSchema.type !== "object") { issue("warning", 'inputSchema normally declares type "object".'); corrected.inputSchema.type = "object"; corrected.inputSchema.properties ||= {}; }
  } else issue("error", "The JSON does not match a supported MCP message or tool-definition shape.");
  if (!issues.length) issue("pass", `The ${type.replaceAll("-", " ")} has the required core structure.`);
  return { valid: !issues.some((entry) => entry.level === "error"), type, protocolVersion, issues, corrected };
}

export function compareMcpPair(requestInput, responseInput) {
  try {
    const request = typeof requestInput === "string" ? JSON.parse(requestInput) : requestInput;
    const response = typeof responseInput === "string" ? JSON.parse(responseInput) : responseInput;
    const checks = [];
    checks.push({ pass: typeof request.method === "string", label: "Left message is a request" });
    checks.push({ pass: Object.hasOwn(response, "result") || Object.hasOwn(response, "error"), label: "Right message is a response" });
    checks.push({ pass: Object.hasOwn(request, "id") && request.id === response.id, label: "Request and response ids match" });
    return { valid: checks.every((check) => check.pass), checks };
  } catch (error) { return { valid: false, checks: [{ pass: false, label: `Pair cannot be parsed: ${error.message}` }] }; }
}

function compareJsonNode(expected, actual, path, checks) {
  if (expected === null || typeof expected !== "object") {
    checks.push({ pass: Object.is(expected, actual), label: `${path} matches expected value` });
    return;
  }
  if (Array.isArray(expected)) {
    checks.push({ pass: Array.isArray(actual), label: `${path} is an array` });
    if (!Array.isArray(actual)) return;
    checks.push({ pass: actual.length >= expected.length, label: `${path} contains at least ${expected.length} item${expected.length === 1 ? "" : "s"}` });
    expected.forEach((value, index) => compareJsonNode(value, actual[index], `${path}[${index}]`, checks));
    return;
  }
  checks.push({ pass: actual !== null && typeof actual === "object" && !Array.isArray(actual), label: `${path} is an object` });
  if (actual === null || typeof actual !== "object" || Array.isArray(actual)) return;
  for (const [key, value] of Object.entries(expected)) {
    const childPath = path === "$" ? `$.${key}` : `${path}.${key}`;
    checks.push({ pass: Object.hasOwn(actual, key), label: `${childPath} exists` });
    if (Object.hasOwn(actual, key)) compareJsonNode(value, actual[key], childPath, checks);
  }
}

export function compareMcpExpectedActual(expectedInput, actualInput) {
  try {
    const expected = typeof expectedInput === "string" ? JSON.parse(expectedInput) : expectedInput;
    const actual = typeof actualInput === "string" ? JSON.parse(actualInput) : actualInput;
    const checks = [];
    compareJsonNode(expected, actual, "$", checks);
    return { valid: checks.every((check) => check.pass), checks };
  } catch (error) { return { valid: false, checks: [{ pass: false, label: `Expected/actual JSON cannot be parsed: ${error.message}` }] }; }
}
