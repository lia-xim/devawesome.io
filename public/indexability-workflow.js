import { diagnoseIndexability, extractIndexabilitySignals } from "./workbench-core.js";
import { createRecipe, downloadRecipe, readRecipeFile } from "./workbench-recipes.js";
import { createRunManifest, downloadRunManifest } from "./workbench-run-manifests.js";

const examples = {
  noindex: { status: "200", canonical: "self", meta: "noindex", header: "index", robots: "allowed" },
  canonical: { status: "200", canonical: "other", meta: "index", header: "index", robots: "allowed" },
  robots: { status: "200", canonical: "self", meta: "noindex", header: "index", robots: "blocked" },
};

for (const root of document.querySelectorAll("[data-indexability-workflow]")) {
  const fields = {
    status: root.querySelector("[data-index-status]"),
    canonical: root.querySelector("[data-index-canonical]"),
    meta: root.querySelector("[data-index-meta]"),
    header: root.querySelector("[data-index-header]"),
    robots: root.querySelector("[data-index-robots]"),
  };
  const verdict = root.querySelector("[data-index-verdict]");
  const explanation = root.querySelector("[data-index-explanation]");
  const checks = root.querySelector("[data-index-checks]");
  const copy = root.querySelector("[data-index-copy]");
  const downloadButton = root.querySelector("[data-index-download]");
  const statusText = root.querySelector("[data-index-report-status]");
  const pageUrl = root.querySelector("[data-index-url]");
  const userAgent = root.querySelector("[data-index-agent]");
  const headerInput = root.querySelector("[data-index-headers]");
  const htmlInput = root.querySelector("[data-index-html]");
  const robotsInput = root.querySelector("[data-index-robots-text]");
  const extractButton = root.querySelector("[data-index-extract]");
  const extractStatus = root.querySelector("[data-index-extract-status]");
  const recipeSave = root.querySelector("[data-recipe-save]");
  const recipeLoad = root.querySelector("[data-recipe-load]");
  const manifestSave = root.querySelector("[data-run-manifest-save]");
  if (Object.values(fields).some((field) => !field) || !verdict || !explanation || !checks) continue;

  let report;
  let extraction = { evidence: [], warnings: [] };
  const signals = () => Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value]));
  const update = () => {
    const supplied = signals();
    const result = diagnoseIndexability(supplied);
    report = {
      signals: supplied,
      verdict: result.title,
      state: result.state,
      explanation: result.detail,
      checks: Object.fromEntries(result.checks),
      extractedEvidence: extraction.evidence,
      extractionWarnings: extraction.warnings,
      limits: [
        "Technical eligibility is not proof of indexing, canonical selection, ranking, or traffic.",
        "The values were entered manually; this report did not fetch the tested URL.",
      ],
    };
    root.dataset.state = result.state;
    verdict.textContent = result.title;
    explanation.textContent = result.detail;
    checks.replaceChildren(...result.checks.map(([label, value]) => {
      const item = document.createElement("div");
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = label;
      description.textContent = value;
      item.append(term, description);
      return item;
    }));
    if (statusText) statusText.textContent = "Diagnosis updated. Verify the values against the final live response.";
  };

  for (const field of Object.values(fields)) field.addEventListener("change", update);
  extractButton?.addEventListener("click", () => {
    extraction = extractIndexabilitySignals({ url: pageUrl.value, headers: headerInput.value, html: htmlInput.value, robots: robotsInput.value, userAgent: userAgent.value });
    for (const [key, value] of Object.entries(extraction.signals)) fields[key].value = value;
    update();
    const messages = [...extraction.evidence, ...extraction.warnings];
    extractStatus.textContent = messages.length ? messages.join(" ") : "No recognizable signals were found. Use the manual controls below.";
  });
  for (const button of document.querySelectorAll("[data-index-example]")) button.addEventListener("click", () => {
    const example = examples[button.dataset.indexExample];
    for (const [key, value] of Object.entries(example)) fields[key].value = value;
    update();
  });
  copy?.addEventListener("click", async () => {
    const text = `${report.verdict}\n${report.explanation}\n\n${Object.entries(report.checks).map(([key, value]) => `${key}: ${value}`).join("\n")}`;
    try { await navigator.clipboard.writeText(text); if (statusText) statusText.textContent = "Diagnosis copied."; }
    catch { if (statusText) statusText.textContent = "Copy was blocked. Download the JSON report instead."; }
  });
  downloadButton?.addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(report, null, 2)}\n`], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "indexability-diagnosis.json";
    link.click();
    URL.revokeObjectURL(url);
    if (statusText) statusText.textContent = "JSON diagnosis downloaded.";
  });
  recipeSave?.addEventListener("click", () => {
    downloadRecipe(createRecipe("indexability", { userAgent: userAgent.value, defaultSignals: signals() }, { sourceType: "pasted-response-evidence" }), "devawesome-indexability.recipe.json");
    statusText.textContent = "Recipe downloaded without pasted headers, HTML, robots.txt, or URL.";
  });
  recipeLoad?.addEventListener("change", async () => {
    try {
      const recipe = await readRecipeFile(recipeLoad.files?.[0], "indexability");
      userAgent.value = recipe.settings.userAgent ?? userAgent.value;
      for (const [key, value] of Object.entries(recipe.settings.defaultSignals || {})) if (fields[key]) fields[key].value = value;
      extraction = { evidence: [], warnings: [] };
      update();
      statusText.textContent = "Recipe loaded. Pasted evidence was left unchanged.";
    } catch (error) { statusText.textContent = `Recipe not loaded: ${error.message}`; }
    recipeLoad.value = "";
  });
  manifestSave?.addEventListener("click", async () => {
    try {
      const inputEvidence = JSON.stringify({ url: pageUrl.value, userAgent: userAgent.value, headers: headerInput.value, html: htmlInput.value, robots: robotsInput.value });
      const manifest = await createRunManifest({
        workflow: "indexability-debugger",
        workflowVersion: "1.1.0",
        sourceType: extraction.evidence.length ? "pasted-response-evidence" : "manual-signals",
        settings: { userAgent: userAgent.value, signals: signals() },
        input: inputEvidence,
        output: JSON.stringify(report),
        outputFormat: "json",
        summary: { verdict: report.verdict, state: report.state, extractedEvidenceItems: extraction.evidence.length, extractionWarnings: extraction.warnings.length },
        limits: report.limits,
      });
      downloadRunManifest(manifest, "devawesome-indexability.run.json");
      statusText.textContent = "Run manifest downloaded without the URL, headers, HTML, or robots.txt contents.";
    } catch (error) { statusText.textContent = `Run manifest not created: ${error.message}`; }
  });
  update();
}
