import { access, readFile, readdir } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const canonicalRoutes = [
  "",
  "guess-the-programming-language",
  "field-tests",
  "field-tests/astro-static-route-contract",
  "field-tests/pnpm-frozen-lockfile-contract",
  "labs",
  "methodology",
  "new-ownership",
  "archive/14",
  "archive/49",
  "impressum",
  "datenschutz",
];
const expectedCanonicals = new Map([
  ["/", "https://devawesome.io/"],
  ["/guess-the-programming-language", "https://devawesome.io/guess-the-programming-language/"],
  ["/field-tests", "https://devawesome.io/field-tests"],
  ["/field-tests/astro-static-route-contract", "https://devawesome.io/field-tests/astro-static-route-contract"],
  ["/field-tests/pnpm-frozen-lockfile-contract", "https://devawesome.io/field-tests/pnpm-frozen-lockfile-contract"],
  ["/labs", "https://devawesome.io/labs"],
  ["/methodology", "https://devawesome.io/methodology"],
  ["/new-ownership", "https://devawesome.io/new-ownership"],
  ["/archive/14", "https://devawesome.io/archive/14"],
  ["/archive/49", "https://devawesome.io/archive/49"],
  ["/impressum", "https://devawesome.io/impressum"],
  ["/datenschutz", "https://devawesome.io/datenschutz"],
]);
const failures = [];

async function readBuiltRoute(route) {
  const candidates = route ? [join(dist, route, "index.html"), join(dist, route + ".html")] : [join(dist, "index.html")];
  for (const candidate of candidates) {
    try {
      return { html: await readFile(candidate, "utf8"), file: candidate };
    } catch {}
  }
  failures.push("missing built route /" + route);
  return { html: "", file: candidates[0] };
}

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

const built = new Map();
for (const route of canonicalRoutes) built.set("/" + route, await readBuiltRoute(route));
built.set("/404", { html: await readFile(join(dist, "404.html"), "utf8"), file: join(dist, "404.html") });

for (const [route, { html }] of built) {
  if (/noindex/i.test(html)) failures.push(route + " must not contain noindex after launch");
  if (route === "/404" && html.includes('rel="canonical"')) failures.push("/404 must not claim a canonical URL");
  if (route !== "/404" && !html.includes(`rel="canonical" href="${expectedCanonicals.get(route)}"`)) failures.push(route + " has the wrong canonical URL");
  if (!html.includes("Skip to content")) failures.push(route + " needs a keyboard skip link");
  if (route !== "/404" && !html.includes('rel="sitemap" href="/sitemap-index.xml"')) failures.push(route + " must expose the generated sitemap index");
}

const index = built.get("/").html;
const robots = await readFile(join(dist, "robots.txt"), "utf8");
const sitemapIndex = await readFile(join(dist, "sitemap-index.xml"), "utf8");
const sitemapFiles = extractLocs(sitemapIndex).map((url) => new URL(url).pathname.slice(1));
const sitemapUrls = [];
for (const file of sitemapFiles) sitemapUrls.push(...extractLocs(await readFile(join(dist, file), "utf8")));
const normalizedSitemapUrls = [...new Set(sitemapUrls)].sort();
const expectedSitemapUrls = [...expectedCanonicals.values()].sort();
const legacy = JSON.parse(await readFile(join(root, "src/data/manifests/legacy-urls.v1.json"), "utf8"));
const rights = JSON.parse(await readFile(join(root, "src/data/manifests/rights-evidence.v1.json"), "utf8"));
const astroResult = JSON.parse(await readFile(join(root, "reports/field-tests/astro-static-contract-2026-08-22.json"), "utf8"));
const pnpmResult = JSON.parse(await readFile(join(root, "reports/field-tests/pnpm-frozen-lockfile-2026-08-22.json"), "utf8"));
const vercel = JSON.parse(await readFile(join(root, "vercel.json"), "utf8"));
const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const astroConfig = await readFile(join(root, "astro.config.mjs"), "utf8");
const quizSource = await readFile(join(root, "src/data/quiz.ts"), "utf8");

if (!index.includes("Test the tool")) failures.push("home page must carry the accepted hero claim");
if (!index.includes("New site. New ownership")) failures.push("home page must disclose new ownership");
if (!index.includes("Indexing approved for launch")) failures.push("home page must show the approved launch state");
if (!robots.includes("Allow: /") || robots.includes("Disallow:")) failures.push("robots.txt must allow crawling and contain no Disallow");
if (!robots.includes("Sitemap: https://devawesome.io/sitemap-index.xml")) failures.push("robots.txt must reference the generated sitemap index");
if (JSON.stringify(normalizedSitemapUrls) !== JSON.stringify(expectedSitemapUrls)) failures.push("generated sitemap must exactly match the canonical indexable 200 route set");
for (const excluded of ["/quiz", "/404", "/404.html"]) {
  if (normalizedSitemapUrls.some((url) => new URL(url).pathname === excluded)) failures.push(excluded + " must stay out of the sitemap");
}
if (!packageJson.dependencies?.["@astrojs/sitemap"] || !astroConfig.includes("sitemap(")) failures.push("automatic Astro sitemap integration must be configured");
try {
  await access(join(root, "src/pages/sitemap.xml.ts"));
  failures.push("manual sitemap endpoint must not remain");
} catch {}

if (legacy.defaultUnknownPathAction !== "404" || legacy.catchAllHomepageRedirect !== false) failures.push("legacy manifest must preserve a real 404 and forbid catch-all redirects");
if (!legacy.records.some((record) => record.normalized_path === "/guess-the-programming-language/" && record.action === "restore_200")) failures.push("legacy manifest must record the exact restored quiz target");
for (const issue of ["/archive/14", "/archive/49"]) {
  if (!legacy.records.some((record) => record.normalized_path === issue && record.action === "restore_200")) failures.push(issue + " must have a reviewed restore_200 record");
}
if (!legacy.records.some((record) => record.normalized_path === "/archive" && record.action === "hold")) failures.push("legacy archive index must remain on hold");
const declaredGone = legacy.records.filter((record) => /410/.test(record.action));
if (declaredGone.length > 0) failures.push("no 410 action is currently supported by reviewed legacy evidence");

if (rights.launchState !== "public_indexable") failures.push("rights manifest must record public_indexable");
if (!rights.currentOperator.startsWith("Matthias Ramahi")) failures.push("rights manifest must name the verified current operator");
if (!built.get("/impressum").html.includes("Matthias Ramahi")) failures.push("impressum must identify the operator");
if (!built.get("/impressum").html.includes("nicht unabh") || !built.get("/impressum").html.includes("technisch reviewed")) failures.push("impressum must disclose the review boundary");
if (!built.get("/datenschutz").html.includes("keine Webanalyse")) failures.push("privacy page must reflect the analytics-free implementation");
if ([...built.values()].some(({ html }) => /https?:\/\/[^"']*contextter/i.test(html))) failures.push("the independent site must not contain a Contextter network link");

for (const [name, result] of [["FT-01", astroResult], ["FT-02", pnpmResult]]) {
  if (result.status !== "passed") failures.push(name + " evidence must be passed");
  if (result.editor !== "Matthias Ramahi") failures.push(name + " must name Matthias Ramahi as editor");
  if (result.technicalReview !== "Not independently reviewed") failures.push(name + " must disclose the absent independent review");
}
for (const route of ["/field-tests/astro-static-route-contract", "/field-tests/pnpm-frozen-lockfile-contract"]) {
  if (!built.get(route).html.includes("Not independently reviewed")) failures.push(route + " must show the review disclosure");
}
if ((quizSource.match(/language: "/g) || []).length !== 8) failures.push("quiz must contain exactly eight original questions");
if (!vercel.redirects?.some((redirect) => redirect.source === "/quiz" && redirect.destination === "/guess-the-programming-language/" && redirect.permanent === true)) failures.push("Vercel must permanently redirect /quiz to the canonical target");
if (/x-robots-tag|noindex/i.test(JSON.stringify(vercel))) failures.push("Vercel config must not emit an indexing block");

const forbiddenClaims = [/80,?000/i, /80k/i, /our subscribers/i, /our former authors/i, /weekly newsletter is back/i];
for (const [route, { html }] of built) {
  for (const claim of forbiddenClaims) if (claim.test(html)) failures.push(route + " contains forbidden historical claim " + claim);
}

const internalHref = /href="(\/[^"]*)"/g;
for (const [route, { html }] of built) {
  for (const match of html.matchAll(internalHref)) {
    const path = match[1].split("#")[0].replace(/\/$/, "") || "/";
    if (["/sitemap-index.xml", "/robots.txt", "/quiz"].includes(path)) continue;
    const relativePath = path.replace(/^\/+/, "");
    const candidates = path === "/"
      ? [join(dist, "index.html")]
      : extname(relativePath)
        ? [join(dist, relativePath)]
        : [join(dist, relativePath, "index.html"), join(dist, relativePath + ".html")];
    let resolved = false;
    for (const candidate of candidates) {
      try {
        await access(candidate);
        resolved = true;
        break;
      } catch {}
    }
    if (!resolved) failures.push(route + " has broken internal link " + match[1]);
  }
}

const pageFiles = await readdir(join(root, "src/pages"));
if (pageFiles.some((name) => name.includes("[..."))) failures.push("catch-all routes are forbidden");

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("QA passed: " + canonicalRoutes.length + " canonical 200 routes, generated sitemap, crawlable robots, no indexing blocks, two passed field tests, legal and identity boundaries, internal links, permanent redirect, real 404, and 0 evidence-backed 410 actions.");
