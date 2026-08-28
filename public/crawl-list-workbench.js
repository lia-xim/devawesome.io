import { extractUrlRows, formatCrawlList, prepareCrawlList } from "./workbench-core.js";

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
  const mode = root.querySelector("[data-crawl-mode]");
  const header = root.querySelector("[data-crawl-header]");
  const urlColumn = root.querySelector("[data-crawl-url-column]");
  const query = root.querySelector("[data-crawl-query]");
  const addHttps = root.querySelector("[data-crawl-add-https]");
  const fragment = root.querySelector("[data-crawl-fragment]");
  const trailing = root.querySelector("[data-crawl-trailing]");
  const formats = [...root.querySelectorAll("[data-crawl-format]")];
  const output = root.querySelector("[data-crawl-output]");
  const sourceSummary = root.querySelector("[data-crawl-source-summary]");
  const reviewSummary = root.querySelector("[data-crawl-review-summary]");
  const hostRows = root.querySelector("[data-crawl-hosts]");
  const suspiciousSummary = root.querySelector("[data-crawl-suspicious-summary]");
  const suspiciousList = root.querySelector("[data-crawl-suspicious]");
  const invalidSummary = root.querySelector("[data-crawl-invalid-summary]");
  const invalidList = root.querySelector("[data-crawl-invalid]");
  const status = root.querySelector("[data-crawl-status]");
  const copy = root.querySelector("[data-crawl-copy]");
  const downloadButton = root.querySelector("[data-crawl-download]");
  if (!input || !mode || !header || !urlColumn || !output || !status) continue;

  let currentResult;
  let currentFormat = "lines";
  let knownHeaders = [];

  const settings = () => ({
    mode: mode.value,
    hasHeader: header.checked,
    urlColumn: Number(urlColumn.value || 0),
    queryMode: query.value,
    addHttps: addHttps.checked,
    stripFragment: fragment.checked,
    stripTrailing: trailing.checked,
  });

  const rebuildColumns = () => {
    const parsed = extractUrlRows(input.value, { mode: mode.value, hasHeader: header.checked });
    const previous = knownHeaders[Number(urlColumn.value || 0)];
    knownHeaders = parsed.headers;
    urlColumn.replaceChildren(...knownHeaders.map((label, index) => makeOption(index, label)));
    const explicitUrl = knownHeaders.findIndex((label) => /^(?:address|url|page)$/i.test(label));
    urlColumn.value = String(Math.max(0, knownHeaders.indexOf(previous), explicitUrl));
    const isSitemap = parsed.sourceType === "sitemap";
    header.disabled = isSitemap;
    urlColumn.disabled = isSitemap || knownHeaders.length < 2;
  };

  function run() {
    currentResult = prepareCrawlList(input.value, settings());
    currentFormat = formats.find((field) => field.checked)?.value || "lines";
    output.value = formatCrawlList(currentResult, currentFormat);
    sourceSummary.textContent = `${currentResult.inputRows} source row${currentResult.inputRows === 1 ? "" : "s"} · ${currentResult.sourceType} input · ${currentResult.headers.length} column${currentResult.headers.length === 1 ? "" : "s"}`;
    reviewSummary.innerHTML = `<strong>${currentResult.entries.length}</strong><span>unique URLs</span><strong>${currentResult.duplicates}</strong><span>duplicates removed</span><strong>${currentResult.invalid.length}</strong><span>invalid entries</span><strong>${currentResult.hosts.length}</strong><span>hosts</span>`;
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
    invalidSummary.textContent = `${currentResult.invalid.length} invalid ${currentResult.invalid.length === 1 ? "entry" : "entries"}`;
    invalidList.replaceChildren(...(currentResult.invalid.length ? currentResult.invalid.map((entry) => makeListItem(entry.entry, entry.reason)) : [makeListItem("No invalid entries") ]));
    status.textContent = `${currentResult.entries.length} URLs ready for ${currentFormat.toUpperCase()} export.`;
    copy.disabled = !output.value;
    downloadButton.disabled = !output.value;
  }

  const rebuildAndRun = () => { rebuildColumns(); run(); };
  input.addEventListener("input", rebuildAndRun);
  mode.addEventListener("change", rebuildAndRun);
  header.addEventListener("change", rebuildAndRun);
  for (const field of [urlColumn, query, addHttps, fragment, trailing, ...formats]) field.addEventListener("change", run);
  for (const button of root.querySelectorAll("[data-crawl-example]")) button.addEventListener("click", () => {
    const example = examples[button.dataset.crawlExample];
    input.value = example.input;
    mode.value = example.mode;
    header.checked = example.header;
    knownHeaders = [];
    rebuildAndRun();
    input.focus();
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
  rebuildAndRun();
}
