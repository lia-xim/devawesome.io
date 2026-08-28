const root = document.querySelector("[data-plan-builder]");

if (root) {
  const form = root.querySelector("[data-plan-form]");
  const output = root.querySelector("[data-plan-output]");
  const status = root.querySelector("[data-plan-status]");
  const copy = root.querySelector("[data-copy]");
  const download = root.querySelector("[data-download]");

  if (!form || !output || !status || !copy || !download) throw new Error("Test-plan builder controls are incomplete.");

  let currentPlan = "";
  const value = (data, key) => String(data.get(key) ?? "").trim();
  const buildPlan = (data) => {
    const subject = value(data, "subject");
    const action = value(data, "action");
    const expected = value(data, "expected");
    const edge = value(data, "edge");
    return [
      `## ${subject}`,
      "",
      `- [ ] Action: ${action}`,
      `- [ ] Expected: ${expected}`,
      ...(edge ? [`- [ ] Edge case: ${edge}`] : []),
      "",
      "Result: Not run",
    ].join("\n");
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    currentPlan = buildPlan(new FormData(form));
    output.textContent = currentPlan;
    copy.disabled = false;
    download.disabled = false;
    status.textContent = "Test case built locally. Run it and replace the result line with what you observed.";
    output.focus();
  });

  form.addEventListener("reset", () => {
    currentPlan = "";
    output.textContent = "Write the subject, action, and expected result.";
    copy.disabled = true;
    download.disabled = true;
    status.textContent = "Plan cleared. No entries were stored.";
  });

  copy.addEventListener("click", async () => {
    if (!currentPlan) return;
    try {
      await navigator.clipboard.writeText(currentPlan);
      status.textContent = "Markdown copied to the clipboard.";
    } catch {
      status.textContent = "Clipboard access was unavailable. Select and copy the test case manually.";
    }
  });

  download.addEventListener("click", () => {
    if (!currentPlan) return;
    const blob = new Blob([currentPlan + "\n"], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "test-case.md";
    anchor.click();
    URL.revokeObjectURL(url);
    status.textContent = "Markdown file created locally.";
  });
}
