import { normalizeColumnName } from "./workbench-tabular.js";

export const recipeSchemaVersion = 2;

export function createRecipe(tool, settings, meta = {}) {
  return {
    $schema: "https://devawesome.io/schemas/workbench-recipe.v2.json",
    schemaVersion: recipeSchemaVersion,
    kind: "devawesome-workbench-recipe",
    tool,
    recipeVersion: meta.recipeVersion || "2.0.0",
    workflowVersion: meta.workflowVersion || "2.0.0",
    compatibleWorkflowVersions: meta.compatibleWorkflowVersions || ["2.x"],
    createdAt: new Date().toISOString(),
    sourceType: meta.sourceType || "manual",
    columnMappings: meta.columnMappings || [],
    settings,
    privacy: "Configuration and column identities only. Pasted input and generated output are not stored in this file.",
  };
}

export function validateRecipe(recipe, expectedTool) {
  if (!recipe || recipe.kind !== "devawesome-workbench-recipe") throw new Error("This is not a DevAwesome workbench recipe.");
  if (![1, recipeSchemaVersion].includes(recipe.schemaVersion)) throw new Error(`Unsupported recipe schema version: ${recipe.schemaVersion ?? "missing"}.`);
  if (recipe.tool !== expectedTool) throw new Error(`This recipe belongs to ${recipe.tool || "another workbench"}, not ${expectedTool}.`);
  if (!recipe.settings || typeof recipe.settings !== "object" || Array.isArray(recipe.settings)) throw new Error("The recipe has no valid settings object.");
  return recipe;
}

function versionMatches(pattern, version) {
  if (pattern === version) return true;
  const [major] = String(version).split(".");
  return pattern === `${major}.x` || pattern === `${major}.*`;
}

export function preflightRecipe(recipe, { workflowVersion = "2.0.0", profiles = [] } = {}) {
  const messages = [];
  const resolvedSettings = structuredClone(recipe.settings);
  let canApply = true;
  const compatible = recipe.schemaVersion === 1 || (recipe.compatibleWorkflowVersions || []).some((pattern) => versionMatches(pattern, workflowVersion));
  if (!compatible) {
    canApply = false;
    messages.push({ state: "error", text: `Recipe targets workflow ${recipe.workflowVersion || "unknown"}; this page runs ${workflowVersion}.` });
  } else if (recipe.schemaVersion === 1) {
    messages.push({ state: "warning", text: "Legacy recipe: column positions can be reviewed, but no saved column identities are available." });
  } else messages.push({ state: "pass", text: `Recipe ${recipe.recipeVersion} is compatible with workflow ${workflowVersion}.` });

  const arrays = new Map();
  for (const mapping of recipe.columnMappings || []) {
    const normalized = mapping.normalizedName || normalizeColumnName(mapping.name);
    const matches = profiles.filter((profile) => profile.normalizedName === normalized);
    if (matches.length === 0) {
      canApply = false;
      messages.push({ state: "error", text: `${mapping.role || mapping.name} is missing. Expected column “${mapping.name}”.` });
      continue;
    }
    if (matches.length > 1) {
      canApply = false;
      messages.push({ state: "error", text: `${mapping.role || mapping.name} is ambiguous. ${matches.length} columns normalize to “${normalized}”.` });
      continue;
    }
    const match = matches[0];
    const positionNote = match.index === mapping.originalIndex ? "same position" : `moved from column ${mapping.originalIndex + 1} to ${match.index + 1}`;
    const typeChanged = mapping.expectedType && match.expectedType !== mapping.expectedType;
    messages.push({ state: typeChanged ? "warning" : "pass", text: `${mapping.role || mapping.name}: matched “${match.name}” (${positionNote}${typeChanged ? `; type changed from ${mapping.expectedType} to ${match.expectedType}` : ""}).` });
    if (mapping.multiple) {
      if (!arrays.has(mapping.setting)) arrays.set(mapping.setting, []);
      arrays.get(mapping.setting).push(match.index);
    } else resolvedSettings[mapping.setting] = match.index;
  }
  for (const [setting, indexes] of arrays) resolvedSettings[setting] = indexes;
  return { canApply, compatible, resolvedSettings, messages, schemaVersion: recipe.schemaVersion };
}

export function presentRecipePreflight(root, preflight) {
  const dialog = root.querySelector("[data-recipe-preflight]");
  const summary = root.querySelector("[data-recipe-preflight-summary]");
  const list = root.querySelector("[data-recipe-preflight-list]");
  const apply = root.querySelector("[data-recipe-preflight-apply]");
  const cancel = root.querySelector("[data-recipe-preflight-cancel]");
  if (!dialog || !summary || !list || !apply || !cancel) return Promise.resolve(preflight.canApply);
  summary.textContent = preflight.canApply ? "Review every mapping before applying this recipe." : "This recipe cannot be applied safely to the current input.";
  list.replaceChildren(...preflight.messages.map((message) => {
    const item = document.createElement("li");
    item.dataset.state = message.state;
    item.textContent = message.text;
    return item;
  }));
  apply.disabled = !preflight.canApply;
  dialog.showModal();
  return new Promise((resolve) => {
    const finish = (accepted) => { dialog.close(); resolve(accepted); };
    apply.onclick = () => finish(true);
    cancel.onclick = () => finish(false);
    dialog.oncancel = (event) => { event.preventDefault(); finish(false); };
  });
}

export async function readRecipeFile(file, expectedTool) {
  if (!file) throw new Error("Choose a recipe file first.");
  const recipe = JSON.parse(await file.text());
  return validateRecipe(recipe, expectedTool);
}

export function downloadRecipe(recipe, filename) {
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(recipe, null, 2)}\n`], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
