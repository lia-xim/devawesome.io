import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { platform, release, arch } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const dist = join(root, "dist");
const resultPath = join(root, "reports", "field-tests", "astro-static-contract-2026-08-22.json");
const capture = process.argv.includes("--capture");

function runCorepack(args) {
  const isWindows = process.platform === "win32";
  const command = isWindows ? (process.env.ComSpec ?? "cmd.exe") : "corepack";
  const commandArgs = isWindows ? ["/d", "/s", "/c", `corepack ${args.join(" ")}`] : args;
  const started = performance.now();
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: "utf8",
    shell: false,
    env: { ...process.env, NO_COLOR: "1" },
  });
  return {
    durationMs: Math.round(performance.now() - started),
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

async function listHtmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listHtmlFiles(absolute));
    else if (entry.name.endsWith(".html")) files.push(relative(dist, absolute).replaceAll("\\", "/"));
  }
  return files.sort();
}

async function inspectBuild() {
  const htmlFiles = await listHtmlFiles(dist);
  const sitemap = await readFile(join(dist, "sitemap.xml"), "utf8");
  const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const noindexFailures = [];
  for (const file of htmlFiles.filter((name) => name !== "quiz/index.html")) {
    const html = await readFile(join(dist, file), "utf8");
    if (!/<meta name="robots" content="noindex, follow, noarchive"/.test(html)) noindexFailures.push(file);
  }
  const assertions = {
    staticOutputExists: htmlFiles.length > 0,
    custom404Exists: htmlFiles.includes("404.html"),
    allCanonicalHtmlNoindex: noindexFailures.length === 0,
    sitemapContainsNoIndexableUrls: sitemapUrls.length === 0,
    redirectAliasNotDiscoverable: !sitemapUrls.some((url) => new URL(url).pathname.replace(/\/$/, "") === "/quiz"),
    errorRouteNotDiscoverable: !sitemapUrls.some((url) => ["/404", "/404.html"].includes(new URL(url).pathname.replace(/\/$/, ""))),
  };
  return { htmlFiles, sitemapUrls, noindexFailures, assertions };
}

let buildRun = null;
if (capture) {
  buildRun = runCorepack(["pnpm", "exec", "astro", "build"]);
  if (buildRun.exitCode !== 0) {
    process.stderr.write(buildRun.stdout + buildRun.stderr);
    process.exit(buildRun.exitCode ?? 1);
  }
}

const inspection = await inspectBuild();
if (Object.values(inspection.assertions).some((value) => value !== true)) {
  console.error(JSON.stringify(inspection, null, 2));
  process.exit(1);
}

const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const recorded = {
  schemaVersion: 1,
  id: "astro-static-route-contract",
  status: "passed",
  capturedAt: capture ? new Date().toISOString() : null,
  editor: "Matthias Ramahi",
  technicalReview: "Not independently reviewed",
  project: "devawesome.io production source",
  environment: {
    platform: platform(),
    osRelease: release(),
    architecture: arch(),
    node: process.version,
    astro: packageJson.dependencies.astro,
    sitemapMode: "empty static hold sitemap",
  },
  command: "corepack pnpm exec astro build",
  buildDurationMs: buildRun?.durationMs ?? null,
  exitCode: buildRun?.exitCode ?? 0,
  generatedHtmlFiles: inspection.htmlFiles.length,
  sitemapEntries: inspection.sitemapUrls.length,
  sitemapUrls: inspection.sitemapUrls,
  assertions: inspection.assertions,
  limits: [
    "One warm local run on a Windows x64 workstation; no cross-platform comparison was made.",
    "This verifies generated artifacts and indexing controls, not Vercel edge behavior or search-engine processing.",
    "The result applies to the captured repository revision and becomes stale when routes or publishing controls change.",
  ],
};

if (capture) {
  await mkdir(dirname(resultPath), { recursive: true });
  await writeFile(resultPath, JSON.stringify(recorded, null, 2) + "\n", "utf8");
}

console.log("Astro noindex contract passed:", inspection.sitemapUrls.length, "indexable sitemap entries and", inspection.htmlFiles.length - 1, "canonical noindex HTML files plus one redirect alias.");
