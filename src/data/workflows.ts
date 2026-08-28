export const workflows = [
  {
    path: "/workflows/prepare-keyword-import",
    name: "Prepare a keyword import",
    description: "Map a copied list or CSV export, expose conflicting duplicate data, and export a reviewed import file.",
    shortDescription: "Map columns, resolve duplicate conflicts, and save the rules as a recipe.",
    tools: ["Keyword list cleaner", "JSON formatter"],
  },
  {
    path: "/workflows/build-clean-crawl-list",
    name: "Build a clean crawl list",
    description: "Extract URLs, define host and protocol scope, explain exclusions, and export a crawl-ready list.",
    shortDescription: "Build a scoped target list and keep every rejected URL with its reason.",
    tools: ["URL list normalizer", "Robots.txt tester"],
  },
  {
    path: "/workflows/debug-indexability",
    name: "Debug indexability",
    description: "Extract status, canonical, robots, and indexing directives from pasted evidence, then explain the first blocker.",
    shortDescription: "Paste headers, HTML head, and robots.txt instead of translating every signal by hand.",
    tools: ["Indexability check", "Robots.txt tester"],
  },
  {
    path: "/workflows/validate-mcp-message",
    name: "Validate an MCP message",
    description: "Validate an MCP message against a selected protocol revision and compare expected with actual output.",
    shortDescription: "Import Inspector or log JSON, apply versioned rules, and preserve the test setup.",
    tools: ["MCP JSON-RPC validator", "Simple test case builder"],
  },
] as const;
