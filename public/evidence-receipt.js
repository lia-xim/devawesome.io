import { sha256Evidence } from "/evidence-receipt-core.js";

const form = document.querySelector("[data-receipt-form]");
const output = document.querySelector("[data-receipt-output]");
const digest = document.querySelector("[data-receipt-digest]");
const status = document.querySelector("[data-receipt-status]");
const copyHashButton = document.querySelector("[data-receipt-copy-hash]");
const copyButton = document.querySelector("[data-receipt-copy]");
const downloadButton = document.querySelector("[data-receipt-download]");

let currentReceipt = null;

function setStatus(message) {
  status.textContent = message;
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const label = String(data.get("label") || "untitled-evidence").trim();
  const text = String(data.get("evidence") || "");
  try {
    const result = await sha256Evidence(text);
    currentReceipt = {
      schema: "https://devawesome.io/schemas/evidence-receipt.v0.1.json",
      version: "0.1",
      label,
      algorithm: "SHA-256",
      normalization: "CRLF and CR line endings converted to LF; UTF-8 encoding",
      bytes: result.bytes,
      digest: result.sha256,
      generatedAt: new Date().toISOString(),
      limitations: [
        "This receipt can support a later byte-equivalence check for normalized text.",
        "It does not prove authorship, ownership, rights clearance, identity, or a trusted creation time."
      ]
    };
    digest.value = result.sha256;
    output.textContent = JSON.stringify(currentReceipt, null, 2);
    copyHashButton.disabled = false;
    copyButton.disabled = false;
    downloadButton.disabled = false;
    output.focus();
    setStatus(`Receipt generated for ${result.bytes} UTF-8 bytes.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Receipt generation failed.");
  }
});

copyHashButton?.addEventListener("click", async () => {
  if (!currentReceipt) return;
  try {
    await navigator.clipboard.writeText(currentReceipt.digest);
    setStatus("Hash copied.");
  } catch {
    digest.focus();
    digest.select();
    setStatus("Select and copy the hash manually.");
  }
});

copyButton?.addEventListener("click", async () => {
  if (!currentReceipt) return;
  await navigator.clipboard.writeText(JSON.stringify(currentReceipt, null, 2));
  setStatus("Receipt copied.");
});

downloadButton?.addEventListener("click", () => {
  if (!currentReceipt) return;
  const blob = new Blob([JSON.stringify(currentReceipt, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "devawesome-evidence-receipt.json";
  link.click();
  URL.revokeObjectURL(url);
  setStatus("Receipt downloaded.");
});

form?.addEventListener("reset", () => {
  currentReceipt = null;
  digest.value = "";
  output.textContent = "The receipt will appear here.";
  copyHashButton.disabled = true;
  copyButton.disabled = true;
  downloadButton.disabled = true;
  setStatus("Receipt cleared.");
});
