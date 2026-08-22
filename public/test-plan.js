const root = document.querySelector("[data-plan-builder]");

if (root) {
  const form = root.querySelector("[data-plan-form]");
  const output = root.querySelector("[data-plan-output]");
  const status = root.querySelector("[data-plan-status]");
  const copy = root.querySelector("[data-copy]");
  const download = root.querySelector("[data-download]");

  if (!form || !output || !status || !copy || !download) throw new Error("Test-plan builder controls are incomplete.");

  let currentJson = "";
  const value = (data, key) => String(data.get(key) ?? "").trim();
  const buildPlan = (data) => ({
    schema: "https://devawesome.io/schemas/developer-tool-test-plan.v0.1.json",
    generatedAt: new Date().toISOString(),
    question: value(data, "question"),
    subject: {
      toolAndVersion: value(data, "tool"),
      environment: value(data, "environment"),
    },
    fixture: value(data, "fixture"),
    cases: [
      { kind: "expected", expectedBehavior: value(data, "expected") },
      { kind: "negative", expectedBehavior: value(data, "negative") },
    ],
    procedure: value(data, "command"),
    evidenceToCapture: value(data, "evidence"),
    knownLimits: value(data, "limits"),
    rerunTrigger: value(data, "rerun") || null,
    editorial: {
      independentReviewRequiredForPublication: true,
      secretsAndPersonalDataExcluded: true,
    },
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    currentJson = JSON.stringify(buildPlan(new FormData(form)), null, 2);
    output.textContent = currentJson;
    copy.disabled = false;
    download.disabled = false;
    status.textContent = "Plan generated locally. Review it before you run or publish the test.";
    output.focus();
  });

  form.addEventListener("reset", () => {
    currentJson = "";
    output.textContent = '{\n  "status": "waiting_for_declaration"\n}';
    copy.disabled = true;
    download.disabled = true;
    status.textContent = "Plan cleared. No entries were stored.";
  });

  copy.addEventListener("click", async () => {
    if (!currentJson) return;
    try {
      await navigator.clipboard.writeText(currentJson);
      status.textContent = "JSON copied to the clipboard.";
    } catch {
      status.textContent = "Clipboard access was unavailable. Select and copy the JSON output manually.";
    }
  });

  download.addEventListener("click", () => {
    if (!currentJson) return;
    const blob = new Blob([currentJson + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "developer-tool-test-plan.json";
    anchor.click();
    URL.revokeObjectURL(url);
    status.textContent = "JSON download created locally.";
  });
}
