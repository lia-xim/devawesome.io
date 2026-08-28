function unwrap(value) {
  for (const key of ["message", "payload", "data", "request", "response"]) if (value?.[key] && typeof value[key] === "object") return value[key];
  return value;
}

export function parseMcpSession(input) {
  const text = String(input || "").trim();
  if (!text) return { messages: [], invalid: [{ line: 0, error: "Session is empty" }] };
  try {
    const value = JSON.parse(text);
    const values = Array.isArray(value) ? value : [value];
    return { messages: values.map(unwrap), invalid: [] };
  } catch {}
  const messages = [];
  const invalid = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    try { messages.push(unwrap(JSON.parse(line))); }
    catch (error) { invalid.push({ line: index + 1, error: error.message }); }
  });
  return { messages, invalid };
}

function capabilityNames(value) { return value && typeof value === "object" ? Object.keys(value).sort() : []; }

export function analyzeMcpSession(input, { protocolVersion = "auto" } = {}) {
  const parsed = parseMcpSession(input);
  const requests = new Map();
  const responses = new Map();
  const duplicates = [];
  const notifications = [];
  const errors = [];
  const versions = new Set();
  const capabilities = { client: [], server: [] };
  for (const message of parsed.messages) {
    const id = message?.id;
    if (message?.params?.protocolVersion) versions.add(message.params.protocolVersion);
    if (message?.result?.protocolVersion) versions.add(message.result.protocolVersion);
    if (message?.method === "initialize") capabilities.client = capabilityNames(message.params?.capabilities);
    if (message?.result?.capabilities) capabilities.server = capabilityNames(message.result.capabilities);
    if (typeof message?.method === "string") {
      if (id === undefined || id === null) notifications.push(message);
      else if (requests.has(String(id))) duplicates.push({ kind: "request", id });
      else requests.set(String(id), message);
    } else if (Object.hasOwn(message || {}, "result") || Object.hasOwn(message || {}, "error")) {
      if (message?.error) errors.push({ id: id ?? null, code: message.error.code ?? null, message: message.error.message || "Unknown MCP error" });
      if (id === undefined || id === null) duplicates.push({ kind: "response-without-id", id: null });
      else if (responses.has(String(id))) duplicates.push({ kind: "response", id });
      else responses.set(String(id), message);
    }
  }
  const pairs = [];
  for (const [id, request] of requests) if (responses.has(id)) pairs.push({ id, method: request.method, outcome: responses.get(id).error ? "error" : "result" });
  const unansweredRequests = [...requests].filter(([id]) => !responses.has(id)).map(([id, request]) => ({ id, method: request.method }));
  const orphanResponses = [...responses].filter(([id]) => !requests.has(id)).map(([id, response]) => ({ id, outcome: response.error ? "error" : "result" }));
  const negotiatedVersions = [...versions];
  const versionMismatch = protocolVersion !== "auto" && negotiatedVersions.some((version) => version !== protocolVersion);
  return {
    schemaVersion: 1,
    declaredProtocolVersion: protocolVersion,
    negotiatedVersions,
    versionMismatch,
    summary: { messages: parsed.messages.length, pairs: pairs.length, unansweredRequests: unansweredRequests.length, orphanResponses: orphanResponses.length, errors: errors.length, invalidLines: parsed.invalid.length },
    capabilities,
    pairs,
    unansweredRequests,
    orphanResponses,
    errors,
    duplicates,
    invalidLines: parsed.invalid,
    boundary: "This report links supplied messages by ID. It does not replay transport, authentication, timeouts, cancellation, or tool execution.",
  };
}
