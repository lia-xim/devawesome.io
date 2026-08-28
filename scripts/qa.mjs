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
  if (!html.includes('<meta name="robots" content="noindex, follow, noarchive">')) failures.push(route + " lacks exact noindex meta");
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
if (robots.trim() !== "User-agent: *\nAllow: /") failures.push("robots must be crawlable and must not advertise a sitemap during hold");
const sitemap = await readFile(join(dist, "sitemap.xml"), "utf8");
if (/<loc>/i.test(sitemap)) failures.push("hold sitemap must contain zero URLs");
for (const old of ["sitemap-index.xml", "sitemap-0.xml"]) { try { await access(join(dist, old)); failures.push(old + " must not exist"); } catch {} }

const rights = JSON.parse(await readFile(join(root, "src/data/manifests/rights-evidence.v1.json"), "utf8"));
const legacy = JSON.parse(await readFile(join(root, "src/data/manifests/legacy-urls.v1.json"), "utf8"));
const vercel = JSON.parse(await readFile(join(root, "vercel.json"), "utf8"));
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const planSchema = JSON.parse(await readFile(join(dist, "schemas", "developer-tool-test-plan.v0.1.json"), "utf8"));
const receiptSchema = JSON.parse(await readFile(join(dist, "schemas", "evidence-receipt.v0.1.json"), "utf8"));
if (planSchema.$id !== "https://devawesome.io/schemas/developer-tool-test-plan.v0.1.json" || planSchema.type !== "object") failures.push("test-plan JSON Schema must build as a valid, versioned utility asset");
if (receiptSchema.$id !== "https://devawesome.io/schemas/evidence-receipt.v0.1.json" || receiptSchema.properties?.algorithm?.const !== "SHA-256") failures.push("evidence-receipt JSON Schema must build as the declared SHA-256 contract");
const headers = Object.fromEntries((vercel.headers?.[0]?.headers ?? []).map(({ key, value }) => [key.toLowerCase(), value]));
if (rights.launchState !== "production_noindex") failures.push("rights manifest must record production_noindex");
if (!rights.unknowns.includes("independent technical reviewer") || !rights.unknowns.includes("brand or mark clearance")) failures.push("open reviewer and identity gates must stay explicit");
if (rights.governance?.independentTechnicalReviewer !== "not_proven" || rights.governance?.brandOrMarkClearance !== "not_proven" || rights.governance?.indexRelease !== "fail") failures.push("governance manifest must keep reviewer, mark, and index-release gates closed");
try { await access(join(root, rights.governance.dossier)); } catch { failures.push("rights and reviewer governance dossier must exist"); }
if (pkg.dependencies?.gsap || pkg.dependencies?.["@astrojs/sitemap"]) failures.push("global GSAP and unused sitemap dependencies must be absent");
if (headers["x-robots-tag"] !== "noindex, follow, noarchive") failures.push("Vercel X-Robots-Tag must match meta");
for (const key of ["content-security-policy", "x-content-type-options", "referrer-policy", "permissions-policy", "x-frame-options", "cross-origin-opener-policy"]) if (!headers[key]) failures.push("missing security header " + key);
if (!vercel.redirects?.some((r) => r.source === "/quiz" && r.destination === "/guess-the-programming-language/" && r.permanent === true)) failures.push("/quiz must permanently redirect");
if (legacy.defaultUnknownPathAction !== "404" || legacy.catchAllHomepageRedirect !== false) failures.push("legacy default must remain real 404");
if (!built.get("/impressum").html.includes("Matthias Ramahi")) failures.push("impressum must name operator");
if (!built.get("/datenschutz").html.includes("keine Webanalyse")) failures.push("privacy copy must match analytics-free runtime");
if (!built.get("/new-ownership").html.includes("remains out of search indexes")) failures.push("ownership page must disclose hold");
for (const route of ["/field-tests/astro-static-route-contract", "/field-tests/pnpm-frozen-lockfile-contract", "/field-tests/evidence-receipt-contract"]) {
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
if (!built.get("/tools/keyword-list-cleaner").html.includes('"@type":"WebApplication"')) failures.push("keyword cleaner needs WebApplication schema");
if (!built.get("/tools/url-list-normalizer").html.includes('"@type":"WebApplication"')) failures.push("URL normalizer needs WebApplication schema");
if (!built.get("/tools/json-formatter").html.includes('"@type":"WebApplication"')) failures.push("JSON formatter needs WebApplication schema");
if (!built.get("/tools/uuid-generator").html.includes('"@type":"WebApplication"')) failures.push("UUID generator needs WebApplication schema");
if (!built.get("/tools/developer-tool-test-plan").html.includes('"@type":"WebApplication"')) failures.push("test-plan tool needs WebApplication schema");
if (!built.get("/tools/evidence-receipt").html.includes('"@type":"WebApplication"')) failures.push("hash tool needs WebApplication schema");
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
for (const copy of ["Simple tools for developers and SEO teams.", "Pick one small job", "Use the tool first. Check the details when they matter."]) if (!home.includes(copy)) failures.push("home lacks plain-language toolbox copy: " + copy);
for (const path of ["/tools/keyword-list-cleaner", "/tools/url-list-normalizer", "/tools/json-formatter", "/tools/uuid-generator", "/tools/evidence-receipt", "/tools/developer-tool-test-plan"]) if (!home.includes(`href="${path}"`)) failures.push("home must link directly to " + path);
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
const jsonTool = built.get("/tools/json-formatter").html;
const uuidTool = built.get("/tools/uuid-generator").html;
if (!home.includes('src="/keyword-list-cleaner.js"') || !keywordTool.includes('src="/keyword-list-cleaner.js"')) failures.push("home and keyword tool must load the shared cleaner behavior");
if (quiz.includes("/keyword-list-cleaner.js") || tool.includes("/keyword-list-cleaner.js") || receiptTool.includes("/keyword-list-cleaner.js") || uuidTool.includes("/keyword-list-cleaner.js") || jsonTool.includes("/keyword-list-cleaner.js") || urlTool.includes("/keyword-list-cleaner.js")) failures.push("keyword cleaner behavior must stay on its two intended surfaces");
if (!jsonTool.includes('src="/json-formatter.js"')) failures.push("JSON tool must load formatter behavior");
if (home.includes("/json-formatter.js") || quiz.includes("/json-formatter.js") || tool.includes("/json-formatter.js") || receiptTool.includes("/json-formatter.js") || uuidTool.includes("/json-formatter.js") || keywordTool.includes("/json-formatter.js") || urlTool.includes("/json-formatter.js")) failures.push("JSON formatter behavior must stay on its intended surface");
if (!urlTool.includes('src="/url-list-normalizer.js"')) failures.push("URL normalizer must load its route-specific behavior");
if (home.includes("/url-list-normalizer.js") || quiz.includes("/url-list-normalizer.js") || tool.includes("/url-list-normalizer.js") || receiptTool.includes("/url-list-normalizer.js") || uuidTool.includes("/url-list-normalizer.js") || keywordTool.includes("/url-list-normalizer.js") || jsonTool.includes("/url-list-normalizer.js")) failures.push("URL normalizer behavior must stay route-specific");
if (!uuidTool.includes('src="/uuid-generator.js"')) failures.push("UUID tool must load its route-specific behavior");
if (home.includes("/uuid-generator.js") || quiz.includes("/uuid-generator.js") || tool.includes("/uuid-generator.js") || receiptTool.includes("/uuid-generator.js") || jsonTool.includes("/uuid-generator.js")) failures.push("UUID behavior must remain route-specific");
for (const asset of ["evidence-receipt.js", "evidence-receipt-core.js", "json-formatter.js", "keyword-list-cleaner.js", "test-plan.js", "url-list-normalizer.js", "uuid-generator.js"]) {
  const source = await readFile(join(root, "public", asset), "utf8");
  if ((await stat(join(root, "public", asset))).size > 7000) failures.push(asset + " exceeds 7 KB utility budget");
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
const forbidden = [/80,?000/i, /80k/i, /our subscribers/i, /weekly newsletter is back/i];
for (const [route, { html }] of built) for (const claim of forbidden) if (claim.test(html)) failures.push(route + " contains forbidden historical claim");

if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log(`QA passed: ${routes.length} registry-backed canonical routes plus 404, crawlable noindex, empty hold sitemap, OG/Twitter/schema metadata, security headers, route-scoped JS, legal/identity boundaries, internal links, and permanent aliases.`);
