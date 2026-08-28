import { verifyRunManifest } from "./workbench-run-manifests.js";

for (const root of document.querySelectorAll("[data-run-manifest-verifier]")) {
  const manifestFile = root.querySelector("[data-verify-manifest]");
  const inputFile = root.querySelector("[data-verify-input]");
  const outputFile = root.querySelector("[data-verify-output]");
  const verify = root.querySelector("[data-verify-run]");
  const status = root.querySelector("[data-verify-status]");
  const resultPanel = root.querySelector("[data-verify-result]");
  const verdict = root.querySelector("[data-verify-verdict]");
  const context = root.querySelector("[data-verify-context]");
  const checks = root.querySelector("[data-verify-checks]");
  const updateReady = () => { verify.disabled = !(manifestFile.files?.[0] && inputFile.files?.[0] && outputFile.files?.[0]); };
  for (const field of [manifestFile, inputFile, outputFile]) field.addEventListener("change", updateReady);
  verify.addEventListener("click", async () => {
    try {
      const manifestText = await manifestFile.files[0].text();
      const input = await inputFile.files[0].text();
      const output = await outputFile.files[0].text();
      const result = await verifyRunManifest(manifestText, { input, output });
      resultPanel.hidden = false;
      resultPanel.dataset.state = result.status === "MATCH" ? "pass" : "error";
      verdict.textContent = result.status;
      context.textContent = result.validManifest ? `${result.workflow} · workflow ${result.workflowVersion}` : result.error;
      checks.replaceChildren(...(result.checks.length ? result.checks.map((check) => {
        const item = document.createElement("li");
        item.dataset.state = check.match ? "pass" : "error";
        item.innerHTML = `<strong>${check.match ? "Match" : "Different"}: ${check.label}</strong><span>${check.match ? "SHA-256 receipt matches." : "The calculated SHA-256 receipt differs from the manifest."}</span>`;
        return item;
      }) : [Object.assign(document.createElement("li"), { textContent: result.error || "This workflow version is not supported by the current verifier." })]));
      status.textContent = result.status === "MATCH" ? "All three receipts match." : "Review the failed check before trusting this run.";
    } catch (error) {
      resultPanel.hidden = false;
      resultPanel.dataset.state = "error";
      verdict.textContent = "UNSUPPORTED VERSION";
      context.textContent = error.message;
      checks.replaceChildren();
      status.textContent = "The run could not be verified.";
    }
  });
}
