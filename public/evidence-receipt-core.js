export function normalizeEvidenceText(value) {
  return String(value).replace(/\r\n?/g, "\n");
}

export async function sha256Evidence(value, cryptoProvider = globalThis.crypto) {
  if (!cryptoProvider?.subtle) throw new Error("Web Crypto is unavailable in this context.");
  const normalizedText = normalizeEvidenceText(value);
  const bytes = new TextEncoder().encode(normalizedText);
  const digest = await cryptoProvider.subtle.digest("SHA-256", bytes);
  const sha256 = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return { normalizedText, bytes: bytes.byteLength, sha256 };
}
