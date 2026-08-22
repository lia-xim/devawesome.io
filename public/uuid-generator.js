const root = document.querySelector("[data-uuid-generator]");

if (root) {
  const countInput = root.querySelector("[data-uuid-count]");
  const output = root.querySelector("[data-uuid-output]");
  const status = root.querySelector("[data-uuid-status]");
  const generateButton = root.querySelector("[data-uuid-generate]");
  const copyButton = root.querySelector("[data-uuid-copy]");
  const downloadButton = root.querySelector("[data-uuid-download]");

  if (!countInput || !output || !status || !generateButton || !copyButton || !downloadButton) {
    throw new Error("UUID generator controls are incomplete.");
  }

  const generate = () => {
    const count = Math.min(100, Math.max(1, Number.parseInt(countInput.value, 10) || 1));
    countInput.value = String(count);
    if (typeof globalThis.crypto?.randomUUID !== "function") {
      status.textContent = "This browser does not support crypto.randomUUID().";
      return;
    }
    output.value = Array.from({ length: count }, () => globalThis.crypto.randomUUID()).join("\n");
    copyButton.disabled = false;
    downloadButton.disabled = false;
    status.textContent = `${count} UUID${count === 1 ? "" : "s"} generated locally.`;
  };

  generateButton.addEventListener("click", generate);

  copyButton.addEventListener("click", async () => {
    if (!output.value) return;
    try {
      await navigator.clipboard.writeText(output.value);
      status.textContent = "UUIDs copied.";
    } catch {
      output.focus();
      output.select();
      status.textContent = "Select and copy the list manually.";
    }
  });

  downloadButton.addEventListener("click", () => {
    if (!output.value) return;
    const blob = new Blob([output.value + "\n"], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "devawesome-uuids.txt";
    link.click();
    URL.revokeObjectURL(url);
    status.textContent = "Text download created locally.";
  });

  generate();
}
