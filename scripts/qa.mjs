import { access, readFile, readdir, stat } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const routes = ["", "guess-the-programming-language", "field-tests", "field-tests/astro-static-route-contract", "field-tests/pnpm-frozen-lockfile-contract", "labs", "methodology", "new-ownership", "archive/14", "archive/49", "impressum", "datenschutz"];
const canonicals = new Map([
  ["/", "https://devawesome.io/"],
  ["/guess-the-programming-language", "https://devawesome.io/guess-the-programming-language/"],
  ["/field-tests", "https://devawesome.io/field-tests"],
  ["/field-tests/astro-static-route-contract", "https://devawesome.io/field-tests/astro-static-route-contract"],
  ["/field-tests/pnpm-frozen-lockfile-contract", "https://devawesome.io/field-tests/pnpm-frozen-lockfile-contract"],
  ["/labs", "https://devawesome.io/labs"], ["/methodology", "https://devawesome.io/methodology"],
  ["/new-ownership", "https://devawesome.io/new-ownership"], ["/archive/14", "https://devawesome.io/archive/14"],
  ["/archive/49", "https://devawesome.io/archive/49"], ["/impressum", "https://devawesome.io/impressum"],
  ["/datenschutz", "https://devawesome.io/datenschutz"],
]);
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
const headers = Object.fromEntries((vercel.headers?.[0]?.headers ?? []).map(({ key, value }) => [key.toLowerCase(), value]));
if (rights.launchState !== "production_noindex") failures.push("rights manifest must record production_noindex");
if (!rights.unknowns.includes("independent technical reviewer") || !rights.unknowns.includes("brand or mark clearance")) failures.push("open reviewer and identity gates must stay explicit");
if (pkg.dependencies?.gsap || pkg.dependencies?.["@astrojs/sitemap"]) failures.push("global GSAP and automatic sitemap dependencies must be absent");
if (headers["x-robots-tag"] !== "noindex, follow, noarchive") failures.push("Vercel X-Robots-Tag must match meta");
for (const key of ["content-security-policy", "x-content-type-options", "referrer-policy", "permissions-policy", "x-frame-options", "cross-origin-opener-policy"]) if (!headers[key]) failures.push("missing security header " + key);
if (!vercel.redirects?.some((r) => r.source === "/quiz" && r.destination === "/guess-the-programming-language/" && r.permanent === true)) failures.push("/quiz must permanently redirect");
if (legacy.defaultUnknownPathAction !== "404" || legacy.catchAllHomepageRedirect !== false) failures.push("legacy default must remain real 404");
if (!built.get("/impressum").html.includes("Matthias Ramahi")) failures.push("impressum must name operator");
if (!built.get("/datenschutz").html.includes("keine Webanalyse")) failures.push("privacy copy must match analytics-free runtime");
if (!built.get("/new-ownership").html.includes("remains out of search indexes")) failures.push("ownership page must disclose hold");
for (const route of ["/field-tests/astro-static-route-contract", "/field-tests/pnpm-frozen-lockfile-contract"]) {
  const html = built.get(route).html;
  if (!html.includes("Not independently reviewed")) failures.push(route + " must disclose review boundary");
  if (!html.includes('"@type":"TechArticle"') || !html.includes('"editor":{"@id":"https://devawesome.io/#operator"}')) failures.push(route + " needs truthful TechArticle editor schema");
}
if (!built.get("/field-tests").html.includes('"@type":"CollectionPage"')) failures.push("field-test hub needs CollectionPage schema");
if (!built.get("/labs").html.includes('"@type":"CollectionPage"')) failures.push("labs needs CollectionPage schema");
if (!built.get("/guess-the-programming-language").html.includes('"@type":"Quiz"')) failures.push("quiz needs Quiz mainEntity schema");
if (!built.get("/").html.includes('"@type":"WebSite"')) failures.push("home needs WebSite schema");
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
const revealPath = join(root, "public/reveal.js");
const revealBytes = (await stat(revealPath)).size;
if (revealBytes > 2000 || !home.includes('src="/reveal.js"')) failures.push("global reveal loader must remain external and below 2 KB");
const quiz = built.get("/guess-the-programming-language").html;
const quizScripts = [...quiz.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => m[1]).filter((src) => src.startsWith("/_astro/"));
if (quizScripts.length === 0) failures.push("quiz route must load its route-specific script");
if (quizScripts.some((src) => home.includes(src))) failures.push("quiz behavior must not be loaded on home");

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
console.log(`QA passed: ${routes.length} canonical routes plus 404, crawlable noindex, empty sitemap, schemas, security headers, route-scoped JS, legal/identity boundaries, internal links, and permanent alias.`);
