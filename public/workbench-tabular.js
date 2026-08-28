import { looksLikeHeader, parseDelimited } from "./workbench-core.js";

export function normalizeColumnName(value) {
  return String(value ?? "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function inferColumnType(values) {
  const populated = values.map((value) => String(value ?? "").trim()).filter(Boolean);
  if (!populated.length) return "empty";
  const tests = { integer: /^[-+]?\d+$/, number: /^[-+]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/, boolean: /^(?:true|false|yes|no|0|1)$/i, url: /^https?:\/\/[^\s]+$/i };
  for (const [type, pattern] of Object.entries(tests)) if (populated.every((value) => pattern.test(value))) return type;
  return "text";
}

export function profileTabularInput(input, { mode = "auto", hasHeader } = {}) {
  const rows = parseDelimited(input, mode);
  const headerPresent = mode === "lines" ? false : hasHeader ?? looksLikeHeader(rows[0] || []);
  const width = rows.reduce((maximum, row) => Math.max(maximum, row.length), 0);
  const headers = headerPresent ? (rows[0] || []).map((value, index) => String(value || `Column ${index + 1}`).trim()) : Array.from({ length: width }, (_, index) => `Column ${index + 1}`);
  const dataRows = headerPresent ? rows.slice(1) : rows;
  const profiles = headers.map((name, index) => ({ name, normalizedName: normalizeColumnName(name), index, expectedType: inferColumnType(dataRows.slice(0, 100).map((row) => row[index])) }));
  return { rows: dataRows, headers, profiles, hasHeader: headerPresent };
}

export function mappingForColumn(setting, role, profile, multiple = false) {
  return { setting, role, name: profile.name, normalizedName: profile.normalizedName, originalIndex: profile.index, expectedType: profile.expectedType, ...(multiple ? { multiple: true } : {}) };
}
