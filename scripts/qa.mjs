import { access, readFile, readdir, stat } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const { canonicalRoutes, toCanonicalUrl } = await import("../src/data/routes.ts");
const routes = canonicalRoutes.map(({ path }) => path.replace(/^\//, "").replace(/\/$/, ""));
const canonicals = new Map(canonicalRoutes.map(({ path }) => [path.replace(/\/$/, "") || "/", toCanonicalUrl(path)]));
const failures = [];
async function builtRoute(route) {
  const candidates = route ? [join(dist, route, "index.html"), join(dist, route + ".html")] : [join(dist, "index.html")];
  for (const file of candidates) { try { return { html: await readFile(file, "utf8"), file }; } catch {} }
  failures.push("missing built route /" + route); return { html: "", file: candidates[0] };
}
const built = new Map();
for (const route of routes) built.set("/" + route, await builtRoute(route));
built.set("/404", { html: await readFile(join(dist, "404.html"), "utf8"), file: join(dist, "404.html") });

for (const [route, { html }] of built) {
  const expectedRobots = route === "/404" ? "noindex, follow, noarchive" : "index, follow";
  if (!html.includes(`<meta name="robots" content="${expectedRobots}">`)) failures.push(route + " lacks expected robots meta: " + expectedRobots);
  if (route === "/404" && html.includes('rel="canonical"')) failures.push("/404 must not claim a canonical");
  if (route !== "/404" && !html.includes(`rel="canonical" href="${canonicals.get(route)}"`)) failures.push(route + " has wrong canonical");
  if (!html.includes("Skip to content")) failures.push(route + " lacks skip link");
  for (const property of ["og:type", "og:site_name", "og:title", "og:description"]) {
    if (!html.includes(`property="${property}"`)) failures.push(route + " lacks " + property);
  }
  if (route !== "/404" && !html.includes('property="og:url"')) failures.push(route + " lacks og:url");
  for (const name of ["twitter:card", "twitter:title", "twitter:description"]) {
    if (!html.includes(`name="${name}"`)) failures.push(route + " lacks " + name);
  }
}
const robots = await readFile(join(dist, "robots.txt"), "utf8");
if (robots.trim() !== "User-agent: *\nAllow: /\nSitemap: https://devawesome.io/sitemap.xml") failures.push("robots must allow crawling and advertise the canonical sitemap");
const sitemap = await readFile(join(dist, "sitemap.xml"), "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const expectedSitemapUrls = canonicalRoutes.filter((route) => route.searchEligible).map((route) => toCanonicalUrl(route.path));
if (sitemapUrls.length !== expectedSitemapUrls.length || expectedSitemapUrls.some((url) => !sitemapUrls.includes(url))) failures.push("sitemap must exactly match search-eligible canonical routes");
for (const old of ["sitemap-index.xml", "sitemap-0.xml"]) { try { await access(join(dist, old)); failures.push(old + " must not exist"); } catch {} }

const rights = JSON.parse(await readFile(join(root, "src/data/manifests/rights-evidence.v1.json"), "utf8"));
const legacy = JSON.parse(await readFile(join(root, "src/data/manifests/legacy-urls.v1.json"), "utf8"));
const vercel = JSON.parse(await readFile(join(root, "vercel.json"), "utf8"));
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const planSchema = JSON.parse(await readFile(join(dist, "schemas", "developer-tool-test-plan.v0.1.json"), "utf8"));
const receiptSchema = JSON.parse(await readFile(join(dist, "schemas", "evidence-receipt.v0.1.json"), "utf8"));
const runManifestSchema = JSON.parse(await readFile(join(dist, "schemas", "workbench-run-manifest.v1.json"), "utf8"));
const recipeSchema = JSON.parse(await readFile(join(dist, "schemas", "workbench-recipe.v2.json"), "utf8"));
if (planSchema.$id !== "https://devawesome.io/schemas/developer-tool-test-plan.v0.1.json" || planSchema.type !== "object") failures.push("test-plan JSON Schema must build as a valid, versioned utility asset");
if (receiptSchema.$id !== "https://devawesome.io/schemas/evidence-receipt.v0.1.json" || receiptSchema.properties?.algorithm?.const !== "SHA-256") failures.push("evidence-receipt JSON Schema must build as the declared SHA-256 contract");
if (runManifestSchema.$id !== "https://devawesome.io/schemas/workbench-run-manifest.v1.json" || runManifestSchema.properties?.kind?.const !== "devawesome-workbench-run-manifest") failures.push("workbench run-manifest JSON Schema must build as the declared privacy-bounded contract");
if (recipeSchema.$id !== "https://devawesome.io/schemas/workbench-recipe.v2.json" || recipeSchema.properties?.schemaVersion?.const !== 2) failures.push("workbench recipe v2 JSON Schema must build as the schema-aware recipe contract");
const headers = Object.fromEntries((vercel.headers?.[0]?.headers ?? []).map(({ key, value }) => [key.toLowerCase(), value]));
if (rights.launchState !== "production_indexable") failures.push("rights manifest must record production_indexable");
if (!rights.unknowns.includes("independent technical reviewer") || !rights.unknowns.includes("brand or mark clearance")) failures.push("open reviewer and identity gates must stay explicit");
if (rights.governance?.independentTechnicalReviewer !== "not_proven" || rights.governance?.brandOrMarkClearance !== "not_proven" || rights.governance?.ownerIndexReleaseDecision !== "pass" || rights.governance?.indexRelease !== "owner_approved_with_disclosed_residual_risk") failures.push("governance manifest must preserve open evidence gaps and the explicit owner index-release decision");
try { await access(join(root, rights.governance.dossier)); } catch { failures.push("rights and reviewer governance dossier must exist"); }
if (pkg.dependencies?.gsap || pkg.dependencies?.["@astrojs/sitemap"]) failures.push("global GSAP and unused sitemap dependencies must be absent");
if (headers["x-robots-tag"]) failures.push("global Vercel X-Robots-Tag must be absent for the indexable launch");
for (const key of ["content-security-policy", "x-content-type-options", "referrer-policy", "permissions-policy", "x-frame-options", "cross-origin-opener-policy"]) if (!headers[key]) failures.push("missing security header " + key);
if (!vercel.redirects?.some((r) => r.source === "/quiz" && r.destination === "/guess-the-programming-language/" && r.permanent === true)) failures.push("/quiz must permanently redirect");
if (legacy.defaultUnknownPathAction !== "404" || legacy.catchAllHomepageRedirect !== false) failures.push("legacy default must remain real 404");
if (!built.get("/impressum").html.includes("Matthias Ramahi")) failures.push("impressum must name operator");
if (!built.get("/datenschutz").html.includes("keine Webanalyse")) failures.push("privacy copy must match analytics-free runtime");
if (!built.get("/new-ownership").html.includes("now eligible for search indexing")) failures.push("ownership page must disclose the current indexable launch status");
for (const route of ["/field-tests/astro-static-route-contract", "/field-tests/pnpm-frozen-lockfile-contract", "/field-tests/evidence-receipt-contract", "/field-tests/workbench-core-contract"]) {
  const html = built.get(route).html;
  if (!html.includes("Not independently reviewed")) failures.push(route + " must disclose review boundary");
  if (!html.includes('"@type":"TechArticle"') || !html.includes('"editor":{"@id":"https://devawesome.io/#operator"}')) failures.push(route + " needs truthful TechArticle editor schema");
}
if (!built.get("/field-tests").html.includes('"@type":"CollectionPage"')) failures.push("field-test hub needs CollectionPage schema");
if (!built.get("/labs").html.includes('"@type":"CollectionPage"')) failures.push("labs needs CollectionPage schema");
if (!built.get("/guess-the-programming-language").html.includes('"@type":"Quiz"')) failures.push("quiz needs Quiz mainEntity schema");
if (!built.get("/").html.includes('"@type":"WebSite"')) failures.push("home needs WebSite schema");
if (!built.get("/guides/reproducible-developer-tool-tests").html.includes('"@type":"TechArticle"') || !built.get("/guides/reproducible-developer-tool-tests").html.includes('"@type":"BreadcrumbList"')) failures.push("guide needs TechArticle and visible breadcrumb schema");
if (!built.get("/tools").html.includes('"@type":"CollectionPage"') || !built.get("/tools").html.includes('"@type":"ItemList"')) failures.push("tools hub needs CollectionPage and ItemList schema");
if (!built.get("/guides").html.includes('"@type":"CollectionPage"') || !built.get("/guides").html.includes('"@type":"ItemList"')) failures.push("guides hub needs CollectionPage and ItemList schema");
if (!built.get("/workflows").html.includes('"@type":"CollectionPage"') || !built.get("/workflows").html.includes('"@type":"ItemList"')) failures.push("workflows hub needs CollectionPage and ItemList schema");
for (const route of ["/workflows/prepare-keyword-import", "/workflows/build-clean-crawl-list", "/workflows/validate-mcp-message"]) if (!built.get(route).html.includes('"@type":"HowTo"')) failures.push(route + " needs visible HowTo mainEntity schema");
if (!built.get("/workflows/debug-indexability").html.includes('"@type":"WebApplication"')) failures.push("indexability workflow needs WebApplication schema");
if (!built.get("/tools/keyword-list-cleaner").html.includes('"@type":"WebApplication"')) failures.push("keyword cleaner needs WebApplication schema");
if (!built.get("/tools/url-list-normalizer").html.includes('"@type":"WebApplication"')) failures.push("URL normalizer needs WebApplication schema");
if (!built.get("/tools/json-formatter").html.includes('"@type":"WebApplication"')) failures.push("JSON formatter needs WebApplication schema");
if (!built.get("/tools/uuid-generator").html.includes('"@type":"WebApplication"')) failures.push("UUID generator needs WebApplication schema");
if (!built.get("/tools/developer-tool-test-plan").html.includes('"@type":"WebApplication"')) failures.push("test-plan tool needs WebApplication schema");
if (!built.get("/tools/evidence-receipt").html.includes('"@type":"WebApplication"')) failures.push("hash tool needs WebApplication schema");
for (const route of ["/tools/robots-txt-tester", "/tools/serp-snippet-preview", "/tools/mcp-json-rpc-validator"]) if (!built.get(route).html.includes('"@type":"WebApplication"')) failures.push(route + " needs WebApplication schema");
if (!built.get("/tools/run-manifest-verifier").html.includes('"@type":"WebApplication"')) failures.push("run-manifest verifier needs WebApplication schema");
if (!built.get("/tools/evidence-receipt").html.includes('href="/schemas/evidence-receipt.v0.1.json"')) failures.push("receipt tool must expose its versioned JSON Schema");
if (built.get("/404").html.includes("application/ld+json")) failures.push("404 must not emit page schema");

const assetDir = join(dist, "_astro");
const assets = await readdir(assetDir);
const js = assets.filter((name) => name.endsWith(".js"));
for (const name of js) {
  const source = await readFile(join(assetDir, name), "utf8");
  const bytes = (await stat(join(assetDir, name))).size;
  if (/gsap|ScrollTrigger/.test(source)) failures.push(name + " still contains GSAP");
  if (bytes > 20000) failures.push(name + " exceeds 20 KB route chunk budget: " + bytes);
}
const home = built.get("/").html;
for (const copy of ["Turn raw SEO exports into inputs you can review and reuse.", "Prepare a keyword import", "Build a clean crawl list", "A result is useful when you know what changed."]) if (!home.includes(copy)) failures.push("home lacks workflow-first copy: " + copy);
for (const path of ["/tools/keyword-list-cleaner", "/tools/url-list-normalizer", "/tools/robots-txt-tester", "/tools/serp-snippet-preview", "/tools/mcp-json-rpc-validator", "/tools/json-formatter", "/tools/uuid-generator", "/tools/evidence-receipt", "/tools/developer-tool-test-plan", "/tools/run-manifest-verifier"]) if (!home.includes(`href="${path}"`)) failures.push("home must link directly to " + path);
for (const path of ["/workflows/prepare-keyword-import", "/workflows/build-clean-crawl-list", "/workflows/debug-indexability", "/workflows/validate-mcp-message"]) if (!home.includes(`href="${path}"`)) failures.push("home must link directly to " + path);
for (const route of canonicalRoutes.map(({ path }) => path.replace(/\/$/, "") || "/")) if (!built.get(route).html.includes('class="toolbox-page"')) failures.push(route + " must use the unified toolbox surface");
const revealPath = join(root, "public/reveal.js");
const revealBytes = (await stat(revealPath)).size;
if (revealBytes > 2000 || !home.includes('src="/reveal.js"')) failures.push("global reveal loader must remain external and below 2 KB");
const quiz = built.get("/guess-the-programming-language").html;
const quizScripts = [...quiz.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => m[1]).filter((src) => src.startsWith("/_astro/"));
if (quizScripts.length === 0) failures.push("quiz route must load its route-specific script");
if (quizScripts.some((src) => home.includes(src))) failures.push("quiz behavior must not be loaded on home");
const tool = built.get("/tools/developer-tool-test-plan").html;
const toolScripts = [...tool.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => m[1]);
if (!toolScripts.includes("/test-plan.js")) failures.push("test-plan tool must load its external CSP-compatible script");
if (home.includes("/test-plan.js") || quiz.includes("/test-plan.js")) failures.push("test-plan behavior must remain route-specific");
const receiptTool = built.get("/tools/evidence-receipt").html;
const receiptScripts = [...receiptTool.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => m[1]);
if (!receiptScripts.includes("/evidence-receipt.js")) failures.push("receipt tool must load its external CSP-compatible script");
if (home.includes("/evidence-receipt.js") || quiz.includes("/evidence-receipt.js") || tool.includes("/evidence-receipt.js")) failures.push("receipt behavior must remain route-specific");
const keywordTool = built.get("/tools/keyword-list-cleaner").html;
const urlTool = built.get("/tools/url-list-normalizer").html;
const keywordWorkflow = built.get("/workflows/prepare-keyword-import").html;
const urlWorkflow = built.get("/workflows/build-clean-crawl-list").html;
const mcpWorkflow = built.get("/workflows/validate-mcp-message").html;
const indexabilityWorkflow = built.get("/workflows/debug-indexability").html;
const jsonTool = built.get("/tools/json-formatter").html;
const uuidTool = built.get("/tools/uuid-generator").html;
if (home.includes('/keyword-list-cleaner.js') || !keywordTool.includes('src="/keyword-list-cleaner.js"')) failures.push("the focused keyword cleaner behavior must load only on its tool page");
if (!keywordWorkflow.includes('src="/keyword-import-workbench.js"')) failures.push("keyword workflow must load the complete import-workbench behavior");
if (quiz.includes("/keyword-list-cleaner.js") || tool.includes("/keyword-list-cleaner.js") || receiptTool.includes("/keyword-list-cleaner.js") || uuidTool.includes("/keyword-list-cleaner.js") || jsonTool.includes("/keyword-list-cleaner.js") || urlTool.includes("/keyword-list-cleaner.js")) failures.push("keyword cleaner behavior must stay on its intended surfaces");
if (!jsonTool.includes('src="/json-formatter.js"')) failures.push("JSON tool must load formatter behavior");
if (home.includes("/json-formatter.js") || quiz.includes("/json-formatter.js") || tool.includes("/json-formatter.js") || receiptTool.includes("/json-formatter.js") || uuidTool.includes("/json-formatter.js") || keywordTool.includes("/json-formatter.js") || urlTool.includes("/json-formatter.js")) failures.push("JSON formatter behavior must stay on its intended surface");
if (!urlTool.includes('src="/url-list-normalizer.js"')) failures.push("URL normalizer tool must load its focused behavior");
if (!urlWorkflow.includes('src="/crawl-list-workbench.js"')) failures.push("crawl-list workflow must load the complete workbench behavior");
if (home.includes("/url-list-normalizer.js") || quiz.includes("/url-list-normalizer.js") || tool.includes("/url-list-normalizer.js") || receiptTool.includes("/url-list-normalizer.js") || uuidTool.includes("/url-list-normalizer.js") || keywordTool.includes("/url-list-normalizer.js") || jsonTool.includes("/url-list-normalizer.js")) failures.push("URL normalizer behavior must stay on its intended surfaces");
if (!mcpWorkflow.includes('src="/mcp-payload-lab.js"')) failures.push("MCP workflow must load payload-lab behavior");
if (!indexabilityWorkflow.includes('src="/indexability-workflow.js"')) failures.push("indexability workflow must load its route-specific behavior");
if (!uuidTool.includes('src="/uuid-generator.js"')) failures.push("UUID tool must load its route-specific behavior");
if (home.includes("/uuid-generator.js") || quiz.includes("/uuid-generator.js") || tool.includes("/uuid-generator.js") || receiptTool.includes("/uuid-generator.js") || jsonTool.includes("/uuid-generator.js")) failures.push("UUID behavior must remain route-specific");
const utilityBudgets = {
  // Shared only by the four deep workflow routes. The budget covers the
  // conflict, scope, evidence-extraction, and versioned MCP contracts.
  "workbench-core.js": 34000,
  "keyword-import-workbench.js": 18000,
  "crawl-list-workbench.js": 18000,
  "mcp-payload-lab.js": 12000,
  "crawl-plan-core.js": 8000,
  "indexability-batch-core.js": 8000,
  "indexability-batch.js": 8000,
  "mcp-session-core.js": 8000,
  "mcp-session-analyzer.js": 8000,
};
for (const asset of ["evidence-receipt.js", "evidence-receipt-core.js", "indexability-workflow.js", "json-formatter.js", "keyword-list-cleaner.js", "mcp-json-rpc-validator.js", "robots-txt-tester.js", "serp-snippet-preview.js", "test-plan.js", "url-list-normalizer.js", "uuid-generator.js", "workbench-recipes.js", "workbench-run-manifests.js", "workbench-tabular.js", "run-manifest-verifier.js", ...Object.keys(utilityBudgets)]) {
  const source = await readFile(join(root, "public", asset), "utf8");
  const budget = utilityBudgets[asset] ?? 8000;
  if ((await stat(join(root, "public", asset))).size > budget) failures.push(`${asset} exceeds its ${budget} byte utility budget`);
  if (/\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage/.test(source)) failures.push(asset + " must stay request-free and storage-free");
}

const internalHref = /href="(\/[^"]*)"/g;
for (const [route, { html }] of built) {
  for (const match of html.matchAll(internalHref)) {
    const path = match[1].split("#")[0].replace(/\/$/, "") || "/";
    if (["/robots.txt", "/sitemap.xml", "/quiz"].includes(path)) continue;
    const relative = path.replace(/^\/+/, "");
    const candidates = path === "/" ? [join(dist, "index.html")] : extname(relative) ? [join(dist, relative)] : [join(dist, relative, "index.html"), join(dist, relative + ".html")];
    let ok = false; for (const file of candidates) { try { await access(file); ok = true; break; } catch {} }
    if (!ok) failures.push(route + " has broken internal link " + match[1]);
  }
}

const searchablePaths = new Set(canonicalRoutes.filter(({ searchEligible }) => searchEligible).map(({ path }) => path.replace(/\/$/, "") || "/"));
const inboundLinks = new Map([...searchablePaths].map((path) => [path, new Set()]));
for (const [source, { html }] of built) {
  if (!searchablePaths.has(source)) continue;
  for (const match of html.matchAll(internalHref)) {
    const target = match[1].split(/[?#]/)[0].replace(/\/$/, "") || "/";
    if (target !== source && searchablePaths.has(target)) inboundLinks.get(target).add(source);
  }
}
for (const [path, sources] of inboundLinks) {
  if (path !== "/" && sources.size === 0) failures.push(path + " must have an internal link from another search-eligible page");
}
const forbidden = [/80,?000/i, /80k/i, /our subscribers/i, /weekly newsletter is back/i];
for (const [route, { html }] of built) for (const claim of forbidden) if (claim.test(html)) failures.push(route + " contains forbidden historical claim");

if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log(`QA passed: ${routes.length} registry-backed canonical routes plus 404, indexable canonical pages, generated sitemap, crawlable robots, OG/Twitter/schema metadata, security headers, route-scoped JS, legal/identity boundaries, internal links, and permanent aliases.`);
