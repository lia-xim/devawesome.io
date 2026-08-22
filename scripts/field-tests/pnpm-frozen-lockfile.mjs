import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir, platform, release, arch } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const resultPath = join(root, "reports", "field-tests", "pnpm-frozen-lockfile-2026-08-22.json");
const capture = process.argv.includes("--capture");
const fixture = await mkdtemp(join(tmpdir(), "devawesome-pnpm-field-test-"));

function run(args) {
  const isWindows = process.platform === "win32";
  const command = isWindows ? (process.env.ComSpec ?? "cmd.exe") : "corepack";
  const commandArgs = isWindows ? ["/d", "/s", "/c", `corepack ${args.join(" ")}`] : args;
  const started = performance.now();
  const result = spawnSync(command, commandArgs, {
    cwd: fixture,
    encoding: "utf8",
    shell: false,
    env: { ...process.env, CI: "1", NO_COLOR: "1" },
  });
  return {
    durationMs: Math.round(performance.now() - started),
    exitCode: result.status,
    output: (result.stdout + result.stderr).replaceAll(fixture, "<fixture>"),
  };
}

try {
  await copyFile(join(root, "package.json"), join(fixture, "package.json"));
  await copyFile(join(root, "pnpm-lock.yaml"), join(fixture, "pnpm-lock.yaml"));
  const positive = run(["pnpm", "install", "--frozen-lockfile", "--offline", "--ignore-scripts"]);

  const packageJson = JSON.parse(await readFile(join(fixture, "package.json"), "utf8"));
  packageJson.dependencies = { ...packageJson.dependencies, "lockfile-mismatch-fixture": "1.0.0" };
  await writeFile(join(fixture, "package.json"), JSON.stringify(packageJson, null, 2) + "\n", "utf8");
  const negative = run(["pnpm", "install", "--frozen-lockfile", "--offline", "--ignore-scripts"]);

  const negativeErrorCode = negative.output.match(/ERR_PNPM_[A-Z_]+/)?.[0] ?? null;
  const assertions = {
    matchingManifestAccepted: positive.exitCode === 0,
    mismatchedManifestRejected: negative.exitCode !== 0,
    explicitFrozenLockfileError: negativeErrorCode === "ERR_PNPM_OUTDATED_LOCKFILE",
  };
  if (Object.values(assertions).some((value) => value !== true)) {
    console.error(JSON.stringify({ positive, negative, negativeErrorCode, assertions }, null, 2));
    process.exitCode = 1;
  }

  const rootPackage = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const recorded = {
    schemaVersion: 1,
    id: "pnpm-frozen-lockfile-contract",
    status: "passed",
    capturedAt: capture ? new Date().toISOString() : null,
    editor: "Matthias Ramahi",
    technicalReview: "Not independently reviewed",
    project: "isolated copy of devawesome.io package.json and pnpm-lock.yaml",
    environment: {
      platform: platform(),
      osRelease: release(),
      architecture: arch(),
      node: process.version,
      pnpm: rootPackage.packageManager.replace("pnpm@", ""),
      dependencyStore: "warm local pnpm store; network disabled",
    },
    command: "corepack pnpm install --frozen-lockfile --offline --ignore-scripts",
    positiveCase: {
      description: "package.json matches the copied lockfile",
      exitCode: positive.exitCode,
      durationMs: positive.durationMs,
    },
    negativeCase: {
      description: "a synthetic dependency is added to package.json without updating pnpm-lock.yaml",
      exitCode: negative.exitCode,
      durationMs: negative.durationMs,
      errorCode: negativeErrorCode,
    },
    assertions,
    limits: [
      "The positive run uses a warm local pnpm store and does not measure network or cold-cache installation.",
      "The fixture uses this repository's dependency graph; other workspaces and peer-dependency layouts may behave differently.",
      "Timing is diagnostic for this run only. The durable result is acceptance of the matching manifest and rejection of the mismatch.",
    ],
  };

  if (capture && process.exitCode !== 1) {
    await mkdir(dirname(resultPath), { recursive: true });
    await writeFile(resultPath, JSON.stringify(recorded, null, 2) + "\n", "utf8");
    console.log("Captured pnpm frozen-lockfile contract:", resultPath);
  } else if (!capture) {
    const saved = JSON.parse(await readFile(resultPath, "utf8"));
    if (saved.status !== "passed" || saved.environment.pnpm !== recorded.environment.pnpm) {
      console.error("Recorded pnpm field-test evidence is stale or incomplete.");
      process.exitCode = 1;
    } else if (process.exitCode !== 1) {
      console.log("pnpm frozen-lockfile contract passed: matching manifest accepted; mismatch rejected.");
    }
  }
} finally {
  await rm(fixture, { recursive: true, force: true });
}
