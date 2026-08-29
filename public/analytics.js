(() => {
  "use strict";

  const route = location.pathname;
  const product = route.startsWith("/tools/")
    ? route.slice(7).replace(/\/$/, "")
    : route.startsWith("/workflows/")
      ? route.slice(11).replace(/\/$/, "")
      : route === "/guess-the-programming-language/"
        ? "programming-language-quiz"
        : null;
  const started = new Set();
  const inputStarted = new Set();
  const resultsRecorded = new Set();
  const milestones = new Set();
  const resultStates = new WeakMap();
  const errorStates = new WeakMap();
  const namedFunnels = new Set(["prepare-keyword-import", "build-clean-crawl-list"]);
  const automaticRunProducts = new Set(["keyword-list-cleaner", "url-list-normalizer", "prepare-keyword-import", "build-clean-crawl-list"]);
  const lifecycleEvents = {
    view: "tool-view",
    input: "tool-input",
    run: "tool-run",
    result: "tool-result",
    export: "tool-export",
  };

  function track(name, data = {}) {
    if (typeof window.umami?.track !== "function") return;
    window.umami.track(name, { page: route, ...data });
  }

  function trackLifecycle(stage, data = {}) {
    track(lifecycleEvents[stage], { tool: product || "site", ...data });
    if (product && namedFunnels.has(product)) track(`${product}-${stage}`, data);
  }

  function recordResultOnce(key, data = {}) {
    if (resultsRecorded.has(key)) return;
    resultsRecorded.add(key);
    trackLifecycle("result", data);
  }

  function controlName(element) {
    const preferred = [
      "data-analytics-action",
      "data-verify-run",
      "data-run-manifest-save",
      "data-recipe-save",
      "data-recipe-load",
      "data-index-extract",
      "data-index-copy",
      "data-index-download",
      "data-keyword-workbench-copy",
      "data-keyword-workbench-download",
      "data-crawl-copy",
      "data-crawl-download",
      "data-json-format",
      "data-json-minify",
      "data-json-copy",
      "data-json-clear",
      "data-copy",
      "data-download",
      "data-next",
      "data-answer",
    ];
    const exact = preferred.find((attribute) => element.hasAttribute(attribute));
    if (exact) return exact.replace(/^data-/, "");
    const fallback = element.getAttributeNames().find((attribute) =>
      attribute.startsWith("data-") && !["data-reveal", "data-stagger", "data-state"].includes(attribute)
    );
    return fallback?.replace(/^data-/, "") || element.tagName.toLowerCase();
  }

  function startProduct() {
    if (!product || started.has(product)) return;
    started.add(product);
    track("tool-start", { tool: product });
  }

  if (product) trackLifecycle("view");

  function linkData(link) {
    const href = link.getAttribute("href") || "";
    if (href.startsWith("mailto:")) return { kind: "email", target: "operator-contact" };
    if (href.startsWith("tel:")) return { kind: "phone", target: "operator-contact" };
    try {
      const target = new URL(href, location.href);
      const isDownload = link.hasAttribute("download");
      return {
        kind: isDownload ? "download" : target.origin === location.origin ? "internal" : "external",
        target: target.origin === location.origin ? target.pathname : target.hostname,
      };
    } catch {
      return { kind: "other", target: "unresolved" };
    }
  }

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const analyticsControl = event.target.closest("[data-analytics-control]");
    if (analyticsControl) return;

    const link = event.target.closest("a[href]");
    if (link) {
      track("link-click", linkData(link));
      return;
    }

    const button = event.target.closest("button, [role='button']");
    if (!button || !button.closest("main")) return;
    startProduct();
    const action = controlName(button);
    if (/(?:copy|download|save|export)/.test(action)) trackLifecycle("export", { method: action.includes("copy") ? "copy" : action.includes("download") ? "download" : "save" });
    if (/(?:clean|normalize|format|generate|test|validate|verify|extract|analyze|build|run)/.test(action) && !/(?:clear|reset)/.test(action)) {
      trackLifecycle("run", { action });
      setTimeout(() => recordResultOnce(`${product || "site"}:run`, { source: "explicit-run" }), 0);
    }
    track("tool-action", { tool: product || "site", action });
  });

  document.addEventListener("input", (event) => {
    if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) return;
    if (!event.target.closest("main") || event.target.readOnly || event.target.matches("[data-analytics-control]")) return;
    const key = `${product || "site"}:${controlName(event.target)}`;
    if (inputStarted.has(key)) return;
    inputStarted.add(key);
    startProduct();
    trackLifecycle("input", { control: controlName(event.target) });
    if (product && automaticRunProducts.has(product)) {
      setTimeout(() => {
        trackLifecycle("run", { trigger: "automatic" });
        recordResultOnce(`${product}:automatic`, { source: "automatic-run" });
      }, 0);
    }
  });

  document.addEventListener("submit", (event) => {
    if (!(event.target instanceof HTMLFormElement) || !event.target.closest("main")) return;
    startProduct();
    track("tool-action", { tool: product || "site", action: controlName(event.target) + "-submit" });
  });

  document.addEventListener("change", (event) => {
    if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement)) return;
    if (!event.target.closest("main") || event.target.matches("[data-analytics-control]")) return;
    startProduct();
    const control = controlName(event.target);
    if (event.target instanceof HTMLInputElement && event.target.type === "file") {
      track("tool-file-selected", { tool: product || "site", control, selected: event.target.files?.length > 0 });
      return;
    }
    if (event.target instanceof HTMLSelectElement) {
      track("tool-config-change", { tool: product || "site", control, choice: event.target.selectedIndex });
      return;
    }
    if (["checkbox", "radio"].includes(event.target.type)) {
      track("tool-config-change", { tool: product || "site", control, checked: event.target.checked });
    }
  });

  const outputObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (!(mutation.target instanceof Element) || !mutation.target.closest("main")) continue;
      const element = mutation.target;
      const control = controlName(element);
      if (mutation.attributeName === "disabled" && !element.hasAttribute("disabled") && /(copy|download|save)/.test(control)) {
        const previous = resultStates.get(element);
        if (previous !== "ready") {
          resultStates.set(element, "ready");
          track("tool-output-ready", { tool: product || "site", output: control });
          const resultKey = `${product || "site"}:${control}`;
          recordResultOnce(resultKey, { output: control });
        }
      }
      if (mutation.attributeName === "hidden" && !element.hasAttribute("hidden") && /(result|verdict|review|conflict)/.test(control)) {
        const previous = resultStates.get(element);
        if (previous !== "visible") {
          resultStates.set(element, "visible");
          track("tool-result-visible", { tool: product || "site", result: control });
        }
      }
      if (mutation.type === "characterData" || mutation.type === "childList") {
        const live = element.closest("[aria-live]") || element.querySelector?.("[aria-live]");
        if (!live) continue;
        const state = /\b(error|invalid|failed|unable|missing|required|unsupported|mismatch)\b/i.test(live.textContent || "") ? "error" : "ok";
        if (state === "error" && errorStates.get(live) !== state) {
          errorStates.set(live, state);
          track("tool-error", { tool: product || "site", area: controlName(live) });
        } else if (state === "ok") {
          errorStates.set(live, state);
        }
      }
    }
  });
  outputObserver.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["disabled", "hidden"], childList: true, characterData: true });

  function recordScroll() {
    const available = document.documentElement.scrollHeight - innerHeight;
    const depth = available <= 0 ? 100 : Math.round((scrollY / available) * 100);
    for (const milestone of [25, 50, 75, 100]) {
      if (depth >= milestone && !milestones.has(milestone)) {
        milestones.add(milestone);
        track("scroll-depth", { percent: milestone });
      }
    }
  }
  addEventListener("scroll", recordScroll, { passive: true });
  recordScroll();

  for (const seconds of [30, 120]) {
    setTimeout(() => {
      if (document.visibilityState === "visible") track("engaged-time", { seconds });
    }, seconds * 1000);
  }
})();
