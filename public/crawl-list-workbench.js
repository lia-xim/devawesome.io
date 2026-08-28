import { extractUrlRows, formatCrawlList, prepareCrawlList } from "./workbench-core.js";
import { createRecipe, downloadRecipe, preflightRecipe, presentRecipePreflight, readRecipeFile } from "./workbench-recipes.js";
import { createRunManifest, downloadRunManifest } from "./workbench-run-manifests.js";
import { mappingForColumn, profileTabularInput } from "./workbench-tabular.js";
import { buildCrawlPlan, formatCrawlPlan } from "./crawl-plan-core.js";

const examples = {
  sitemap: { mode: "sitemap", header: false, input: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/</loc></url>
  <url><loc>https://example.com/about/</loc></url>
  <url><loc>https://example.com/products?utm_source=sitemap</loc></url>
</urlset>` },
  csv: { mode: "table", header: true, input: "Address,Status Code,Content Type\nhttps://example.com/,200,text/html\nhttps://example.com/page/?utm_source=news#top,200,text/html\nhttps://EXAMPLE.com/page,200,text/html\nhttps://example.com/Products,200,text/html\nnot a url,0,unknown" },
  mixed: { mode: "lines", header: false, input: "1. https://EXAMPLE.com/\n[About](https://example.com/about/)\nexample.com/page/#section\nhttps://example.com/page?utm_source=email\nhttps://example.com/Search?q=shoes\nnot a url" },
};

function makeOption(value, label) {
  const option = document.createElement("option");
  option.value = String(value);
  option.textContent = label;
  return option;
}

function makeListItem(primary, secondary) {
  const item = document.createElement("li");
  const code = document.createElement("code");
  code.textContent = primary;
  item.append(code);
  if (secondary) item.append(document.createTextNode(` — ${secondary}`));
  return item;
}

for (const root of document.querySelectorAll("[data-crawl-list-workbench]")) {
  const input = root.querySelector("[data-crawl-input]");
  const sourceFile = root.querySelector("[data-crawl-file]");
  const mode = root.querySelector("[data-crawl-mode]");
  const header = root.querySelector("[data-crawl-header]");
  const urlColumn = root.querySelector("[data-crawl-url-column]");
  const query = root.querySelector("[data-crawl-query]");
  const addHttps = root.querySelector("[data-crawl-add-https]");
  const fragment = root.querySelector("[data-crawl-fragment]");
  const trailing = root.querySelector("[data-crawl-trailing]");
  const scopeMode = root.querySelector("[data-crawl-scope-mode]");
  const scopeHost = root.querySelector("[data-crawl-scope-host]");
  const protocolMode = root.querySelector("[data-crawl-protocol]");
  const includePatterns = root.querySelector("[data-crawl-include]");
  const excludePatterns = root.querySelector("[data-crawl-exclude]");
  const includeSitemapFiles = root.querySelector("[data-crawl-include-sitemaps]");
  const formats = [...root.querySelectorAll("[data-crawl-format]")];
  const output = root.querySelector("[data-crawl-output]");
  const sourceSummary = root.querySelector("[data-crawl-source-summary]");
  const reviewSummary = root.querySelector("[data-crawl-review-summary]");
  const hostRows = root.querySelector("[data-crawl-hosts]");
  const suspiciousSummary = root.querySelector("[data-crawl-suspicious-summary]");
  const suspiciousList = root.querySelector("[data-crawl-suspicious]");
  const invalidSummary = root.querySelector("[data-crawl-invalid-summary]");
  const invalidList = root.querySelector("[data-crawl-invalid]");
  const excludedSummary = root.querySelector("[data-crawl-excluded-summary]");
  const excludedList = root.querySelector("[data-crawl-excluded]");
  const status = root.querySelector("[data-crawl-status]");
  const copy = root.querySelector("[data-crawl-copy]");
  const downloadButton = root.querySelector("[data-crawl-download]");
  const downloadExcluded = root.querySelector("[data-crawl-download-excluded]");
  const downloadPlan = root.querySelector("[data-crawl-download-plan]");
  const robots = root.querySelector("[data-crawl-robots]");
  const agent = root.querySelector("[data-crawl-agent]");
  const customAgent = root.querySelector("[data-crawl-custom-agent]");
  const customAgentWrap = root.querySelector("[data-crawl-custom-wrap]");
  const planSummary = root.querySelector("[data-crawl-plan-summary]");
  const planReview = root.querySelector("[data-crawl-plan-review]");
  const recipeSave = root.querySelector("[data-recipe-save]");
  const recipeLoad = root.querySelector("[data-recipe-load]");
  const manifestSave = root.querySelector("[data-run-manifest-save]");
  if (!input || !mode || !header || !urlColumn || !output || !status) continue;

  let currentResult;
  let currentFormat = "lines";
  let knownHeaders = [];
  let currentSourceType = "pasted-table";
  let currentPlan;
  const selectedAgent = () => agent.value === "custom" ? (customAgent.value.trim() || "CustomCrawler") : agent.value;

  const settings = () => ({
    mode: mode.value,
    hasHeader: header.checked,
    urlColumn: Number(urlColumn.value || 0),
    queryMode: query.value,
    addHttps: addHttps.checked,
    stripFragment: fragment.checked,
    stripTrailing: trailing.checked,
    scopeMode: scopeMode.value,
    scopeHost: scopeHost.value,
    protocolMode: protocolMode.value,
    includePatterns: includePatterns.value,
    excludePatterns: excludePatterns.value,
    includeSitemapFiles: includeSitemapFiles.checked,
  });

  const rebuildColumns = () => {
    const parsed = extractUrlRows(input.value, { mode: mode.value, hasHeader: header.checked });
    const previous = knownHeaders[Number(urlColumn.value || 0)];
    knownHeaders = parsed.headers;
    urlColumn.replaceChildren(...knownHeaders.map((label, index) => makeOption(index, label)));
    const explicitUrl = knownHeaders.findIndex((label) => /^(?:address|url|page)$/i.test(label));
    urlColumn.value = String(Math.max(0, knownHeaders.indexOf(previous), explicitUrl));
    const isSitemap = parsed.sourceType === "sitemap" || parsed.sourceType === "sitemap-index";
    const headerUnavailable = isSitemap || mode.value === "lines";
    header.disabled = headerUnavailable;
    if (headerUnavailable) header.checked = false;
    urlColumn.disabled = isSitemap || knownHeaders.length < 2;
  };

  function run() {
    currentResult = prepareCrawlList(input.value, settings());
    currentPlan = buildCrawlPlan(currentResult, { robots: robots.value, userAgent: selectedAgent() });
    currentFormat = formats.find((field) => field.checked)?.value || "lines";
    output.value = formatCrawlList(currentResult, currentFormat);
    sourceSummary.textContent = `${currentResult.inputRows} source row${currentResult.inputRows === 1 ? "" : "s"} · ${currentResult.sourceType} input · ${currentResult.headers.length} column${currentResult.headers.length === 1 ? "" : "s"}`;
    reviewSummary.innerHTML = `<strong>${currentResult.entries.length}</strong><span>crawl targets</span><strong>${currentResult.excluded.length}</strong><span>excluded</span><strong>${currentResult.duplicates}</strong><span>duplicates</span><strong>${currentResult.invalid.length}</strong><span>invalid</span><strong>${currentResult.hosts.length}</strong><span>hosts</span>`;
    hostRows.replaceChildren(...currentResult.hosts.map(({ host, count }) => {
      const row = document.createElement("tr");
      const hostCell = document.createElement("td");
      const countCell = document.createElement("td");
      hostCell.textContent = host;
      countCell.textContent = String(count);
      row.append(hostCell, countCell);
      return row;
    }));
    suspiciousSummary.textContent = `${currentResult.suspicious.length} suspicious variant${currentResult.suspicious.length === 1 ? "" : "s"}`;
    suspiciousList.replaceChildren(...(currentResult.suspicious.length ? currentResult.suspicious.map((entry) => makeListItem(entry.url, entry.reasons.join(", "))) : [makeListItem("No flagged variants", "Review parameters and paths for business-specific meaning.")]));
    excludedSummary.textContent = `${currentResult.excluded.length} excluded by scope`;
    excludedList.replaceChildren(...(currentResult.excluded.length ? currentResult.excluded.map((entry) => makeListItem(entry.normalized, `${entry.reason}; ${entry.resourceType}`)) : [makeListItem("No scope exclusions") ]));
    invalidSummary.textContent = `${currentResult.invalid.length} invalid ${currentResult.invalid.length === 1 ? "entry" : "entries"}`;
    invalidList.replaceChildren(...(currentResult.invalid.length ? currentResult.invalid.map((entry) => makeListItem(entry.entry, entry.reason)) : [makeListItem("No invalid entries") ]));
    const typeSummary = currentResult.resourceTypes.map((entry) => `${entry.count} ${entry.type}`).join(", ");
    const planLabels = { allowed: "allowed", blocked: "blocked", "outside-scope": "outside host scope", "excluded-pattern": "excluded by pattern", invalid: "invalid", resource: "resources", review: "manual review" };
    planSummary.replaceChildren(...Object.entries(currentPlan.counts).flatMap(([key, count]) => { const strong = document.createElement("strong"); strong.textContent = String(count); const span = document.createElement("span"); span.textContent = planLabels[key]; return [strong, span]; }));
    const attention = currentPlan.rows.filter((entry) => !["allowed"].includes(entry.category));
    planReview.replaceChildren(...(attention.length ? attention.slice(0, 100).map((entry) => makeListItem(entry.url, `${entry.label}; ${entry.reason}; ${entry.winningRule}`)) : [makeListItem("No blocked or uncertain URLs") ]));
    status.textContent = `${currentResult.entries.length} URLs ready for ${currentFormat.toUpperCase()} export${typeSummary ? ` · ${typeSummary}` : ""}.`;
    copy.disabled = !output.value;
    downloadButton.disabled = !output.value;
  }

  const rebuildAndRun = () => { rebuildColumns(); run(); };
  input.addEventListener("input", () => { currentSourceType = `pasted-${mode.value}`; rebuildAndRun(); });
  mode.addEventListener("change", () => { currentSourceType = `pasted-${mode.value}`; rebuildAndRun(); });
  header.addEventListener("change", rebuildAndRun);
  for (const field of [urlColumn, query, addHttps, fragment, trailing, scopeMode, protocolMode, includeSitemapFiles, ...formats]) field.addEventListener("change", run);
  for (const field of [scopeHost, includePatterns, excludePatterns]) field.addEventListener("input", run);
  robots.addEventListener("input", run);
  agent.addEventListener("change", () => { customAgentWrap.hidden = agent.value !== "custom"; run(); });
  customAgent.addEventListener("input", run);
  for (const button of root.querySelectorAll("[data-crawl-example]")) button.addEventListener("click", () => {
    const example = examples[button.dataset.crawlExample];
    input.value = example.input;
    mode.value = example.mode;
    header.checked = example.header;
    knownHeaders = [];
    currentSourceType = `example-${button.dataset.crawlExample}`;
    rebuildAndRun();
    input.focus();
  });
  sourceFile?.addEventListener("change", async () => {
    try {
      const file = sourceFile.files?.[0];
      const text = await file?.text();
      if (!text) throw new Error("The selected file is empty.");
      const extension = file.name.toLowerCase().split(".").pop();
      mode.value = extension === "xml" ? "sitemap" : ["csv", "tsv"].includes(extension) ? "table" : "auto";
      const parsed = extractUrlRows(text, { mode: mode.value });
      header.checked = parsed.hasHeader;
      input.value = text;
      knownHeaders = [];
      currentSourceType = `local-${extension || "text"}-file`;
      rebuildAndRun();
      status.textContent = `${file.name} loaded locally. Review the detected source type, URL column, and scope.`;
    } catch (error) { status.textContent = `File not loaded: ${error.message}`; }
    sourceFile.value = "";
  });
  copy.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(output.value); status.textContent = "Crawl list copied."; }
    catch { output.focus(); output.select(); status.textContent = "Select and copy the output manually."; }
  });
  downloadButton.addEventListener("click", () => {
    const extension = currentFormat === "json" ? "json" : currentFormat === "csv" ? "csv" : "txt";
    const type = currentFormat === "json" ? "application/json" : currentFormat === "csv" ? "text/csv" : "text/plain";
    const url = URL.createObjectURL(new Blob([`${output.value}\n`], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `crawl-list.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
    status.textContent = "Crawl list downloaded.";
  });
  downloadExcluded.addEventListener("click", () => {
    const content = formatCrawlList(currentResult, "excluded");
    const url = URL.createObjectURL(new Blob([`${content}\n`], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "crawl-list-exclusions.csv";
    link.click();
    URL.revokeObjectURL(url);
    status.textContent = "Exclusion report downloaded.";
  });
  downloadPlan.addEventListener("click", () => {
    const content = formatCrawlPlan(currentPlan, "csv");
    const url = URL.createObjectURL(new Blob([`${content}\n`], { type: "text/csv" }));
    const link = document.createElement("a"); link.href = url; link.download = "crawl-plan.csv"; link.click(); URL.revokeObjectURL(url);
    status.textContent = "Crawl plan downloaded with robots.txt decisions and winning rules.";
  });
  recipeSave.addEventListener("click", () => {
    const saved = settings();
    const profile = profileTabularInput(input.value, { mode: mode.value === "table" ? "auto" : mode.value, hasHeader: header.checked });
    const columnMappings = profile.profiles[saved.urlColumn] ? [mappingForColumn("urlColumn", "URL column", profile.profiles[saved.urlColumn])] : [];
    downloadRecipe(createRecipe("crawl-list", saved, { sourceType: mode.value, workflowVersion: "2.0.0", compatibleWorkflowVersions: ["2.x"], columnMappings }), "devawesome-crawl-list.recipe.json");
    status.textContent = "Recipe downloaded without input data.";
  });
  recipeLoad.addEventListener("change", async () => {
    try {
      const recipe = await readRecipeFile(recipeLoad.files?.[0], "crawl-list");
      const recipeMode = recipe.settings.mode === "table" ? "auto" : (recipe.settings.mode ?? mode.value);
      const profile = profileTabularInput(input.value, { mode: recipeMode, hasHeader: recipe.settings.hasHeader ?? header.checked });
      const preflight = preflightRecipe(recipe, { workflowVersion: "2.0.0", profiles: profile.profiles });
      if (!(await presentRecipePreflight(root, preflight))) { recipeLoad.value = ""; status.textContent = "Recipe not applied."; return; }
      const saved = preflight.resolvedSettings;
      mode.value = saved.mode ?? mode.value;
      header.checked = saved.hasHeader ?? header.checked;
      query.value = saved.queryMode ?? query.value;
      addHttps.checked = saved.addHttps ?? addHttps.checked;
      fragment.checked = saved.stripFragment ?? fragment.checked;
      trailing.checked = saved.stripTrailing ?? trailing.checked;
      scopeMode.value = saved.scopeMode ?? scopeMode.value;
      scopeHost.value = saved.scopeHost ?? "";
      protocolMode.value = saved.protocolMode ?? protocolMode.value;
      includePatterns.value = saved.includePatterns ?? "";
      excludePatterns.value = saved.excludePatterns ?? "";
      includeSitemapFiles.checked = saved.includeSitemapFiles ?? false;
      rebuildColumns();
      urlColumn.value = String(saved.urlColumn ?? urlColumn.value);
      run();
      status.textContent = "Recipe loaded. Pasted input was left unchanged.";
    } catch (error) { status.textContent = `Recipe not loaded: ${error.message}`; }
    recipeLoad.value = "";
  });
  manifestSave?.addEventListener("click", async () => {
    try {
      const manifest = await createRunManifest({
        workflow: "crawl-list",
        workflowVersion: "2.0.0",
        sourceType: currentSourceType,
        settings: settings(),
        input: input.value,
        output: output.value,
        outputFormat: currentFormat,
        summary: { inputRows: currentResult.inputRows, crawlTargets: currentResult.entries.length, excluded: currentResult.excluded.length, duplicates: currentResult.duplicates, invalid: currentResult.invalid.length, hosts: currentResult.hosts.length, sourceType: currentResult.sourceType },
        limits: ["The manifest proves a local transformation, not that any output URL was requested or crawled."],
      });
      downloadRunManifest(manifest, "devawesome-crawl-list.run.json");
      status.textContent = "Run manifest downloaded without source or crawl-list contents.";
    } catch (error) { status.textContent = `Run manifest not created: ${error.message}`; }
  });
  rebuildAndRun();
}
