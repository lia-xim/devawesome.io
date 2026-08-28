import { formatKeywordImport, prepareKeywordImport } from "./workbench-core.js";

const examples = {
  spreadsheet: {
    mode: "tab",
    header: true,
    input: "keyword\tvolume\tlist\ntechnical seo audit\t210\tAudit\nKeyword Clustering\t90\tContent\n1. technical seo audit\t210\tAudit\n/\t\t\nsearch intent\t140\tResearch",
  },
  csv: {
    mode: ",",
    header: true,
    input: 'query,search volume,intent\n"running shoes, women",1200,commercial\ntrail running shoes,800,commercial\nTrail Running Shoes,800,commercial\nseo audit checklist,260,informational',
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
  const mode = root.querySelector("[data-keyword-workbench-mode]");
  const header = root.querySelector("[data-keyword-workbench-header]");
  const keywordColumn = root.querySelector("[data-keyword-column]");
  const retained = root.querySelector("[data-keyword-retained]");
  const caseMode = root.querySelector("[data-keyword-case]");
  const ignoreCase = root.querySelector("[data-keyword-workbench-ignore-case]");
  const stripNoise = root.querySelector("[data-keyword-workbench-strip-noise]");
  const whitespace = root.querySelector("[data-keyword-workbench-whitespace]");
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
  if (!input || !mode || !header || !keywordColumn || !retained || !output || !status) continue;

  let currentResult;
  let currentFormat = "txt";
  let knownHeaders = [];

  const options = () => ({
    mode: mode.value,
    hasHeader: header.checked,
    keywordColumn: Number(keywordColumn.value || 0),
    retainedColumns: [...retained.querySelectorAll("input:checked")].map((field) => Number(field.value)),
    caseMode: caseMode.value,
    ignoreCase: ignoreCase.checked,
    stripNoise: stripNoise.checked,
    whitespace: whitespace.checked,
  });

  const rebuildMapping = () => {
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

  function run() {
    for (const field of retained.querySelectorAll("input")) field.disabled = Number(field.value) === Number(keywordColumn.value);
    currentResult = prepareKeywordImport(input.value, options());
    currentFormat = formats.find((field) => field.checked)?.value || "txt";
    output.value = formatKeywordImport(currentResult, currentFormat);
    sourceSummary.textContent = `${currentResult.inputRows} data rows · ${currentResult.headers.length} column${currentResult.headers.length === 1 ? "" : "s"} · ${currentResult.hasHeader ? "header kept for mapping" : "no header row"}`;
    reviewSummary.innerHTML = `<strong>${currentResult.rows.length}</strong><span>clean rows</span><strong>${currentResult.duplicates}</strong><span>duplicates removed</span><strong>${currentResult.ignored}</strong><span>empty or noise rows removed</span>`;
    changeLog.replaceChildren(...[
      `${currentResult.inputRows} source rows read`,
      `${currentResult.rows.length} unique keywords kept`,
      `${currentResult.retainedHeaders.length} additional column${currentResult.retainedHeaders.length === 1 ? "" : "s"} retained`,
      currentResult.duplicates ? `${currentResult.duplicates} duplicate row${currentResult.duplicates === 1 ? "" : "s"} removed` : "No duplicates found",
    ].map((text) => { const item = document.createElement("li"); item.textContent = text; return item; }));
    renderPreview(currentResult);
    formatNote.textContent = currentFormat === "contextter"
      ? 'Contextter CSV renames the selected keyword column to "keyword". The current Contextter importer can map retained columns during import.'
      : currentFormat === "csv" ? "CSV keeps the selected keyword column and any retained columns."
      : currentFormat === "json" ? "JSON exports one object per cleaned keyword row."
      : "TXT contains one cleaned keyword per line and drops additional columns.";
    status.textContent = `${currentResult.rows.length} rows ready for ${currentFormat === "contextter" ? "Contextter CSV" : currentFormat.toUpperCase()} export.`;
    copy.disabled = !output.value;
    downloadButton.disabled = !output.value;
  }

  const rebuildAndRun = () => { rebuildMapping(); run(); };
  input.addEventListener("input", rebuildAndRun);
  mode.addEventListener("change", rebuildAndRun);
  header.addEventListener("change", rebuildAndRun);
  keywordColumn.addEventListener("change", run);
  for (const field of [caseMode, ignoreCase, stripNoise, whitespace, ...formats]) field.addEventListener("change", run);
  for (const button of root.querySelectorAll("[data-keyword-example]")) button.addEventListener("click", () => {
    const example = examples[button.dataset.keywordExample];
    input.value = example.input;
    mode.value = example.mode;
    header.checked = example.header;
    knownHeaders = [];
    retained.replaceChildren();
    rebuildAndRun();
    input.focus();
  });
  copy.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(output.value); status.textContent = "Export copied."; }
    catch { output.focus(); output.select(); status.textContent = "Select and copy the export manually."; }
  });
  downloadButton.addEventListener("click", () => { download(output.value, currentFormat); status.textContent = "Export downloaded."; });
  rebuildAndRun();
}
