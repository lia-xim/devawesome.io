import { analyzeMcpMessage, compareMcpExpectedActual, compareMcpPair } from "./workbench-core.js";
import { createRecipe, downloadRecipe, readRecipeFile } from "./workbench-recipes.js";
import { createRunManifest, downloadRunManifest } from "./workbench-run-manifests.js";

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
  const version = root.querySelector("[data-mcp-lab-version]");
  const fileInput = root.querySelector("[data-mcp-lab-file]");
  const compareMode = root.querySelector("[data-mcp-compare-mode]");
  const relatedLabel = root.querySelector("[data-mcp-related-label]");
  const detected = root.querySelector("[data-mcp-lab-detected]");
  const findings = root.querySelector("[data-mcp-lab-findings]");
  const corrected = root.querySelector("[data-mcp-lab-corrected]");
  const pairChecks = root.querySelector("[data-mcp-pair-checks]");
  const copy = root.querySelector("[data-mcp-lab-copy]");
  const downloadButton = root.querySelector("[data-mcp-lab-download]");
  const status = root.querySelector("[data-mcp-lab-status]");
  const recipeSave = root.querySelector("[data-recipe-save]");
  const recipeLoad = root.querySelector("[data-recipe-load]");
  const manifestSave = root.querySelector("[data-run-manifest-save]");
  if (!source || !type || !input || !related || !detected || !findings || !corrected || !pairChecks || !status) continue;

  let result;
  let comparison = null;
  const run = () => {
    result = analyzeMcpMessage(input.value, type.value, version.value);
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
      comparison = compareMode.value === "expected" ? compareMcpExpectedActual(input.value, related.value) : compareMcpPair(input.value, related.value);
      pairChecks.replaceChildren(...comparison.checks.map((check) => {
        const item = document.createElement("li");
        item.dataset.state = check.pass ? "pass" : "error";
        item.textContent = `${check.pass ? "Pass" : "Check"}: ${check.label}`;
        return item;
      }));
    } else {
      comparison = null;
      const item = document.createElement("li");
      item.textContent = compareMode.value === "expected" ? "Paste the actual JSON to compare it with the expected shape." : "Paste a related response to compare the pair.";
      pairChecks.replaceChildren(item);
    }
    relatedLabel.textContent = compareMode.value === "expected" ? "Actual JSON (primary message is expected)" : "Related response";
    status.textContent = result.valid ? `Core structure passes for the ${version.value} checks. Run the fixture with the exact client and server versions next.` : `Fix the listed ${version.value} structural errors before testing transport or execution.`;
  };

  for (const field of [type, version, compareMode, input, related]) field.addEventListener(field.tagName === "TEXTAREA" ? "input" : "change", run);
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
    const fixture = JSON.stringify({ source: source.value, protocolVersion: version.value, declaredType: type.value, detectedType: result.type, message: result.corrected }, null, 2);
    const url = URL.createObjectURL(new Blob([`${fixture}\n`], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "mcp-payload-fixture.json";
    link.click();
    URL.revokeObjectURL(url);
    status.textContent = "Fixture downloaded.";
  });
  fileInput.addEventListener("change", async () => {
    try {
      const text = await fileInput.files?.[0]?.text();
      if (!text) throw new Error("The selected file is empty.");
      let selected = text.trim();
      if (fileInput.files[0].name.toLowerCase().endsWith(".jsonl")) {
        const lines = selected.split(/\r?\n/).filter(Boolean);
        selected = lines.find((line) => { try { JSON.parse(line); return true; } catch { return false; } }) || selected;
      }
      input.value = selected;
      source.value = "MCP Inspector";
      run();
      status.textContent = "File loaded locally. Review the selected message before export.";
    } catch (error) { status.textContent = `File not loaded: ${error.message}`; }
    fileInput.value = "";
  });
  recipeSave.addEventListener("click", () => {
    downloadRecipe(createRecipe("mcp-payload", { source: source.value, declaredType: type.value, protocolVersion: version.value, comparisonMode: compareMode.value }, { sourceType: source.value }), "devawesome-mcp-payload.recipe.json");
    status.textContent = "Recipe downloaded without payload or log content.";
  });
  recipeLoad.addEventListener("change", async () => {
    try {
      const recipe = await readRecipeFile(recipeLoad.files?.[0], "mcp-payload");
      source.value = recipe.settings.source ?? source.value;
      type.value = recipe.settings.declaredType ?? type.value;
      version.value = recipe.settings.protocolVersion ?? version.value;
      compareMode.value = recipe.settings.comparisonMode ?? compareMode.value;
      run();
      status.textContent = "Recipe loaded. Payloads were left unchanged.";
    } catch (error) { status.textContent = `Recipe not loaded: ${error.message}`; }
    recipeLoad.value = "";
  });
  manifestSave?.addEventListener("click", async () => {
    try {
      const outputReport = { detectedType: result.type, protocolVersion: result.protocolVersion, valid: result.valid, issues: result.issues, corrected: result.corrected, comparison };
      const manifest = await createRunManifest({
        workflow: "mcp-payload-validation",
        workflowVersion: "1.1.0",
        sourceType: source.value,
        settings: { declaredType: type.value, protocolVersion: version.value, comparisonMode: compareMode.value },
        input: JSON.stringify({ primary: input.value, related: related.value }),
        output: JSON.stringify(outputReport),
        outputFormat: "json",
        summary: { detectedType: result.type, valid: result.valid, errors: result.issues.filter((entry) => entry.level === "error").length, warnings: result.issues.filter((entry) => entry.level === "warning").length, comparisonPassed: comparison?.valid ?? null },
        limits: ["This validates selected message structures. It does not execute a client/server exchange or prove transport compatibility."],
      });
      downloadRunManifest(manifest, "devawesome-mcp-validation.run.json");
      status.textContent = "Run manifest downloaded without payload or log contents.";
    } catch (error) { status.textContent = `Run manifest not created: ${error.message}`; }
  });
  run();
}
