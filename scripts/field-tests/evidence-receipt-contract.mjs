import { createHash, webcrypto } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { arch, platform, release } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeEvidenceText, sha256Evidence } from "../../public/evidence-receipt-core.js";

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const resultPath = join(root, "reports", "field-tests", "evidence-receipt-contract-2026-08-22.json");
const capture = process.argv.includes("--capture");
const vectors = [
  { label: "empty", input: "", expected: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" },
  { label: "abc", input: "abc", expected: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad" },
  { label: "line endings", input: "alpha\r\nbeta\rgamma", normalized: "alpha\nbeta\ngamma" },
  { label: "unicode", input: "DevAwesome ✓ — UTF-8" },
];

const cases = [];
for (const vector of vectors) {
  const result = await sha256Evidence(vector.input, webcrypto);
  const normalized = normalizeEvidenceText(vector.input);
  const reference = createHash("sha256").update(normalized, "utf8").digest("hex");
  const assertions = {
    normalizationMatches: result.normalizedText === (vector.normalized ?? normalized),
    nodeReferenceMatches: result.sha256 === reference,
    knownVectorMatches: vector.expected ? result.sha256 === vector.expected : true,
    digestShapeValid: /^[a-f0-9]{64}$/.test(result.sha256),
  };
  cases.push({ label: vector.label, bytes: result.bytes, digest: result.sha256, assertions });
}

const allPassed = cases.every((entry) => Object.values(entry.assertions).every(Boolean));
if (!allPassed) {
  console.error(JSON.stringify(cases, null, 2));
  process.exit(1);
}

const recorded = {
  schemaVersion: 1,
  id: "evidence-receipt-contract",
  status: "passed",
  capturedAt: capture ? new Date().toISOString() : null,
  editor: "Matthias Ramahi",
  technicalReview: "Not independently reviewed",
  environment: { platform: platform(), osRelease: release(), architecture: arch(), node: process.version, crypto: "Node Web Crypto plus node:crypto reference" },
  command: "corepack pnpm field-test:receipt",
  cases,
  limits: [
    "The test covers normalized text encoded as UTF-8, not arbitrary binary files.",
    "A matching digest supports content-equivalence checking but does not establish authorship, ownership, rights clearance, identity, or trusted time.",
    "The browser tool requires a secure context with Web Crypto support."
  ]
};

if (capture) {
  await mkdir(dirname(resultPath), { recursive: true });
  await writeFile(resultPath, JSON.stringify(recorded, null, 2) + "\n", "utf8");
  console.log("Captured evidence receipt contract:", resultPath);
} else {
  const saved = JSON.parse(await readFile(resultPath, "utf8"));
  if (saved.status !== "passed" || saved.cases?.length !== cases.length || saved.cases.some((entry) => !/^[a-f0-9]{64}$/.test(entry.digest))) {
    console.error("Recorded evidence-receipt field-test evidence is stale or incomplete.");
    process.exit(1);
  }
  console.log("Evidence receipt contract passed: known vectors, normalization, and Node/Web Crypto equivalence matched.");
}
