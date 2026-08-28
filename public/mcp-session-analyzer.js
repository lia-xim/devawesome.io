import { analyzeMcpSession } from "./mcp-session-core.js";
function download(text) { const url = URL.createObjectURL(new Blob([`${text}\n`], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = "mcp-session-report.json"; link.click(); URL.revokeObjectURL(url); }
function list(items, empty) { return items.length ? items.map((text) => { const item = document.createElement("li"); item.textContent = text; return item; }) : [Object.assign(document.createElement("li"), { textContent: empty })]; }
for (const root of document.querySelectorAll("[data-mcp-session]")) {
  const input = root.querySelector("[data-session-input]"); const file = root.querySelector("[data-session-file]"); const version = root.querySelector("[data-session-version]"); const summary = root.querySelector("[data-session-summary]"); const negotiation = root.querySelector("[data-session-negotiation]"); const gaps = root.querySelector("[data-session-gaps]"); const errors = root.querySelector("[data-session-errors]"); const status = root.querySelector("[data-session-status]");
  let report;
  const run = () => {
    report = analyzeMcpSession(input.value, { protocolVersion: version.value });
    summary.replaceChildren(...Object.entries(report.summary).flatMap(([key, count]) => { const strong = document.createElement("strong"); strong.textContent = count; const span = document.createElement("span"); span.textContent = key.replace(/([A-Z])/g, " $1").toLowerCase(); return [strong, span]; }));
    const terms = [["Versions", report.negotiatedVersions.join(", ") || "Not supplied"], ["Client capabilities", report.capabilities.client.join(", ") || "None supplied"], ["Server capabilities", report.capabilities.server.join(", ") || "None supplied"]];
    negotiation.replaceChildren(...terms.flatMap(([term, value]) => { const dt = document.createElement("dt"); dt.textContent = term; const dd = document.createElement("dd"); dd.textContent = value; return [dt, dd]; }));
    gaps.replaceChildren(...list([...report.unansweredRequests.map((item) => `Request ${item.id}: ${item.method} has no response.`), ...report.orphanResponses.map((item) => `Response ${item.id} has no matching request.`), ...report.invalidLines.map((item) => `Line ${item.line} is invalid JSON.`)], "No gaps detected."));
    errors.replaceChildren(...list(report.errors.map((item) => `ID ${item.id ?? "none"}: ${item.code ?? "no code"} — ${item.message}`), "No error responses detected."));
    status.textContent = report.versionMismatch ? "Session parsed, but a negotiated version differs from the selected version." : `${report.summary.messages} messages analyzed locally.`;
  };
  root.querySelector("[data-session-run]").addEventListener("click", run); root.querySelector("[data-session-download]").addEventListener("click", () => report && download(JSON.stringify(report, null, 2)));
  file.addEventListener("change", async () => { const selected = file.files?.[0]; if (selected) { input.value = await selected.text(); run(); status.textContent = `${selected.name} loaded and analyzed locally.`; } file.value = ""; });
  version.addEventListener("change", run); run();
}
