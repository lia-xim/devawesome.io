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
    const values = entries.map((entry) => typeof entry === "string" ? entry : entry.url);
    if (format === "comma") return values.map(csvValue).join(", ");
    if (format === "json") return JSON.stringify(entries.map((entry) => typeof entry === "string" ? { url: entry } : entry), null, 2);
    return values.join("\n");
  }

  function classifyResource(url) {
    const path = url.pathname.toLowerCase();
    if (/\.(?:html?|php|aspx?)$/.test(path) || !/\.[a-z\d]{1,8}$/.test(path)) return "page";
    if (/\.(?:jpe?g|png|gif|webp|avif|svg|ico)$/.test(path)) return "image";
    if (/\.(?:css|less|scss)$/.test(path)) return "stylesheet";
    if (/\.(?:js|mjs|cjs|map)$/.test(path)) return "script";
    if (/\.(?:woff2?|ttf|otf|eot)$/.test(path)) return "font";
    if (/\.(?:pdf|docx?|xlsx?|pptx?)$/.test(path)) return "document";
    if (/\.(?:mp3|mp4|wav|ogg|webm|mov)$/.test(path)) return "media";
    if (/\.(?:xml|rss|atom)$/.test(path)) return "feed-or-sitemap";
    if (/\.(?:zip|gz|tar|rar|7z)$/.test(path)) return "archive";
    return "other-resource";
  }

  function scopeHost(value) {
    const candidate = value.trim();
    if (!candidate) return "";
    try { return new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(candidate) ? candidate : `https://${candidate}`).hostname.toLowerCase(); }
    catch { return candidate.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""); }
  }

  function compilePatterns(value) {
    return value.split(/[\r\n,]+/).map((entry) => entry.trim()).filter(Boolean).map((entry) => {
      const escaped = entry.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*");
      return { source: entry, regex: new RegExp(escaped, "i") };
    });
  }

  function csvRows(rows) {
    return rows.map((row) => row.map(csvValue).join(",")).join("\n");
  }

  function downloadText(content, filename, type) {
    const blob = new Blob([`${content}\n`], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  for (const root of document.querySelectorAll("[data-url-normalizer]")) {
    const input = root.querySelector("[data-url-input]");
    const output = root.querySelector("[data-url-output]");
    const inputMode = root.querySelector("[data-url-input-mode]");
    const queryMode = root.querySelector("[data-url-query-mode]");
    const addHttps = root.querySelector("[data-url-add-https]");
    const stripFragment = root.querySelector("[data-url-strip-fragment]");
    const stripTrailing = root.querySelector("[data-url-strip-trailing]");
    const scopeHostInput = root.querySelector("[data-url-scope-host]");
    const scopeMode = root.querySelector("[data-url-scope-mode]");
    const protocolMode = root.querySelector("[data-url-protocol-mode]");
    const outputGroup = root.querySelector("[data-url-output-group]");
    const includePatterns = root.querySelector("[data-url-include-patterns]");
    const excludePatterns = root.querySelector("[data-url-exclude-patterns]");
    const formats = [...root.querySelectorAll("[data-url-format]")];
    const status = root.querySelector("[data-url-status]");
    const normalizeButton = root.querySelector("[data-url-normalize]");
    const clearButton = root.querySelector("[data-url-clear]");
    const copyButton = root.querySelector("[data-url-copy]");
    const downloadButton = root.querySelector("[data-url-download]");
    const invalidWrap = root.querySelector("[data-url-invalid-wrap]");
    const invalidSummary = root.querySelector("[data-url-invalid-summary]");
    const invalidList = root.querySelector("[data-url-invalid]");
    const excludedWrap = root.querySelector("[data-url-excluded-wrap]");
    const excludedSummary = root.querySelector("[data-url-excluded-summary]");
    const excludedList = root.querySelector("[data-url-excluded]");
    const downloadExcluded = root.querySelector("[data-url-download-excluded]");
    const groupSummary = root.querySelector("[data-url-group-summary]");
    if (!input || !output || !status || !normalizeButton || !clearButton || !copyButton || !downloadButton || !invalidWrap || !invalidSummary || !invalidList) continue;

    let currentFormat = "lines";
    let currentExcluded = [];
    const run = () => {
      const seen = new Set();
      const accepted = [];
      const invalid = [];
      const excluded = [];
      let duplicates = 0;
      const host = scopeHost(scopeHostInput?.value || "");
      const include = compilePatterns(includePatterns?.value || "");
      const exclude = compilePatterns(excludePatterns?.value || "");
      currentFormat = formats.find((field) => field.checked)?.value || "lines";
      for (const entry of splitEntries(input.value, inputMode?.value || "smart")) {
        try {
          const value = normalizeEntry(entry, {
            addHttps: addHttps?.checked ?? true,
            stripFragment: stripFragment?.checked ?? true,
            stripTrailing: stripTrailing?.checked ?? true,
            queryMode: queryMode?.value || "tracking",
          });
          if (seen.has(value)) { duplicates += 1; continue; }
          seen.add(value);
          const parsed = new URL(value);
          const resourceType = classifyResource(parsed);
          let reason = "";
          if (protocolMode?.value !== "all" && parsed.protocol !== `${protocolMode.value}:`) reason = `Outside ${protocolMode.value.toUpperCase()} protocol scope`;
          else if (host && scopeMode?.value === "exact" && parsed.hostname !== host) reason = `Outside exact host ${host}`;
          else if (host && scopeMode?.value === "subdomains" && parsed.hostname !== host && !parsed.hostname.endsWith(`.${host}`)) reason = `Outside ${host} and its subdomains`;
          else if (include.length && !include.some((pattern) => pattern.regex.test(value))) reason = "Does not match an include pattern";
          else {
            const blockedBy = exclude.find((pattern) => pattern.regex.test(value));
            if (blockedBy) reason = `Matches exclude pattern ${blockedBy.source}`;
          }
          const record = { url: value, host: parsed.hostname, protocol: parsed.protocol.slice(0, -1), resourceType };
          if (reason) excluded.push({ ...record, reason });
          else accepted.push(record);
        } catch (error) { invalid.push({ entry, reason: error.message }); }
      }
      const group = outputGroup?.value || "all";
      const selected = accepted.filter((entry) => group === "all" || (group === "pages" ? entry.resourceType === "page" : entry.resourceType !== "page"));
      currentExcluded = excluded;
      output.value = formatEntries(selected, currentFormat);
      copyButton.disabled = selected.length === 0;
      downloadButton.disabled = selected.length === 0;
      if (downloadExcluded) downloadExcluded.disabled = excluded.length === 0;
      status.textContent = `${selected.length} in output · ${excluded.length} excluded · ${duplicates} duplicate${duplicates === 1 ? "" : "s"} · ${invalid.length} invalid`;
      if (groupSummary) {
        const counts = accepted.reduce((map, entry) => map.set(entry.resourceType, (map.get(entry.resourceType) || 0) + 1), new Map());
        groupSummary.replaceChildren(...[...counts.entries()].map(([type, count]) => {
          const item = document.createElement("span");
          item.innerHTML = `<strong>${count}</strong> ${type.replaceAll("-", " ")}`;
          return item;
        }));
      }
      if (excludedWrap && excludedSummary && excludedList) {
        excludedList.replaceChildren(...excluded.map(({ url, reason }) => {
          const item = document.createElement("li");
          const code = document.createElement("code");
          code.textContent = url;
          item.append(code, document.createTextNode(` — ${reason}`));
          return item;
        }));
        excludedSummary.textContent = `${excluded.length} excluded ${excluded.length === 1 ? "URL" : "URLs"} with reasons`;
        excludedWrap.hidden = excluded.length === 0;
        if (!excluded.length) excludedWrap.open = false;
      }
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
    for (const field of [inputMode, queryMode, addHttps, stripFragment, stripTrailing, scopeMode, protocolMode, outputGroup, ...formats]) field?.addEventListener("change", run);
    for (const field of [scopeHostInput, includePatterns, excludePatterns]) field?.addEventListener("input", run);
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
      downloadText(output.value, `normalized-urls.${extension}`, type);
      status.textContent = `Normalized list downloaded as ${extension.toUpperCase()}.`;
    });
    downloadExcluded?.addEventListener("click", () => {
      if (!currentExcluded.length) return;
      const content = csvRows([["url", "reason", "resource_type"], ...currentExcluded.map((entry) => [entry.url, entry.reason, entry.resourceType])]);
      downloadText(content, "excluded-urls.csv", "text/csv");
      status.textContent = "Exclusion report downloaded as CSV.";
    });
    run();
  }
})();
