(function () {
  function parseEntries(input, mode) {
    const entries = [];
    let current = "";
    let quoted = false;
    const isDelimiter = (character, index) => {
      if (character === "\n" || character === "\r") return true;
      if (mode === "lines") return false;
      if (mode === "comma") return character === ",";
      if (character === "," || character === "\t" || character === ";" || character === "|") return true;
      return character === "/" && /\s/.test(input[index - 1] || "") && /\s/.test(input[index + 1] || "");
    };

    for (let index = 0; index < input.length; index += 1) {
      const character = input[index];
      const next = input[index + 1];
      if (character === '"') {
        if (quoted && next === '"') { current += '"'; index += 1; }
        else quoted = !quoted;
      } else if (!quoted && isDelimiter(character, index)) {
        entries.push(current);
        current = "";
        if (character === "\r" && next === "\n") index += 1;
      } else current += character;
    }
    entries.push(current);
    return entries;
  }

  function cleanEntry(value, options) {
    let keyword = value.replace(/^\uFEFF/, "").trim();
    if (options.stripNoise) {
      keyword = keyword
        .replace(/^(?:[-–—•·*▪◦]+|\d{1,4}[.)\]:-])\s+/, "")
        .replace(/^[`'“”‘’]+|[`'“”‘’]+$/g, "")
        .trim();
      if (/^[,;|/\\-]+$/.test(keyword)) return "";
    }
    if (options.whitespace) keyword = keyword.replace(/\s+/g, " ");
    return keyword;
  }

  function cleanKeywords(input, options) {
    const seen = new Set();
    const keywords = [];
    let ignored = 0;
    let duplicates = 0;
    for (const entry of parseEntries(input, options.mode)) {
      const keyword = cleanEntry(entry, options);
      if (!keyword) { ignored += 1; continue; }
      const key = options.ignoreCase ? keyword.toLocaleLowerCase() : keyword;
      if (seen.has(key)) { duplicates += 1; continue; }
      seen.add(key);
      keywords.push(keyword);
    }
    return { keywords, ignored, duplicates };
  }

  function csvValue(value) {
    return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
  }

  function formatKeywords(keywords, format) {
    if (format === "comma") return keywords.map(csvValue).join(", ");
    if (format === "json") return JSON.stringify(keywords, null, 2);
    return keywords.join("\n");
  }

  for (const root of document.querySelectorAll("[data-keyword-cleaner]")) {
    const input = root.querySelector("[data-keyword-input]");
    const output = root.querySelector("[data-keyword-output]");
    const ignoreCase = root.querySelector("[data-keyword-ignore-case]");
    const stripNoise = root.querySelector("[data-keyword-strip-noise]");
    const whitespace = root.querySelector("[data-keyword-whitespace]");
    const inputMode = root.querySelector("[data-keyword-input-mode]");
    const formats = [...root.querySelectorAll("[data-keyword-format]")];
    const status = root.querySelector("[data-keyword-status]");
    const cleanButton = root.querySelector("[data-keyword-clean]");
    const clearButton = root.querySelector("[data-keyword-clear]");
    const copyButton = root.querySelector("[data-keyword-copy]");
    const downloadButton = root.querySelector("[data-keyword-download]");
    if (!input || !output || !status || !cleanButton || !clearButton || !copyButton) continue;

    let currentFormat = "lines";
    const run = () => {
      currentFormat = formats.find((field) => field.checked)?.value || "lines";
      const result = cleanKeywords(input.value, {
        mode: inputMode?.value || "smart",
        ignoreCase: ignoreCase?.checked ?? true,
        stripNoise: stripNoise?.checked ?? true,
        whitespace: whitespace?.checked ?? true,
      });
      output.value = formatKeywords(result.keywords, currentFormat);
      copyButton.disabled = result.keywords.length === 0;
      if (downloadButton) downloadButton.disabled = result.keywords.length === 0;
      status.textContent = `${result.keywords.length} kept · ${result.duplicates} duplicate${result.duplicates === 1 ? "" : "s"} removed · ${result.ignored} empty/noise row${result.ignored === 1 ? "" : "s"} ignored`;
    };

    cleanButton.addEventListener("click", run);
    input.addEventListener("input", run);
    for (const field of [ignoreCase, stripNoise, whitespace, inputMode, ...formats]) field?.addEventListener("change", run);
    clearButton.addEventListener("click", () => {
      input.value = "";
      run();
      status.textContent = "List cleared.";
      input.focus();
    });
    copyButton.addEventListener("click", async () => {
      if (!output.value) return;
      try { await navigator.clipboard.writeText(output.value); status.textContent = "Clean list copied."; }
      catch { output.focus(); output.select(); status.textContent = "Select and copy the list manually."; }
    });
    downloadButton?.addEventListener("click", () => {
      if (!output.value) return;
      const extension = currentFormat === "json" ? "json" : currentFormat === "comma" ? "csv" : "txt";
      const type = currentFormat === "json" ? "application/json" : currentFormat === "comma" ? "text/csv" : "text/plain";
      const blob = new Blob([`${output.value}\n`], { type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `clean-keywords.${extension}`;
      link.click();
      URL.revokeObjectURL(url);
      status.textContent = `Clean list downloaded as ${extension.toUpperCase()}.`;
    });
    run();
  }
})();
