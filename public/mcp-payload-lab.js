import { analyzeMcpMessage, compareMcpPair } from "./workbench-core.js";

const examples = {
  request: {
    type: "auto",
    input: '{\n  "id": 7,\n  "method": "tools/call",\n  "params": {\n    "name": "crawl_page",\n    "arguments": "https://example.com"\n  }\n}',
    related: "",
  },
  response: {
    type: "auto",
    input: '{\n  "jsonrpc": "2.0",\n  "id": 7,\n  "method": "tools/list",\n  "params": {}\n}',
    related: '{\n  "jsonrpc": "2.0",\n  "id": 8,\n  "result": { "tools": [] }\n}',
  },
  tool: {
    type: "tool-definition",
    input: '{\n  "name": "get_keyword_data",\n  "description": "Return data for one keyword.",\n  "inputSchema": {\n    "type": "string"\n  }\n}',
    related: "",
  },
};

for (const root of document.querySelectorAll("[data-mcp-payload-lab]")) {
  const source = root.querySelector("[data-mcp-lab-source]");
  const type = root.querySelector("[data-mcp-lab-type]");
  const input = root.querySelector("[data-mcp-lab-input]");
  const related = root.querySelector("[data-mcp-lab-related]");
  const detected = root.querySelector("[data-mcp-lab-detected]");
  const findings = root.querySelector("[data-mcp-lab-findings]");
  const corrected = root.querySelector("[data-mcp-lab-corrected]");
  const pairChecks = root.querySelector("[data-mcp-pair-checks]");
  const copy = root.querySelector("[data-mcp-lab-copy]");
  const downloadButton = root.querySelector("[data-mcp-lab-download]");
  const status = root.querySelector("[data-mcp-lab-status]");
  if (!source || !type || !input || !related || !detected || !findings || !corrected || !pairChecks || !status) continue;

  let result;
  const run = () => {
    result = analyzeMcpMessage(input.value, type.value);
    detected.textContent = result.type.replaceAll("-", " ");
    detected.dataset.state = result.valid ? "valid" : "error";
    findings.replaceChildren(...result.issues.map((entry) => {
      const item = document.createElement("li");
      item.dataset.state = entry.level;
      const marker = document.createElement("span");
      marker.textContent = entry.level === "error" ? "!" : entry.level === "warning" ? "?" : "✓";
      const text = document.createElement("span");
      text.textContent = entry.message;
      item.append(marker, text);
      return item;
    }));
    corrected.value = result.corrected ? JSON.stringify(result.corrected, null, 2) : "";
    copy.disabled = !corrected.value;
    downloadButton.disabled = !corrected.value;
    if (related.value.trim()) {
      const pair = compareMcpPair(input.value, related.value);
      pairChecks.replaceChildren(...pair.checks.map((check) => {
        const item = document.createElement("li");
        item.dataset.state = check.pass ? "pass" : "error";
        item.textContent = `${check.pass ? "Pass" : "Check"}: ${check.label}`;
        return item;
      }));
    } else {
      const item = document.createElement("li");
      item.textContent = "Paste a related message to compare the pair.";
      pairChecks.replaceChildren(item);
    }
    status.textContent = result.valid ? "Core structure passes. Run the fixture with the exact client and server versions next." : "Fix the listed structural errors before testing transport or execution.";
  };

  for (const field of [type, input, related]) field.addEventListener(field.tagName === "TEXTAREA" ? "input" : "change", run);
  for (const button of root.querySelectorAll("[data-mcp-lab-example]")) button.addEventListener("click", () => {
    const example = examples[button.dataset.mcpLabExample];
    type.value = example.type;
    input.value = example.input;
    related.value = example.related;
    run();
    input.focus();
  });
  copy.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(corrected.value); status.textContent = "Corrected JSON copied."; }
    catch { corrected.focus(); corrected.select(); status.textContent = "Select and copy the corrected JSON manually."; }
  });
  downloadButton.addEventListener("click", () => {
    const fixture = JSON.stringify({ source: source.value, declaredType: type.value, detectedType: result.type, message: result.corrected }, null, 2);
    const url = URL.createObjectURL(new Blob([`${fixture}\n`], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "mcp-payload-fixture.json";
    link.click();
    URL.revokeObjectURL(url);
    status.textContent = "Fixture downloaded.";
  });
  run();
}
