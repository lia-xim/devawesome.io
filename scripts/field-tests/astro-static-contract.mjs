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
const expectedUrls = [
  "https://devawesome.io/",
  "https://devawesome.io/archive/14",
  "https://devawesome.io/archive/49",
  "https://devawesome.io/datenschutz",
  "https://devawesome.io/field-tests",
  "https://devawesome.io/field-tests/astro-static-route-contract",
  "https://devawesome.io/field-tests/pnpm-frozen-lockfile-contract",
  "https://devawesome.io/guess-the-programming-language/",
  "https://devawesome.io/impressum",
  "https://devawesome.io/labs",
  "https://devawesome.io/methodology",
  "https://devawesome.io/new-ownership",
];

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

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

async function inspectBuild() {
  const htmlFiles = await listHtmlFiles(dist);
  const sitemapIndex = await readFile(join(dist, "sitemap-index.xml"), "utf8");
  const sitemapFiles = extractLocs(sitemapIndex).map((url) => new URL(url).pathname.slice(1));
  const sitemapUrls = [];
  for (const sitemapFile of sitemapFiles) {
    sitemapUrls.push(...extractLocs(await readFile(join(dist, sitemapFile), "utf8")));
  }
  const normalizedUrls = [...new Set(sitemapUrls)].sort();
  const missingUrls = expectedUrls.filter((url) => !normalizedUrls.includes(url));
  const extraUrls = normalizedUrls.filter((url) => !expectedUrls.includes(url));
  const assertions = {
    staticOutputExists: htmlFiles.length > 0,
    custom404Exists: htmlFiles.includes("404.html"),
    redirectAliasExcluded: !normalizedUrls.some((url) => new URL(url).pathname.replace(/\/$/, "") === "/quiz"),
    errorRouteExcluded: !normalizedUrls.some((url) => ["/404", "/404.html"].includes(new URL(url).pathname.replace(/\/$/, ""))),
    sitemapMatchesCanonicalSet: missingUrls.length === 0 && extraUrls.length === 0,
  };
  return { htmlFiles, sitemapFiles, sitemapUrls: normalizedUrls, missingUrls, extraUrls, assertions };
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
    sitemapIntegration: packageJson.dependencies["@astrojs/sitemap"],
  },
  command: "corepack pnpm exec astro build",
  buildDurationMs: buildRun?.durationMs ?? null,
  exitCode: buildRun?.exitCode ?? 0,
  generatedHtmlFiles: inspection.htmlFiles.length,
  sitemapEntries: inspection.sitemapUrls.length,
  sitemapUrls: inspection.sitemapUrls,
  assertions: inspection.assertions,
  limits: [
    "One warm local run on a Windows x64 workstation; this is not a cross-platform performance benchmark.",
    "The result covers Astro static output for this repository, not SSR, server islands, adapters, or cold dependency installation.",
    "Elapsed time includes local filesystem and process-start variance and should not be compared across machines.",
  ],
};

if (capture) {
  await mkdir(dirname(resultPath), { recursive: true });
  await writeFile(resultPath, JSON.stringify(recorded, null, 2) + "\n", "utf8");
  console.log("Captured Astro static contract:", resultPath);
} else {
  const saved = JSON.parse(await readFile(resultPath, "utf8"));
  if (saved.status !== "passed" || saved.environment.astro !== recorded.environment.astro) {
    console.error("Recorded Astro field-test evidence is stale or incomplete.");
    process.exit(1);
  }
  console.log("Astro static contract passed:", inspection.sitemapUrls.length, "canonical sitemap entries.");
}
