import { sha256Evidence } from "./evidence-receipt-core.js";

export const runManifestSchemaVersion = 1;
export const supportedWorkflowVersions = {
  "keyword-import": ["1.1.0", "2.0.0"],
  "crawl-list": ["1.1.0", "2.0.0"],
  "indexability-debugger": ["1.1.0", "2.0.0"],
  "mcp-payload-validation": ["1.1.0", "2.0.0"],
  "mcp-session-analysis": ["1.0.0"],
};

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  }
  return value;
}

export function stableJson(value) {
  return JSON.stringify(sortValue(value));
}

export async function createRunManifest({ workflow, workflowVersion = "1.0.0", sourceType = "manual", settings = {}, input = "", output = "", outputFormat = "text", summary = {}, limits = [] }, cryptoProvider = globalThis.crypto) {
  if (!workflow) throw new Error("A workflow identifier is required.");
  const safeSettings = sortValue(settings);
  const [inputReceipt, outputReceipt, settingsReceipt] = await Promise.all([
    sha256Evidence(input, cryptoProvider),
    sha256Evidence(output, cryptoProvider),
    sha256Evidence(stableJson(safeSettings), cryptoProvider),
  ]);
  return {
    $schema: "https://devawesome.io/schemas/workbench-run-manifest.v1.json",
    schemaVersion: runManifestSchemaVersion,
    kind: "devawesome-workbench-run-manifest",
    workflow,
    workflowVersion,
    createdAt: new Date().toISOString(),
    sourceType,
    settings: safeSettings,
    receipts: {
      input: { algorithm: "SHA-256", bytes: inputReceipt.bytes, sha256: inputReceipt.sha256 },
      output: { algorithm: "SHA-256", bytes: outputReceipt.bytes, sha256: outputReceipt.sha256, format: outputFormat },
      settings: { algorithm: "SHA-256", bytes: settingsReceipt.bytes, sha256: settingsReceipt.sha256 },
    },
    summary: sortValue(summary),
    limits,
    privacy: "Contains settings, counts, limits, and SHA-256 receipts. Pasted input and generated output are not included.",
  };
}

export function validateRunManifest(manifest) {
  if (!manifest || manifest.kind !== "devawesome-workbench-run-manifest") throw new Error("This is not a DevAwesome run manifest.");
  if (manifest.schemaVersion !== runManifestSchemaVersion) throw new Error(`Unsupported manifest schema version: ${manifest.schemaVersion ?? "missing"}.`);
  if (!manifest.workflow || !manifest.workflowVersion || !manifest.settings || !manifest.receipts) throw new Error("The manifest is missing workflow, settings, or receipt data.");
  for (const key of ["input", "output", "settings"]) {
    const receipt = manifest.receipts[key];
    if (receipt?.algorithm !== "SHA-256" || !/^[a-f0-9]{64}$/.test(receipt?.sha256 || "")) throw new Error(`The ${key} receipt is invalid.`);
  }
  return manifest;
}

export async function verifyRunManifest(manifestInput, { input = "", output = "" } = {}, cryptoProvider = globalThis.crypto) {
  let manifest;
  try { manifest = validateRunManifest(typeof manifestInput === "string" ? JSON.parse(manifestInput) : manifestInput); }
  catch (error) { return { status: "UNSUPPORTED VERSION", validManifest: false, error: error.message, checks: [] }; }
  const supported = supportedWorkflowVersions[manifest.workflow]?.includes(manifest.workflowVersion) ?? false;
  if (!supported) return { status: "UNSUPPORTED VERSION", validManifest: true, workflow: manifest.workflow, workflowVersion: manifest.workflowVersion, checks: [] };
  const [inputReceipt, outputReceipt, settingsReceipt] = await Promise.all([
    sha256Evidence(input, cryptoProvider),
    sha256Evidence(output, cryptoProvider),
    sha256Evidence(stableJson(manifest.settings), cryptoProvider),
  ]);
  const checks = [
    { key: "input", label: "Original input", match: inputReceipt.sha256 === manifest.receipts.input.sha256, expected: manifest.receipts.input.sha256, actual: inputReceipt.sha256 },
    { key: "output", label: "Generated output", match: outputReceipt.sha256 === manifest.receipts.output.sha256, expected: manifest.receipts.output.sha256, actual: outputReceipt.sha256 },
    { key: "settings", label: "Embedded settings", match: settingsReceipt.sha256 === manifest.receipts.settings.sha256, expected: manifest.receipts.settings.sha256, actual: settingsReceipt.sha256 },
  ];
  const failed = checks.filter((check) => !check.match).map((check) => check.key);
  const status = failed.includes("settings") ? "SETTINGS CHANGED" : failed.includes("input") ? "INPUT CHANGED" : failed.includes("output") ? "OUTPUT CHANGED" : "MATCH";
  return { status, validManifest: true, workflow: manifest.workflow, workflowVersion: manifest.workflowVersion, checks, failed };
}

export function downloadRunManifest(manifest, filename) {
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(manifest, null, 2)}\n`], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
