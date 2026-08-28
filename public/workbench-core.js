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
  const hasHeader = options.hasHeader ?? looksLikeHeader(rows[0] || []);
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const headers = hasHeader ? (rows[0] || []).map(safeHeader) : Array.from({ length: width }, (_, index) => `Column ${index + 1}`);
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const keywordColumn = Math.min(Number(options.keywordColumn || 0), Math.max(width - 1, 0));
  const retainedColumns = [...new Set((options.retainedColumns || []).map(Number))].filter((index) => index >= 0 && index < width && index !== keywordColumn);
  const seen = new Set();
  const cleanedRows = [];
  let ignored = 0;
  let duplicates = 0;
  for (const row of dataRows) {
    const keyword = cleanKeyword(row[keywordColumn], {
      stripNoise: options.stripNoise ?? true,
      whitespace: options.whitespace ?? true,
      caseMode: options.caseMode || "preserve",
    });
    if (!keyword) { ignored += 1; continue; }
    const key = options.ignoreCase === false ? keyword : keyword.toLocaleLowerCase();
    if (seen.has(key)) { duplicates += 1; continue; }
    seen.add(key);
    cleanedRows.push({ keyword, values: retainedColumns.map((index) => row[index] || ""), source: row });
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
    return { rows: xmlMatches.map((value) => [value]), headers: ["URL"], urlColumn: 0, sourceType: "sitemap", inputRows: xmlMatches.length };
  }
  const rows = parseDelimited(input, mode === "table" ? "auto" : mode);
  const hasHeader = options.hasHeader ?? looksLikeHeader(rows[0] || []);
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
  let duplicates = 0;
  for (const row of parsed.rows) {
    const raw = row[parsed.urlColumn] || "";
    try {
      const normalized = normalizeUrlEntry(raw, options);
      if (seen.has(normalized.value)) { duplicates += 1; continue; }
      seen.add(normalized.value);
      entries.push({ original: raw, normalized: normalized.value, host: normalized.url.hostname, path: normalized.url.pathname, query: normalized.url.search, warnings: normalized.warnings });
    } catch (error) { invalid.push({ entry: raw, reason: error.message }); }
  }
  const hosts = [...entries.reduce((map, entry) => map.set(entry.host, (map.get(entry.host) || 0) + 1), new Map()).entries()]
    .map(([host, count]) => ({ host, count })).sort((a, b) => b.count - a.count || a.host.localeCompare(b.host));
  const suspicious = entries.filter((entry) => entry.warnings.length).map((entry) => ({ url: entry.normalized, reasons: entry.warnings }));
  return { ...parsed, entries, invalid, duplicates, hosts, suspicious };
}

export function formatCrawlList(result, format = "lines") {
  if (format === "json") return JSON.stringify(result.entries.map(({ normalized, host, path, query, warnings }) => ({ url: normalized, host, path, query, warnings })), null, 2);
  if (format === "csv") return [["url", "host", "path", "query", "warnings"], ...result.entries.map((entry) => [entry.normalized, entry.host, entry.path, entry.query, entry.warnings.join("; ")])].map((row) => row.map(csvCell).join(",")).join("\n");
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

export function detectMcpType(message) {
  if (message && typeof message === "object" && typeof message.name === "string" && message.inputSchema) return "tool-definition";
  if (message?.result && Array.isArray(message.result.tools)) return "tools-list-response";
  if (typeof message?.method === "string") return message.method === "tools/call" ? "tools-call-request" : "request";
  if (Object.hasOwn(message || {}, "result") || Object.hasOwn(message || {}, "error")) return "response";
  return "unknown";
}

export function analyzeMcpMessage(input, declaredType = "auto") {
  let message;
  try { message = typeof input === "string" ? JSON.parse(input) : input; }
  catch (error) { return { valid: false, type: "invalid-json", issues: [{ level: "error", message: `JSON parse error: ${error.message}` }], corrected: null }; }
  const type = declaredType === "auto" ? detectMcpType(message) : declaredType;
  const issues = [];
  const corrected = structuredClone(message);
  const issue = (level, text) => issues.push({ level, message: text });
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
  } else if (type === "response" || type === "tools-list-response") {
    if (!Object.hasOwn(message, "id")) { issue("error", "A response needs the matching request id."); corrected.id = 1; }
    if (Object.hasOwn(message, "result") && Object.hasOwn(message, "error")) { issue("error", "A response cannot contain both result and error."); delete corrected.error; }
    if (!Object.hasOwn(message, "result") && !Object.hasOwn(message, "error")) { issue("error", "A response needs result or error."); corrected.result = type === "tools-list-response" ? { tools: [] } : {}; }
    if (type === "tools-list-response") {
      corrected.result ||= { tools: [] };
      if (!Array.isArray(message.result?.tools)) { issue("error", "A tools/list result needs a tools array."); corrected.result.tools = []; }
    }
  } else if (type === "tool-definition") {
    if (typeof message.name !== "string" || !message.name) { issue("error", "A tool definition needs a name."); corrected.name = "tool_name"; }
    if (!message.inputSchema || typeof message.inputSchema !== "object" || Array.isArray(message.inputSchema)) { issue("error", "A tool definition needs an inputSchema object."); corrected.inputSchema = { type: "object", properties: {} }; }
    else if (message.inputSchema.type !== "object") { issue("warning", 'inputSchema normally declares type "object".'); corrected.inputSchema.type = "object"; corrected.inputSchema.properties ||= {}; }
  } else issue("error", "The JSON does not match a supported MCP message or tool-definition shape.");
  if (!issues.length) issue("pass", `The ${type.replaceAll("-", " ")} has the required core structure.`);
  return { valid: !issues.some((entry) => entry.level === "error"), type, issues, corrected };
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
