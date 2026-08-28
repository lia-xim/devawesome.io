import { sha256Evidence } from "./evidence-receipt-core.js";

export const runManifestSchemaVersion = 1;

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

export function downloadRunManifest(manifest, filename) {
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(manifest, null, 2)}\n`], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
