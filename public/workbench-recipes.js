export const recipeSchemaVersion = 1;

export function createRecipe(tool, settings, meta = {}) {
  return {
    schemaVersion: recipeSchemaVersion,
    kind: "devawesome-workbench-recipe",
    tool,
    toolVersion: meta.toolVersion || "1.0.0",
    createdAt: new Date().toISOString(),
    sourceType: meta.sourceType || "manual",
    settings,
    privacy: "Configuration only. No pasted input or generated output is stored in this file.",
  };
}

export function validateRecipe(recipe, expectedTool) {
  if (!recipe || recipe.kind !== "devawesome-workbench-recipe") throw new Error("This is not a DevAwesome workbench recipe.");
  if (recipe.schemaVersion !== recipeSchemaVersion) throw new Error(`Unsupported recipe schema version: ${recipe.schemaVersion ?? "missing"}.`);
  if (recipe.tool !== expectedTool) throw new Error(`This recipe belongs to ${recipe.tool || "another workbench"}, not ${expectedTool}.`);
  if (!recipe.settings || typeof recipe.settings !== "object" || Array.isArray(recipe.settings)) throw new Error("The recipe has no valid settings object.");
  return recipe;
}

export async function readRecipeFile(file, expectedTool) {
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
