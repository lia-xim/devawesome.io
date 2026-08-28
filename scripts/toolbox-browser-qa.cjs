const { mkdir } = require("node:fs/promises");
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

  await page.getByRole("heading", { level: 1, name: /Simple tools for developers and SEO teams/ }).waitFor();
  check((await page.locator(".tool-row").count()) === 9, "home must show exactly nine real tool rows");
  check(await page.getByRole("link", { name: /Browse tools/ }).first().isVisible(), "primary Browse tools CTA must be visible");
  check(await page.locator(".hero-tool-preview").isVisible(), "desktop must show the working keyword cleaner preview");

  const initialRequestCount = await page.evaluate(() => performance.getEntriesByType("resource").length);
  const heroInput = page.locator(".hero-tool-preview [data-keyword-input]");
  const heroOutput = page.locator(".hero-tool-preview [data-keyword-output]");
  await heroInput.fill("seo audit\nSEO Audit\nkeyword tracking");
  await page.locator(".hero-tool-preview [data-keyword-clean]").click();
  check((await heroOutput.inputValue()) === "seo audit\nkeyword tracking", "hero keyword preview must trim and deduplicate the list");
  const postInteractionRequestCount = await page.evaluate(() => performance.getEntriesByType("resource").length);
  check(postInteractionRequestCount === initialRequestCount, "home keyword interaction must not create a request");

  const desktopStyles = await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const hero = getComputedStyle(document.querySelector(".toolbox-hero-copy h1"));
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
  check(desktopStyles.primaryBackground === "rgb(181, 242, 10)", "primary action must use the locked lime accent");

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

  check(!(await page.locator(".hero-tool-preview").isVisible()), "mobile must prioritize the tool list over the JSON preview");
  check(await page.locator(".mobile-nav summary").isVisible(), "mobile navigation control must be visible");
  await page.locator(".mobile-nav summary").click();
  check(await page.locator(".mobile-nav nav").isVisible(), "mobile navigation must open");
  await page.locator(".mobile-nav summary").click();
  check((await page.locator(".tool-row").count()) === 9, "mobile must show all nine tools");

  const mobileStyles = await page.evaluate(() => {
    const hero = getComputedStyle(document.querySelector(".toolbox-hero-copy h1"));
    const row = document.querySelector(".tool-row").getBoundingClientRect();
    return { heroSize: hero.fontSize, rowHeight: row.height };
  });
  check(Number.parseFloat(mobileStyles.heroSize) >= 33, "mobile hero type is too small");
  check(mobileStyles.rowHeight >= 88, "mobile tool rows need large tap targets");

  await page.screenshot({ path: join(screenshots, "toolbox-home-mobile.png"), fullPage: true });
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
  await page.locator("[data-keyword-input]").fill("seo audit\nSEO Audit\nkeyword tracking");
  await page.locator("[data-keyword-clean]").click();
  check((await page.locator("[data-keyword-output]").inputValue()) === "seo audit\nkeyword tracking", "keyword cleaner must normalize and deduplicate the list");
  check((await page.evaluate(() => performance.getEntriesByType("resource").length)) === before, "keyword cleaner must not create a request");

  await page.goto(origin + "/tools/url-list-normalizer", { waitUntil: "networkidle" });
  await verifyStructure(page, "/tools/url-list-normalizer");
  before = await page.evaluate(() => performance.getEntriesByType("resource").length);
  await page.locator("[data-url-input]").fill("Example.com/page/#top\nhttps://example.com/page/\nnot a url");
  await page.locator("[data-url-normalize]").click();
  check((await page.locator("[data-url-output]").inputValue()) === "https://example.com/page", "URL normalizer must strip fragments, trailing slashes, and duplicates");
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
  check((await page.locator("[data-mcp-output]").inputValue()).includes("PASS:"), "MCP validator must accept a valid tools/list request");
  check((await page.evaluate(() => performance.getEntriesByType("resource").length)) === before, "MCP validator must not create a request");

  await page.goto(origin + "/tools/robots-txt-tester", { waitUntil: "networkidle" });
  await verifyStructure(page, "/tools/robots-txt-tester");
  before = await page.evaluate(() => performance.getEntriesByType("resource").length);
  await page.locator("[data-robots-agent]").fill("Googlebot");
  await page.locator("[data-robots-path]").fill("/preview/article");
  await page.locator("[data-robots-test]").click();
  check((await page.locator("[data-robots-verdict]").textContent()) === "Disallowed from crawling", "robots tester must select the specific Googlebot disallow rule");
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
  await lowerPage.evaluate(() => window.scrollTo(0, document.querySelector(".tool-picker").offsetTop));
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
    }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
