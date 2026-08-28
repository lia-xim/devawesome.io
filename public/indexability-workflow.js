(function () {
  for (const root of document.querySelectorAll("[data-indexability-workflow]")) {
    const status = root.querySelector("[data-index-status]");
    const canonical = root.querySelector("[data-index-canonical]");
    const meta = root.querySelector("[data-index-meta]");
    const header = root.querySelector("[data-index-header]");
    const robots = root.querySelector("[data-index-robots]");
    const verdict = root.querySelector("[data-index-verdict]");
    const explanation = root.querySelector("[data-index-explanation]");
    const checks = root.querySelector("[data-index-checks]");
    if (!status || !canonical || !meta || !header || !robots || !verdict || !explanation || !checks) continue;

    const update = () => {
      const items = [];
      let state = "eligible";
      let title = "Technically eligible";
      let detail = "The supplied signals do not block indexing. Search engines still decide whether and when to index the page.";

      if (status.value !== "200") {
        state = "blocked";
        title = status.value === "redirect" ? "This URL is a redirect" : "The response is not indexable";
        detail = status.value === "redirect"
          ? "A redirecting URL is not the final indexable document. Check the destination and the complete redirect chain."
          : "The supplied HTTP status does not describe an indexable page. Fix the response or verify that removal is intentional.";
      } else if (meta.value === "noindex" || header.value === "noindex") {
        state = "blocked";
        title = "Blocked by a noindex directive";
        detail = meta.value === "noindex"
          ? "The supplied meta robots value asks search engines not to index this page."
          : "The supplied X-Robots-Tag asks search engines not to index this response.";
      } else if (robots.value === "blocked") {
        state = "warning";
        title = "Crawling is blocked";
        detail = "A crawler may be unable to fetch the page and process its current canonical or noindex directives. Robots blocking is not a reliable removal method.";
      } else if (canonical.value === "other") {
        state = "warning";
        title = "Canonical points elsewhere";
        detail = "The page may be crawlable and indexable, but the supplied canonical asks search engines to consolidate signals with another URL.";
      } else if (canonical.value === "missing") {
        state = "warning";
        title = "Eligible, with no declared canonical";
        detail = "No supplied signal blocks indexing, but the page does not declare its preferred URL in this test.";
      }

      items.push(["HTTP response", status.value === "200" ? "Pass" : "Check"]);
      items.push(["Meta robots", meta.value === "noindex" ? "Noindex" : "Pass"]);
      items.push(["X-Robots-Tag", header.value === "noindex" ? "Noindex" : "Pass"]);
      items.push(["Robots access", robots.value === "blocked" ? "Blocked" : "Allowed"]);
      items.push(["Canonical", canonical.value === "self" ? "Self" : canonical.value === "other" ? "Other URL" : "Missing"]);

      root.dataset.state = state;
      verdict.textContent = title;
      explanation.textContent = detail;
      checks.replaceChildren(...items.map(([label, value]) => {
        const item = document.createElement("div");
        const term = document.createElement("dt");
        const description = document.createElement("dd");
        term.textContent = label;
        description.textContent = value;
        item.append(term, description);
        return item;
      }));
    };

    for (const field of [status, canonical, meta, header, robots]) field.addEventListener("change", update);
    update();
  }
})();
