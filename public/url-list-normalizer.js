(function () {
  function splitEntries(input) {
    return input.split(/[\r\n\t]+/).map((value) => value.trim()).filter(Boolean);
  }

  function normalizeEntry(raw, options) {
    let candidate = raw;
    if (!/^[a-z][a-z\d+.-]*:\/\//i.test(candidate) && /^[^\s/]+\.[^\s]+/.test(candidate)) {
      candidate = `https://${candidate}`;
    }

    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS URLs are accepted.');
    if (url.username || url.password) throw new Error('URLs with credentials are not accepted.');

    url.hash = '';
    if (options.stripQuery) url.search = '';
    if (options.stripTrailing && url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
    return url.href;
  }

  for (const root of document.querySelectorAll('[data-url-normalizer]')) {
    const input = root.querySelector('[data-url-input]');
    const output = root.querySelector('[data-url-output]');
    const stripQuery = root.querySelector('[data-url-strip-query]');
    const stripTrailing = root.querySelector('[data-url-strip-trailing]');
    const status = root.querySelector('[data-url-status]');
    const normalizeButton = root.querySelector('[data-url-normalize]');
    const clearButton = root.querySelector('[data-url-clear]');
    const copyButton = root.querySelector('[data-url-copy]');
    const downloadButton = root.querySelector('[data-url-download]');
    const invalidWrap = root.querySelector('[data-url-invalid-wrap]');
    const invalidSummary = root.querySelector('[data-url-invalid-summary]');
    const invalidList = root.querySelector('[data-url-invalid]');

    if (!input || !output || !stripQuery || !stripTrailing || !status || !normalizeButton || !clearButton || !copyButton || !downloadButton || !invalidWrap || !invalidSummary || !invalidList) continue;

    const run = () => {
      const seen = new Set();
      const normalized = [];
      const invalid = [];
      let duplicates = 0;

      for (const entry of splitEntries(input.value)) {
        try {
          const value = normalizeEntry(entry, { stripQuery: stripQuery.checked, stripTrailing: stripTrailing.checked });
          if (seen.has(value)) duplicates += 1;
          else {
            seen.add(value);
            normalized.push(value);
          }
        } catch {
          invalid.push(entry);
        }
      }

      output.value = normalized.join('\n');
      copyButton.disabled = normalized.length === 0;
      downloadButton.disabled = normalized.length === 0;
      status.textContent = `${normalized.length} valid · ${duplicates} duplicates · ${invalid.length} invalid`;
      invalidList.replaceChildren(...invalid.map((entry) => {
        const item = document.createElement('li');
        item.textContent = entry;
        return item;
      }));
      invalidSummary.textContent = `${invalid.length} invalid ${invalid.length === 1 ? 'entry' : 'entries'}`;
      invalidWrap.hidden = invalid.length === 0;
      if (invalid.length === 0) invalidWrap.open = false;
    };

    normalizeButton.addEventListener('click', run);
    stripQuery.addEventListener('change', run);
    stripTrailing.addEventListener('change', run);
    clearButton.addEventListener('click', () => {
      input.value = '';
      output.value = '';
      copyButton.disabled = true;
      downloadButton.disabled = true;
      invalidWrap.hidden = true;
      invalidList.replaceChildren();
      status.textContent = 'List cleared.';
      input.focus();
    });
    copyButton.addEventListener('click', async () => {
      if (!output.value) return;
      try {
        await navigator.clipboard.writeText(output.value);
        status.textContent = 'Normalized list copied.';
      } catch {
        output.focus();
        output.select();
        status.textContent = 'Select and copy the list manually.';
      }
    });
    downloadButton.addEventListener('click', () => {
      if (!output.value) return;
      const blob = new Blob([`${output.value}\n`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'normalized-urls.txt';
      link.click();
      URL.revokeObjectURL(url);
      status.textContent = 'Normalized list downloaded.';
    });

    run();
  }
})();
