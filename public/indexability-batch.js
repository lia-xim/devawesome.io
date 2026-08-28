import { analyzeIndexabilityBatch, formatIndexabilityBatch } from "./indexability-batch-core.js";
import { profileTabularInput, normalizeColumnName } from "./workbench-tabular.js";

const fields = [
  ["url", "URL", /^(url|address|page)$/], ["status", "Status code", /status.*code|http.*status/], ["canonical", "Canonical", /canonical/],
  ["metaRobots", "Meta robots", /meta.*robots|robots.*meta/], ["xRobotsTag", "X-Robots-Tag", /x.*robots/], ["robotsStatus", "robots.txt status", /robots.*(status|allowed|access)/], ["contentType", "Content type", /content.*type|mime/],
];
function option(value, label) { const node = document.createElement("option"); node.value = value; node.textContent = label; return node; }
function download(text, name, type) { const url = URL.createObjectURL(new Blob([`${text}\n`], { type })); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url); }

for (const root of document.querySelectorAll("[data-indexability-batch]")) {
  const input = root.querySelector("[data-batch-input]"); const file = root.querySelector("[data-batch-file]"); const delimiter = root.querySelector("[data-batch-delimiter]"); const header = root.querySelector("[data-batch-header]");
  const mappingRoot = root.querySelector("[data-batch-mapping]"); const rowsRoot = root.querySelector("[data-batch-rows]"); const summary = root.querySelector("[data-batch-summary]"); const status = root.querySelector("[data-batch-status]");
  let report;
  const mode = () => delimiter.value === "comma" ? "," : delimiter.value;
  const rebuild = () => {
    const profile = profileTabularInput(input.value, { mode: mode(), hasHeader: header.checked });
    mappingRoot.replaceChildren(...fields.map(([key, label, matcher]) => {
      const wrapper = document.createElement("label"); const title = document.createElement("span"); title.textContent = label; const select = document.createElement("select"); select.dataset.batchColumn = key;
      select.append(option("-1", `Not supplied: ${label}`), ...profile.headers.map((name, index) => option(String(index), name)));
      const guessed = profile.profiles.find((item) => matcher.test(normalizeColumnName(item.name))); select.value = guessed ? String(guessed.index) : "-1"; wrapper.append(title, select); return wrapper;
    }));
  };
  const run = () => {
    const mapping = Object.fromEntries([...mappingRoot.querySelectorAll("[data-batch-column]")].map((select) => [select.dataset.batchColumn, Number(select.value)]));
    report = analyzeIndexabilityBatch(input.value, { delimiter: mode(), hasHeader: header.checked, mapping });
    const grouped = Object.entries(report.counts); summary.replaceChildren(...grouped.flatMap(([key, count]) => { const strong = document.createElement("strong"); strong.textContent = count; const span = document.createElement("span"); span.textContent = key.replaceAll("-", " "); return [strong, span]; }));
    rowsRoot.replaceChildren(...report.rows.slice(0, 100).map((item) => { const row = document.createElement("tr"); for (const value of [item.url, item.label, item.reason]) { const cell = document.createElement("td"); cell.textContent = value; row.append(cell); } return row; }));
    status.textContent = `${report.rows.length} rows classified locally${report.rows.length > 100 ? "; first 100 shown" : ""}.`;
  };
  root.querySelector("[data-batch-run]").addEventListener("click", run);
  root.querySelector("[data-batch-download]").addEventListener("click", () => report && download(formatIndexabilityBatch(report), "indexability-groups.csv", "text/csv"));
  root.querySelector("[data-batch-json]").addEventListener("click", () => report && download(formatIndexabilityBatch(report, "json"), "indexability-report.json", "application/json"));
  for (const control of [input, delimiter, header]) control.addEventListener(control === input ? "input" : "change", rebuild);
  file.addEventListener("change", async () => { const selected = file.files?.[0]; if (selected) { input.value = await selected.text(); delimiter.value = selected.name.toLowerCase().endsWith(".tsv") ? "tab" : "auto"; rebuild(); status.textContent = `${selected.name} loaded locally. Review every mapping.`; } file.value = ""; });
  rebuild(); run();
}
