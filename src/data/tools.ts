export const toolCategories = [
  {
    id: "seo-data",
    name: "SEO data",
    description: "Clean keyword and URL inputs before they enter a crawl, import, or reporting workflow.",
  },
  {
    id: "technical-seo",
    name: "Technical SEO",
    description: "Check directives and search-result inputs before they reach a crawler or production template.",
  },
  {
    id: "agents-and-mcp",
    name: "Agents and MCP",
    description: "Inspect protocol payloads and tool definitions without sending them to a server.",
  },
  {
    id: "developer-utilities",
    name: "Developer utilities",
    description: "Small browser tools for structured data, identifiers, hashing, and repeatable test cases.",
  },
] as const;

export type ToolCategoryId = (typeof toolCategories)[number]["id"];

export const tools: ReadonlyArray<{
  path: string;
  name: string;
  description: string;
  glyph: string;
  category: ToolCategoryId;
  featured?: boolean;
}> = [
  {
    path: "/tools/keyword-list-cleaner",
    name: "Keyword list cleaner",
    description: "Clean messy keyword lists and choose the output format.",
    glyph: "Aa",
    category: "seo-data",
    featured: true,
  },
  {
    path: "/tools/url-list-normalizer",
    name: "URL list normalizer",
    description: "Normalize mixed URL lists and control the final format.",
    glyph: "URL",
    category: "seo-data",
    featured: true,
  },
  {
    path: "/tools/robots-txt-tester",
    name: "Robots.txt tester",
    description: "Test a crawler and full URL against pasted robots rules.",
    glyph: "BOT",
    category: "technical-seo",
    featured: true,
  },
  {
    path: "/tools/serp-snippet-preview",
    name: "SERP snippet preview",
    description: "Preview a title, URL, and meta description together.",
    glyph: "SERP",
    category: "technical-seo",
  },
  {
    path: "/tools/mcp-json-rpc-validator",
    name: "MCP JSON-RPC validator",
    description: "Check JSON copied from an MCP inspector, SDK, or log.",
    glyph: "MCP",
    category: "agents-and-mcp",
    featured: true,
  },
  {
    path: "/tools/json-formatter",
    name: "JSON formatter",
    description: "Format and validate JSON, API, and SEO export data.",
    glyph: "{ }",
    category: "developer-utilities",
  },
  {
    path: "/tools/uuid-generator",
    name: "UUID generator",
    description: "Generate secure v4 UUIDs instantly.",
    glyph: "ID",
    category: "developer-utilities",
  },
  {
    path: "/tools/evidence-receipt",
    name: "SHA-256 hash",
    description: "Create SHA-256 hashes from text.",
    glyph: "#",
    category: "developer-utilities",
  },
  {
    path: "/tools/developer-tool-test-plan",
    name: "Simple test case builder",
    description: "Turn one expected result into a short test case.",
    glyph: "list",
    category: "developer-utilities",
  },
];
