(function () {
  const trackingParameter = /^(?:utm_.+|gclid|dclid|fbclid|msclkid|mc_cid|mc_eid)$/i;

  function splitEntries(input, mode) {
    const entries = [];
    let current = "";
    let quoted = false;
    const isDelimiter = (character) => {
      if (character === "\n" || character === "\r") return true;
      if (mode === "lines") return false;
      if (mode === "comma") return character === ",";
      return character === "," || character === "\t" || character === ";" || character === "|";
    };
    for (let index = 0; index < input.length; index += 1) {
      const character = input[index];
      const next = input[index + 1];
      if (character === '"') {
        if (quoted && next === '"') { current += '"'; index += 1; }
        else quoted = !quoted;
      } else if (!quoted && isDelimiter(character)) {
        entries.push(current);
        current = "";
        if (character === "\r" && next === "\n") index += 1;
      } else current += character;
    }
    entries.push(current);
    return entries.map((value) => value.trim()).filter(Boolean);
  }

  function unwrapEntry(raw) {
    let value = raw.replace(/^\uFEFF/, "").trim().replace(/^(?:[-–—•·*▪◦]+|\d{1,4}[.)\]:-])\s+/, "");
    const markdown = value.match(/^\[[^\]]*\]\((https?:\/\/[^)]+)\)$/i);
    if (markdown) value = markdown[1];
    value = value.replace(/^[<`'“”‘’]+|[>`'“”‘’]+$/g, "").trim();
    const embedded = value.match(/(?:https?:\/\/|www\.)[^\s]+/i);
    if (embedded && /\s/.test(value)) value = embedded[0];
    return value.replace(/[.,]+$/, "");
  }

  function normalizeEntry(raw, options) {
    let candidate = unwrapEntry(raw);
    if (!/^[a-z][a-z\d+.-]*:\/\//i.test(candidate)) {
      if (!options.addHttps || !/^(?:www\.)?[^\s/]+\.[^\s]+/i.test(candidate)) throw new Error("Missing a valid HTTP or HTTPS URL");
      candidate = `https://${candidate}`;
    }
    let url;
    try { url = new URL(candidate); }
    catch { throw new Error("Could not parse this entry as a URL"); }
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP and HTTPS URLs are accepted");
    if (url.username || url.password) throw new Error("URLs with credentials are not accepted");
    if (!url.hostname.includes(".") && url.hostname !== "localhost") throw new Error("The hostname is incomplete");
    if (options.stripFragment) url.hash = "";
    if (options.queryMode === "remove") url.search = "";
    if (options.queryMode === "tracking") {
      for (const key of [...url.searchParams.keys()]) if (trackingParameter.test(key)) url.searchParams.delete(key);
    }
    if (options.stripTrailing && url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    return url.href;
  }

  function csvValue(value) {
    return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
  }
  function formatEntries(entries, format) {
    if (format === "comma") return entries.map(csvValue).join(", ");
    if (format === "json") return JSON.stringify(entries, null, 2);
    return entries.join("\n");
  }

  for (const root of document.querySelectorAll("[data-url-normalizer]")) {
    const input = root.querySelector("[data-url-input]");
    const output = root.querySelector("[data-url-output]");
    const inputMode = root.querySelector("[data-url-input-mode]");
    const queryMode = root.querySelector("[data-url-query-mode]");
    const addHttps = root.querySelector("[data-url-add-https]");
    const stripFragment = root.querySelector("[data-url-strip-fragment]");
    const stripTrailing = root.querySelector("[data-url-strip-trailing]");
    const formats = [...root.querySelectorAll("[data-url-format]")];
    const status = root.querySelector("[data-url-status]");
    const normalizeButton = root.querySelector("[data-url-normalize]");
    const clearButton = root.querySelector("[data-url-clear]");
    const copyButton = root.querySelector("[data-url-copy]");
    const downloadButton = root.querySelector("[data-url-download]");
    const invalidWrap = root.querySelector("[data-url-invalid-wrap]");
    const invalidSummary = root.querySelector("[data-url-invalid-summary]");
    const invalidList = root.querySelector("[data-url-invalid]");
    if (!input || !output || !status || !normalizeButton || !clearButton || !copyButton || !downloadButton || !invalidWrap || !invalidSummary || !invalidList) continue;

    let currentFormat = "lines";
    const run = () => {
      const seen = new Set();
      const normalized = [];
      const invalid = [];
      let duplicates = 0;
      currentFormat = formats.find((field) => field.checked)?.value || "lines";
      for (const entry of splitEntries(input.value, inputMode?.value || "smart")) {
        try {
          const value = normalizeEntry(entry, {
            addHttps: addHttps?.checked ?? true,
            stripFragment: stripFragment?.checked ?? true,
            stripTrailing: stripTrailing?.checked ?? true,
            queryMode: queryMode?.value || "tracking",
          });
          if (seen.has(value)) duplicates += 1;
          else { seen.add(value); normalized.push(value); }
        } catch (error) { invalid.push({ entry, reason: error.message }); }
      }
      output.value = formatEntries(normalized, currentFormat);
      copyButton.disabled = normalized.length === 0;
      downloadButton.disabled = normalized.length === 0;
      status.textContent = `${normalized.length} kept · ${duplicates} duplicate${duplicates === 1 ? "" : "s"} removed · ${invalid.length} invalid`;
      invalidList.replaceChildren(...invalid.map(({ entry, reason }) => {
        const item = document.createElement("li");
        const code = document.createElement("code");
        code.textContent = entry;
        item.append(code, document.createTextNode(` — ${reason}`));
        return item;
      }));
      invalidSummary.textContent = `${invalid.length} invalid ${invalid.length === 1 ? "entry" : "entries"}`;
      invalidWrap.hidden = invalid.length === 0;
      if (!invalid.length) invalidWrap.open = false;
    };

    normalizeButton.addEventListener("click", run);
    input.addEventListener("input", run);
    for (const field of [inputMode, queryMode, addHttps, stripFragment, stripTrailing, ...formats]) field?.addEventListener("change", run);
    clearButton.addEventListener("click", () => { input.value = ""; run(); status.textContent = "List cleared."; input.focus(); });
    copyButton.addEventListener("click", async () => {
      if (!output.value) return;
      try { await navigator.clipboard.writeText(output.value); status.textContent = "Normalized list copied."; }
      catch { output.focus(); output.select(); status.textContent = "Select and copy the list manually."; }
    });
    downloadButton.addEventListener("click", () => {
      if (!output.value) return;
      const extension = currentFormat === "json" ? "json" : currentFormat === "comma" ? "csv" : "txt";
      const type = currentFormat === "json" ? "application/json" : currentFormat === "comma" ? "text/csv" : "text/plain";
      const blob = new Blob([`${output.value}\n`], { type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `normalized-urls.${extension}`;
      link.click();
      URL.revokeObjectURL(url);
      status.textContent = `Normalized list downloaded as ${extension.toUpperCase()}.`;
    });
    run();
  }
})();
