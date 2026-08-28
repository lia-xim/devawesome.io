const { mkdir, readFile } = require("node:fs/promises");
const { join } = require("node:path");
const { chromium } = require(process.env.DEVAWESOME_PLAYWRIGHT_MODULE || "playwright");

const origin = process.env.DEVAWESOME_QA_ORIGIN || "http://127.0.0.1:4321";
const screenshots = process.env.DEVAWESOME_QA_SCREENSHOTS || join(process.cwd(), "reports", "qa");
const failures = [];
const consoleErrors = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

async function attachGuards(page) {
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("request", (request) => {
    if (!request.url().startsWith(origin)) failures.push("external request: " + request.url());
  });
}

async function verifyStructure(page, route) {
  const h1Count = await page.locator("main h1").count();
  check(h1Count === 1, route + " must have one H1, found " + h1Count);
  check((await page.locator("main").count()) === 1, route + " must have one main element");
  check((await page.locator('meta[name="robots"]').getAttribute("content")) === "index, follow", route + " must be indexable");
  check((await page.locator(".skip-link").count()) === 1, route + " must include skip link");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 1, route + " has horizontal overflow of " + overflow + "px");
}

async function runDesktop(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  await attachGuards(page);
  await page.goto(origin + "/", { waitUntil: "networkidle" });
  await verifyStructure(page, "/");

  await page.getByRole("heading", { level: 1, name: /Turn raw SEO exports into inputs you can review and reuse/ }).waitFor();
  check((await page.locator(".hero-flagship-preview a").count()) === 2, "home must lead with two flagship preparation workflows");
  check((await page.locator(".secondary-workflows a").count()) === 2, "home must expose the two evidence and protocol workflows");
  check((await page.locator(".tool-row").count()) === 9, "home must show exactly nine real tool rows");
  check(await page.getByRole("link", { name: /Prepare a keyword import/ }).first().isVisible(), "primary workflow CTA must be visible");
  check(await page.locator(".hero-flagship-preview").isVisible(), "desktop must show the flagship workflow preview");

  const initialRequestCount = await page.evaluate(() => performance.getEntriesByType("resource").length);
  await page.locator(".hero-flagship-preview a").first().focus();
  const postInteractionRequestCount = await page.evaluate(() => performance.getEntriesByType("resource").length);
  check(postInteractionRequestCount === initialRequestCount, "home navigation preview must not create a request");

  const desktopStyles = await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const hero = getComputedStyle(document.querySelector(".workbench-hero-copy h1"));
    const row = getComputedStyle(document.querySelector(".tool-row"));
    const primary = getComputedStyle(document.querySelector(".toolbox-button"));
    return {
      bodyBackground: body.backgroundColor,
      bodyFont: body.fontFamily,
      heroSize: hero.fontSize,
      heroLineHeight: hero.lineHeight,
      rowBorder: row.borderBottomColor,
      primaryBackground: primary.backgroundColor,
    };
  });
  check(desktopStyles.bodyBackground === "rgb(255, 255, 255)", "toolbox background must be true white");
  check(Number.parseFloat(desktopStyles.heroSize) >= 50, "desktop hero type is too small");
  check(desktopStyles.primaryBackground === "rgb(67, 56, 244)", "primary action must use the workbench violet accent");

  await page.goto(origin + "/", { waitUntil: "networkidle" });
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    outline: getComputedStyle(document.activeElement).outlineStyle,
  }));
  check(focused.tag === "A" && focused.outline !== "none", "keyboard focus must start on a visible link");
  await page.evaluate(() => document.activeElement?.blur());

  await page.screenshot({ path: join(screenshots, "toolbox-home-desktop.png"), fullPage: true });
  await context.close();
  return desktopStyles;
}

async function runMobile(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await attachGuards(page);
  await page.goto(origin + "/", { waitUntil: "networkidle" });
  await verifyStructure(page, "/ mobile");

  check(await page.locator(".hero-flagship-preview").isVisible(), "mobile must keep both flagship workflows immediately visible");
  check(await page.locator(".mobile-nav summary").isVisible(), "mobile navigation control must be visible");
  await page.locator(".mobile-nav summary").click();
  check(await page.locator(".mobile-nav nav").isVisible(), "mobile navigation must open");
  await page.locator(".mobile-nav summary").click();
  check((await page.locator(".tool-row").count()) === 9, "mobile must show all nine tools");

  const mobileStyles = await page.evaluate(() => {
    const hero = getComputedStyle(document.querySelector(".workbench-hero-copy h1"));
    const row = document.querySelector(".tool-row").getBoundingClientRect();
    return { heroSize: hero.fontSize, rowHeight: row.height };
  });
  check(Number.parseFloat(mobileStyles.heroSize) >= 33, "mobile hero type is too small");
  check(mobileStyles.rowHeight >= 56, "mobile tool rows need usable tap targets");
  await page.screenshot({ path: join(screenshots, "toolbox-home-mobile.png"), fullPage: true });

  for (const route of [
    "/workflows/prepare-keyword-import",
    "/workflows/build-clean-crawl-list",
    "/workflows/debug-indexability",
    "/workflows/validate-mcp-message",
    "/guides/clean-keyword-import-files",
    "/guides/prepare-crawl-list",
    "/guides/debug-indexability-signals",
  ]) {
    await page.goto(origin + route, { waitUntil: "networkidle" });
    await verifyStructure(page, route + " mobile");
  }
  await page.goto(origin + "/workflows/prepare-keyword-import", { waitUntil: "networkidle" });
  await page.screenshot({ path: join(screenshots, "keyword-workbench-mobile.png"), fullPage: true });
  await context.close();
  return mobileStyles;
}

async function runTools(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  await attachGuards(page);

  await page.goto(origin + "/tools/keyword-list-cleaner", { waitUntil: "networkidle" });
  await verifyStructure(page, "/tools/keyword-list-cleaner");
  let before = await page.evaluate(() => performance.getEntriesByType("resource").length);
  await page.locator("[data-keyword-input]").fill("1. seo audit, SEO Audit | keyword tracking\n/\n2) content brief");
  await page.locator("[data-keyword-clean]").click();
  check((await page.locator("[data-keyword-output]").inputValue()) === "seo audit\nkeyword tracking\ncontent brief", "keyword cleaner must remove list noise and deduplicate mixed separators");
  await page.locator('[data-keyword-format][value="comma"]').check();
  check((await page.locator("[data-keyword-output]").inputValue()) === "seo audit, keyword tracking, content brief", "keyword cleaner must switch the output to comma-separated values");
  check((await page.evaluate(() => performance.getEntriesByType("resource").length)) === before, "keyword cleaner must not create a request");

  await page.goto(origin + "/workflows/prepare-keyword-import", { waitUntil: "networkidle" });
  await verifyStructure(page, "/workflows/prepare-keyword-import");
  check((await page.locator(".workflow-progress li").count()) === 4, "keyword workflow must show its four-step sequence");
  before = await page.evaluate(() => performance.getEntriesByType("resource").length);
  await page.locator('[data-keyword-example="csv"]').click();
  check(await page.locator("[data-keyword-conflict-review]").isVisible(), "keyword workflow must expose duplicate column conflicts");
  check((await page.locator("[data-keyword-conflicts] select").count()) === 1, "keyword workflow must expose one decision control per conflict");
  check(await page.locator("[data-keyword-workbench-download]").isDisabled(), "keyword export must remain locked while a conflict is unresolved");
  await page.locator("[data-keyword-conflicts] select").selectOption("merge");
  check(!(await page.locator("[data-keyword-workbench-download]").isDisabled()), "keyword export must unlock after the conflict is resolved");
  check((await page.locator("[data-keyword-workbench-output]").inputValue()).includes("running shoes, women"), "keyword workflow must preserve a quoted comma inside a keyword");
  await page.locator('[data-keyword-workbench-format][value="contextter"]').check();
  check((await page.locator("[data-keyword-workbench-output]").inputValue()).startsWith("keyword,"), "keyword workflow must export a mapped Contextter CSV header");
  check((await page.locator("[data-keyword-review-summary]").textContent()).includes("data conflicts"), "keyword workflow must count data conflicts");
  const recipeDownload = page.waitForEvent("download");
  await page.locator("[data-recipe-save]").click();
  const recipe = await recipeDownload;
  const recipeJson = JSON.parse(await readFile(await recipe.path(), "utf8"));
  check(recipeJson.tool === "keyword-import" && !JSON.stringify(recipeJson).includes("running shoes"), "keyword recipe must contain configuration without pasted input");
  const inputBeforeRecipeLoad = await page.locator("[data-keyword-workbench-input]").inputValue();
  await page.locator("[data-recipe-load]").setInputFiles(join(process.cwd(), "public", "fixtures", "keyword-import-conflicts.recipe.json"));
  await page.waitForFunction(() => document.querySelector("[data-keyword-conflict-strategy]")?.value === "merge");
  check((await page.locator("[data-keyword-conflict-strategy]").inputValue()) === "merge", "keyword recipe must restore the saved duplicate strategy");
  check((await page.locator("[data-keyword-workbench-input]").inputValue()) === inputBeforeRecipeLoad, "loading a keyword recipe must not replace pasted input");
  check((await page.evaluate(() => performance.getEntriesByType("resource").length)) === before, "keyword workflow must not create a request");

  await page.goto(origin + "/workflows/build-clean-crawl-list", { waitUntil: "networkidle" });
  await verifyStructure(page, "/workflows/build-clean-crawl-list");
  check((await page.locator(".workflow-progress li").count()) === 5, "crawl workflow must show its five-step sequence");
  before = await page.evaluate(() => performance.getEntriesByType("resource").length);
  await page.locator("[data-crawl-input]").fill("https://example.com/a\nhttps://shop.example.com/b\nhttp://example.com/c\nhttps://example.com/private/x\nhttps://example.com/file.pdf");
  await page.locator("[data-crawl-mode]").selectOption("lines");
  await page.locator("[data-crawl-scope-mode]").selectOption("exact");
  await page.locator("[data-crawl-scope-host]").fill("example.com");
  await page.locator("[data-crawl-protocol]").selectOption("https");
  await page.locator("[data-crawl-exclude]").fill("/private/*");
  check((await page.locator("[data-crawl-output]").inputValue()) === "https://example.com/a\nhttps://example.com/file.pdf", "crawl workflow must apply protocol, exact-host, and wildcard exclusion scope");
  check((await page.locator("[data-crawl-hosts] tr").count()) === 1, "crawl workflow must group the output by host");
  check((await page.locator("[data-crawl-excluded] li").count()) === 3, "crawl workflow must retain every excluded URL with a reason");
  check((await page.evaluate(() => performance.getEntriesByType("resource").length)) === before, "crawl workflow must not create a request");

  await page.goto(origin + "/workflows/debug-indexability", { waitUntil: "networkidle" });
  await verifyStructure(page, "/workflows/debug-indexability");
  before = await page.evaluate(() => performance.getEntriesByType("resource").length);
  await page.locator("[data-index-url]").fill("https://example.com/private/page");
  await page.locator("[data-index-headers]").fill("HTTP/2 200\nx-robots-tag: noindex");
  await page.locator("[data-index-html]").fill('<link rel="canonical" href="https://example.com/other"><meta name="robots" content="index,follow">');
  await page.locator("[data-index-robots-text]").fill("User-agent: *\nDisallow: /private/");
  await page.locator("[data-index-extract]").click();
  check((await page.locator("[data-index-verdict]").textContent()).includes("noindex"), "indexability workflow must extract and reject an X-Robots-Tag noindex directive");
  check((await page.locator("[data-index-canonical]").inputValue()) === "other", "indexability workflow must extract a non-self canonical");
  check((await page.locator("[data-index-robots]").inputValue()) === "blocked", "indexability workflow must evaluate pasted robots.txt for the tested URL");
  check((await page.evaluate(() => performance.getEntriesByType("resource").length)) === before, "indexability workflow must not create a request");

  await page.goto(origin + "/workflows/validate-mcp-message", { waitUntil: "networkidle" });
  await verifyStructure(page, "/workflows/validate-mcp-message");
  check((await page.locator(".workflow-progress li").count()) === 4, "MCP workflow must show its four-step sequence");
  before = await page.evaluate(() => performance.getEntriesByType("resource").length);
  await page.locator('[data-mcp-lab-example="request"]').click();
  check((await page.locator("[data-mcp-lab-version]").inputValue()) === "2026-07-28", "MCP workflow must default to the current declared revision");
  check((await page.locator("[data-mcp-lab-corrected]").inputValue()).includes('"io.modelcontextprotocol/protocolVersion": "2026-07-28"'), "MCP workflow must propose current request metadata");
  await page.locator("[data-mcp-compare-mode]").selectOption("expected");
  await page.locator("[data-mcp-lab-input]").fill('{"jsonrpc":"2.0","id":7,"result":{"content":[{"type":"text"}]}}');
  await page.locator("[data-mcp-lab-related]").fill('{"jsonrpc":"2.0","id":7,"result":{"content":[{"type":"text","text":"ok"}]}}');
  check((await page.locator('[data-mcp-pair-checks] li[data-state="error"]').count()) === 0 && (await page.locator("[data-mcp-pair-checks]").textContent()).includes("$.result.content[0].type matches expected value"), "MCP workflow must compare expected and actual response shapes");
  check((await page.evaluate(() => performance.getEntriesByType("resource").length)) === before, "MCP workflow must not create a request");

  await page.goto(origin + "/tools/url-list-normalizer", { waitUntil: "networkidle" });
  await verifyStructure(page, "/tools/url-list-normalizer");
  before = await page.evaluate(() => performance.getEntriesByType("resource").length);
  await page.locator("[data-url-input]").fill("1. Example.com/page/#top | https://example.com/page/?utm_source=test\n[Pricing](https://example.com/pricing?plan=pro)\nnot a url");
  await page.locator("[data-url-normalize]").click();
  check((await page.locator("[data-url-output]").inputValue()) === "https://example.com/page\nhttps://example.com/pricing?plan=pro", "URL normalizer must remove tracking parameters, normalize markdown URLs, strip fragments, and deduplicate");
  await page.locator('[data-url-format][value="json"]').check();
  check((await page.locator("[data-url-output]").inputValue()).includes('"https://example.com/pricing?plan=pro"'), "URL normalizer must switch the output to JSON");
  check((await page.locator("[data-url-status]").textContent()).includes("1 invalid"), "URL normalizer must report invalid entries");
  check((await page.evaluate(() => performance.getEntriesByType("resource").length)) === before, "URL normalizer must not create a request");

  await page.goto(origin + "/tools/json-formatter", { waitUntil: "networkidle" });
  await verifyStructure(page, "/tools/json-formatter");
  before = await page.evaluate(() => performance.getEntriesByType("resource").length);
  await page.locator("[data-json-input]").fill('{"z":2,"a":1}');
  await page.locator("[data-json-minify]").click();
  check((await page.locator("[data-json-output]").inputValue()) === '{"z":2,"a":1}', "JSON minify must preserve parsed data");
  check((await page.evaluate(() => performance.getEntriesByType("resource").length)) === before, "JSON tool must not create a request");

  await page.goto(origin + "/tools/uuid-generator", { waitUntil: "networkidle" });
  await verifyStructure(page, "/tools/uuid-generator");
  before = await page.evaluate(() => performance.getEntriesByType("resource").length);
  await page.locator("[data-uuid-count]").fill("3");
  await page.locator("[data-uuid-generate]").click();
  const uuids = (await page.locator("[data-uuid-output]").inputValue()).trim().split("\n");
  const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  check(uuids.length === 3 && uuids.every((value) => uuidV4.test(value)), "UUID tool must generate three valid v4 values");
  check((await page.evaluate(() => performance.getEntriesByType("resource").length)) === before, "UUID tool must not create a request");

  await page.goto(origin + "/tools/evidence-receipt", { waitUntil: "networkidle" });
  await verifyStructure(page, "/tools/evidence-receipt");
  before = await page.evaluate(() => performance.getEntriesByType("resource").length);
  await page.locator('textarea[name="evidence"]').fill("abc");
  await page.getByRole("button", { name: "Create hash" }).click();
  check((await page.locator("[data-receipt-digest]").inputValue()) === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", "SHA-256 tool must match the known abc vector");
  check((await page.evaluate(() => performance.getEntriesByType("resource").length)) === before, "SHA-256 tool must not create a request");

  await page.goto(origin + "/tools/developer-tool-test-plan", { waitUntil: "networkidle" });
  await verifyStructure(page, "/tools/developer-tool-test-plan");
  before = await page.evaluate(() => performance.getEntriesByType("resource").length);
  const values = {
    subject: "Canonical redirect for /old-page",
    action: "Request /old-page without following redirects",
    expected: "Returns 301 and preserves the path",
    edge: "Query strings remain intact",
  };
  for (const [name, value] of Object.entries(values)) await page.locator(`[name="${name}"]`).fill(value);
  await page.getByRole("button", { name: "Build test case" }).click();
  const plan = await page.locator("[data-plan-output]").textContent();
  check(plan.includes(values.subject) && plan.includes(values.edge) && plan.includes("Result: Not run"), "test-case builder must create the declared Markdown structure");
  check((await page.evaluate(() => performance.getEntriesByType("resource").length)) === before, "test-plan tool must not create a request");

  await page.goto(origin + "/tools/mcp-json-rpc-validator", { waitUntil: "networkidle" });
  await verifyStructure(page, "/tools/mcp-json-rpc-validator");
  before = await page.evaluate(() => performance.getEntriesByType("resource").length);
  await page.locator("[data-mcp-input]").fill('{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}');
  await page.locator("[data-mcp-validate]").click();
  check((await page.locator("[data-mcp-output]").inputValue()).includes("Looks good:"), "MCP validator must accept a valid tools/list request");
  check((await page.evaluate(() => performance.getEntriesByType("resource").length)) === before, "MCP validator must not create a request");

  await page.goto(origin + "/tools/robots-txt-tester", { waitUntil: "networkidle" });
  await verifyStructure(page, "/tools/robots-txt-tester");
  before = await page.evaluate(() => performance.getEntriesByType("resource").length);
  await page.locator("[data-robots-agent]").selectOption("Googlebot");
  await page.locator("[data-robots-path]").fill("https://example.com/preview/article?draft=1");
  await page.locator("[data-robots-test]").click();
  check((await page.locator("[data-robots-verdict]").textContent()) === "Blocked by robots.txt", "robots tester must select the specific Googlebot disallow rule");
  check((await page.locator("[data-robots-tested-path]").textContent()) === "/preview/article?draft=1", "robots tester must extract the path and query from a full URL");
  await page.locator('[data-robots-example="allowed"]').click();
  check((await page.locator("[data-robots-verdict]").textContent()) === "Allowed by robots.txt", "robots tester must explain an Allow exception through the example control");
  check((await page.evaluate(() => performance.getEntriesByType("resource").length)) === before, "robots tester must not create a request");

  await page.goto(origin + "/tools/serp-snippet-preview", { waitUntil: "networkidle" });
  await verifyStructure(page, "/tools/serp-snippet-preview");
  before = await page.evaluate(() => performance.getEntriesByType("resource").length);
  await page.locator("[data-serp-title]").fill("Technical SEO Checklist | Example");
  check((await page.locator("[data-serp-display-title]").textContent()) === "Technical SEO Checklist | Example", "SERP preview must update the visible title");
  check((await page.evaluate(() => performance.getEntriesByType("resource").length)) === before, "SERP preview must not create a request");

  await context.close();
}

async function captureConceptViewports(browser) {
  const firstContext = await browser.newContext({ viewport: { width: 1504, height: 1046 }, deviceScaleFactor: 1 });
  const firstPage = await firstContext.newPage();
  await firstPage.goto(origin + "/", { waitUntil: "networkidle" });
  await firstPage.screenshot({ path: join(screenshots, "toolbox-home-desktop-native.png") });
  await firstContext.close();

  const lowerContext = await browser.newContext({ viewport: { width: 1555, height: 1012 }, deviceScaleFactor: 1 });
  const lowerPage = await lowerContext.newPage();
  await lowerPage.goto(origin + "/", { waitUntil: "networkidle" });
  await lowerPage.evaluate(() => window.scrollTo(0, document.querySelector(".quick-tool-section").offsetTop));
  await lowerPage.screenshot({ path: join(screenshots, "toolbox-home-lower-native.png") });
  await lowerContext.close();
}

(async () => {
  await mkdir(screenshots, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const desktopStyles = await runDesktop(browser);
    const mobileStyles = await runMobile(browser);
    await runTools(browser);
    await captureConceptViewports(browser);
    if (consoleErrors.length) failures.push("console errors: " + consoleErrors.join(" | "));
    if (failures.length) {
      console.error(failures.join("\n"));
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify({
      result: "PASS",
      desktopStyles,
      mobileStyles,
      screenshots: [
        join(screenshots, "toolbox-home-desktop.png"),
        join(screenshots, "toolbox-home-mobile.png"),
        join(screenshots, "toolbox-home-desktop-native.png"),
        join(screenshots, "toolbox-home-lower-native.png"),
      ],
      consoleErrors: 0,
      externalRequests: 0,
      checkedTools: 9,
      checkedWorkflows: 4,
    }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
