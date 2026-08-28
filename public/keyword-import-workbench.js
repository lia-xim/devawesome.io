import { formatKeywordImport, prepareKeywordImport } from "./workbench-core.js";
import { createRecipe, downloadRecipe, preflightRecipe, presentRecipePreflight, readRecipeFile } from "./workbench-recipes.js";
import { createRunManifest, downloadRunManifest } from "./workbench-run-manifests.js";
import { mappingForColumn, profileTabularInput } from "./workbench-tabular.js";

const examples = {
  spreadsheet: {
    mode: "tab",
    header: true,
    input: "keyword\tvolume\tlist\ntechnical seo audit\t210\tAudit\nKeyword Clustering\t90\tContent\n1. technical seo audit\t210\tAudit\n/\t\t\nsearch intent\t140\tResearch",
  },
  csv: {
    mode: ",",
    header: true,
    input: 'query,search volume,intent\n"running shoes, women",1200,commercial\ntrail running shoes,800,commercial\nTrail Running Shoes,950,transactional\nseo audit checklist,260,informational',
  },
  messy: {
    mode: "lines",
    header: false,
    input: "1. technical seo audit\nTechnical SEO Audit\n/\nkeyword   clustering\n• search intent\n2) site audit",
  },
};

function option(value, label) {
  const element = document.createElement("option");
  element.value = String(value);
  element.textContent = label;
  return element;
}

function download(content, format) {
  const extension = format === "json" ? "json" : format === "txt" ? "txt" : "csv";
  const type = format === "json" ? "application/json" : format === "txt" ? "text/plain" : "text/csv";
  const url = URL.createObjectURL(new Blob([`${content}\n`], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `keyword-import.${extension}`;
  link.click();
  URL.revokeObjectURL(url);
}

for (const root of document.querySelectorAll("[data-keyword-import-workbench]")) {
  const input = root.querySelector("[data-keyword-workbench-input]");
  const sourceFile = root.querySelector("[data-keyword-workbench-file]");
  const mode = root.querySelector("[data-keyword-workbench-mode]");
  const header = root.querySelector("[data-keyword-workbench-header]");
  const keywordColumn = root.querySelector("[data-keyword-column]");
  const retained = root.querySelector("[data-keyword-retained]");
  const caseMode = root.querySelector("[data-keyword-case]");
  const ignoreCase = root.querySelector("[data-keyword-workbench-ignore-case]");
  const stripNoise = root.querySelector("[data-keyword-workbench-strip-noise]");
  const whitespace = root.querySelector("[data-keyword-workbench-whitespace]");
  const conflictStrategy = root.querySelector("[data-keyword-conflict-strategy]");
  const conflictReview = root.querySelector("[data-keyword-conflict-review]");
  const conflictRows = root.querySelector("[data-keyword-conflicts]");
  const formats = [...root.querySelectorAll("[data-keyword-workbench-format]")];
  const output = root.querySelector("[data-keyword-workbench-output]");
  const sourceSummary = root.querySelector("[data-keyword-source-summary]");
  const reviewSummary = root.querySelector("[data-keyword-review-summary]");
  const previewHead = root.querySelector("[data-keyword-preview-head]");
  const previewBody = root.querySelector("[data-keyword-preview-body]");
  const changeLog = root.querySelector("[data-keyword-change-log]");
  const formatNote = root.querySelector("[data-keyword-format-note]");
  const status = root.querySelector("[data-keyword-workbench-status]");
  const copy = root.querySelector("[data-keyword-workbench-copy]");
  const downloadButton = root.querySelector("[data-keyword-workbench-download]");
  const recipeSave = root.querySelector("[data-recipe-save]");
  const recipeLoad = root.querySelector("[data-recipe-load]");
  const manifestSave = root.querySelector("[data-run-manifest-save]");
  if (!input || !mode || !header || !keywordColumn || !retained || !output || !status) continue;

  let currentResult;
  let currentFormat = "txt";
  let knownHeaders = [];
  let conflictResolutions = {};
  let currentSourceType = "pasted-tabular-data";

  const options = () => ({
    mode: mode.value,
    hasHeader: header.checked,
    keywordColumn: Number(keywordColumn.value || 0),
    retainedColumns: [...retained.querySelectorAll("input:checked")].map((field) => Number(field.value)),
    caseMode: caseMode.value,
    ignoreCase: ignoreCase.checked,
    stripNoise: stripNoise.checked,
    whitespace: whitespace.checked,
    duplicateStrategy: conflictStrategy.value,
    conflictResolutions,
  });

  const rebuildMapping = () => {
    const lineMode = mode.value === "lines";
    header.disabled = lineMode;
    if (lineMode) header.checked = false;
    const probe = prepareKeywordImport(input.value, { mode: mode.value, hasHeader: header.checked });
    const previousKeyword = knownHeaders[Number(keywordColumn.value || 0)];
    const previousRetained = new Set([...retained.querySelectorAll("input:checked")].map((field) => knownHeaders[Number(field.value)]));
    knownHeaders = probe.headers;
    keywordColumn.replaceChildren(...knownHeaders.map((label, index) => option(index, label)));
    const keywordIndex = Math.max(0, knownHeaders.indexOf(previousKeyword));
    keywordColumn.value = String(keywordIndex);
    retained.replaceChildren(...knownHeaders.map((label, index) => {
      const row = document.createElement("label");
      const field = document.createElement("input");
      field.type = "checkbox";
      field.value = String(index);
      field.checked = previousRetained.has(label) || (!previousRetained.size && index > 0);
      field.disabled = index === keywordIndex;
      const text = document.createElement("span");
      text.textContent = label;
      row.append(field, text);
      return row;
    }));
    for (const field of retained.querySelectorAll("input")) field.addEventListener("change", run);
  };

  const renderPreview = (result) => {
    const headers = [result.headers[result.keywordColumn] || "keyword", ...result.retainedHeaders];
    const headRow = document.createElement("tr");
    for (const label of headers) { const cell = document.createElement("th"); cell.scope = "col"; cell.textContent = label; headRow.append(cell); }
    previewHead.replaceChildren(headRow);
    previewBody.replaceChildren(...result.rows.slice(0, 6).map((row) => {
      const tableRow = document.createElement("tr");
      for (const value of [row.keyword, ...row.values]) { const cell = document.createElement("td"); cell.textContent = value; tableRow.append(cell); }
      return tableRow;
    }));
  };

  const renderConflicts = (result) => {
    conflictReview.hidden = result.conflicts.length === 0;
    conflictRows.replaceChildren(...result.conflicts.map((conflict) => {
      const item = document.createElement("article");
      item.className = "conflict-row";
      const summary = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = conflict.keyword;
      const detail = document.createElement("span");
      detail.textContent = conflict.rows.map((row) => `Row ${row.sourceRow}: ${row.values.join(" · ") || "no retained values"}`).join(" | ");
      summary.append(title, detail);
      const select = document.createElement("select");
      select.setAttribute("aria-label", `Resolve conflicting rows for ${conflict.keyword}`);
      for (const [value, label] of [["unresolved", "Choose a resolution"], ["first", "Keep first row"], ["last", "Keep last row"], ["merge", "Merge distinct values"]]) select.append(option(value, label));
      select.value = conflict.resolution;
      select.disabled = conflictStrategy.value !== "manual";
      select.addEventListener("change", () => {
        if (select.value === "unresolved") delete conflictResolutions[conflict.id];
        else conflictResolutions[conflict.id] = select.value;
        run();
      });
      item.append(summary, select);
      return item;
    }));
  };

  function run() {
    for (const field of retained.querySelectorAll("input")) field.disabled = Number(field.value) === Number(keywordColumn.value);
    currentResult = prepareKeywordImport(input.value, options());
    currentFormat = formats.find((field) => field.checked)?.value || "txt";
    output.value = formatKeywordImport(currentResult, currentFormat);
    sourceSummary.textContent = `${currentResult.inputRows} data rows · ${currentResult.headers.length} column${currentResult.headers.length === 1 ? "" : "s"} · ${currentResult.hasHeader ? "header kept for mapping" : "no header row"}`;
    reviewSummary.innerHTML = `<strong>${currentResult.rows.length}</strong><span>clean rows</span><strong>${currentResult.duplicates}</strong><span>duplicate rows</span><strong>${currentResult.conflicts.length}</strong><span>data conflicts</span><strong>${currentResult.ignored}</strong><span>empty or noise rows</span>`;
    changeLog.replaceChildren(...[
      `${currentResult.inputRows} source rows read`,
      `${currentResult.rows.length} unique keywords kept`,
      `${currentResult.retainedHeaders.length} additional column${currentResult.retainedHeaders.length === 1 ? "" : "s"} retained`,
      currentResult.duplicates ? `${currentResult.duplicates} duplicate row${currentResult.duplicates === 1 ? "" : "s"} reviewed` : "No duplicates found",
      currentResult.unresolvedConflicts ? `${currentResult.unresolvedConflicts} conflict${currentResult.unresolvedConflicts === 1 ? "" : "s"} still need a decision` : "No unresolved data conflicts",
    ].map((text) => { const item = document.createElement("li"); item.textContent = text; return item; }));
    renderPreview(currentResult);
    renderConflicts(currentResult);
    formatNote.textContent = currentFormat === "contextter"
      ? 'Contextter CSV renames the selected keyword column to "keyword". The current Contextter importer can map retained columns during import.'
      : currentFormat === "csv" ? "CSV keeps the selected keyword column and any retained columns."
      : currentFormat === "json" ? "JSON exports one object per cleaned keyword row."
      : "TXT contains one cleaned keyword per line and drops additional columns.";
    status.textContent = currentResult.unresolvedConflicts
      ? `Resolve ${currentResult.unresolvedConflicts} conflicting keyword${currentResult.unresolvedConflicts === 1 ? "" : "s"} before export.`
      : `${currentResult.rows.length} rows ready for ${currentFormat === "contextter" ? "Contextter CSV" : currentFormat.toUpperCase()} export.`;
    copy.disabled = !output.value || currentResult.unresolvedConflicts > 0;
    downloadButton.disabled = !output.value || currentResult.unresolvedConflicts > 0;
    if (manifestSave) manifestSave.disabled = !output.value || currentResult.unresolvedConflicts > 0;
  }

  const rebuildAndRun = () => { rebuildMapping(); run(); };
  input.addEventListener("input", () => { currentSourceType = `pasted-${mode.value}`; rebuildAndRun(); });
  mode.addEventListener("change", () => { currentSourceType = `pasted-${mode.value}`; rebuildAndRun(); });
  header.addEventListener("change", rebuildAndRun);
  keywordColumn.addEventListener("change", run);
  for (const field of [caseMode, ignoreCase, stripNoise, whitespace, ...formats]) field.addEventListener("change", run);
  conflictStrategy.addEventListener("change", () => { conflictResolutions = {}; run(); });
  for (const button of root.querySelectorAll("[data-keyword-example]")) button.addEventListener("click", () => {
    const example = examples[button.dataset.keywordExample];
    input.value = example.input;
    mode.value = example.mode;
    header.checked = example.header;
    knownHeaders = [];
    retained.replaceChildren();
    conflictResolutions = {};
    currentSourceType = `example-${button.dataset.keywordExample}`;
    rebuildAndRun();
    input.focus();
  });
  sourceFile?.addEventListener("change", async () => {
    try {
      const file = sourceFile.files?.[0];
      const text = await file?.text();
      if (!text) throw new Error("The selected file is empty.");
      const extension = file.name.toLowerCase().split(".").pop();
      mode.value = extension === "csv" ? "," : extension === "tsv" ? "tab" : "auto";
      const probe = prepareKeywordImport(text, { mode: mode.value });
      header.checked = probe.hasHeader;
      input.value = text;
      knownHeaders = [];
      retained.replaceChildren();
      conflictResolutions = {};
      currentSourceType = `local-${extension || "text"}-file`;
      rebuildAndRun();
      status.textContent = `${file.name} loaded locally. Review the detected separator and column mapping.`;
    } catch (error) { status.textContent = `File not loaded: ${error.message}`; }
    sourceFile.value = "";
  });
  copy.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(output.value); status.textContent = "Export copied."; }
    catch { output.focus(); output.select(); status.textContent = "Select and copy the export manually."; }
  });
  downloadButton.addEventListener("click", () => { download(output.value, currentFormat); status.textContent = "Export downloaded."; });
  recipeSave.addEventListener("click", () => {
    const settings = options();
    delete settings.conflictResolutions;
    const profile = profileTabularInput(input.value, { mode: mode.value, hasHeader: header.checked });
    const columnMappings = [];
    if (profile.profiles[settings.keywordColumn]) columnMappings.push(mappingForColumn("keywordColumn", "Keyword column", profile.profiles[settings.keywordColumn]));
    for (const index of settings.retainedColumns) if (profile.profiles[index]) columnMappings.push(mappingForColumn("retainedColumns", `Retained column: ${profile.profiles[index].name}`, profile.profiles[index], true));
    downloadRecipe(createRecipe("keyword-import", settings, { sourceType: mode.value, workflowVersion: "2.0.0", compatibleWorkflowVersions: ["2.x"], columnMappings }), "devawesome-keyword-import.recipe.json");
    status.textContent = "Recipe downloaded without input data or row-specific conflict decisions.";
  });
  recipeLoad.addEventListener("change", async () => {
    try {
      const recipe = await readRecipeFile(recipeLoad.files?.[0], "keyword-import");
      const profile = profileTabularInput(input.value, { mode: recipe.settings.mode ?? mode.value, hasHeader: recipe.settings.hasHeader ?? header.checked });
      const preflight = preflightRecipe(recipe, { workflowVersion: "2.0.0", profiles: profile.profiles });
      if (!(await presentRecipePreflight(root, preflight))) { recipeLoad.value = ""; status.textContent = "Recipe not applied."; return; }
      const settings = preflight.resolvedSettings;
      mode.value = settings.mode ?? mode.value;
      header.checked = settings.hasHeader ?? header.checked;
      caseMode.value = settings.caseMode ?? caseMode.value;
      ignoreCase.checked = settings.ignoreCase ?? ignoreCase.checked;
      stripNoise.checked = settings.stripNoise ?? stripNoise.checked;
      whitespace.checked = settings.whitespace ?? whitespace.checked;
      conflictStrategy.value = settings.duplicateStrategy ?? conflictStrategy.value;
      // A recipe restores reusable rules, never decisions tied to pasted rows.
      conflictResolutions = {};
      rebuildMapping();
      keywordColumn.value = String(settings.keywordColumn ?? keywordColumn.value);
      for (const field of retained.querySelectorAll("input")) field.checked = (settings.retainedColumns || []).includes(Number(field.value));
      run();
      status.textContent = "Recipe loaded. Pasted input was left unchanged.";
    } catch (error) { status.textContent = `Recipe not loaded: ${error.message}`; }
    recipeLoad.value = "";
  });
  manifestSave?.addEventListener("click", async () => {
    try {
      const manifestSettings = options();
      delete manifestSettings.conflictResolutions;
      const manifest = await createRunManifest({
        workflow: "keyword-import",
        workflowVersion: "2.0.0",
        sourceType: currentSourceType,
        settings: manifestSettings,
        input: input.value,
        output: output.value,
        outputFormat: currentFormat,
        summary: { inputRows: currentResult.inputRows, outputRows: currentResult.rows.length, duplicates: currentResult.duplicates, conflicts: currentResult.conflicts.length, ignoredRows: currentResult.ignored },
        limits: ["Row-specific manual conflict choices are reflected in the output receipt but omitted from settings because they can reveal source keywords."],
      });
      downloadRunManifest(manifest, "devawesome-keyword-import.run.json");
      status.textContent = "Run manifest downloaded without keyword or export contents.";
    } catch (error) { status.textContent = `Run manifest not created: ${error.message}`; }
  });
  rebuildAndRun();
}
