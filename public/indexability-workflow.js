import { diagnoseIndexability } from "./workbench-core.js";

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
  if (Object.values(fields).some((field) => !field) || !verdict || !explanation || !checks) continue;

  let report;
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
  update();
}
