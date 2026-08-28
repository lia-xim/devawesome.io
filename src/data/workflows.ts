export const workflows = [
  {
    path: "/workflows/prepare-keyword-import",
    name: "Prepare a keyword import",
    description: "Turn a copied list or CSV export into clean, deduplicated keywords.",
    shortDescription: "Clean the list, review what changed, and export a reusable file.",
    tools: ["Keyword list cleaner", "JSON formatter"],
  },
  {
    path: "/workflows/build-clean-crawl-list",
    name: "Build a clean crawl list",
    description: "Normalize URLs, surface invalid entries, and export a crawl-ready list.",
    shortDescription: "Prepare a stable URL set before a crawler or audit touches it.",
    tools: ["URL list normalizer", "Robots.txt tester"],
  },
  {
    path: "/workflows/debug-indexability",
    name: "Debug indexability",
    description: "Combine status, canonical, robots, and indexing directives into one verdict.",
    shortDescription: "Find the signal that keeps a page from being technically eligible for indexing.",
    tools: ["Indexability check", "Robots.txt tester"],
  },
  {
    path: "/workflows/validate-mcp-message",
    name: "Validate an MCP message",
    description: "Identify an MCP JSON message, check its structure, and record the next test.",
    shortDescription: "Move from copied debug output to a message you can test deliberately.",
    tools: ["MCP JSON-RPC validator", "Simple test case builder"],
  },
] as const;
