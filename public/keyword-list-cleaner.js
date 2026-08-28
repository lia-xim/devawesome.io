(function () {
  function parseCells(input) {
    const cells = [];
    let current = "";
    let quoted = false;

    for (let index = 0; index < input.length; index += 1) {
      const character = input[index];
      const next = input[index + 1];

      if (character === '"') {
        if (quoted && next === '"') {
          current += '"';
          index += 1;
        } else {
          quoted = !quoted;
        }
      } else if (!quoted && (character === "," || character === "\t" || character === "\n" || character === "\r")) {
        cells.push(current);
        current = "";
        if (character === "\r" && next === "\n") index += 1;
      } else {
        current += character;
      }
    }

    cells.push(current);
    return cells;
  }

  function cleanKeywords(input, ignoreCase) {
    const seen = new Set();
    const keywords = [];
    let empty = 0;
    let duplicates = 0;

    for (const cell of parseCells(input)) {
      const keyword = cell.trim().replace(/\s+/g, " ");
      if (!keyword) {
        empty += 1;
        continue;
      }
      const key = ignoreCase ? keyword.toLocaleLowerCase() : keyword;
      if (seen.has(key)) {
        duplicates += 1;
        continue;
      }
      seen.add(key);
      keywords.push(keyword);
    }

    return { keywords, empty, duplicates };
  }

  for (const root of document.querySelectorAll("[data-keyword-cleaner]")) {
    const input = root.querySelector("[data-keyword-input]");
    const output = root.querySelector("[data-keyword-output]");
    const ignoreCase = root.querySelector("[data-keyword-ignore-case]");
    const status = root.querySelector("[data-keyword-status]");
    const cleanButton = root.querySelector("[data-keyword-clean]");
    const clearButton = root.querySelector("[data-keyword-clear]");
    const copyButton = root.querySelector("[data-keyword-copy]");
    const downloadButton = root.querySelector("[data-keyword-download]");

    if (!input || !output || !ignoreCase || !status || !cleanButton || !clearButton || !copyButton) continue;

    const run = () => {
      const result = cleanKeywords(input.value, ignoreCase.checked);
      output.value = result.keywords.join("\n");
      copyButton.disabled = result.keywords.length === 0;
      if (downloadButton) downloadButton.disabled = result.keywords.length === 0;
      status.textContent = `${result.keywords.length} unique · ${result.duplicates} ${result.duplicates === 1 ? "duplicate" : "duplicates"} removed`;
    };

    cleanButton.addEventListener("click", run);
    ignoreCase.addEventListener("change", run);
    clearButton.addEventListener("click", () => {
      input.value = "";
      output.value = "";
      copyButton.disabled = true;
      if (downloadButton) downloadButton.disabled = true;
      status.textContent = "List cleared.";
      input.focus();
    });
    copyButton.addEventListener("click", async () => {
      if (!output.value) return;
      try {
        await navigator.clipboard.writeText(output.value);
        status.textContent = "Clean list copied.";
      } catch {
        output.focus();
        output.select();
        status.textContent = "Select and copy the list manually.";
      }
    });
    downloadButton?.addEventListener("click", () => {
      if (!output.value) return;
      const blob = new Blob([`${output.value}\n`], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "clean-keywords.txt";
      link.click();
      URL.revokeObjectURL(url);
      status.textContent = "Clean list downloaded.";
    });

    run();
  }
})();
