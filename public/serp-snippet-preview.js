(function () {
  const example = {
    title: "Keyword List Cleaner | DevAwesome",
    url: "https://devawesome.io/tools/keyword-list-cleaner",
    description: "Clean and deduplicate keyword lists locally in your browser. No signup and no uploads.",
  };
  function displayUrl(value) {
    try {
      const url = new URL(value);
      return url.hostname.replace(/^www\./, "") + url.pathname.split("/").filter(Boolean).map((part) => " › " + decodeURIComponent(part)).join("");
    } catch { return value || "example.com"; }
  }
  for (const root of document.querySelectorAll("[data-serp-preview]")) {
    const title = root.querySelector("[data-serp-title]");
    const url = root.querySelector("[data-serp-url]");
    const description = root.querySelector("[data-serp-description]");
    const titleCount = root.querySelector("[data-serp-title-count]");
    const descriptionCount = root.querySelector("[data-serp-description-count]");
    const shownTitle = root.querySelector("[data-serp-display-title]");
    const shownUrl = root.querySelector("[data-serp-display-url]");
    const shownDescription = root.querySelector("[data-serp-display-description]");
    const reset = root.querySelector("[data-serp-reset]");
    if (!title || !url || !description || !titleCount || !descriptionCount || !shownTitle || !shownUrl || !shownDescription || !reset) continue;
    const render = () => {
      shownTitle.textContent = title.value || "Untitled page";
      shownUrl.textContent = displayUrl(url.value);
      shownDescription.textContent = description.value || "No meta description entered.";
      titleCount.textContent = `${title.value.length} title characters`;
      descriptionCount.textContent = `${description.value.length} description characters`;
    };
    for (const field of [title, url, description]) field.addEventListener("input", render);
    reset.addEventListener("click", () => { title.value = example.title; url.value = example.url; description.value = example.description; render(); title.focus(); });
    render();
  }
})();
