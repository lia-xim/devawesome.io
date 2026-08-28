(function () {
  function isObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
  function validId(value) { return value === null || typeof value === "string" || (typeof value === "number" && Number.isFinite(value)); }

  function validateTool(tool, prefix, errors, warnings) {
    if (!isObject(tool)) { errors.push(prefix + " must be an object."); return; }
    if (typeof tool.name !== "string" || !tool.name.trim()) errors.push(prefix + ".name must be a non-empty string.");
    if (tool.description !== undefined && typeof tool.description !== "string") errors.push(prefix + ".description must be a string when present.");
    if (!isObject(tool.inputSchema)) errors.push(prefix + ".inputSchema must be a JSON Schema object.");
    else if (tool.inputSchema.type !== "object") warnings.push(prefix + ".inputSchema normally declares type \"object\".");
    if (tool.outputSchema !== undefined && !isObject(tool.outputSchema)) errors.push(prefix + ".outputSchema must be an object when present.");
  }

  function validate(value) {
    const errors = [];
    const warnings = [];
    let kind = "Unknown JSON object";
    if (!isObject(value)) return { kind, errors: ["The top-level JSON value must be an object."], warnings };

    if ("jsonrpc" in value || "method" in value || "result" in value || "error" in value) {
      kind = "JSON-RPC 2.0 envelope";
      if (value.jsonrpc !== "2.0") errors.push('jsonrpc must equal "2.0".');
      const request = typeof value.method === "string";
      if (request) {
        kind = value.method.startsWith("tools/") ? "MCP " + value.method + " request" : "JSON-RPC request";
        if (!value.method.trim()) errors.push("method must not be empty.");
        if ("id" in value && !validId(value.id)) errors.push("id must be a string, number, or null.");
        if (value.params !== undefined && !isObject(value.params) && !Array.isArray(value.params)) errors.push("params must be an object or array when present.");
        if (value.method === "tools/call") {
          if (!isObject(value.params)) errors.push("tools/call params must be an object.");
          else {
            if (typeof value.params.name !== "string" || !value.params.name.trim()) errors.push("tools/call params.name must be a non-empty string.");
            if (value.params.arguments !== undefined && !isObject(value.params.arguments)) errors.push("tools/call params.arguments must be an object when present.");
          }
        }
      } else {
        if (!("id" in value) || !validId(value.id)) errors.push("A response must contain a valid id.");
        const hasResult = "result" in value;
        const hasError = "error" in value;
        if (hasResult === hasError) errors.push("A response must contain exactly one of result or error.");
        if (hasError) {
          if (!isObject(value.error)) errors.push("error must be an object.");
          else {
            if (!Number.isInteger(value.error.code)) errors.push("error.code must be an integer.");
            if (typeof value.error.message !== "string") errors.push("error.message must be a string.");
          }
        }
        if (hasResult && isObject(value.result) && Array.isArray(value.result.tools)) {
          kind = "MCP tools/list response";
          value.result.tools.forEach((tool, index) => validateTool(tool, `result.tools[${index}]`, errors, warnings));
        }
      }
    } else if (Array.isArray(value.tools)) {
      kind = "MCP tools list result";
      value.tools.forEach((tool, index) => validateTool(tool, `tools[${index}]`, errors, warnings));
    } else if ("name" in value || "inputSchema" in value) {
      kind = "MCP tool definition";
      validateTool(value, "tool", errors, warnings);
    } else {
      errors.push("No JSON-RPC envelope or MCP tool definition was detected.");
    }
    return { kind, errors, warnings };
  }

  for (const root of document.querySelectorAll("[data-mcp-validator]")) {
    const input = root.querySelector("[data-mcp-input]");
    const output = root.querySelector("[data-mcp-output]");
    const status = root.querySelector("[data-mcp-status]");
    const validateButton = root.querySelector("[data-mcp-validate]");
    const clearButton = root.querySelector("[data-mcp-clear]");
    const copyButton = root.querySelector("[data-mcp-copy]");
    if (!input || !output || !status || !validateButton || !clearButton || !copyButton) continue;

    const run = () => {
      try {
        const result = validate(JSON.parse(input.value));
        const lines = [`Detected: ${result.kind}`, ""];
        if (!result.errors.length) lines.push("PASS: No structural errors found by this focused validator.");
        for (const error of result.errors) lines.push("ERROR: " + error);
        for (const warning of result.warnings) lines.push("WARNING: " + warning);
        lines.push("", "Scope: focused JSON-RPC and MCP tool checks; not the complete versioned MCP schema.");
        output.value = lines.join("\n");
        status.textContent = result.errors.length ? `${result.errors.length} structural ${result.errors.length === 1 ? "error" : "errors"}` : `${result.warnings.length} warnings · structure passed`;
        status.dataset.state = result.errors.length ? "error" : "valid";
      } catch (error) {
        output.value = "ERROR: Invalid JSON.\n\n" + error.message;
        status.textContent = "JSON syntax error";
        status.dataset.state = "error";
      }
      copyButton.disabled = !output.value;
    };
    validateButton.addEventListener("click", run);
    clearButton.addEventListener("click", () => { input.value = ""; output.value = ""; copyButton.disabled = true; status.textContent = "Cleared"; input.focus(); });
    copyButton.addEventListener("click", async () => { try { await navigator.clipboard.writeText(output.value); status.textContent = "Report copied"; } catch { output.focus(); output.select(); status.textContent = "Select and copy the report manually"; } });
    run();
  }
})();
