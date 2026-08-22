import { access, readFile, readdir } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const routes = ["", "guess-the-programming-language", "field-tests", "labs", "methodology", "new-ownership", "archive/14", "archive/49", "impressum", "datenschutz"];
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

const built = new Map();
for (const route of routes) built.set("/" + route, await readBuiltRoute(route));
built.set("/404", { html: await readFile(join(dist, "404.html"), "utf8"), file: join(dist, "404.html") });

const expectedCanonicals = new Map([
  ["/", "https://devawesome.io/"],
  ["/guess-the-programming-language", "https://devawesome.io/guess-the-programming-language/"],
  ["/field-tests", "https://devawesome.io/field-tests"],
  ["/labs", "https://devawesome.io/labs"],
  ["/methodology", "https://devawesome.io/methodology"],
  ["/new-ownership", "https://devawesome.io/new-ownership"],
  ["/archive/14", "https://devawesome.io/archive/14"],
  ["/archive/49", "https://devawesome.io/archive/49"],
  ["/impressum", "https://devawesome.io/impressum"],
  ["/datenschutz", "https://devawesome.io/datenschutz"],
]);

for (const [route, { html }] of built) {
  if (!html.includes('content="noindex, follow, noarchive"')) failures.push(route + " must remain noindex while allowing crawl");
  if (route === "/404" && html.includes('rel="canonical"')) failures.push("/404 must not claim a canonical URL");
  if (route !== "/404" && !html.includes(`rel="canonical" href="${expectedCanonicals.get(route)}"`)) failures.push(route + " has the wrong canonical URL");
  if (!html.includes("Skip to content")) failures.push(route + " needs a keyboard skip link");
}

const index = built.get("/").html;
const robots = await readFile(join(dist, "robots.txt"), "utf8");
const sitemap = await readFile(join(dist, "sitemap.xml"), "utf8");
const legacy = JSON.parse(await readFile(join(root, "src/data/manifests/legacy-urls.v1.json"), "utf8"));
const rights = JSON.parse(await readFile(join(root, "src/data/manifests/rights-evidence.v1.json"), "utf8"));
const vercel = JSON.parse(await readFile(join(root, "vercel.json"), "utf8"));
const quizSource = await readFile(join(root, "src/data/quiz.ts"), "utf8");

if (!index.includes("Test the tool")) failures.push("home page must carry the accepted hero claim");
if (!index.includes("New site. New ownership")) failures.push("home page must disclose new ownership");
if (!robots.includes("Allow: /") || robots.includes("Disallow: /")) failures.push("robots.txt must allow crawl so crawlers can observe noindex");
if (sitemap.includes("<loc>")) failures.push("preview sitemap must not list indexable URLs");
if (legacy.defaultUnknownPathAction !== "404" || legacy.catchAllHomepageRedirect !== false) failures.push("legacy manifest must forbid homepage catch-all redirects");
if (!legacy.records.some((record) => record.normalized_path === "/guess-the-programming-language/" && record.action === "restore_200")) failures.push("legacy manifest must record the exact restored quiz target");
for (const issue of ["/archive/14", "/archive/49"]) {
  if (!legacy.records.some((record) => record.normalized_path === issue && record.action === "restore_200")) failures.push(issue + " must have a reviewed restore_200 record");
}
if (!legacy.records.some((record) => record.normalized_path === "/archive" && record.action === "hold")) failures.push("legacy archive index must remain on hold");
if (rights.launchState !== "production_noindex") failures.push("rights manifest must preserve production_noindex state");
if (!rights.currentOperator.startsWith("Matthias Ramahi")) failures.push("rights manifest must name the verified current operator");
if (!built.get("/impressum").html.includes("Matthias Ramahi")) failures.push("impressum must identify the operator");
if (!built.get("/datenschutz").html.includes("keine Webanalyse")) failures.push("privacy page must reflect the actual analytics-free implementation");
if ([...built.values()].some(({ html }) => /https?:\/\/[^"']*contextter/i.test(html))) failures.push("the independent site must not contain a Contextter network link");
if ((quizSource.match(/language: "/g) || []).length !== 8) failures.push("quiz must contain exactly eight original questions");
if (!vercel.redirects?.some((redirect) => redirect.source === "/quiz" && redirect.destination === "/guess-the-programming-language/" && redirect.permanent === true)) failures.push("Vercel must permanently redirect /quiz to the restored exact target");

const forbiddenClaims = [/80,?000/i, /80k/i, /our subscribers/i, /our former authors/i, /weekly newsletter is back/i, /published field tests:\s*[1-9]/i];
for (const [route, { html }] of built) {
  for (const claim of forbiddenClaims) if (claim.test(html)) failures.push(route + " contains forbidden historical or result claim " + claim);
}

const internalHref = /href="(\/[^\"]*)"/g;
for (const [route, { html }] of built) {
  for (const match of html.matchAll(internalHref)) {
    const path = match[1].split("#")[0].replace(/\/$/, "") || "/";
    if (path === "/sitemap.xml" || path === "/robots.txt") continue;
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
if (pageFiles.some((name) => name.includes("[..."))) failures.push("catch-all routes are forbidden for this preview");

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("QA passed: " + built.size + " routes, legal pages, exact canonicals, crawlable noindex, real 404 boundary, empty sitemap, manifests, internal links, redirect, quiz, and forbidden claims.");
