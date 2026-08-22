const formatterRoots = document.querySelectorAll("[data-json-formatter]");

for (const root of formatterRoots) {
  const input = root.querySelector("[data-json-input]");
  const output = root.querySelector("[data-json-output]");
  const status = root.querySelector("[data-json-status]");
  const formatButton = root.querySelector("[data-json-format]");
  const minifyButton = root.querySelector("[data-json-minify]");
  const copyButton = root.querySelector("[data-json-copy]");
  const clearButton = root.querySelector("[data-json-clear]");

  if (!input || !output || !status || !formatButton || !minifyButton || !copyButton || !clearButton) {
    throw new Error("JSON formatter controls are incomplete.");
  }

  const setStatus = (message, state = "") => {
    status.textContent = message;
    status.dataset.state = state;
  };

  const transform = (spaces) => {
    try {
      const parsed = JSON.parse(input.value);
      output.value = JSON.stringify(parsed, null, spaces);
      setStatus("Valid JSON", "valid");
    } catch (error) {
      output.value = "";
      const message = error instanceof Error ? error.message : "Invalid JSON";
      setStatus(message.replace(/^JSON\.parse:\s*/i, ""), "error");
    }
  };

  formatButton.addEventListener("click", () => transform(2));
  minifyButton.addEventListener("click", () => transform(0));

  clearButton.addEventListener("click", () => {
    input.value = "";
    output.value = "";
    setStatus("Cleared");
    input.focus();
  });

  copyButton.addEventListener("click", async () => {
    if (!output.value) transform(2);
    if (!output.value) return;
    try {
      await navigator.clipboard.writeText(output.value);
      setStatus("Copied formatted JSON", "valid");
    } catch {
      output.focus();
      output.select();
      setStatus("Select and copy the output manually");
    }
  });

  input.addEventListener("input", () => {
    if (!input.value.trim()) {
      output.value = "";
      setStatus("Ready");
      return;
    }
    transform(2);
  });

  transform(2);
}
